import { describe, expect, it } from "vitest";

import {
  FORGE_REPLAY_STAGING_CONTRACT_ID,
  type ForgeReplayStagedRecord,
  type StagedForgeReplayDossier,
} from "./forge-replay-admission";

const REGISTRY_MODULE_PATH = "./forge-import-registry";
async function loadRegistryApi(): Promise<Record<string, any>> {
  try {
    return await import(/* @vite-ignore */ REGISTRY_MODULE_PATH);
  } catch {
    return {};
  }
}
const ACCEPTANCE = {
  contract_id: "pixel-forge-static-interchange-acceptance/v1",
  binding_sha256: "f11213bc7b3b55bfc4153ba6b4d0607b6876f25466a975f6e412e1c24245905f",
  prerequisite_track: "engine_interop_evidence_20260719",
  decision: { scope: "static_png_glb_interchange" },
} as const;

const REVISION = `revision.${"1".repeat(64)}`;
const MANIFEST_SHA = "2".repeat(64);
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalValue(entry)]),
  );
}

async function buildStaged(): Promise<StagedForgeReplayDossier> {
  const sources = [
    ...DIRECTIONS.map((direction, index) => ({
      record_kind: "artifact" as const,
      id: `frame.${direction.toLowerCase()}`,
      classification: "source" as const,
      role: "directional_frame" as const,
      media_type: "image/png" as const,
      source_reference: `artifacts/frame-${direction.toLowerCase()}.png`,
      bytes: Uint8Array.from([0x89, 0x50, 0x4e, index + 1]),
      width: 128,
      height: 128,
      transparent: true,
      direction,
    })),
    {
      record_kind: "artifact" as const,
      id: "model.glb",
      classification: "source" as const,
      role: "glb" as const,
      media_type: "model/gltf-binary" as const,
      source_reference: "artifacts/model.glb",
      bytes: Uint8Array.from([0x67, 0x6c, 0x54, 0x46]),
    },
    {
      record_kind: "evidence" as const,
      id: "workflow.public-mcp",
      evidence_kind: "workflow",
      media_type: "application/json" as const,
      source_reference: "evidence/public-mcp-workflow.json",
      bytes: new TextEncoder().encode(
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
      ),
    },
  ];
  const records: ForgeReplayStagedRecord[] = [];
  const files = [];
  for (const source of sources) {
    const digest = await sha256Bytes(source.bytes);
    const extension =
      source.media_type === "image/png"
        ? "png"
        : source.media_type === "model/gltf-binary"
          ? "glb"
          : "json";
    const localReference = `objects/sha256/${digest}.${extension}`;
    records.push({
      record_kind: source.record_kind,
      id: source.id,
      ...(source.record_kind === "artifact"
        ? { classification: "source" as const, role: source.role }
        : { evidence_kind: source.evidence_kind }),
      media_type: source.media_type,
      byte_length: source.bytes.byteLength,
      sha256: digest,
      source_reference: source.source_reference,
      local_reference: localReference,
      ...(source.record_kind === "artifact" && source.role === "directional_frame"
        ? {
            width: source.width,
            height: source.height,
            transparent: source.transparent,
            direction: source.direction,
          }
        : {}),
    });
    files.push({
      reference: localReference,
      sha256: digest,
      media_type: source.media_type,
      bytes: source.bytes,
    });
  }
  const unsigned = {
    contract_id: FORGE_REPLAY_STAGING_CONTRACT_ID,
    status: "validated_pending_review" as const,
    source: {
      contract_id: "forge-asset-interchange-manifest/v1" as const,
      asset_id: "adventurer.unit",
      revision_id: REVISION,
      manifest_sha256: MANIFEST_SHA,
      style_profile: {
        id: "cute_chibi_v1" as const,
        version: "1.0.0" as const,
        review: { status: "not_required" as const },
      },
      render_profile: {
        id: "fantasy.sprite.orthographic.v1" as const,
        version: "1.0.0" as const,
      },
      provenance: {
        source_kind: "project_generated" as const,
        workflow_reference: "evidence/public-mcp-workflow.json",
        ownership: "project_owned" as const,
        license_label: "project-owned",
      },
    },
    discovery: {
      tools: [
        {
          name: "get_interchange_manifest" as const,
          visibility: "public" as const,
          capability: "manifest_retrieval" as const,
          contract_ids: ["forge-asset-interchange-manifest/v1"] as const,
          revision_pinned: true as const,
        },
        {
          name: "get_interchange_artifact_chunk" as const,
          visibility: "public" as const,
          capability: "artifact_retrieval" as const,
          contract_ids: ["forge-asset-interchange-manifest/v1"] as const,
          revision_pinned: true as const,
          transfer: "chunked_or_mcp_resource" as const,
          record_kinds: ["artifact", "evidence"] as const,
        },
      ] as const,
    },
    acceptance: {
      contract_id: ACCEPTANCE.contract_id,
      binding_sha256:
        ACCEPTANCE.binding_sha256,
      prerequisite_track:
        ACCEPTANCE.prerequisite_track,
      scope:
        ACCEPTANCE.decision.scope,
    },
    records,
    verification: {
      record_count: records.length,
      chunk_count: 11,
      total_bytes: records.reduce((sum, record) => sum + record.byte_length, 0),
      chunk_digests_verified: true as const,
      reconstructed_digests_verified: true as const,
      exact_allowlist_verified: true as const,
    },
    blockers: ["delivery_resolution_review_evidence_missing"] as const,
  };
  const registry = {
    ...unsigned,
    registry_sha256: await sha256Bytes(
      new TextEncoder().encode(JSON.stringify(canonicalValue(unsigned))),
    ),
  };
  return {
    registry,
    files,
    registry_json: `${JSON.stringify(canonicalValue(registry), null, 2)}\n`,
  };
}

