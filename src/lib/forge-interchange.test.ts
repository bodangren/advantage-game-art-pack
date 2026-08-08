import { describe, expect, it } from "vitest";

import {
  FORGE_INTERCHANGE_CONTRACT_ID,
  ForgeInterchangeValidationError,
  assertForgeIngestionReady,
  canonicalizeForgeInterchangeManifest,
  digestForgeInterchangeManifest,
  negotiateForgeInterchangeContract,
  reconstructRetrievedForgeRecord,
  validateForgeMcpDiscoveryContract,
  validateForgeInterchangeManifest,
  validateRetrievedForgeChunkBinding,
} from "./forge-interchange";

const HEX_64 = "a".repeat(64);
const REVISION = `revision.${"1".repeat(64)}`;
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const GOLDEN_REVISION =
  "revision.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const GOLDEN_DIGEST =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const GOLDEN_MANIFEST_SHA256 =
  "f56c7a0c1fffe6555e35d8f47ca7ca418197e6f2c28328e30ac3c7d94fef2096";
const RAW_CHUNK_SHA256 =
  "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a";
const CORRUPT_CHUNK_SHA256 =
  "1571902abec0a45661de965dbe90cb0177b98c49fc58a5aabfa1edb6c678d972";
const FIRST_HALF_SHA256 =
  "a12871fee210fb8619291eaea194581cbd2531e4b23759d225f6806923f63222";
const SECOND_HALF_SHA256 =
  "0ce3940bebf2b22a5d2108ecf0c368a0541c7e3c45703f8540921b4eafc82947";

function unsignedManifest() {
  return {
    contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
    source: { asset_id: "adventurer", revision_id: REVISION },
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
      ...DIRECTIONS.map((direction) => ({
        id: `adventurer-${direction.toLowerCase()}`,
        classification: "source",
        role: "directional_frame",
        media_type: "image/png",
        byte_length: 128,
        sha256: HEX_64,
        width: 128,
        height: 128,
        transparent: true,
        revision_id: REVISION,
        reference: `artifacts/adventurer/${direction.toLowerCase()}.png`,
        direction,
      })),
      {
        id: "adventurer-glb",
        classification: "source",
        role: "glb",
        media_type: "model/gltf-binary",
        byte_length: 256,
        sha256: "b".repeat(64),
        revision_id: REVISION,
        reference: "artifacts/adventurer/model.glb",
      },
    ],
    evidence: [
      {
        id: "public-mcp-workflow",
        kind: "workflow_manifest",
        reference: "evidence/public-mcp-workflow.json",
        sha256: "d".repeat(64),
        byte_length: 64,
      },
      {
        id: "adventurer-review",
        kind: "delivery-resolution-review",
        reference: "evidence/adventurer/review.json",
        sha256: "c".repeat(64),
      },
    ],
  };
}

function goldenUnsignedManifest() {
  const base = unsignedManifest();
  return {
    ...base,
    source: { asset_id: "adventurer.rustic", revision_id: GOLDEN_REVISION },
    artifacts: [
      ...DIRECTIONS.map((direction) => ({
        id: `frame.${direction.toLowerCase()}`,
        classification: "source",
        role: "directional_frame",
        media_type: "image/png",
        byte_length: 128,
        sha256: GOLDEN_DIGEST,
        width: 128,
        height: 128,
        transparent: true,
        revision_id: GOLDEN_REVISION,
        reference: `artifacts/adventurer/${direction.toLowerCase()}.png`,
        direction,
      })),
      {
        id: "model.glb",
        classification: "source",
        role: "glb",
        media_type: "model/gltf-binary",
        byte_length: 512,
        sha256: GOLDEN_DIGEST,
        revision_id: GOLDEN_REVISION,
        reference: "artifacts/adventurer/adventurer.rustic.glb",
      },
      {
        id: "review.contact-sheet",
        classification: "derived",
        role: "contact_sheet",
        media_type: "image/png",
        byte_length: 256,
        sha256: GOLDEN_DIGEST,
        width: 1024,
        height: 128,
        transparent: false,
        revision_id: GOLDEN_REVISION,
        reference: "artifacts/adventurer/contact-sheet.png",
      },
    ],
    evidence: [
      { id: "render.manifest", kind: "render_manifest", reference: "evidence/render-manifest.json", sha256: GOLDEN_DIGEST },
      { id: "workflow.public-mcp", kind: "workflow", reference: "evidence/public-mcp-workflow.json", sha256: GOLDEN_DIGEST },
    ],
  };
}

async function signedManifest() {
  const unsigned = unsignedManifest();
  return {
    ...unsigned,
    manifest_sha256: await digestForgeInterchangeManifest(unsigned),
  };
}

