import { describe, expect, it } from "vitest";

import {
  EDUCATION_APP_PACK_PROFILE_ID,
  EDUCATION_APP_PACK_PROFILE_V2_ID,
  EducationAppPackValidationError,
  canonicalizeEducationAppPackProfile,
  digestEducationAppPackProfile,
  validateEducationAppPackProfile,
  validateEducationAppPackProfileV2,
} from "./education-app-pack-profile";
import { FORGE_INTERCHANGE_CONTRACT_ID } from "./forge-interchange";
import {
  FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID,
  FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID,
  PIXEL_FORGE_FIVE_CLIP_STAGING_PLAN_ID,
} from "./fantasy-asset-forge-five-clip-ingestion";

const REVISION =
  "revision.0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const MANIFEST_DIGEST =
  "1111111111111111111111111111111111111111111111111111111111111111";
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
type MutablePackMember = {
  media_type: string;
  width?: number;
  height?: number;
  transparent?: boolean;
  source: {
    kind: string;
    direction?: (typeof DIRECTIONS)[number];
  } & Record<string, unknown>;
};
const FRAME_DIGESTS = DIRECTIONS.map((_, index) =>
  (index + 2).toString(16).repeat(64),
);
const GLB_DIGEST =
  "4444444444444444444444444444444444444444444444444444444444444444";
const PIXEL_DIGEST =
  "5555555555555555555555555555555555555555555555555555555555555555";
const PIXEL_SOURCE_DIGEST =
  "6666666666666666666666666666666666666666666666666666666666666666";
const GOLDEN_CANONICAL_INPUT = {
  members: [{ source: { kind: "forge", artifact_id: "frame.n" }, id: "member.n" }],
  profile_sha256: "excluded-from-canonical-form",
  contract_id: EDUCATION_APP_PACK_PROFILE_ID,
};
const GOLDEN_CANONICAL_JSON =
  '{"contract_id":"education-app-pack-profile/v1","members":[{"id":"member.n","source":{"artifact_id":"frame.n","kind":"forge"}}]}';
const GOLDEN_CANONICAL_SHA256 =
  "27df4dbfeaf24d406a0824180eb3588f4f1e36e83985ce0190a794c5b726724e";

function unsignedProfile() {
  const members = [
    {
      id: "pixel.background",
      semantic_role: "scene.background",
      media_type: "image/svg+xml",
      byte_length: 300,
      sha256: PIXEL_DIGEST,
      source: {
        kind: "pixel_native",
        source_id: "composition.background",
        source_sha256: PIXEL_SOURCE_DIGEST,
      },
    },
    ...DIRECTIONS.map((direction, index) => ({
      id: "forge.hero." + direction.toLowerCase(),
      semantic_role: "avatar.directional-frame",
      media_type: "image/png",
      byte_length: 100 + index,
      sha256: FRAME_DIGESTS[index]!,
      width: 128,
      height: 128,
      transparent: true,
      source: {
        kind: "forge",
        contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
        asset_id: "adventurer.rustic",
        revision_id: REVISION,
        manifest_sha256: MANIFEST_DIGEST,
        artifact_id: "frame." + direction.toLowerCase(),
        artifact_sha256: FRAME_DIGESTS[index]!,
        artifact_role: "directional_frame",
        direction,
      },
    })),
    {
      id: "forge.hero.model",
      semantic_role: "avatar.model",
      media_type: "model/gltf-binary",
      byte_length: 400,
      sha256: GLB_DIGEST,
      source: {
        kind: "forge",
        contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
        asset_id: "adventurer.rustic",
        revision_id: REVISION,
        manifest_sha256: MANIFEST_DIGEST,
        artifact_id: "model.glb",
        artifact_sha256: GLB_DIGEST,
        artifact_role: "glb",
      },
    },
  ];
  const memberIds = members.map(({ id }) => id);
  return {
    contract_id: EDUCATION_APP_PACK_PROFILE_ID,
    pack_id: "theme-pack.contract-fixture",
    members,
    role_cardinalities: [
      { semantic_role: "scene.background", minimum: 1, maximum: 1 },
      { semantic_role: "avatar.directional-frame", minimum: 8, maximum: 8 },
      { semantic_role: "avatar.model", minimum: 1, maximum: 1 },
    ],
    completeness: {
      required_member_ids: [...memberIds],
      required_derived_profile_ids: ["mixed-runtime-v1"],
    },
    derived_export_profiles: [
      {
        id: "mixed-runtime-v1",
        output_contract_id: "runtime-export-profile/v1",
        member_ids: [...memberIds],
        budgets: {
          max_artifact_count: 10,
          max_total_bytes: 2_048,
        },
      },
    ],
    budgets: {
      max_artifact_count: 16,
      max_total_bytes: 4_096,
      max_single_artifact_bytes: 2_048,
    },
  };
}

