import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import {
  validateForgeInterchangeManifest,
  validateRetrievedForgeChunkBinding,
} from "./forge-interchange";
import { normalizeForgeMcpToolsList } from "./forge-mcp-discovery";
import {
  stageForgeReplayDossier,
  type ForgeReplayDossier,
  type StagedForgeReplayDossier,
} from "./forge-replay-admission";

const PROTOCOL_VERSION = "2025-06-18";
const MANIFEST_TOOL = "get_interchange_manifest";
const CHUNK_TOOL = "get_interchange_artifact_chunk";
const MAX_CHUNK_BYTES = 32_768;
const MAX_TOTAL_BYTES = 128 * 1024 * 1024;
const MAX_CHUNK_CALLS = 10_000;
const MAX_SERVER_NOTIFICATIONS = 100;
const MAX_STDERR_DIAGNOSTIC_BYTES = 16 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1024 * 1024;
const SERVER_NOTIFICATION_METHOD =
  /^notifications\/[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const LOG_LEVELS = new Set([
  "debug",
  "info",
  "notice",
  "warning",
  "error",
  "critical",
  "alert",
  "emergency",
]);

type UnknownRecord = Record<string, unknown>;

export interface ForgeMcpStdioConfig {
  readonly command: string;
  readonly args?: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly timeout_ms?: number;
  readonly max_response_bytes?: number;
}

export interface ForgeMcpRetrievalRequest {
  readonly asset_id: string;
  readonly revision_id: string;
}

export class ForgeMcpTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForgeMcpTransportError";
  }
}

function fail(message: string): never {
  throw new ForgeMcpTransportError(message);
}

