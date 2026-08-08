import { describe, expect, it } from "vitest";

import {
  ForgeMcpTransportError,
  retrieveForgeReplayDossierOverStdio,
  stageForgeAssetOverStdio,
  type ForgeMcpStdioConfig,
} from "./forge-mcp-transport";
import {
  FORGE_INTERCHANGE_CONTRACT_ID,
  digestForgeInterchangeManifest,
} from "./forge-interchange";

const REVISION = `revision.${"1".repeat(64)}`;
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const SEMANTIC_ID_PATTERN = "^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$";
const REVISION_ID_PATTERN = "^revision\\.[a-f0-9]{64}$";

function rawToolsList() {
  return {
    tools: [
      {
        name: "get_interchange_manifest",
        description: "Public manifest retrieval.",
        inputSchema: {
          type: "object",
          properties: {
            asset_id: { type: "string", pattern: SEMANTIC_ID_PATTERN },
            revision_id: { type: "string", pattern: REVISION_ID_PATTERN },
          },
          required: ["asset_id", "revision_id"],
          additionalProperties: false,
        },
      },
      {
        name: "get_interchange_artifact_chunk",
        description: "Public bounded chunk retrieval.",
        inputSchema: {
          type: "object",
          properties: {
            asset_id: { type: "string", pattern: SEMANTIC_ID_PATTERN },
            revision_id: { type: "string", pattern: REVISION_ID_PATTERN },
            artifact_id: { type: "string", pattern: SEMANTIC_ID_PATTERN },
            record_kind: {
              type: "string",
              enum: ["artifact", "evidence"],
              default: "artifact",
            },
            offset: {
              type: "integer",
              minimum: 0,
              maximum: Number.MAX_SAFE_INTEGER,
            },
            length: { type: "integer", minimum: 1, maximum: 32_768 },
          },
          required: [
            "asset_id",
            "revision_id",
            "artifact_id",
            "offset",
            "length",
          ],
          additionalProperties: false,
        },
      },
    ],
  };
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const view = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", view);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function buildDossier() {
  const frameBytes = DIRECTIONS.map((_, index) =>
    Uint8Array.from([0x89, 0x50, 0x4e, index + 1]),
  );
  const glbBytes = new Uint8Array(40_000).fill(7);
  const evidenceBytes = new TextEncoder().encode(
    JSON.stringify({
      contract_id: "forge-public-mcp-workflow-evidence/v1",
      asset_id: "adventurer.unit",
      revision_id: REVISION,
      source_operations: ["render_preview", "export_asset"],
      retrieval_operations: [
        "get_interchange_manifest",
        "get_interchange_artifact_chunk",
      ],
    }),
  );
  const frameDigests = await Promise.all(frameBytes.map(sha256Bytes));
  const glbDigest = await sha256Bytes(glbBytes);
  const evidenceDigest = await sha256Bytes(evidenceBytes);
  const unsigned = {
    contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
    source: { asset_id: "adventurer.unit", revision_id: REVISION },
    style_profile: {
      id: "cute_chibi_v1",
      version: "1.0.0",
      review: { status: "not_required" },
    },
    render_profile: {
      id: "fantasy.sprite.orthographic.v1",
      version: "1.0.0",
    },
    provenance: {
      source_kind: "project_generated",
      workflow_reference: "evidence/public-mcp-workflow.json",
      ownership: "project_owned",
      license_label: "project-owned",
    },
    artifacts: [
      ...DIRECTIONS.map((direction, index) => ({
        id: `frame.${direction.toLowerCase()}`,
        classification: "source",
        role: "directional_frame",
        media_type: "image/png",
        byte_length: frameBytes[index]!.byteLength,
        sha256: frameDigests[index]!,
        width: 128,
        height: 128,
        transparent: true,
        revision_id: REVISION,
        reference: `artifacts/adventurer/${direction.toLowerCase()}.png`,
        direction,
      })),
      {
        id: "model.glb",
        classification: "source",
        role: "glb",
        media_type: "model/gltf-binary",
        byte_length: glbBytes.byteLength,
        sha256: glbDigest,
        revision_id: REVISION,
        reference: "artifacts/adventurer/model.glb",
      },
    ],
    evidence: [
      {
        id: "workflow.public-mcp",
        kind: "workflow",
        reference: "evidence/public-mcp-workflow.json",
        sha256: evidenceDigest,
        byte_length: evidenceBytes.byteLength,
      },
    ],
  };
  const manifest = {
    ...unsigned,
    manifest_sha256: await digestForgeInterchangeManifest(unsigned),
  };
  const records = [
    ...frameBytes.map((bytes, index) => ({
      record_kind: "artifact" as const,
      artifact_id: `frame.${DIRECTIONS[index]!.toLowerCase()}`,
      artifact_sha256: frameDigests[index]!,
      bytes,
    })),
    {
      record_kind: "artifact" as const,
      artifact_id: "model.glb",
      artifact_sha256: glbDigest,
      bytes: glbBytes,
    },
    {
      record_kind: "evidence" as const,
      artifact_id: "workflow.public-mcp",
      artifact_sha256: evidenceDigest,
      bytes: evidenceBytes,
    },
  ];
  const chunks = [];
  for (const item of records) {
    for (let offset = 0; offset < item.bytes.byteLength; offset += 32_768) {
      const bytes = item.bytes.slice(
        offset,
        Math.min(offset + 32_768, item.bytes.byteLength),
      );
      chunks.push({
        record_kind: item.record_kind,
        asset_id: "adventurer.unit",
        revision_id: REVISION,
        artifact_id: item.artifact_id,
        artifact_sha256: item.artifact_sha256,
        chunk_sha256: await sha256Bytes(bytes),
        offset,
        length: bytes.byteLength,
        total: item.bytes.byteLength,
        bytes_base64: Buffer.from(bytes).toString("base64"),
      });
    }
  }
  return { tools_list: rawToolsList(), manifest, chunks };
}