async function signedProfile() {
  const unsigned = unsignedProfile();
  return {
    ...unsigned,
    profile_sha256: await digestEducationAppPackProfile(unsigned),
  };
}

async function resign(value: ReturnType<typeof unsignedProfile> & { profile_sha256: string }) {
  value.profile_sha256 = await digestEducationAppPackProfile(value);
  return value;
}

describe("education app pack: exact contract and deterministic profile", () => {
  it("accepts the closed v1 contract without imposing a downstream role ontology", async () => {
    const value = await signedProfile();
    value.members[0]!.semantic_role = "future.product-specific-surface";
    value.role_cardinalities[0]!.semantic_role = "future.product-specific-surface";
    await resign(value);

    await expect(validateEducationAppPackProfile(value)).resolves.toEqual(value);
  });

  it("sorts object keys, omits only profile_sha256, and preserves member order", async () => {
    const value = await signedProfile();
    const canonical = canonicalizeEducationAppPackProfile(value);
    expect(canonical).not.toContain("profile_sha256");
    expect(canonical.indexOf('"budgets"')).toBeLessThan(canonical.indexOf('"contract_id"'));
    expect(canonical.indexOf("pixel.background")).toBeLessThan(
      canonical.indexOf("forge.hero.n"),
    );
    expect(await digestEducationAppPackProfile(value)).toBe(value.profile_sha256);
  });

  it("pins the exact canonical JSON and literal SHA-256 golden vector", async () => {
    expect(canonicalizeEducationAppPackProfile(GOLDEN_CANONICAL_INPUT)).toBe(
      GOLDEN_CANONICAL_JSON,
    );
    expect(await digestEducationAppPackProfile(GOLDEN_CANONICAL_INPUT)).toBe(
      GOLDEN_CANONICAL_SHA256,
    );
  });

  it("produces the same digest for equivalent object key order", async () => {
    const value = unsignedProfile();
    const reordered = {
      budgets: value.budgets,
      derived_export_profiles: value.derived_export_profiles,
      completeness: value.completeness,
      role_cardinalities: value.role_cardinalities,
      members: value.members,
      pack_id: value.pack_id,
      contract_id: value.contract_id,
    };
    expect(await digestEducationAppPackProfile(reordered)).toBe(
      await digestEducationAppPackProfile(value),
    );
  });

  it("makes ordered membership part of the deterministic digest", async () => {
    const value = unsignedProfile();
    const reordered = {
      ...value,
      members: [value.members[1]!, value.members[0]!, ...value.members.slice(2)],
    };
    expect(await digestEducationAppPackProfile(reordered)).not.toBe(
      await digestEducationAppPackProfile(value),
    );
  });

  it.each([
    {
      change: async () => ({ ...(await signedProfile()), contract_id: "education-app-pack-profile/v2" }),
      error: /contract_id.*education-app-pack-profile\/v1/,
    },
    {
      change: async () => ({ ...(await signedProfile()), internal_registry_path: "/tmp/imports" }),
      error: /unexpected key.*internal_registry_path/,
    },
    {
      change: async () => ({ ...(await signedProfile()), profile_sha256: "f".repeat(64) }),
      error: /profile_sha256 mismatch/,
    },
  ])("fails closed for contract/schema/digest drift", async ({ change, error }) => {
    await expect(validateEducationAppPackProfile(await change())).rejects.toThrow(error);
  });
});

