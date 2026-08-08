import { describe, expect, it } from "vitest";

import {
  ForgeReplayAdmissionError,
  admitForgeReplayDossier,
  stageForgeReplayDossier,
} from "./forge-replay-admission";
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

function base64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
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
  for (const record of records) {
    for (let offset = 0; offset < record.bytes.byteLength; offset += 32_768) {
      const bytes = record.bytes.slice(
        offset,
        Math.min(offset + 32_768, record.bytes.byteLength),
      );
      chunks.push({
        record_kind: record.record_kind,
        asset_id: "adventurer.unit",
        revision_id: REVISION,
        artifact_id: record.artifact_id,
        artifact_sha256: record.artifact_sha256,
        chunk_sha256: await sha256Bytes(bytes),
        offset,
        length: bytes.byteLength,
        total: record.bytes.byteLength,
        bytes_base64: base64(bytes),
      });
    }
  }
  return { tools_list: rawToolsList(), manifest, chunks };
}

describe("Forge replay staging", () => {
  it("validates a complete replay into deterministic portable pending records", async () => {
    const staged = await stageForgeReplayDossier(await buildDossier());

    expect(staged.registry).toMatchObject({
      contract_id: "pixel-forge-replay-staging/v1",
      status: "validated_pending_review",
      source: {
        contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
        asset_id: "adventurer.unit",
        revision_id: REVISION,
      },
      verification: {
        record_count: 10,
        chunk_count: 11,
        chunk_digests_verified: true,
        reconstructed_digests_verified: true,
        exact_allowlist_verified: true,
      },
      acceptance: {
        contract_id: "pixel-forge-static-interchange-acceptance/v1",
        prerequisite_track: "engine_interop_evidence_20260719",
        scope: "static_png_glb_interchange",
      },
      blockers: ["delivery_resolution_review_evidence_missing"],
    });
    expect(staged.registry.registry_sha256).toMatch(/^[a-f0-9]{64}$/);
    const parsedRegistry = JSON.parse(staged.registry_json);
    const signedDigest = parsedRegistry.registry_sha256;
    delete parsedRegistry.registry_sha256;
    const canonicalize = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(canonicalize)
        : value !== null && typeof value === "object"
          ? Object.fromEntries(
              Object.entries(value as Record<string, unknown>)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, entry]) => [key, canonicalize(entry)]),
            )
          : value;
    expect(
      await sha256Bytes(
        new TextEncoder().encode(JSON.stringify(canonicalize(parsedRegistry))),
      ),
    ).toBe(signedDigest);
    parsedRegistry.status = "tampered";
    expect(
      await sha256Bytes(
        new TextEncoder().encode(JSON.stringify(canonicalize(parsedRegistry))),
      ),
    ).not.toBe(signedDigest);
    expect(staged.files).toHaveLength(10);
    expect(staged.files.map(({ reference }) => reference)).toEqual(
      staged.registry.records.map(({ local_reference }) => local_reference),
    );
    for (const file of staged.files) {
      expect(file.reference).toMatch(
        /^objects\/sha256\/[a-f0-9]{64}\.(?:png|glb|json)$/,
      );
      expect(file.sha256).toBe(await sha256Bytes(file.bytes));
    }
    expect(staged.registry_json).not.toMatch(
      /bytes_base64|runtime_root|inspector_url|\/home\/|\/tmp\//,
    );
  });

  it("is byte-deterministic when chunk response order differs", async () => {
    const firstInput = await buildDossier();
    const secondInput = structuredClone(firstInput);
    secondInput.chunks.reverse();
    const first = await stageForgeReplayDossier(firstInput);
    const second = await stageForgeReplayDossier(secondInput);
    expect(second.registry_json).toBe(first.registry_json);
    expect(second.files).toEqual(first.files);
  });

  it("rejects missing, corrupt, or non-allowlisted replay chunks", async () => {
    const missing = await buildDossier();
    missing.chunks.pop();
    await expect(stageForgeReplayDossier(missing)).rejects.toThrow(
      /missing.*workflow\.public-mcp|expected.*record/i,
    );

    const corrupt = await buildDossier();
    corrupt.chunks[0]!.bytes_base64 = "AAAAAA==";
    await expect(stageForgeReplayDossier(corrupt)).rejects.toThrow(
      /length|chunk_sha256/,
    );

    const extra = await buildDossier();
    extra.chunks.push({
      ...extra.chunks[0]!,
      artifact_id: "derived.contact-sheet",
    });
    await expect(stageForgeReplayDossier(extra)).rejects.toThrow(
      /unknown artifact|allowlist|unexpected/i,
    );
  });

  it("rejects caller-controlled host state in the dossier envelope", async () => {
    const dossier = await buildDossier();
    await expect(
      stageForgeReplayDossier({
        ...dossier,
        runtime_root: "/tmp/forge-runtime",
      }),
    ).rejects.toThrow(/unexpected.*runtime_root/i);
  });

  it("does not invent JSON semantics for unbound evidence bytes", async () => {
    const dossier = await buildDossier();
    const bytes = new TextEncoder().encode(JSON.stringify({ opaque: true }));
    const digest = await sha256Bytes(bytes);
    const evidence = dossier.manifest.evidence[0]!;
    evidence.sha256 = digest;
    evidence.byte_length = bytes.byteLength;
    const chunk = dossier.chunks.find(
      ({ record_kind }) => record_kind === "evidence",
    )!;
    chunk.artifact_sha256 = digest;
    chunk.chunk_sha256 = digest;
    chunk.length = bytes.byteLength;
    chunk.total = bytes.byteLength;
    chunk.bytes_base64 = base64(bytes);
    dossier.manifest.manifest_sha256 =
      await digestForgeInterchangeManifest(dossier.manifest);

    await expect(stageForgeReplayDossier(dossier)).rejects.toThrow(
      /workflow evidence|contract_id|source_operations/i,
    );
  });

  it("keeps final admission fail-closed without a code-owned accepted binding", async () => {
    await expect(admitForgeReplayDossier(await buildDossier())).rejects.toThrow(
      /validated_pending_review|delivery-resolution review.*missing/,
    );
  });

  it("reports boundary errors through the package-owned error type", async () => {
    const dossier = await buildDossier();
    dossier.tools_list.tools[0]!.inputSchema.required = ["asset_id"];
    await expect(stageForgeReplayDossier(dossier)).rejects.toThrow(
      ForgeReplayAdmissionError,
    );
  });
});