type Dossier = Awaited<ReturnType<typeof buildDossier>>;
type MockMode =
  | "success"
  | "stderr"
  | "stderr_overflow"
  | "notification_message"
  | "notification_list_changed"
  | "notification_hybrid"
  | "notification_flood"
  | "malformed"
  | "unexpected_response_field"
  | "wrong_id"
  | "wrong_protocol"
  | "rpc_error"
  | "tool_error"
  | "paginated"
  | "corrupt_chunk"
  | "exit"
  | "timeout";

function mockConfig(dossier: Dossier, mode: MockMode): ForgeMcpStdioConfig {
  const source = `
import readline from "node:readline";
const dossier = ${JSON.stringify(dossier)};
const mode = ${JSON.stringify(mode)};
const revision = ${JSON.stringify(REVISION)};
if (mode === "stderr") process.stderr.write("diagnostic /private/runtime/hidden\\n");
if (mode === "stderr_overflow") process.stderr.write("x".repeat(16 * 1024 + 1));
const respond = (id, result) => process.stdout.write(JSON.stringify({
  jsonrpc: "2.0",
  id: mode === "wrong_id" ? id + 1 : id,
  result,
  ...(mode === "unexpected_response_field" ? { unexpected: true } : {}),
}) + "\\n");
const notify = (method, params) => process.stdout.write(JSON.stringify({
  jsonrpc: "2.0",
  method,
  params,
}) + "\\n");
const emitInterleavedNotifications = () => {
  if (mode === "notification_message") {
    notify("notifications/message", {
      level: "info",
      logger: "forge",
      data: { message: "rendered /private/runtime/hidden" },
    });
  }
  if (mode === "notification_list_changed") {
    notify("notifications/tools/list_changed", {});
  }
  if (mode === "notification_flood") {
    for (let index = 0; index < 101; index += 1) {
      notify("notifications/message", { level: "debug", data: index });
    }
  }
  if (mode === "notification_hybrid") {
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/message",
      params: { level: "info", data: "bad" },
      result: {},
    }) + "\\n");
  }
};
const envelope = (data, isError = false) => ({
  content: [{
    type: "text",
    text: JSON.stringify(isError
      ? { ok: false, affectedIds: [], summary: "rejected", issues: [{ code: "FAIL" }] }
      : { ok: true, revisionId: revision, affectedIds: [], summary: "ok", issues: [], data }),
  }],
  isError,
});
let initialized = false;
const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
lines.on("line", (line) => {
  if (mode === "timeout") return;
  if (mode === "exit") process.exit(0);
  if (mode === "malformed") {
    process.stdout.write("not-json\\n");
    return;
  }
  const message = JSON.parse(line);
  if (message.method === "initialize") {
    if (mode === "rpc_error") {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, error: { code: -32000, message: "no" } }) + "\\n");
      return;
    }
    respond(message.id, {
      protocolVersion: mode === "wrong_protocol" ? "1900-01-01" : "2025-06-18",
      capabilities: { tools: { listChanged: true } },
      serverInfo: { name: "fantasy-asset-forge", version: "0.1.0" },
    });
    return;
  }
  if (message.method === "notifications/initialized") {
    initialized = true;
    return;
  }
  if (!initialized) process.exit(9);
  if (message.method === "tools/list") {
    respond(message.id, mode === "paginated"
      ? { ...dossier.tools_list, nextCursor: "more" }
      : dossier.tools_list);
    return;
  }
  if (message.method !== "tools/call") process.exit(10);
  const name = message.params?.name;
  const args = message.params?.arguments;
  if (name === "get_interchange_manifest") {
    if (args?.asset_id !== "adventurer.unit" || args?.revision_id !== revision) process.exit(11);
    emitInterleavedNotifications();
    respond(message.id, envelope(dossier.manifest, mode === "tool_error"));
    return;
  }
  if (name !== "get_interchange_artifact_chunk") process.exit(12);
  const found = dossier.chunks.find((chunk) =>
    chunk.record_kind === args?.record_kind &&
    chunk.artifact_id === args?.artifact_id &&
    chunk.offset === args?.offset &&
    chunk.length === args?.length &&
    args?.asset_id === "adventurer.unit" &&
    args?.revision_id === revision);
  if (!found) process.exit(13);
  const data = mode === "corrupt_chunk" ? { ...found, chunk_sha256: "0".repeat(64) } : found;
  respond(message.id, envelope(data));
});
`;
  return {
    command: process.execPath,
    args: ["--input-type=module", "--eval", source],
    timeout_ms: mode === "timeout" ? 100 : 3_000,
  };
}