describe("education app pack: declared role cardinality and completeness", () => {
  it("allows repeated semantic roles within their declared bounds", async () => {
    const validated = await validateEducationAppPackProfile(await signedProfile());
    expect(
      validated.members.filter(
        ({ semantic_role }) => semantic_role === "avatar.directional-frame",
      ),
    ).toHaveLength(8);
  });

  it.each([
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.role_cardinalities = value.role_cardinalities.slice(1);
      },
      error: /undeclared semantic role.*scene\.background/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.role_cardinalities[1]!.minimum = 9;
        value.role_cardinalities[1]!.maximum = 9;
      },
      error: /avatar\.directional-frame.*minimum 9.*actual 8/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.role_cardinalities[1]!.minimum = 0;
        value.role_cardinalities[1]!.maximum = 7;
      },
      error: /avatar\.directional-frame.*maximum 7.*actual 8/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.role_cardinalities[1]!.minimum = 9;
        value.role_cardinalities[1]!.maximum = 8;
      },
      error: /minimum.*maximum/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.role_cardinalities.push({ ...value.role_cardinalities[0]! });
      },
      error: /duplicate role cardinality.*scene\.background/,
    },
  ])("reports actionable cardinality failures", async ({ mutate, error }) => {
    const value = await signedProfile();
    mutate(value);
    await resign(value);
    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(error);
  });

  it.each([
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.completeness.required_member_ids[0] = "missing.member";
      },
      error: /required member.*missing\.member/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.completeness.required_derived_profile_ids[0] = "missing-export";
      },
      error: /required derived profile.*missing-export/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.derived_export_profiles[0]!.member_ids =
          value.derived_export_profiles[0]!.member_ids.slice(0, -1);
      },
      error: /mixed-runtime-v1.*missing required member.*forge\.hero\.model/,
    },
  ])("reports incomplete membership and derived profiles", async ({ mutate, error }) => {
    const value = await signedProfile();
    mutate(value);
    await resign(value);
    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(error);
  });
});

describe("education app pack: member identity and exact Forge pins", () => {
  it.each([
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.members[1]!.id = "pixel.background";
      },
      error: /duplicate member id.*pixel\.background/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.members[2]!.source = { ...value.members[1]!.source };
      },
      error: /duplicate Forge artifact identity.*frame\.n/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        const source = value.members[1]!.source;
        if (source.kind === "forge") source.revision_id = "revision.stale";
      },
      error: /revision_id.*pinned/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        const source = value.members[1]!.source;
        if (source.kind === "forge") source.manifest_sha256 = "not-a-digest";
      },
      error: /manifest_sha256/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        const source = value.members[1]!.source;
        if (source.kind === "forge") source.artifact_sha256 = GLB_DIGEST;
      },
      error: /artifact_sha256.*member sha256/,
    },
  ])("rejects duplicate or stale/mismatched source pins", async ({ mutate, error }) => {
    const value = await signedProfile();
    mutate(value);
    await resign(value);
    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(error);
  });

  it("requires one manifest digest for each Forge asset revision group", async () => {
    const value = await signedProfile();
    const source = value.members[2]!.source;
    if (source.kind === "forge") source.manifest_sha256 = "a".repeat(64);
    await resign(value);

    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(
      /Forge manifest group.*single manifest_sha256/,
    );
  });

  it("rejects caller-declared completeness that omits a Forge direction", async () => {
    const value = await signedProfile();
    value.members = value.members.filter(({ id }) => id !== "forge.hero.nw");
    value.completeness.required_member_ids =
      value.completeness.required_member_ids.filter((id) => id !== "forge.hero.nw");
    value.derived_export_profiles[0]!.member_ids =
      value.derived_export_profiles[0]!.member_ids.filter((id) => id !== "forge.hero.nw");
    value.role_cardinalities[1]!.minimum = 7;
    value.role_cardinalities[1]!.maximum = 7;
    await resign(value);

    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(
      /Forge manifest group.*missing direction NW/,
    );
  });

  it("rejects caller-declared completeness that omits the Forge GLB", async () => {
    const value = await signedProfile();
    value.members = value.members.filter(({ id }) => id !== "forge.hero.model");
    value.completeness.required_member_ids =
      value.completeness.required_member_ids.filter((id) => id !== "forge.hero.model");
    value.derived_export_profiles[0]!.member_ids =
      value.derived_export_profiles[0]!.member_ids.filter((id) => id !== "forge.hero.model");
    value.role_cardinalities =
      value.role_cardinalities.filter(({ semantic_role }) => semantic_role !== "avatar.model");
    await resign(value);

    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(
      /Forge manifest group.*at least one GLB/,
    );
  });

  it("rejects duplicate Forge direction bindings even under unique member roles", async () => {
    const value = await signedProfile();
    const source = (value.members[2]! as MutablePackMember).source;
    if (source.kind === "forge") source.direction = "N";
    await resign(value);

    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(
      /Forge manifest group.*duplicate direction N/,
    );
  });

  it("applies PNG shape and transparency requirements only to Forge members", async () => {
    const value = await signedProfile();
    expect(value.members[0]).toMatchObject({
      media_type: "image/svg+xml",
      source: { kind: "pixel_native" },
    });
    expect(value.members[0]).not.toHaveProperty("width");
    expect(value.members[0]).not.toHaveProperty("transparent");
    await expect(validateEducationAppPackProfile(value)).resolves.toEqual(value);
  });

  it.each([
    {
      mutate: (member: MutablePackMember) => {
        delete member.transparent;
      },
      error: /Forge PNG.*transparent/,
    },
    {
      mutate: (member: MutablePackMember) => {
        delete member.width;
      },
      error: /Forge PNG.*width.*height/,
    },
    {
      mutate: (member: MutablePackMember) => {
        member.width = 127;
      },
      error: /Forge PNG.*exactly 128x128/,
    },
    {
      mutate: (member: MutablePackMember) => {
        member.height = 129;
      },
      error: /Forge PNG.*exactly 128x128/,
    },
    {
      mutate: (member: MutablePackMember) => {
        member.transparent = false;
      },
      error: /Forge PNG.*transparent.*true/,
    },
    {
      mutate: (member: MutablePackMember) => {
        member.media_type = "image/svg+xml";
      },
      error: /Forge member.*PNG or GLB/,
    },
  ])("enforces Forge-only PNG requirements", async ({ mutate, error }) => {
    const value = await signedProfile();
    mutate(value.members[1]! as MutablePackMember);
    await resign(value);
    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(error);
  });

  it("rejects raster fields on a Forge GLB", async () => {
    const value = await signedProfile();
    (value.members.at(-1)! as MutablePackMember).width = 128;
    await resign(value);
    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(
      /Forge GLB.*raster/,
    );
  });
});

