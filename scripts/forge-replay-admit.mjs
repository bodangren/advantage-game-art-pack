#!/usr/bin/env node

import {
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import {
  O_CREAT,
  O_DIRECTORY,
  O_EXCL,
  O_NOFOLLOW,
  O_RDONLY,
  O_WRONLY,
} from "node:constants";
import { basename, dirname, join, parse, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const REPOSITORY_ROOT = fileURLToPath(new URL("../", import.meta.url));
const INPUTS = [
  ["tools-list.json", 2 * 1024 * 1024],
  ["interchange-manifest.json", 8 * 1024 * 1024],
  ["chunks.json", 128 * 1024 * 1024],
];

function usage() {
  return "usage: npm run forge:replay-admit -- --dossier <directory> --out <directory> [--admit]";
}

function parseArguments(argv) {
  const result = { dossier: undefined, out: undefined, admit: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--admit") {
      if (result.admit) throw new Error("duplicate --admit argument");
      result.admit = true;
      continue;
    }
    if (argument !== "--dossier" && argument !== "--out") {
      throw new Error(`unknown argument ${argument}\n${usage()}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${argument} requires a directory\n${usage()}`);
    }
    const key = argument === "--dossier" ? "dossier" : "out";
    if (result[key] !== undefined) throw new Error(`duplicate ${argument} argument`);
    result[key] = value;
    index += 1;
  }
  if (result.dossier === undefined || result.out === undefined) {
    throw new Error(usage());
  }
  return result;
}

async function readBounded(handle, maximumBytes) {
  const chunks = [];
  let total = 0;
  while (total <= maximumBytes) {
    const buffer = Buffer.allocUnsafe(
      Math.min(64 * 1024, maximumBytes + 1 - total),
    );
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
    total += bytesRead;
  }
  if (total > maximumBytes) {
    throw new Error("actual bytes exceed the permitted size boundary");
  }
  return Buffer.concat(chunks, total);
}

async function readRegularJson(root, name, maximumBytes) {
  await ensureSafeDirectoryChain(root, false);
  const path = join(root, name);
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new Error(`${name} must be a regular non-symlink file`);
  }
  const handle = await open(path, O_RDONLY | O_NOFOLLOW);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw new Error(`${name} must be a regular file`);
    if (before.size <= 0n || before.size > BigInt(maximumBytes)) {
      throw new Error(`${name} exceeds its permitted size boundary`);
    }
    const bytes = await readBounded(handle, maximumBytes);
    const after = await handle.stat({ bigint: true });
    if (
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs
    ) {
      throw new Error(`${name} changed while it was being read`);
    }
    if (bytes.byteLength <= 0 || bytes.byteLength > maximumBytes) {
      throw new Error(`${name} actual bytes exceed the permitted size boundary`);
    }
    await ensureSafeDirectoryChain(root, false);
    let source;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(`${name} is not valid UTF-8 JSON`);
    }
    try {
      return JSON.parse(source);
    } catch (error) {
      throw new Error(`${name} is not valid JSON: ${error.message}`);
    }
  } finally {
    await handle.close();
  }
}

async function loadDossier(root) {
  const values = await Promise.all(
    INPUTS.map(([name, maximumBytes]) =>
      readRegularJson(root, name, maximumBytes),
    ),
  );
  return {
    tools_list: values[0],
    manifest: values[1],
    chunks: values[2],
  };
}