async function retrievableManifest() {
  const manifest = await signedManifest();
  const value = {
    ...manifest,
    artifacts: manifest.artifacts.map((artifact, index) =>
      index === 0
        ? { ...artifact, byte_length: 4, sha256: RAW_CHUNK_SHA256 }
        : artifact,
    ),
    evidence: manifest.evidence.map((evidence, index) =>
      index === 0
        ? { ...evidence, byte_length: 4, sha256: RAW_CHUNK_SHA256 }
        : evidence,
    ),
  };
  value.manifest_sha256 = await digestForgeInterchangeManifest(value);
  return value;
}

function discoveryContract() {
  return {
    tools: [
      {
        name: "get_interchange_manifest",
        visibility: "public",
        capability: "manifest_retrieval",
        contract_ids: [FORGE_INTERCHANGE_CONTRACT_ID],
        revision_pinned: true,
      },
      {
        name: "get_interchange_artifact_chunk",
        visibility: "public",
        capability: "artifact_retrieval",
        contract_ids: [FORGE_INTERCHANGE_CONTRACT_ID],
        revision_pinned: true,
        transfer: "chunked_or_mcp_resource",
        record_kinds: ["artifact", "evidence"],
      },
    ],
  };
}

describe("forge interchange: version negotiation", () => {
  it("selects only the exact supported version", () => {
    expect(
      negotiateForgeInterchangeContract([FORGE_INTERCHANGE_CONTRACT_ID]),
    ).toBe(FORGE_INTERCHANGE_CONTRACT_ID);
  });

  it.each([
    [],
    ["forge-asset-interchange-manifest"],
    ["forge-asset-interchange-manifest/v2"],
    [FORGE_INTERCHANGE_CONTRACT_ID, FORGE_INTERCHANGE_CONTRACT_ID],
    "forge-asset-interchange-manifest/v1",
  ])("rejects unsupported, ambiguous, or unconstrained offers", (offered) => {
    expect(() => negotiateForgeInterchangeContract(offered)).toThrow(
      ForgeInterchangeValidationError,
    );
  });
});

describe("forge interchange: canonical signed manifest", () => {
  it("matches Forge shared v1 golden digest", async () => {
    expect(await digestForgeInterchangeManifest(goldenUnsignedManifest())).toBe(
      GOLDEN_MANIFEST_SHA256,
    );
  });

  it("sorts object keys, preserves array order, and omits only the digest field", async () => {
    const value = await signedManifest();
    const canonical = canonicalizeForgeInterchangeManifest(value);
    expect(canonical).not.toContain("manifest_sha256");
    expect(canonical).not.toContain("\n");
    expect(canonical.indexOf('"artifacts"')).toBeLessThan(
      canonical.indexOf('"contract_id"'),
    );
    expect(canonical.indexOf("adventurer-n")).toBeLessThan(
      canonical.indexOf("adventurer-glb"),
    );
    expect(await digestForgeInterchangeManifest(value)).toBe(
      value.manifest_sha256,
    );
  });

  it("rejects unknown fields and a mismatched manifest digest", async () => {
    const value = await signedManifest();
    await expect(
      validateForgeInterchangeManifest({ ...value, private_path: "/tmp/x" }),
    ).rejects.toThrow(/unexpected key/);
    await expect(
      validateForgeInterchangeManifest({ ...value, manifest_sha256: HEX_64 }),
    ).rejects.toThrow(/manifest_sha256 mismatch/);
  });

  it("accepts the exact closed v1 schema", async () => {
    const value = await signedManifest();
    await expect(validateForgeInterchangeManifest(value)).resolves.toEqual(value);
  });
});