describe("education app pack: derived profiles and budgets", () => {
  it.each([
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.derived_export_profiles[0]!.member_ids[0] = "unknown.member";
      },
      error: /derived profile.*unknown member.*unknown\.member/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.derived_export_profiles[0]!.member_ids[1] = "pixel.background";
      },
      error: /derived profile.*duplicate member.*pixel\.background/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        const ids = value.derived_export_profiles[0]!.member_ids;
        [ids[0], ids[1]] = [ids[1]!, ids[0]!];
      },
      error: /derived profile.*membership order/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.derived_export_profiles[0]!.budgets.max_artifact_count = 9;
      },
      error: /mixed-runtime-v1.*artifact count budget.*10.*9/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.derived_export_profiles[0]!.budgets.max_total_bytes = 1_527;
      },
      error: /mixed-runtime-v1.*byte budget.*1528.*1527/,
    },
  ])("rejects incomplete, ambiguous, or over-budget derived profiles", async ({ mutate, error }) => {
    const value = await signedProfile();
    mutate(value);
    await resign(value);
    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(error);
  });

  it.each([
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.budgets.max_artifact_count = 9;
      },
      error: /pack artifact count budget.*10.*9/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.budgets.max_total_bytes = 1_527;
      },
      error: /pack total byte budget.*1528.*1527/,
    },
    {
      mutate: (value: Awaited<ReturnType<typeof signedProfile>>) => {
        value.budgets.max_single_artifact_bytes = 399;
      },
      error: /forge\.hero\.model.*single-artifact byte budget.*400.*399/,
    },
  ])("rejects pack-level count and byte budget overruns", async ({ mutate, error }) => {
    const value = await signedProfile();
    mutate(value);
    await resign(value);
    await expect(validateEducationAppPackProfile(value)).rejects.toThrow(error);
  });
});