async function buildReview(
  staged: StagedForgeReplayDossier,
  status: "accepted_for_pack" | "transport_only" = "accepted_for_pack",
) {
  const api = await loadRegistryApi();
  expect(api.digestForgeDeliveryResolutionReview).toBeTypeOf("function");
  const artifacts = staged.registry.records
    .filter((record) => record.role === "directional_frame")
    .map((record) => ({
      id: record.id,
      direction: record.direction,
      sha256: record.sha256,
      natural_width: 128,
      natural_height: 128,
      display_width: 128,
      display_height: 128,
      overflow: false,
      verdict:
        status === "accepted_for_pack" ? "accepted" : "transport_verified",
    }));
  const unsigned = {
    contract_id: "pixel-delivery-resolution-review/v1",
    source: {
      contract_id: staged.registry.source.contract_id,
      asset_id: staged.registry.source.asset_id,
      revision_id: staged.registry.source.revision_id,
      manifest_sha256: staged.registry.source.manifest_sha256,
      staging_registry_sha256: staged.registry.registry_sha256,
    },
    review_scope: "static_directional_frames",
    status,
    reviewer: { kind: "human", id: "owner" },
    reviewed_at: "2026-07-22T00:00:00Z",
    artifacts,
    quality_debt: status === "accepted_for_pack" ? [] : ["thin-dark-e-w"],
  };
  return {
    ...unsigned,
    review_sha256: await api.digestForgeDeliveryResolutionReview(unsigned),
  };
}