describe("forge interchange: identity, provenance, and artifact rules", () => {
  it.each([
    "/tmp/artifact.png",
    "../artifact.png",
    "artifacts\\artifact.png",
    "https://forge.invalid/artifact.png",
    "file:///tmp/artifact.png",
  ])("rejects non-portable opaque retrieval references: %s", async (reference) => {
    const value = await signedManifest();
    const artifacts = value.artifacts.map((artifact, index) =>
      index === 0 ? { ...artifact, reference } : artifact,
    );
    const changed = { ...value, artifacts };
    changed.manifest_sha256 = await digestForgeInterchangeManifest(changed);
    await expect(validateForgeInterchangeManifest(changed)).rejects.toThrow(
      /portable retrieval reference/,
    );
  });

  it("keeps style profile distinct from render profile", async () => {
    const value = await signedManifest();
    const changed = { ...value, render_profile: value.style_profile };
    changed.manifest_sha256 = await digestForgeInterchangeManifest(changed);
    await expect(validateForgeInterchangeManifest(changed)).rejects.toThrow(
      /render_profile/,
    );
  });

  it("requires recorded originality evidence for heroic style", async () => {
    const value = await signedManifest();
    const changed = {
      ...value,
      style_profile: {
        id: "heroic_stylized_v1",
        version: "1.0.0",
        review: {
          status: "recorded",
          attestation: "copied-franchise",
          evidence_reference: "evidence/originality.json",
        },
      },
    };
    changed.manifest_sha256 = await digestForgeInterchangeManifest(changed);
    await expect(validateForgeInterchangeManifest(changed)).rejects.toThrow(
      /original-project-owned-no-franchise-copy/,
    );
  });

  it("requires a source 128x128 directional PNG and source GLB pair", async () => {
    const value = await signedManifest();
    const changed = { ...value, artifacts: value.artifacts.slice(1) };
    changed.manifest_sha256 = await digestForgeInterchangeManifest(changed);
    await expect(validateForgeInterchangeManifest(changed)).rejects.toThrow(
      /directional_frame/,
    );
  });

  it("rejects stale source revisions and source/derived misclassification", async () => {
    const value = await signedManifest();
    const artifacts = value.artifacts.map((artifact, index) =>
      index === 0
        ? { ...artifact, revision_id: "revision.2222222222222222222222222222222222222222222222222222222222222222", classification: "derived" }
        : artifact,
    );
    const changed = { ...value, artifacts };
    changed.manifest_sha256 = await digestForgeInterchangeManifest(changed);
    await expect(validateForgeInterchangeManifest(changed)).rejects.toThrow(
      /revision_id|classification/,
    );
  });
  it("rejects style and render profile version drift", async () => {
    const value = await signedManifest();
    for (const changed of [
      { ...value, style_profile: { ...value.style_profile, version: "9.0.0" } },
      { ...value, render_profile: { ...value.render_profile, version: "9.0.0" } },
    ]) {
      changed.manifest_sha256 = await digestForgeInterchangeManifest(changed);
      await expect(validateForgeInterchangeManifest(changed)).rejects.toThrow(/version/);
    }
  });

  it.each([
    "ftp://example.com/source",
    "https://user:secret.com/source",
    "https://",
    `https://example.com/${"x".repeat(2049)}`,
  ])("rejects invalid provenance source_url: %s", async (source_url) => {
    const value = await signedManifest();
    const changed = { ...value, provenance: { ...value.provenance, source_url } };
    changed.manifest_sha256 = await digestForgeInterchangeManifest(changed);
    await expect(validateForgeInterchangeManifest(changed)).rejects.toThrow(
      /source_url/,
    );
  });

  it("accepts a credential-free HTTP(S) provenance URL", async () => {
    const value = await signedManifest();
    const changed = { ...value, provenance: { ...value.provenance, source_url: "https://example.com/source" } };
    changed.manifest_sha256 = await digestForgeInterchangeManifest(changed);
    await expect(validateForgeInterchangeManifest(changed)).resolves.toEqual(changed);
  });

  it("binds workflow and heroic review references to digest-pinned evidence", async () => {
    const value = await signedManifest();
    const missingWorkflow = {
      ...value,
      provenance: { ...value.provenance, workflow_reference: "evidence/missing.json" },
    };
    missingWorkflow.manifest_sha256 = await digestForgeInterchangeManifest(missingWorkflow);
    await expect(validateForgeInterchangeManifest(missingWorkflow)).rejects.toThrow(/workflow_reference.*evidence/i);

    const missingHeroic = {
      ...value,
      style_profile: {
        id: "heroic_stylized_v1",
        version: "1.0.0",
        review: {
          status: "recorded",
          attestation: "original-project-owned-no-franchise-copy",
          evidence_reference: "evidence/missing-originality.json",
        },
      },
    };
    missingHeroic.manifest_sha256 = await digestForgeInterchangeManifest(missingHeroic);
    await expect(validateForgeInterchangeManifest(missingHeroic)).rejects.toThrow(/evidence_reference.*evidence/i);
  });

  it("enforces executable PNG transparency rules", async () => {
    const value = await signedManifest();
    const missingFrameTransparency = {
      ...value.artifacts[0]!,
      transparent: undefined,
    };
    const missingFrame = { ...value, artifacts: [missingFrameTransparency, ...value.artifacts.slice(1)] };
    missingFrame.manifest_sha256 = await digestForgeInterchangeManifest(missingFrame);
    await expect(validateForgeInterchangeManifest(missingFrame)).rejects.toThrow(/transparent/);

    const derivedWithoutTransparency = {
      id: "review.contact-sheet",
      classification: "derived",
      role: "contact_sheet",
      media_type: "image/png",
      byte_length: 256,
      sha256: HEX_64,
      width: 1024,
      height: 128,
      revision_id: REVISION,
      reference: "artifacts/adventurer/contact-sheet.png",
    };
    const invalidDerived = { ...value, artifacts: [...value.artifacts, derivedWithoutTransparency] };
    invalidDerived.manifest_sha256 = await digestForgeInterchangeManifest(invalidDerived);
    await expect(validateForgeInterchangeManifest(invalidDerived)).rejects.toThrow(/transparent/);

    const glbIndex = value.artifacts.findIndex(({ role }) => role === "glb");
    const glbHasTransparency = { ...value.artifacts[glbIndex]!, transparent: false };
    const invalidGlb = { ...value, artifacts: value.artifacts.map((artifact, index) => index === glbIndex ? glbHasTransparency : artifact) };
    invalidGlb.manifest_sha256 = await digestForgeInterchangeManifest(invalidGlb);
    await expect(validateForgeInterchangeManifest(invalidGlb)).rejects.toThrow(/transparent/);
  });
});