function record(value: unknown, context: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${context} must be an object`);
  }
  return value as UnknownRecord;
}

function exactKeys(
  value: UnknownRecord,
  required: readonly string[],
  allowed: readonly string[],
  context: string,
): void {
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0) {
    fail(`${context} missing required key(s): ${missing.join(", ")}`);
  }
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    fail(`${context} contains unexpected key(s): ${unexpected.join(", ")}`);
  }
}

function configuredPositiveInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
  context: string,
): number {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 100 || value > maximum) {
    return fail(`${context} must be an integer between 100 and ${maximum}`);
  }
  return value;
}

function validateProcessConfig(config: ForgeMcpStdioConfig): {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd?: string;
  readonly env: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
} {
  if (
    typeof config.command !== "string" ||
    config.command.length === 0 ||
    config.command.includes("\0")
  ) {
    fail("MCP stdio command must be a non-empty string without NUL bytes");
  }
  const args = config.args ?? [];
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string" || arg.includes("\0"))) {
    fail("MCP stdio args must contain only strings without NUL bytes");
  }
  if (
    config.cwd !== undefined &&
    (config.cwd.length === 0 || config.cwd.includes("\0"))
  ) {
    fail("MCP stdio cwd must be a non-empty path without NUL bytes when provided");
  }
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (config.env !== undefined) {
    for (const [key, value] of Object.entries(config.env)) {
      if (key.length === 0 || key.includes("=") || key.includes("\0")) {
        fail("MCP stdio env contains an invalid key");
      }
      if (value !== undefined && value.includes("\0")) {
        fail("MCP stdio env contains a value with a NUL byte");
      }
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
  return {
    command: config.command,
    args: [...args],
    ...(config.cwd === undefined ? {} : { cwd: config.cwd }),
    env,
    timeoutMs: configuredPositiveInteger(
      config.timeout_ms,
      DEFAULT_TIMEOUT_MS,
      120_000,
      "MCP stdio timeout_ms",
    ),
    maxResponseBytes: configuredPositiveInteger(
      config.max_response_bytes,
      DEFAULT_MAX_RESPONSE_BYTES,
      8 * 1024 * 1024,
      "MCP stdio max_response_bytes",
    ),
  };
}

type PendingRequest = {
  readonly id: number;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: ForgeMcpTransportError) => void;
  readonly timer: ReturnType<typeof setTimeout>;
};

class JsonRpcStdioSession {
  readonly #child: ChildProcessWithoutNullStreams;
  readonly #timeoutMs: number;
  readonly #maxResponseBytes: number;
  #buffer = Buffer.alloc(0);
  #nextId = 1;
  #notificationCount = 0;
  #stderrDiagnosticBytes = 0;
  #pending?: PendingRequest;
  #fatal?: ForgeMcpTransportError;
  #closing = false;
  #exited?: { readonly code: number | null; readonly signal: NodeJS.Signals | null };

  constructor(config: ForgeMcpStdioConfig) {
    const validated = validateProcessConfig(config);
    this.#timeoutMs = validated.timeoutMs;
    this.#maxResponseBytes = validated.maxResponseBytes;
    this.#child = spawn(validated.command, validated.args, {
      ...(validated.cwd === undefined ? {} : { cwd: validated.cwd }),
      env: validated.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    this.#child.stdout.on("data", (chunk: Buffer) => this.#onStdout(chunk));
    this.#child.stderr.on("data", (chunk: Buffer) => {
      this.#stderrDiagnosticBytes += chunk.byteLength;
      if (this.#stderrDiagnosticBytes > MAX_STDERR_DIAGNOSTIC_BYTES) {
        this.#setFatal("MCP stdio stderr diagnostic byte limit exceeded");
      }
    });
    this.#child.once("error", () => {
      this.#setFatal("MCP stdio process could not be started or communicated with");
    });
    this.#child.once("exit", (code, signal) => {
      this.#exited = { code, signal };
      if (!this.#closing || code !== 0 || signal !== null) {
        this.#setFatal("MCP stdio process exited before a clean session shutdown");
      }
    });
  }

  #setFatal(message: string): void {
    if (this.#fatal !== undefined) return;
    this.#fatal = new ForgeMcpTransportError(message);
    if (this.#pending !== undefined) {
      clearTimeout(this.#pending.timer);
      this.#pending.reject(this.#fatal);
      this.#pending = undefined;
    }
    if (!this.#child.killed) this.#child.kill("SIGKILL");
  }

  #onStdout(chunk: Buffer): void {
    if (this.#fatal !== undefined) return;
    this.#buffer = Buffer.concat([this.#buffer, chunk]);
    if (this.#buffer.byteLength > this.#maxResponseBytes) {
      this.#setFatal("MCP stdio response exceeded the configured byte limit");
      return;
    }
    let newline = this.#buffer.indexOf(0x0a);
    while (newline !== -1) {
      const rawLine = this.#buffer.subarray(0, newline);
      this.#buffer = this.#buffer.subarray(newline + 1);
      const line = rawLine.toString("utf8").replace(/\r$/, "");
      if (line.length === 0) {
        this.#setFatal("MCP stdio emitted an empty protocol line");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        this.#setFatal("MCP stdio emitted malformed JSON");
        return;
      }
      try {
        this.#acceptMessage(parsed);
      } catch (error) {
        this.#setFatal(
          error instanceof Error
            ? error.message
            : "MCP JSON-RPC response failed schema validation",
        );
      }
      if (this.#fatal !== undefined) return;
      newline = this.#buffer.indexOf(0x0a);
    }
  }

  #acceptMessage(value: unknown): void {
    const message = record(value, "MCP JSON-RPC message");
    if (message.jsonrpc !== "2.0") {
      this.#setFatal("MCP JSON-RPC message has an unsupported protocol version");
      return;
    }
    if (!("id" in message) && "method" in message) {
      this.#acceptNotification(message);
      return;
    }
    if (this.#pending === undefined || message.id !== this.#pending.id) {
      this.#setFatal("MCP JSON-RPC response has an unexpected request id");
      return;
    }
    const pending = this.#pending;
    if ("error" in message) {
      if ("result" in message) {
        this.#setFatal("MCP JSON-RPC response contains both result and error");
        return;
      }
      exactKeys(message, ["jsonrpc", "id", "error"], ["jsonrpc", "id", "error"], "MCP JSON-RPC error response");
      this.#pending = undefined;
      clearTimeout(pending.timer);
      pending.reject(new ForgeMcpTransportError("MCP JSON-RPC request failed"));
      return;
    }
    exactKeys(message, ["jsonrpc", "id", "result"], ["jsonrpc", "id", "result"], "MCP JSON-RPC success response");
    this.#pending = undefined;
    clearTimeout(pending.timer);
    pending.resolve(message.result);
  }

  #acceptNotification(message: UnknownRecord): void {
    exactKeys(
      message,
      ["jsonrpc", "method"],
      ["jsonrpc", "method", "params"],
      "MCP JSON-RPC server notification",
    );
    if (
      typeof message.method !== "string" ||
      message.method.length > 160 ||
      !SERVER_NOTIFICATION_METHOD.test(message.method)
    ) {
      fail("MCP JSON-RPC server notification.method is invalid");
    }
    this.#notificationCount += 1;
    if (this.#notificationCount > MAX_SERVER_NOTIFICATIONS) {
      fail("MCP JSON-RPC server notification budget exceeded");
    }
    if (message.params === undefined) {
      if (message.method === "notifications/message") {
        fail("MCP notifications/message requires params");
      }
      return;
    }
    const params = record(
      message.params,
      "MCP " + message.method + " notification.params",
    );
    if (message.method === "notifications/message") {
      exactKeys(
        params,
        ["level", "data"],
        ["level", "logger", "data", "_meta"],
        "MCP notifications/message params",
      );
      if (typeof params.level !== "string" || !LOG_LEVELS.has(params.level)) {
        fail("MCP notifications/message params.level is invalid");
      }
      if (
        params.logger !== undefined &&
        (typeof params.logger !== "string" ||
          params.logger.length === 0 ||
          params.logger.length > 128)
      ) {
        fail("MCP notifications/message params.logger is invalid");
      }
      if (params._meta !== undefined) {
        record(params._meta, "MCP notifications/message params._meta");
      }
      return;
    }
    if (message.method === "notifications/tools/list_changed") {
      exactKeys(
        params,
        [],
        ["_meta"],
        "MCP notifications/tools/list_changed params",
      );
      if (params._meta !== undefined) {
        record(
          params._meta,
          "MCP notifications/tools/list_changed params._meta",
        );
      }
    }
  }

  async request(method: string, params: UnknownRecord): Promise<unknown> {
    if (this.#fatal !== undefined) throw this.#fatal;
    if (this.#pending !== undefined) {
      fail("MCP stdio session permits only one in-flight request");
    }
    const id = this.#nextId++;
    const result = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#setFatal("MCP stdio request timed out");
      }, this.#timeoutMs);
      this.#pending = { id, resolve, reject, timer };
    });
    const message = `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`;
    this.#child.stdin.write(message, (error) => {
      if (error !== null && error !== undefined) {
        this.#setFatal("MCP stdio request could not be written");
      }
    });
    return result;
  }

  notify(method: string, params: UnknownRecord): void {
    if (this.#fatal !== undefined) throw this.#fatal;
    const message = `${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`;
    this.#child.stdin.write(message, (error) => {
      if (error !== null && error !== undefined) {
        this.#setFatal("MCP stdio notification could not be written");
      }
    });
  }

  async close(): Promise<void> {
    if (this.#fatal !== undefined) throw this.#fatal;
    if (this.#pending !== undefined) fail("cannot close MCP stdio session with a pending request");
    if (this.#buffer.byteLength > 0) {
      return fail("MCP stdio ended with an unterminated protocol message");
    }
    this.#closing = true;
    if (this.#exited === undefined) {
      this.#child.stdin.end();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.#setFatal("MCP stdio process did not exit after stdin closed");
          reject(this.#fatal!);
        }, this.#timeoutMs);
        this.#child.once("close", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    if (this.#fatal !== undefined) throw this.#fatal;
    if (
      this.#exited === undefined ||
      this.#exited.code !== 0 ||
      this.#exited.signal !== null
    ) {
      fail("MCP stdio process did not complete a clean shutdown");
    }
  }

  abort(): void {
    this.#closing = true;
    if (!this.#child.killed) this.#child.kill("SIGKILL");
  }
}

function validateInitializeResult(value: unknown): void {
  const result = record(value, "MCP initialize result");
  exactKeys(
    result,
    ["protocolVersion", "capabilities", "serverInfo"],
    ["protocolVersion", "capabilities", "serverInfo", "instructions"],
    "MCP initialize result",
  );
  if (result.protocolVersion !== PROTOCOL_VERSION) {
    fail(`MCP server must negotiate protocol ${PROTOCOL_VERSION}`);
  }
  const capabilities = record(result.capabilities, "MCP initialize result.capabilities");
  exactKeys(capabilities, ["tools"], ["tools"], "MCP initialize result.capabilities");
  const tools = record(capabilities.tools, "MCP initialize result.capabilities.tools");
  exactKeys(tools, [], ["listChanged"], "MCP initialize result.capabilities.tools");
  if (tools.listChanged !== undefined && typeof tools.listChanged !== "boolean") {
    fail("MCP initialize result.capabilities.tools.listChanged must be boolean");
  }
  const serverInfo = record(result.serverInfo, "MCP initialize result.serverInfo");
  exactKeys(serverInfo, ["name", "version"], ["name", "version"], "MCP initialize result.serverInfo");
  if (serverInfo.name !== "fantasy-asset-forge") {
    fail("MCP initialize result serverInfo.name is not fantasy-asset-forge");
  }
  if (typeof serverInfo.version !== "string" || serverInfo.version.length === 0) {
    fail("MCP initialize result serverInfo.version must be a non-empty string");
  }
  if (result.instructions !== undefined && typeof result.instructions !== "string") {
    fail("MCP initialize result.instructions must be a string when present");
  }
}

function unwrapToolData(value: unknown, expectedRevision: string): unknown {
  const result = record(value, "MCP tools/call result");
  exactKeys(result, ["content", "isError"], ["content", "isError"], "MCP tools/call result");
  if (result.isError !== false) fail("MCP public retrieval tool returned an error");
  if (!Array.isArray(result.content) || result.content.length !== 1) {
    fail("MCP tools/call result.content must contain exactly one text item");
  }
  const content = record(result.content[0], "MCP tools/call result.content[0]");
  exactKeys(content, ["type", "text"], ["type", "text"], "MCP tools/call result.content[0]");
  if (content.type !== "text" || typeof content.text !== "string") {
    fail("MCP tools/call result.content[0] must be text");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(content.text);
  } catch {
    return fail("MCP public retrieval tool returned malformed JSON text");
  }
  const envelope = record(parsed, "Forge public retrieval envelope");
  exactKeys(
    envelope,
    ["ok", "revisionId", "affectedIds", "summary", "issues", "data"],
    ["ok", "revisionId", "affectedIds", "summary", "issues", "data"],
    "Forge public retrieval envelope",
  );
  if (envelope.ok !== true || envelope.revisionId !== expectedRevision) {
    fail("Forge public retrieval envelope is not a success for the requested revision");
  }
  if (
    !Array.isArray(envelope.affectedIds) ||
    envelope.affectedIds.some((id) => typeof id !== "string") ||
    typeof envelope.summary !== "string" ||
    !Array.isArray(envelope.issues) ||
    envelope.issues.length !== 0
  ) {
    fail("Forge public retrieval success envelope has an invalid schema");
  }
  return envelope.data;
}

async function callPublicTool(
  session: JsonRpcStdioSession,
  name: string,
  args: UnknownRecord,
  revisionId: string,
): Promise<unknown> {
  return unwrapToolData(
    await session.request("tools/call", { name, arguments: args }),
    revisionId,
  );
}

export async function retrieveForgeReplayDossierOverStdio(
  config: ForgeMcpStdioConfig,
  request: ForgeMcpRetrievalRequest,
): Promise<ForgeReplayDossier> {
  const session = new JsonRpcStdioSession(config);
  try {
    validateInitializeResult(
      await session.request("initialize", {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "pixel-art-generator", version: "0.1.0" },
      }),
    );
    session.notify("notifications/initialized", {});

    const toolsList = await session.request("tools/list", {});
    normalizeForgeMcpToolsList(toolsList);

    const manifestValue = await callPublicTool(
      session,
      MANIFEST_TOOL,
      { asset_id: request.asset_id, revision_id: request.revision_id },
      request.revision_id,
    );
    const manifest = await validateForgeInterchangeManifest(manifestValue);
    if (
      manifest.source.asset_id !== request.asset_id ||
      manifest.source.revision_id !== request.revision_id
    ) {
      fail("Forge manifest source does not match the requested immutable identity");
    }

    const records = [
      ...manifest.artifacts
        .filter(({ classification }) => classification === "source")
        .map((record) => ({ record_kind: "artifact" as const, record })),
      ...manifest.evidence.map((record) => ({
        record_kind: "evidence" as const,
        record,
      })),
    ];
    let totalBytes = 0;
    let chunkCalls = 0;
    for (const { record } of records) {
      if (record.byte_length === undefined) {
        fail(`Forge evidence ${record.id} has no signed byte_length`);
      }
      totalBytes += record.byte_length;
      chunkCalls += Math.ceil(record.byte_length / MAX_CHUNK_BYTES);
      if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_TOTAL_BYTES) {
        fail("Forge retrieval exceeds the transport total-byte budget");
      }
      if (chunkCalls > MAX_CHUNK_CALLS) {
        fail("Forge retrieval exceeds the transport chunk-call budget");
      }
    }

    const chunks: unknown[] = [];
    for (const { record_kind, record } of records) {
      const byteLength = record.byte_length!;
      for (let offset = 0; offset < byteLength; offset += MAX_CHUNK_BYTES) {
        const length = Math.min(MAX_CHUNK_BYTES, byteLength - offset);
        const chunk = await callPublicTool(
          session,
          CHUNK_TOOL,
          {
            asset_id: request.asset_id,
            revision_id: request.revision_id,
            artifact_id: record.id,
            record_kind,
            offset,
            length,
          },
          request.revision_id,
        );
        await validateRetrievedForgeChunkBinding(manifest, chunk);
        chunks.push(chunk);
      }
    }
    await session.close();
    return { tools_list: toolsList, manifest: manifestValue, chunks };
  } catch (error) {
    session.abort();
    if (error instanceof ForgeMcpTransportError) throw error;
    throw new ForgeMcpTransportError(
      error instanceof Error ? error.message : "Forge MCP transport failed",
    );
  }
}

export async function stageForgeAssetOverStdio(
  config: ForgeMcpStdioConfig,
  request: ForgeMcpRetrievalRequest,
): Promise<StagedForgeReplayDossier> {
  return stageForgeReplayDossier(
    await retrieveForgeReplayDossierOverStdio(config, request),
  );
}