const TEMPORAL_BASELINE = [
  { action: "idle", samples: 4 },
  { action: "walk_forward", samples: 6 },
  { action: "walk_right", samples: 6 },
  { action: "attack", samples: 6 },
  { action: "receive_damage", samples: 4 },
] as const;

function temporalDigest(seed: number): string {
  return seed.toString(16).padStart(2, "0").repeat(32);
}

function temporalIdentity() {
  return {
    kind: "forge_temporal",
    contract_id: FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID,
    authoring_contract_id: FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID,
    staging_plan_contract_id: PIXEL_FORGE_FIVE_CLIP_STAGING_PLAN_ID,
    batch_id: "batch.hero",
    asset_id: "guard.reference-ready",
    revision_id: "revision." + temporalDigest(1),
    morphology_revision_id: "morphology." + temporalDigest(2),
    rig_signature: "rig." + temporalDigest(3),
    equipment_signature: "equipment." + temporalDigest(4),
    delivery_id: "delivery." + temporalDigest(5),
    manifest_sha256: temporalDigest(6),
    staging_plan_sha256: temporalDigest(7),
  } as const;
}

function unsignedTemporalProfile(): any {
  const common = temporalIdentity();
  const members: any[] = [
    {
      id: "pixel.background.temporal",
      semantic_role: "scene.background",
      media_type: "image/svg+xml",
      byte_length: 300,
      sha256: temporalDigest(8),
      source: {
        kind: "pixel_native",
        source_id: "composition.background.temporal",
        source_sha256: temporalDigest(9),
      },
    },
  ];
  const clips: any[] = [];
  let sequence = 0;
  for (const [clipIndex, clip] of TEMPORAL_BASELINE.entries()) {
    const clipId = "clip." + temporalDigest(20 + clipIndex);
    const framePlanId = "frame-plan." + temporalDigest(30 + clipIndex);
    const frameMemberIds: string[] = [];
    for (let frameIndex = 0; frameIndex < clip.samples; frameIndex += 1) {
      const id =
        "forge.hero." + clip.action + ".frame." + frameIndex.toString();
      const digest = temporalDigest(50 + sequence);
      frameMemberIds.push(id);
      members.push({
        id,
        semantic_role: "avatar.animation-frame",
        media_type: "image/png",
        byte_length: 100 + sequence,
        sha256: digest,
        width: 128,
        height: 128,
        transparent: true,
        source: {
          ...common,
          artifact_id:
            "artifact.hero." + clip.action + ".frame." + frameIndex.toString(),
          artifact_sha256: digest,
          artifact_role: "source_frame",
          action: clip.action,
          clip_id: clipId,
          frame_plan_id: framePlanId,
          direction: "S",
          sequence,
          sample_time_ms: frameIndex * 100,
        },
      });
      sequence += 1;
    }
    const sheetId = "forge.hero." + clip.action + ".sheet";
    const sheetDigest = temporalDigest(100 + clipIndex);
    members.push({
      id: sheetId,
      semantic_role: "avatar.pose-sheet",
      media_type: "image/png",
      byte_length: 1_000 + clipIndex,
      sha256: sheetDigest,
      width: clip.samples * 128,
      height: 128,
      transparent: true,
      source: {
        ...common,
        artifact_id: "artifact.hero." + clip.action + ".sheet",
        artifact_sha256: sheetDigest,
        artifact_role: "derived_pose_sheet",
        action: clip.action,
        clip_id: clipId,
        frame_plan_id: framePlanId,
      },
    });
    clips.push({
      action: clip.action,
      clip_id: clipId,
      frame_plan_id: framePlanId,
      direction: "S",
      frame_member_ids: frameMemberIds,
      pose_sheet_member_id: sheetId,
    });
  }
  const terminalArtifacts = [
    {
      id: "forge.hero.atlas",
      semantic_role: "avatar.sprite-atlas",
      media_type: "image/png",
      byte_length: 5_000,
      sha256: temporalDigest(110),
      width: 3_328,
      height: 128,
      transparent: true,
      role: "derived_atlas",
    },
    {
      id: "forge.hero.model",
      semantic_role: "avatar.model",
      media_type: "model/gltf-binary",
      byte_length: 10_000,
      sha256: temporalDigest(111),
      role: "source_glb",
    },
    {
      id: "forge.hero.animation-bundle",
      semantic_role: "avatar.animation-bundle",
      media_type: "application/json",
      byte_length: 2_000,
      sha256: temporalDigest(112),
      role: "animation_bundle",
    },
  ];
  for (const artifact of terminalArtifacts) {
    members.push({
      id: artifact.id,
      semantic_role: artifact.semantic_role,
      media_type: artifact.media_type,
      byte_length: artifact.byte_length,
      sha256: artifact.sha256,
      ...(artifact.width === undefined ? {} : { width: artifact.width }),
      ...(artifact.height === undefined ? {} : { height: artifact.height }),
      ...(artifact.transparent === undefined
        ? {}
        : { transparent: artifact.transparent }),
      source: {
        ...common,
        artifact_id: "artifact." + artifact.id,
        artifact_sha256: artifact.sha256,
        artifact_role: artifact.role,
      },
    });
  }
  const memberIds = members.map(({ id }) => id);
  return {
    contract_id: EDUCATION_APP_PACK_PROFILE_V2_ID,
    pack_id: "theme-pack.temporal-fixture",
    members,
    temporal_batches: [
      {
        id: common.batch_id,
        clips,
        atlas_member_id: "forge.hero.atlas",
        source_glb_member_id: "forge.hero.model",
        animation_bundle_member_id: "forge.hero.animation-bundle",
      },
    ],
    role_cardinalities: [
      { semantic_role: "scene.background", minimum: 1, maximum: 1 },
      { semantic_role: "avatar.animation-frame", minimum: 26, maximum: 26 },
      { semantic_role: "avatar.pose-sheet", minimum: 5, maximum: 5 },
      { semantic_role: "avatar.sprite-atlas", minimum: 1, maximum: 1 },
      { semantic_role: "avatar.model", minimum: 1, maximum: 1 },
      { semantic_role: "avatar.animation-bundle", minimum: 1, maximum: 1 },
    ],
    completeness: {
      required_member_ids: memberIds,
      required_derived_profile_ids: ["mixed-runtime-v2"],
    },
    derived_export_profiles: [
      {
        id: "mixed-runtime-v2",
        output_contract_id: "runtime-export-profile/v2",
        member_ids: memberIds,
        budgets: {
          max_artifact_count: 40,
          max_total_bytes: 100_000,
        },
      },
    ],
    staging_admission: {
      status: "validated_unadmitted",
      model_acceptance: "pending",
      visual_acceptance: "pending",
      playback_acceptance: "pending",
      pack_admission: "not_evaluated",
      shipping: false,
    },
    budgets: {
      max_artifact_count: 40,
      max_total_bytes: 100_000,
      max_single_artifact_bytes: 20_000,
    },
  };
}