describe("forge interchange: public MCP admission gate", () => {
  it("validates exact future public retrieval tool contracts", () => {
    expect(validateForgeMcpDiscoveryContract(discoveryContract())).toEqual({
      manifest_tool: "get_interchange_manifest",
      artifact_tool: "get_interchange_artifact_chunk",
      contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
    });
  });

  it("keeps live ingestion unavailable even for a valid discovery contract", () => {
    expect(() => assertForgeIngestionReady(discoveryContract())).toThrow(
      /unavailable|not accepted/,
    );
  });

  it("does not let caller-supplied accepted state authorize ingestion", () => {
    expect(() =>
      assertForgeIngestionReady({ ...discoveryContract(), accepted: true }),
    ).toThrow();
  });

  it.each([
    { mutate: (gate: ReturnType<typeof discoveryContract>) => { gate.tools[0]!.name = "arbitrary_manifest_tool"; }, message: /get_interchange_manifest/ },
    { mutate: (gate: ReturnType<typeof discoveryContract>) => { gate.tools[0]!.visibility = "private"; }, message: /public/ },
    { mutate: (gate: ReturnType<typeof discoveryContract>) => { gate.tools[0]!.revision_pinned = false; }, message: /revision-pinned/ },
    { mutate: (gate: ReturnType<typeof discoveryContract>) => { gate.tools[0]!.contract_ids = []; }, message: /contract/ },
    { mutate: (gate: ReturnType<typeof discoveryContract>) => { gate.tools.pop(); }, message: /artifact_retrieval/ },
    { mutate: (gate: ReturnType<typeof discoveryContract>) => { gate.tools[1]!.record_kinds = ["artifact"]; }, message: /record_kinds/ },
  ])("fails closed for unusable MCP discovery", ({ mutate, message }) => {
    const gate = discoveryContract();
    mutate(gate);
    expect(() => validateForgeMcpDiscoveryContract(gate)).toThrow(message);
  });

  it("rejects private/source-coupled boundary declarations", () => {
    expect(() =>
      validateForgeMcpDiscoveryContract({
        ...discoveryContract(),
        source_import: "../fantasy-asset-forge/src/index.ts",
      }),
    ).toThrow(/unexpected key/);
  });
});