const REQUEST = {
  asset_id: "adventurer.unit",
  revision_id: REVISION,
} as const;

describe("Forge MCP stdio transport", () => {
  it("negotiates, retrieves bounded public records, and delegates final staging", async () => {
    const dossier = await buildDossier();
    const raw = await retrieveForgeReplayDossierOverStdio(
      mockConfig(dossier, "success"),
      REQUEST,
    );
    expect(raw.tools_list).toEqual(dossier.tools_list);
    expect(raw.manifest).toEqual(dossier.manifest);
    expect(raw.chunks).toEqual(dossier.chunks);

    const staged = await stageForgeAssetOverStdio(
      mockConfig(dossier, "success"),
      REQUEST,
    );
    expect(staged.registry.verification).toMatchObject({
      record_count: 10,
      chunk_count: 11,
      chunk_digests_verified: true,
      reconstructed_digests_verified: true,
    });
    expect(staged.registry.status).toBe("validated_pending_review");
    expect(staged.registry_json).not.toMatch(
      /runtime_root|process\.execPath|\/home\/|\/tmp\//,
    );
  });

  it.each([
    ["stderr_overflow", /stderr.*byte limit|diagnostic.*limit/],
    ["notification_hybrid", /notification.*unexpected|hybrid/],
    ["notification_flood", /notification.*limit|notification.*budget/],
    ["malformed", /malformed JSON/],
    ["unexpected_response_field", /unexpected/],
    ["wrong_id", /unexpected request id/],
    ["wrong_protocol", /negotiate protocol/],
    ["rpc_error", /request failed/],
    ["tool_error", /retrieval tool returned an error/],
    ["paginated", /paginated|nextCursor|page/],
    ["corrupt_chunk", /chunk_sha256|digest/],
    ["exit", /exited/],
    ["timeout", /timed out/],
  ] as const)("fails closed for %s transport behavior", async (mode, error) => {
    const dossier = await buildDossier();
    await expect(
      retrieveForgeReplayDossierOverStdio(mockConfig(dossier, mode), REQUEST),
    ).rejects.toThrow(error);
  });

  it.each([
    "stderr",
    "notification_message",
    "notification_list_changed",
  ] as const)("accepts bounded benign %s interleaving without persisting it", async (mode) => {
    const dossier = await buildDossier();
    const raw = await retrieveForgeReplayDossierOverStdio(
      mockConfig(dossier, mode),
      REQUEST,
    );
    expect(raw.manifest).toEqual(dossier.manifest);
    expect(raw.chunks).toEqual(dossier.chunks);
    expect(JSON.stringify(raw)).not.toContain("/private/runtime");
    if (mode === "stderr") {
      const staged = await stageForgeAssetOverStdio(
        mockConfig(dossier, mode),
        REQUEST,
      );
      expect(staged.registry_json).not.toMatch(
        /diagnostic|private\/runtime|stderr/,
      );
    }
  });

  it("uses a package-owned error without exposing configured runtime paths", async () => {
    const missingCommand = "/private/runtime/that-must-not-be-reported/mcp";
    await expect(
      retrieveForgeReplayDossierOverStdio(
        { command: missingCommand, cwd: "/private/runtime/also-hidden" },
        REQUEST,
      ),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(ForgeMcpTransportError);
      expect(String(error)).not.toContain("/private/runtime");
      return true;
    });
  });
});
