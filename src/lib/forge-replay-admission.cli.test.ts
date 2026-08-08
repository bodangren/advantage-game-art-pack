import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const liveRoot = process.env.FORGE_REPLAY_DOSSIER_A;
const testIt = liveRoot === undefined ? it.skip : it;
const cleanupRoots: string[] = [];

async function temporaryRoot(label: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `pixel-forge-${label}-`));
  cleanupRoots.push(root);
  return root;
}

async function runCli(output: string) {
  return runCliWithDossier(output, liveRoot!);
}

async function runCliWithDossier(output: string, dossier: string) {
  return execFileAsync(
    process.execPath,
    [
      "scripts/forge-replay-admit.mjs",
      "--dossier",
      dossier,
      "--out",
      output,
    ],
    { cwd: process.cwd() },
  );
}

afterEach(async () => {
  await Promise.all(
    cleanupRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("Forge replay CLI atomic publication", () => {
  testIt(
    "refuses a symlink dossier root before reading inputs",
    async () => {
      const root = await temporaryRoot("input-root");
      await symlink(liveRoot!, join(root, "dossier"), "dir");
      await expect(
        runCliWithDossier(join(root, "published"), join(root, "dossier")),
      ).rejects.toThrow(/symlink/i);
      expect(await readdir(root)).toEqual(["dossier"]);
    },
    30_000,
  );

  testIt(
    "refuses a symlink dossier file before reading bytes",
    async () => {
      const root = await temporaryRoot("input-file");
      const dossier = join(root, "dossier");
      await mkdir(dossier);
      await copyFile(
        join(liveRoot!, "tools-list.json"),
        join(dossier, "tools-list.json"),
      );
      await copyFile(
        join(liveRoot!, "interchange-manifest.json"),
        join(dossier, "interchange-manifest.json"),
      );
      await symlink(
        join(liveRoot!, "chunks.json"),
        join(dossier, "chunks.json"),
      );
      await expect(
        runCliWithDossier(join(root, "published"), dossier),
      ).rejects.toThrow(/symlink/i);
      expect((await readdir(root)).sort()).toEqual(["dossier"]);
    },
    30_000,
  );

  testIt(
    "does not mutate a mismatched pre-existing destination",
    async () => {
      const root = await temporaryRoot("mismatch");
      const output = join(root, "published");
      await mkdir(output);
      await writeFile(join(output, "registry.json"), "sentinel\n");

      await expect(runCli(output)).rejects.toThrow();

      expect(await readdir(output)).toEqual(["registry.json"]);
      expect(await readFile(join(output, "registry.json"), "utf8")).toBe(
        "sentinel\n",
      );
    },
    30_000,
  );

  testIt(
    "refuses a symlink ancestor without writing through it",
    async () => {
      const root = await temporaryRoot("ancestor");
      const outside = await temporaryRoot("outside");
      await symlink(outside, join(root, "redirect"), "dir");

      await expect(runCli(join(root, "redirect", "published"))).rejects.toThrow(
        /symlink/i,
      );
      expect(await readdir(outside)).toEqual([]);
    },
    30_000,
  );

  testIt(
    "refuses a symlink destination entry without writing through it",
    async () => {
      const root = await temporaryRoot("entry");
      const outside = await temporaryRoot("entry-outside");
      const output = join(root, "published");
      await mkdir(output);
      await symlink(outside, join(output, "objects"), "dir");

      await expect(runCli(output)).rejects.toThrow(/symlink/i);
      expect(await readdir(outside)).toEqual([]);
      expect(await readdir(output)).toEqual(["objects"]);
    },
    30_000,
  );
});