describe("forge interchange: retrieval chunk response checks", () => {
  function artifactChunk() {
    return {
      record_kind: "artifact",
      asset_id: "adventurer",
      revision_id: REVISION,
      artifact_id: "adventurer-n",
      artifact_sha256: RAW_CHUNK_SHA256,
      chunk_sha256: RAW_CHUNK_SHA256,
      offset: 0,
      length: 4,
      total: 4,
      bytes_base64: "AQIDBA==",
    };
  }

  function evidenceChunk() {
    return {
      record_kind: "evidence",
      asset_id: "adventurer",
      revision_id: REVISION,
      artifact_id: "public-mcp-workflow",
      artifact_sha256: RAW_CHUNK_SHA256,
      chunk_sha256: RAW_CHUNK_SHA256,
      offset: 0,
      length: 4,
      total: 4,
      bytes_base64: "AQIDBA==",
    };
  }

  it("binds an artifact chunk response to the signed manifest", async () => {
    const manifest = await retrievableManifest();
    await expect(
      validateRetrievedForgeChunkBinding(manifest, artifactChunk()),
    ).resolves.toEqual(manifest.artifacts[0]);
  });

  it("binds an evidence chunk response using the shared artifact field names", async () => {
    const manifest = await retrievableManifest();
    await expect(
      validateRetrievedForgeChunkBinding(manifest, evidenceChunk()),
    ).resolves.toEqual(manifest.evidence[0]);
  });

  it("accepts optional positive evidence byte_length without changing the omitted golden vector", async () => {
    const manifest = await signedManifest();
    expect(manifest.evidence[0]).toMatchObject({ byte_length: 64 });
    expect(await digestForgeInterchangeManifest(goldenUnsignedManifest())).toBe(
      GOLDEN_MANIFEST_SHA256,
    );

    const invalid = {
      ...manifest,
      evidence: manifest.evidence.map((item, index) =>
        index === 0 ? { ...item, byte_length: 0 } : item,
      ),
    };
    invalid.manifest_sha256 = await digestForgeInterchangeManifest(invalid);
    await expect(validateForgeInterchangeManifest(invalid)).rejects.toThrow(
      /evidence.*byte_length/,
    );
  });

  it.each([
    {
      mutate: (chunk: ReturnType<typeof artifactChunk>) => {
        chunk.revision_id =
          "revision.2222222222222222222222222222222222222222222222222222222222222222";
      },
      error: /revision_id/,
    },
    {
      mutate: (chunk: ReturnType<typeof artifactChunk>) => {
        chunk.artifact_sha256 = "d".repeat(64);
      },
      error: /artifact_sha256/,
    },
    {
      mutate: (chunk: ReturnType<typeof artifactChunk>) => {
        chunk.total = 5;
      },
      error: /total/,
    },
    {
      mutate: (chunk: ReturnType<typeof artifactChunk>) => {
        chunk.length = 3;
      },
      error: /decoded length/,
    },
  ])("rejects stale, mismatched, or malformed artifact chunks", async ({ mutate, error }) => {
    const manifest = await retrievableManifest();
    const chunk = artifactChunk();
    mutate(chunk);
    await expect(validateRetrievedForgeChunkBinding(manifest, chunk)).rejects.toThrow(error);
  });

  it("rejects corrupt response bytes before returning the binding", async () => {
    const manifest = await retrievableManifest();
    const chunk = { ...artifactChunk(), bytes_base64: "AQIDBQ==" };
    await expect(validateRetrievedForgeChunkBinding(manifest, chunk)).rejects.toThrow(
      /chunk_sha256/,
    );
  });

  it("rejects a reconstructed stream that differs from the signed manifest digest", async () => {
    const manifest = await retrievableManifest();
    const chunk = {
      ...artifactChunk(),
      bytes_base64: "AQIDBQ==",
      chunk_sha256: CORRUPT_CHUNK_SHA256,
    };
    await expect(reconstructRetrievedForgeRecord(manifest, [chunk])).rejects.toThrow(
      /reconstructed.*sha256/,
    );
  });

  it("reconstructs a complete byte stream only after manifest digest verification", async () => {
    const manifest = await retrievableManifest();
    await expect(
      reconstructRetrievedForgeRecord(manifest, [artifactChunk()]),
    ).resolves.toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it("reconstructs ordered bytes from multiple out-of-order chunks", async () => {
    const manifest = await retrievableManifest();
    const first = {
      ...artifactChunk(),
      length: 2,
      bytes_base64: "AQI=",
      chunk_sha256: FIRST_HALF_SHA256,
    };
    const second = {
      ...artifactChunk(),
      offset: 2,
      length: 2,
      bytes_base64: "AwQ=",
      chunk_sha256: SECOND_HALF_SHA256,
    };
    await expect(
      reconstructRetrievedForgeRecord(manifest, [second, first]),
    ).resolves.toEqual(new Uint8Array([1, 2, 3, 4]));

    await expect(
      reconstructRetrievedForgeRecord(manifest, [{ ...second, offset: 1 }, first]),
    ).rejects.toThrow(/gap or overlap/);
  });

  it("rejects evidence retrieval when the signed evidence omits byte_length", async () => {
    const manifest = await signedManifest();
    const chunk = evidenceChunk();
    chunk.artifact_id = "adventurer-review";
    chunk.artifact_sha256 = "c".repeat(64);
    await expect(validateRetrievedForgeChunkBinding(manifest, chunk)).rejects.toThrow(
      /evidence.*byte_length/,
    );
  });

  it("rejects caller-controlled record kind confusion", async () => {
    const manifest = await retrievableManifest();
    await expect(
      validateRetrievedForgeChunkBinding(manifest, {
        ...artifactChunk(),
        record_kind: "evidence",
      }),
    ).rejects.toThrow(/unknown evidence|record_kind/);
  });
});