async function signedTemporalProfile(): Promise<any> {
  const unsigned = unsignedTemporalProfile();
  return {
    ...unsigned,
    profile_sha256: await digestEducationAppPackProfile(unsigned),
  };
}

async function resignTemporalProfile(value: any): Promise<void> {
  value.profile_sha256 = await digestEducationAppPackProfile(value);
}

describe("education app pack v2: exact five-clip temporal staging", () => {
  it("accepts all 26 frames, five sheets, atlas, source GLB, and animation bundle without claiming admission", async () => {
    const value = await signedTemporalProfile();
    const validated = await validateEducationAppPackProfileV2(value);

    expect(validated.temporal_batches[0]?.clips.map(({ action }) => action)).toEqual(
      TEMPORAL_BASELINE.map(({ action }) => action),
    );
    expect(
      validated.members.filter(
        ({ source }) =>
          source.kind === "forge_temporal" &&
          source.artifact_role === "source_frame",
      ),
    ).toHaveLength(26);
    expect(validated.staging_admission).toEqual({
      status: "validated_unadmitted",
      model_acceptance: "pending",
      visual_acceptance: "pending",
      playback_acceptance: "pending",
      pack_admission: "not_evaluated",
      shipping: false,
    });
  });

  it("keeps the complete static eight-direction v1 contract backward-compatible", async () => {
    const value = await signedProfile();
    await expect(validateEducationAppPackProfile(value)).resolves.toEqual(value);
    await expect(validateEducationAppPackProfileV2(value)).rejects.toThrow(
      /contract_id.*education-app-pack-profile\/v2/,
    );
  });

  it.each([
    ["forge.hero.idle.frame.0", /missing Forge temporal member.*idle\.frame\.0/],
    ["forge.hero.idle.sheet", /missing Forge temporal member.*idle\.sheet/],
    ["forge.hero.atlas", /missing Forge temporal member.*hero\.atlas/],
    ["forge.hero.model", /missing Forge temporal member.*hero\.model/],
    [
      "forge.hero.animation-bundle",
      /missing Forge temporal member.*animation-bundle/,
    ],
  ])("rejects a missing required temporal member %s", async (id, error) => {
    const value = await signedTemporalProfile();
    value.members = value.members.filter((member: any) => member.id !== id);
    await resignTemporalProfile(value);
    await expect(validateEducationAppPackProfileV2(value)).rejects.toThrow(error);
  });

  it("rejects an incomplete or reordered baseline instead of accepting caller-declared semantics", async () => {
    const incomplete = await signedTemporalProfile();
    incomplete.temporal_batches[0].clips.pop();
    await resignTemporalProfile(incomplete);
    await expect(validateEducationAppPackProfileV2(incomplete)).rejects.toThrow(
      /exactly five baseline clips/,
    );

    const reordered = await signedTemporalProfile();
    [
      reordered.temporal_batches[0].clips[0],
      reordered.temporal_batches[0].clips[1],
    ] = [
      reordered.temporal_batches[0].clips[1],
      reordered.temporal_batches[0].clips[0],
    ];
    await resignTemporalProfile(reordered);
    await expect(validateEducationAppPackProfileV2(reordered)).rejects.toThrow(
      /clips\[0\]\.action must be idle/,
    );
  });

  it.each([
    {
      mutate: (value: any) => {
        value.members.find(
          ({ id }: any) => id === "forge.hero.idle.frame.0",
        ).source.action = "attack";
      },
      error: /clip\/action\/frame-plan\/direction binding mismatch/,
    },
    {
      mutate: (value: any) => {
        value.members.find(
          ({ id }: any) => id === "forge.hero.walk_forward.frame.0",
        ).source.sequence = 99;
      },
      error: /sequence must be 4/,
    },
    {
      mutate: (value: any) => {
        value.members.find(
          ({ id }: any) => id === "forge.hero.idle.frame.0",
        ).source.artifact_sha256 = temporalDigest(200);
      },
      error: /artifact_sha256 does not match member sha256/,
    },
    {
      mutate: (value: any) => {
        value.members.find(
          ({ id }: any) => id === "forge.hero.idle.sheet",
        ).source.delivery_id = "delivery." + temporalDigest(201);
      },
      error: /one immutable source identity/,
    },
  ])("rejects inconsistent temporal identity or bindings", async ({ mutate, error }) => {
    const value = await signedTemporalProfile();
    mutate(value);
    await resignTemporalProfile(value);
    await expect(validateEducationAppPackProfileV2(value)).rejects.toThrow(error);
  });

  it("rejects unbound temporal members and admission/shipping overclaims", async () => {
    const unbound = await signedTemporalProfile();
    const extra = structuredClone(
      unbound.members.find(({ id }: any) => id === "forge.hero.atlas"),
    );
    extra.id = "forge.hero.atlas.unbound";
    extra.sha256 = temporalDigest(210);
    extra.source.artifact_id = "artifact.forge.hero.atlas.unbound";
    extra.source.artifact_sha256 = extra.sha256;
    unbound.members.push(extra);
    await resignTemporalProfile(unbound);
    await expect(validateEducationAppPackProfileV2(unbound)).rejects.toThrow(
      /unbound or missing artifact members/,
    );

    const shipping = await signedTemporalProfile();
    shipping.staging_admission.shipping = true;
    await resignTemporalProfile(shipping);
    await expect(validateEducationAppPackProfileV2(shipping)).rejects.toThrow(
      /shipping must be false/,
    );
  });
});

describe("education app pack: error type", () => {
  it("uses a specific fail-closed validation error", async () => {
    await expect(validateEducationAppPackProfile(null)).rejects.toBeInstanceOf(
      EducationAppPackValidationError,
    );
  });
});