describe("Forge immutable import registry", () => {
  it("keeps missing or transport-only review evidence pending", async () => {
    const api = await loadRegistryApi();
    expect(api.prepareForgeImportAdmission).toBeTypeOf("function");
    expect(api.admitForgeImportRegistry).toBeTypeOf("function");
    const staged = await buildStaged();
    expect(await api.prepareForgeImportAdmission(staged)).toMatchObject({
      status: "validated_pending_review",
      blockers: ["delivery_resolution_review_evidence_missing"],
    });
    const transportReview = await buildReview(staged, "transport_only");
    expect(
      await api.prepareForgeImportAdmission(staged, transportReview),
    ).toMatchObject({
      status: "validated_pending_review",
      blockers: ["delivery_resolution_review_not_accepted"],
    });
    await expect(
      api.admitForgeImportRegistry(staged, transportReview),
    ).rejects.toThrow(/delivery-resolution review.*not accepted/i);
  });

  it("projects accepted review into a deterministic immutable registry", async () => {
    const api = await loadRegistryApi();
    expect(api.admitForgeImportRegistry).toBeTypeOf("function");
    const staged = await buildStaged();
    const review = await buildReview(staged);
    const first = await api.admitForgeImportRegistry(staged, review);
    const second = await api.admitForgeImportRegistry(
      structuredClone(staged),
      structuredClone(review),
    );
    expect(first.registry).toMatchObject({
      contract_id: "pixel-forge-import-registry/v1",
      status: "admitted_static",
      source: staged.registry.source,
      staging_registry_sha256: staged.registry.registry_sha256,
      acceptance_binding_sha256:
        ACCEPTANCE.binding_sha256,
      delivery_review_sha256: review.review_sha256,
      verification: {
        record_count: 10,
        object_count: 10,
        education_member_count: 9,
        object_digests_verified: true,
      },
    });
    expect(first.registry.registry_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(second.registry_json).toBe(first.registry_json);
    expect(second.files).toEqual(first.files);
  });

  it("projects ordered deterministic EducationAppPackMember bindings", async () => {
    const api = await loadRegistryApi();
    expect(api.admitForgeImportRegistry).toBeTypeOf("function");
    expect(api.projectForgeEducationMembers).toBeTypeOf("function");
    const staged = await buildStaged();
    const admitted = await api.admitForgeImportRegistry(
      staged,
      await buildReview(staged),
    );
    const members = api.projectForgeEducationMembers(admitted.registry);
    expect(members).toHaveLength(9);
    expect(members.map(({ id }: { id: string }) => id)).toEqual([
      "forge.adventurer.unit.frame.n",
      "forge.adventurer.unit.frame.ne",
      "forge.adventurer.unit.frame.e",
      "forge.adventurer.unit.frame.se",
      "forge.adventurer.unit.frame.s",
      "forge.adventurer.unit.frame.sw",
      "forge.adventurer.unit.frame.w",
      "forge.adventurer.unit.frame.nw",
      "forge.adventurer.unit.model.glb",
    ]);
    expect(members[0]).toMatchObject({
      semantic_role: "directional_frame",
      media_type: "image/png",
      width: 128,
      height: 128,
      transparent: true,
      source: {
        kind: "forge",
        contract_id: "forge-asset-interchange-manifest/v1",
        asset_id: "adventurer.unit",
        revision_id: REVISION,
        manifest_sha256: MANIFEST_SHA,
        artifact_id: "frame.n",
        artifact_role: "directional_frame",
        direction: "N",
      },
    });
  });

  it("rejects acceptance, review, staged registry, and object drift", async () => {
    const api = await loadRegistryApi();
    expect(api.admitForgeImportRegistry).toBeTypeOf("function");
    const staged = await buildStaged();
    const review = await buildReview(staged);

    const acceptanceDrift = structuredClone(staged);
    (acceptanceDrift.registry.acceptance as { binding_sha256: string }).binding_sha256 = "0".repeat(64);
    await expect(
      api.admitForgeImportRegistry(acceptanceDrift, review),
    ).rejects.toThrow(/acceptance.*binding/i);

    const reviewDrift = structuredClone(review);
    reviewDrift.artifacts[0]!.sha256 = "0".repeat(64);
    await expect(
      api.admitForgeImportRegistry(staged, reviewDrift),
    ).rejects.toThrow(/review_sha256|artifact.*sha256|review.*digest/i);

    const registryDrift = structuredClone(staged);
    (registryDrift.registry.source as { revision_id: string }).revision_id = `revision.${"f".repeat(64)}`;
    await expect(
      api.admitForgeImportRegistry(registryDrift, review),
    ).rejects.toThrow(/staging registry.*digest/i);

    const objectDrift = structuredClone(staged);
    objectDrift.files[0]!.bytes[0] = objectDrift.files[0]!.bytes[0]! ^ 0xff;
    await expect(
      api.admitForgeImportRegistry(objectDrift, review),
    ).rejects.toThrow(/object.*digest|sha256/i);
  });

  it("rejects duplicate staged files that leave a registry record uncovered", async () => {
    const api = await loadRegistryApi();
    const staged = await buildStaged();
    const review = await buildReview(staged);
    const duplicatedFile = {
      ...staged,
      files: [staged.files[0], staged.files[0], ...staged.files.slice(2)],
    };
    await expect(
      api.admitForgeImportRegistry(duplicatedFile, review),
    ).rejects.toThrow(/duplicate.*object|exactly one|uncovered/i);
  });

  it("detaches admitted records and bytes from the mutable staged input", async () => {
    const api = await loadRegistryApi();
    const staged = await buildStaged();
    const review = await buildReview(staged);
    const admitted = await api.admitForgeImportRegistry(staged, review);
    const registryJson = admitted.registry_json;
    const recordId = admitted.registry.records[0].id;
    const firstByte = admitted.files[0].bytes[0];
    expect(admitted.registry.records).not.toBe(staged.registry.records);
    expect(admitted.files).not.toBe(staged.files);
    expect(admitted.files[0].bytes).not.toBe(staged.files[0]!.bytes);
    (staged.registry.records[0] as { id: string }).id =
      "mutated.after.admission";
    staged.files[0]!.bytes[0] = staged.files[0]!.bytes[0]! ^ 0xff;
    expect(admitted.registry.records[0].id).toBe(recordId);
    expect(admitted.files[0].bytes[0]).toBe(firstByte);
    expect(admitted.registry_json).toBe(registryJson);
    expect(JSON.parse(admitted.registry_json)).toEqual(admitted.registry);
  });
});