function containedPath(root, portableReference) {
  const target = resolve(root, portableReference);
  const pathFromRoot = relative(resolve(root), target);
  if (
    pathFromRoot === "" ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`)
  ) {
    throw new Error(`output reference escapes destination: ${portableReference}`);
  }
  return target;
}

async function lstatIfPresent(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

async function ensureSafeDirectoryChain(path, createMissing) {
  const absolute = resolve(path);
  const root = parse(absolute).root;
  let current = root;
  for (const segment of relative(root, absolute).split(sep).filter(Boolean)) {
    current = join(current, segment);
    let stats = await lstatIfPresent(current);
    if (stats === undefined && createMissing) {
      try {
        await mkdir(current, { mode: 0o700 });
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
      }
      stats = await lstatIfPresent(current);
    }
    if (stats === undefined) throw new Error(`directory does not exist: ${current}`);
    if (stats.isSymbolicLink()) {
      throw new Error(`refusing symlink directory ancestor ${current}`);
    }
    if (!stats.isDirectory()) throw new Error(`expected directory ${current}`);
  }
}

async function readNoFollow(path) {
  const handle = await open(path, O_RDONLY | O_NOFOLLOW);
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) throw new Error(`expected regular file ${path}`);
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

async function writeNewFile(path, bytes) {
  const handle = await open(
    path,
    O_CREAT | O_EXCL | O_WRONLY | O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function syncDirectory(path) {
  const handle = await open(path, O_RDONLY | O_DIRECTORY | O_NOFOLLOW);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function collectExistingFiles(root, current = root, files = []) {
  const entries = await readdir(current);
  for (const name of entries) {
    const path = join(current, name);
    const stats = await lstat(path);
    if (stats.isSymbolicLink()) {
      throw new Error(`refusing symlink destination entry ${path}`);
    }
    if (stats.isDirectory()) {
      await collectExistingFiles(root, path, files);
    } else if (stats.isFile()) {
      files.push(relative(root, path));
    } else {
      throw new Error(`refusing non-regular destination entry ${path}`);
    }
  }
  return files;
}

async function verifyExistingTree(outputRoot, expected) {
  await ensureSafeDirectoryChain(dirname(outputRoot), false);
  const rootStats = await lstat(outputRoot);
  if (rootStats.isSymbolicLink()) {
    throw new Error(`refusing symlink destination ${outputRoot}`);
  }
  if (!rootStats.isDirectory()) {
    throw new Error(`destination must be a directory ${outputRoot}`);
  }
  const actualReferences = (await collectExistingFiles(outputRoot)).sort();
  const expectedReferences = [...expected.keys()].sort();
  if (
    actualReferences.length !== expectedReferences.length ||
    actualReferences.some((entry, index) => entry !== expectedReferences[index])
  ) {
    throw new Error("existing destination does not exactly match staged tree");
  }
  for (const reference of expectedReferences) {
    const existing = await readNoFollow(containedPath(outputRoot, reference));
    if (!existing.equals(expected.get(reference))) {
      throw new Error(`refusing different existing file ${reference}`);
    }
  }
}

function expectedTree(staged) {
  const expected = new Map();
  for (const file of staged.files) {
    containedPath("/portable-output-root", file.reference);
    if (expected.has(file.reference)) {
      throw new Error(`duplicate output reference ${file.reference}`);
    }
    expected.set(file.reference, Buffer.from(file.bytes));
  }
  expected.set("registry.json", Buffer.from(staged.registry_json));
  return expected;
}

async function publishAtomicTree(outputRoot, expected) {
  const parent = dirname(outputRoot);
  await ensureSafeDirectoryChain(parent, true);
  const existing = await lstatIfPresent(outputRoot);
  if (existing !== undefined) {
    await verifyExistingTree(outputRoot, expected);
    return;
  }

  let temporaryRoot = await mkdtemp(join(parent, `.${basename(outputRoot)}.tmp-`));
  try {
    const directories = new Set([temporaryRoot]);
    for (const [reference, bytes] of [...expected.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      const target = containedPath(temporaryRoot, reference);
      const targetDirectory = dirname(target);
      await ensureSafeDirectoryChain(targetDirectory, true);
      for (
        let current = targetDirectory;
        current.startsWith(`${temporaryRoot}${sep}`);
        current = dirname(current)
      ) {
        directories.add(current);
      }
      await writeNewFile(target, bytes);
    }
    for (const directory of [...directories].sort(
      (left, right) => right.length - left.length,
    )) {
      await syncDirectory(directory);
    }

    await ensureSafeDirectoryChain(parent, false);
    const racedDestination = await lstatIfPresent(outputRoot);
    if (racedDestination !== undefined) {
      await verifyExistingTree(outputRoot, expected);
      return;
    }
    await rename(temporaryRoot, outputRoot);
    temporaryRoot = undefined;
    await syncDirectory(parent);
  } finally {
    if (temporaryRoot !== undefined) {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

async function loadAdmissionModule() {
  const server = await createServer({
    root: REPOSITORY_ROOT,
    configFile: false,
    appType: "custom",
    logLevel: "error",
    server: { middlewareMode: true, hmr: false },
  });
  try {
    return await server.ssrLoadModule("/src/lib/forge-replay-admission.ts");
  } finally {
    await server.close();
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const dossier = await loadDossier(resolve(options.dossier));
  const admission = await loadAdmissionModule();

  if (options.admit) {
    await admission.admitForgeReplayDossier(dossier);
    return;
  }

  const staged = await admission.stageForgeReplayDossier(dossier);
  const outputRoot = resolve(options.out);
  await publishAtomicTree(outputRoot, expectedTree(staged));
  process.stdout.write(
    `${staged.registry.status}: ${staged.registry.verification.record_count} records, ${staged.registry.verification.total_bytes} bytes\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
