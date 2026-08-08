import { describe, expect, it } from "vitest";

import {
  DUAL_THEME_ANIMATION_MEMBER_ID,
  DUAL_THEME_CAPABILITY_FAMILIES,
  DUAL_THEME_PACK_MANIFEST_ID,
  DUAL_THEME_PACK_MANIFEST_V2_ID,
  DUAL_THEME_PACK_REQUIREMENTS_ID,
  DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
  DUAL_THEME_TEMPORAL_BINDING_V2_ID,
  DualThemePackValidationError,
  canonicalizeDualThemePackManifest,
  digestDualThemePackManifest,
  digestDualThemePackManifestV2,
  digestDualThemePackRequirements,
  digestDualThemePackRequirementsV2,
  validateDualThemePackManifest,
  validateDualThemePackManifestV2,
  validateDualThemePackRequirements,
  validateDualThemePackRequirementsV2,
  type DualThemeCapabilityRequirement,
  type DualThemePackManifest,
  type DualThemePackManifestV2,
  type DualThemePackMember,
  type DualThemePackRequirements,
  type DualThemeCapabilityRequirementV2,
  type DualThemePackRequirementsV2,
} from "./dual-theme-pack-contract";
import {
  compileDualThemeAssetDemandCatalog,
  digestDualThemeAssetDemandCatalog,
  type DualThemeAssetDemandCatalog,
  type DualThemeAssetDemandCompilation,
} from "./dual-theme-asset-demand-catalog";

const THEME_IDS = ["chibi_quest", "riven_lands"] as const;

function hexDigest(seed: number): string {
  return seed.toString(16).padStart(2, "0").repeat(32);
}

function revision(seed: number): string {
  return `revision.${hexDigest(seed)}`;
}

const CAPABILITIES: readonly DualThemeCapabilityRequirement[] = [
  {
    id: "character.hero",
    family: "character",
    usage_contexts: ["gameplay", "roster"],
    required_states: ["idle"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.directional/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "static_artifact",
  },
  {
    id: "equipment.primary",
    family: "equipment",
    usage_contexts: ["gameplay"],
    required_states: ["equipped"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.directional/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "static_artifact",
  },
  {
    id: "monster.enemy",
    family: "monster",
    usage_contexts: ["gameplay"],
    required_states: ["idle"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.directional/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "static_artifact",
  },
  {
    id: "pose_clip.hero",
    family: "pose_clip",
    usage_contexts: ["gameplay"],
    required_states: ["attack", "idle"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.animation.pose-sheet/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "temporal_animation",
  },
  {
    id: "presentation.cover",
    family: "presentation",
    usage_contexts: ["loading", "marketing"],
    required_states: [],
    required_variants: ["landscape"],
    physical_contract_reference: "presentation.cover/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "static_artifact",
  },
  {
    id: "prop.pickup",
    family: "prop",
    usage_contexts: ["gameplay"],
    required_states: ["available", "collected"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.state-bank/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "static_artifact",
  },
  {
    id: "tile_environment.ground",
    family: "tile_environment",
    usage_contexts: ["gameplay", "world"],
    required_states: [],
    required_variants: ["base"],
    physical_contract_reference: "tile.grid/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "static_artifact",
  },
  {
    id: "ui.hud",
    family: "ui",
    usage_contexts: ["gameplay"],
    required_states: ["default"],
    required_variants: ["desktop"],
    physical_contract_reference: "ui.hud/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "static_artifact",
  },
  {
    id: "vfx.impact",
    family: "vfx",
    usage_contexts: ["feedback", "gameplay"],
    required_states: ["active"],
    required_variants: ["base"],
    physical_contract_reference: "vfx.sequence/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "static_artifact",
  },
];

function unsignedRequirements(
  capabilities: readonly DualThemeCapabilityRequirement[] = CAPABILITIES,
): Omit<DualThemePackRequirements, "requirements_sha256"> {
  return {
    contract_id: DUAL_THEME_PACK_REQUIREMENTS_ID,
    program_id: "reading_advantage.dual_theme",
    theme_ids: THEME_IDS,
    capabilities,
  };
}

async function signedRequirements(
  capabilities: readonly DualThemeCapabilityRequirement[] = CAPABILITIES,
): Promise<DualThemePackRequirements> {
  const unsigned = unsignedRequirements(capabilities);
  return {
    ...unsigned,
    requirements_sha256: await digestDualThemePackRequirements(unsigned),
  };
}

function provenance(sourceOwner: "forge" | "pixel", themeId: string, capabilityId: string) {
  return {
    source_kind: "project_generated" as const,
    ownership: "project_owned" as const,
    license_label: "project-owned",
    evidence_reference: `evidence/${sourceOwner}/${themeId}/${capabilityId}.json`,
  };
}

function packMember(
  capability: DualThemeCapabilityRequirement,
  themeId: string,
  themeIndex: number,
  capabilityIndex: number,
): DualThemePackMember {
  const seed = 20 + themeIndex * 80 + capabilityIndex * 6;
  const revisionId = revision(140 + themeIndex * 20 + capabilityIndex);
  const temporalRole: "pose_sheet" | "sprite_atlas" =
    capability.physical_contract_reference === "sprite.animation.sprite-atlas/v1"
      ? "sprite_atlas"
      : "pose_sheet";
  const base = {
    id: `member.${themeId}.${capability.id}`,
    capability_id: capability.id,
    family: capability.family,
    usage_contexts: capability.usage_contexts,
    required_states: capability.required_states,
    required_variants: capability.required_variants,
    physical_contract_reference: capability.physical_contract_reference,
    source_owner: capability.source_owner,
    artifact: {
      artifact_id: `artifact.${themeId}.${capability.id}`,
      revision_id: revisionId,
      sha256: hexDigest(seed),
      reference: `artifacts/${themeId}/${capability.id}.png`,
    },
    media_type: "image/png",
    role: capability.delivery_kind === "temporal_animation" ? temporalRole : `${capability.family}.asset`,
    byte_length: 1_000 + seed,
    width: 128,
    height: 128,
    transparent: true,
    provenance: provenance(capability.source_owner, themeId, capability.id),
    review: {
      requirement: capability.review_requirement,
      disposition: "accepted" as const,
      evidence_reference: `reviews/${themeId}/${capability.id}.json`,
    },
  };
  if (capability.delivery_kind !== "temporal_animation") return base;
  return {
    ...base,
    animation: {
      contract_id: DUAL_THEME_ANIMATION_MEMBER_ID,
      source_frames: capability.required_states.map((state, frameIndex) => ({
        frame_id: `${state}.${frameIndex.toString().padStart(3, "0")}`,
        state,
        artifact_id: `frame.${themeId}.${state}.${frameIndex}`,
        revision_id: revisionId,
        sha256: hexDigest(seed + frameIndex + 1),
        reference: `artifacts/${themeId}/${capability.id}/${state}.${frameIndex}.png`,
        media_type: "image/png" as const,
        width: 128,
        height: 128,
        transparent: true as const,
        role: "animation_frame" as const,
      })),
      source_glb: {
        artifact_id: `model.${themeId}.${capability.id}`,
        revision_id: revisionId,
        sha256: hexDigest(seed + 4),
        reference: `artifacts/${themeId}/${capability.id}/source.glb`,
        media_type: "model/gltf-binary" as const,
        role: "glb" as const,
      },
      metadata: {
        artifact_id: `metadata.${themeId}.${capability.id}`,
        revision_id: revisionId,
        sha256: hexDigest(seed + 5),
        reference: `artifacts/${themeId}/${capability.id}/clips.json`,
        media_type: "application/json" as const,
        role: "clip_metadata" as const,
      },
      derived_surfaces: [
        {
          ...base.artifact,
          media_type: "image/png" as const,
          role: temporalRole,
          width: base.width,
          height: base.height,
          transparent: true as const,
        },
      ],
    },
  };
}

function unsignedManifest(
  requirements: DualThemePackRequirements,
): Omit<DualThemePackManifest, "manifest_sha256"> {
  const themes = requirements.theme_ids.map((themeId, themeIndex) => ({
    theme_id: themeId,
    members: requirements.capabilities.map((capability, capabilityIndex) =>
      packMember(capability, themeId, themeIndex, capabilityIndex),
    ),
  })) as unknown as DualThemePackManifest["themes"];
  return {
    contract_id: DUAL_THEME_PACK_MANIFEST_ID,
    program_id: requirements.program_id,
    requirements: {
      contract_id: DUAL_THEME_PACK_REQUIREMENTS_ID,
      requirements_sha256: requirements.requirements_sha256,
    },
    themes,
  };
}

async function signedManifest(
  requirements: DualThemePackRequirements,
): Promise<DualThemePackManifest> {
  const unsigned = unsignedManifest(requirements);
  return {
    ...unsigned,
    manifest_sha256: await digestDualThemePackManifest(unsigned),
  };
}

async function resignRequirements(value: any): Promise<void> {
  value.requirements_sha256 = await digestDualThemePackRequirements(value);
}

async function resignManifest(value: any): Promise<void> {
  value.manifest_sha256 = await digestDualThemePackManifest(value);
}

describe("dual-theme requirements", () => {
  it("accepts a strict extensible semantic contract covering every pack family", async () => {
    const requirements = await signedRequirements();
    const validated = await validateDualThemePackRequirements(requirements);

    expect(new Set(validated.capabilities.map(({ family }) => family))).toEqual(
      new Set(DUAL_THEME_CAPABILITY_FAMILIES),
    );
    expect(validated.theme_ids).toEqual(["chibi_quest", "riven_lands"]);
  });

  it("accepts additive capabilities without freezing a roster or layout", async () => {
    const extra: DualThemeCapabilityRequirement = {
      ...CAPABILITIES.find(({ id }) => id === "prop.pickup")!,
      id: "prop.quest_item",
      required_states: ["available", "used"],
      supersedes_capability_id: "legacy.quest_item",
    };
    const capabilities = [...CAPABILITIES, extra].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
    const requirements = await signedRequirements(capabilities);
    const manifest = await signedManifest(requirements);

    await expect(validateDualThemePackManifest(manifest, requirements)).resolves.toEqual(
      manifest,
    );
  });

  it("canonicalizes object key order and binds ordered arrays into the digest", async () => {
    const unsigned = unsignedRequirements();
    const reordered = {
      capabilities: unsigned.capabilities,
      theme_ids: unsigned.theme_ids,
      program_id: unsigned.program_id,
      contract_id: unsigned.contract_id,
    };
    expect(await digestDualThemePackRequirements(reordered)).toBe(
      await digestDualThemePackRequirements(unsigned),
    );

    const signed: any = structuredClone(await signedRequirements());
    signed.theme_ids.reverse();
    await resignRequirements(signed);
    await expect(validateDualThemePackRequirements(signed)).rejects.toThrow(
      /theme_ids.*canonical lexicographic ordering/,
    );
  });

  it("rejects unknown fields, duplicate capabilities, and missing family coverage", async () => {
    const unknown: any = structuredClone(await signedRequirements());
    unknown.internal_layout = { columns: 12 };
    await resignRequirements(unknown);
    await expect(validateDualThemePackRequirements(unknown)).rejects.toThrow(
      /unexpected key.*internal_layout/,
    );

    const duplicate: any = structuredClone(await signedRequirements());
    duplicate.capabilities.splice(1, 0, structuredClone(duplicate.capabilities[0]));
    await resignRequirements(duplicate);
    await expect(validateDualThemePackRequirements(duplicate)).rejects.toThrow(
      /duplicate id character\.hero/,
    );

    const missingFamily = CAPABILITIES.filter(({ family }) => family !== "vfx");
    await expect(
      validateDualThemePackRequirements(await signedRequirements(missingFamily)),
    ).rejects.toThrow(/missing required family vfx/);
  });
});

const CAPABILITIES_V2: readonly DualThemeCapabilityRequirementV2[] = [
  {
    id: "audio.ambience",
    family: "audio",
    usage_demands: [
      {
        usage_context: "world",
        basis: "observed_unaccepted",
        evidence_reference: "observations/t10/audio-usage.json",
      },
    ],
    required_states: [],
    required_variants: ["loop"],
    physical_contract_reference: "audio.loop/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "temporal_artifact",
    media_class: "audio",
    execution_contracts: [],
    demand_reference: "demands/audio/ambience.json",
    temporal_requirement: {
      media_class: "audio",
      signature_contract_reference: "temporal.audio-signature/v1",
      signature_reference: "signatures/audio/ambience.json",
      signature_sha256: hexDigest(10),
      required_states: [],
    },
  },
  {
    id: "character.hero",
    family: "character",
    usage_demands: [
      {
        usage_context: "roster",
        basis: "authored_requirement",
        evidence_reference: "requirements/character/hero.json",
      },
    ],
    required_states: ["idle"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.directional/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "static_artifact",
    media_class: "visual",
    execution_contracts: [],
    demand_reference: "demands/characters/hero.json",
  },
  {
    id: "equipment.primary",
    family: "equipment",
    usage_demands: [
      {
        usage_context: "gameplay",
        basis: "authored_requirement",
        evidence_reference: "requirements/equipment/primary.json",
      },
    ],
    required_states: ["equipped"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.directional/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "static_artifact",
    media_class: "visual",
    execution_contracts: [],
    demand_reference: "demands/equipment/primary.json",
  },
  {
    id: "monster.enemy",
    family: "monster",
    usage_demands: [
      {
        usage_context: "gameplay",
        basis: "authored_requirement",
        evidence_reference: "requirements/monster/enemy.json",
      },
    ],
    required_states: ["idle"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.directional/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "static_artifact",
    media_class: "visual",
    execution_contracts: [],
    demand_reference: "demands/monsters/enemy.json",
  },
  {
    id: "pose_clip.hero",
    family: "pose_clip",
    usage_demands: [
      {
        usage_context: "gameplay",
        basis: "authored_requirement",
        evidence_reference: "requirements/pose_clip/hero.json",
      },
    ],
    required_states: ["attack", "idle"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.animation.pose-sheet-or-atlas/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "temporal_artifact",
    media_class: "visual",
    execution_contracts: [],
    demand_reference: "demands/pose-clips/hero.json",
    temporal_requirement: {
      media_class: "visual",
      signature_contract_reference: "forge.temporal-signature/v1",
      signature_reference: "signatures/forge/pose-clip-hero.json",
      signature_sha256: hexDigest(11),
      required_states: ["attack", "idle"],
    },
  },
  {
    id: "presentation.cover",
    family: "presentation",
    usage_demands: [
      {
        usage_context: "loading",
        basis: "authored_requirement",
        evidence_reference: "requirements/presentation/loading.json",
      },
    ],
    required_states: [],
    required_variants: ["landscape"],
    physical_contract_reference: "presentation.cover/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "static_artifact",
    media_class: "visual",
    execution_contracts: [
      {
        kind: "crop_focal_derivation",
        contract_reference: "presentation.crop-focal/v1",
        evidence_reference: "requirements/presentation/crop-focal.json",
      },
    ],
    demand_reference: "demands/presentation/cover.json",
  },
  {
    id: "projectile.primary",
    family: "projectile",
    usage_demands: [
      {
        usage_context: "combat",
        basis: "observed_unaccepted",
        evidence_reference: "observations/t9/projectile-usage.json",
      },
    ],
    required_states: ["flight", "impact"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.projectile/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "temporal_artifact",
    media_class: "visual",
    execution_contracts: [],
    demand_reference: "demands/projectiles/primary.json",
    temporal_requirement: {
      media_class: "visual",
      signature_contract_reference: "forge.temporal-signature/v1",
      signature_reference: "signatures/forge/projectile-primary.json",
      signature_sha256: hexDigest(12),
      required_states: ["flight", "impact"],
    },
  },
  {
    id: "prop.torch",
    family: "prop",
    usage_demands: [
      {
        usage_context: "world",
        basis: "observed_unaccepted",
        evidence_reference: "observations/t8/animated-prop.json",
      },
    ],
    required_states: ["burning"],
    required_variants: ["base"],
    physical_contract_reference: "sprite.state-bank/v1",
    source_owner: "forge",
    review_requirement: "reference_convergence",
    delivery_kind: "temporal_artifact",
    media_class: "visual",
    execution_contracts: [],
    demand_reference: "demands/props/torch.json",
    temporal_requirement: {
      media_class: "visual",
      signature_contract_reference: "forge.temporal-signature/v1",
      signature_reference: "signatures/forge/prop-torch.json",
      signature_sha256: hexDigest(13),
      required_states: ["burning"],
    },
  },
  {
    id: "tile_environment.ground",
    family: "tile_environment",
    usage_demands: [
      {
        usage_context: "world",
        basis: "authored_requirement",
        evidence_reference: "requirements/environment/world.json",
      },
    ],
    required_states: [],
    required_variants: ["base"],
    physical_contract_reference: "tile.grid/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "static_artifact",
    media_class: "visual",
    execution_contracts: [
      {
        kind: "tiling_adjacency",
        contract_reference: "environment.tiling-adjacency/v1",
        evidence_reference: "requirements/environment/tiling-adjacency.json",
      },
    ],
    demand_reference: "demands/environments/ground.json",
  },
  {
    id: "ui.panel",
    family: "ui",
    usage_demands: [
      {
        usage_context: "gameplay",
        basis: "authored_requirement",
        evidence_reference: "requirements/ui/gameplay.json",
      },
    ],
    required_states: ["default"],
    required_variants: ["desktop"],
    physical_contract_reference: "ui.panel/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "static_artifact",
    media_class: "visual",
    execution_contracts: [
      {
        kind: "nine_slice_text_safe_area",
        contract_reference: "ui.nine-slice-text-safe-area/v1",
        evidence_reference: "requirements/ui/panel-execution.json",
      },
    ],
    demand_reference: "demands/ui/panel.json",
  },
  {
    id: "vfx.impact",
    family: "vfx",
    usage_demands: [
      {
        usage_context: "feedback",
        basis: "observed_unaccepted",
        evidence_reference: "observations/t9/vfx-impact.json",
      },
    ],
    required_states: ["active"],
    required_variants: ["base"],
    physical_contract_reference: "vfx.sequence/v1",
    source_owner: "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: "temporal_artifact",
    media_class: "visual",
    execution_contracts: [],
    demand_reference: "demands/vfx/impact.json",
    temporal_requirement: {
      media_class: "visual",
      signature_contract_reference: "temporal.visual-signature/v1",
      signature_reference: "signatures/vfx/impact.json",
      signature_sha256: hexDigest(14),
      required_states: ["active"],
    },
  },
];

async function signedRequirementsV2(
  capabilities: readonly DualThemeCapabilityRequirementV2[] = CAPABILITIES_V2,
): Promise<DualThemePackRequirementsV2> {
  const unsigned = {
    contract_id: DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
    program_id: "reading_advantage.dual_theme",
    theme_ids: THEME_IDS,
    capabilities,
  } as const;
  return {
    ...unsigned,
    requirements_sha256: await digestDualThemePackRequirementsV2(unsigned),
  };
}

describe("dual-theme requirements v2", () => {
  it("keeps family extensible and temporality orthogonal to semantic family", async () => {
    const validated = await validateDualThemePackRequirementsV2(
      await signedRequirementsV2(),
    );

    expect(validated.capabilities.map(({ family }) => family)).toContain("audio");
    expect(validated.capabilities.map(({ family }) => family)).toContain("projectile");
    expect(
      validated.capabilities
        .filter(({ delivery_kind }) => delivery_kind === "temporal_artifact")
        .map(({ family }) => family),
    ).toEqual(["audio", "pose_clip", "projectile", "prop", "vfx"]);
    expect(
      validated.capabilities.find(({ id }) => id === "prop.torch")
        ?.temporal_requirement?.signature_contract_reference,
    ).toBe("forge.temporal-signature/v1");
  });

  it("carries provenance-linked usage and executable surface contracts", async () => {
    const validated = await validateDualThemePackRequirementsV2(
      await signedRequirementsV2(),
    );

    expect(
      validated.capabilities.find(({ family }) => family === "tile_environment")
        ?.execution_contracts[0]?.kind,
    ).toBe("tiling_adjacency");
    expect(
      validated.capabilities.find(({ family }) => family === "ui")
        ?.execution_contracts[0]?.kind,
    ).toBe("nine_slice_text_safe_area");
    expect(
      validated.capabilities.find(({ family }) => family === "presentation")
        ?.execution_contracts[0]?.kind,
    ).toBe("crop_focal_derivation");
    expect(
      validated.capabilities
        .flatMap(({ usage_demands }) => usage_demands)
        .some(({ basis }) => basis === "observed_unaccepted"),
    ).toBe(true);
  });

  it("fails closed on temporal, provenance, and canonical-order drift", async () => {
    const missingTemporal: any = structuredClone(await signedRequirementsV2());
    delete missingTemporal.capabilities.find(
      ({ family }: { family: string }) => family === "projectile",
    ).temporal_requirement;
    missingTemporal.requirements_sha256 =
      await digestDualThemePackRequirementsV2(missingTemporal);
    await expect(validateDualThemePackRequirementsV2(missingTemporal)).rejects.toThrow(
      /temporal_requirement is required/,
    );

    const unsafeEvidence: any = structuredClone(await signedRequirementsV2());
    unsafeEvidence.capabilities[0].usage_demands[0].evidence_reference =
      "../downstream/guess.json";
    unsafeEvidence.requirements_sha256 =
      await digestDualThemePackRequirementsV2(unsafeEvidence);
    await expect(validateDualThemePackRequirementsV2(unsafeEvidence)).rejects.toThrow(
      /portable relative reference/,
    );

    const reordered: any = structuredClone(await signedRequirementsV2());
    reordered.capabilities.reverse();
    reordered.requirements_sha256 =
      await digestDualThemePackRequirementsV2(reordered);
    await expect(validateDualThemePackRequirementsV2(reordered)).rejects.toThrow(
      /canonical capability-id ordering/,
    );
  });

  it("enforces core completeness, provenance namespaces, execution semantics, and Forge signatures", async () => {
    const missingCore = CAPABILITIES_V2.filter(
      ({ family }) => family !== "character",
    );
    await expect(
      validateDualThemePackRequirementsV2(
        await signedRequirementsV2(missingCore),
      ),
    ).rejects.toThrow(/missing required core family character/);

    const wrongProvenance: any = structuredClone(await signedRequirementsV2());
    wrongProvenance.capabilities[0].usage_demands[0].evidence_reference =
      "requirements/audio/guess.json";
    wrongProvenance.requirements_sha256 =
      await digestDualThemePackRequirementsV2(wrongProvenance);
    await expect(
      validateDualThemePackRequirementsV2(wrongProvenance),
    ).rejects.toThrow(/must start with observations\//);

    const missingExecution: any = structuredClone(await signedRequirementsV2());
    missingExecution.capabilities.find(
      ({ family }: { family: string }) => family === "ui",
    ).execution_contracts = [];
    missingExecution.requirements_sha256 =
      await digestDualThemePackRequirementsV2(missingExecution);
    await expect(
      validateDualThemePackRequirementsV2(missingExecution),
    ).rejects.toThrow(/requires nine_slice_text_safe_area/);

    const wrongSignature: any = structuredClone(await signedRequirementsV2());
    wrongSignature.capabilities.find(
      ({ family }: { family: string }) => family === "projectile",
    ).temporal_requirement.signature_contract_reference =
      "temporal.visual-signature/v1";
    wrongSignature.requirements_sha256 =
      await digestDualThemePackRequirementsV2(wrongSignature);
    await expect(
      validateDualThemePackRequirementsV2(wrongSignature),
    ).rejects.toThrow(/Forge temporal artifacts require/);

    const mismatchedStates: any = structuredClone(await signedRequirementsV2());
    mismatchedStates.capabilities.find(
      ({ family }: { family: string }) => family === "prop",
    ).temporal_requirement.required_states = [];
    mismatchedStates.requirements_sha256 =
      await digestDualThemePackRequirementsV2(mismatchedStates);
    await expect(
      validateDualThemePackRequirementsV2(mismatchedStates),
    ).rejects.toThrow(/required_states must match/);
  });
});

const CATALOG_THEMES_V2 = [
    {
      id: "chibi_quest",
      display_name: "Chibi Quest",
      audience: "younger_learners",
    },
    {
      id: "riven_lands",
      display_name: "Riven Lands",
      audience: "older_learners",
    },
] as const;

async function compiledManifestInputsV2(): Promise<{
  catalog: DualThemeAssetDemandCatalog;
  compilation: DualThemeAssetDemandCompilation;
}> {
  const unsigned = {
    contract_id: "dual-theme-asset-demand-catalog/v2" as const,
    catalog_id: "reading_advantage.dual_theme",
    program_id: "reading_advantage.dual_theme",
    themes: CATALOG_THEMES_V2,
    demands: CAPABILITIES_V2.map((capability) => ({
      ...capability,
      theme_scope: "mirrored" as const,
    })),
  };
  const catalog = {
    ...unsigned,
    catalog_sha256: await digestDualThemeAssetDemandCatalog(unsigned),
  };
  return {
    catalog,
    compilation: await compileDualThemeAssetDemandCatalog(catalog),
  };
}

function packArtifactV2(
  capability: DualThemeCapabilityRequirementV2,
  themeId: string,
  capabilityIndex: number,
  themeIndex: number,
  kind: "source" | "derived",
) {
  const seed =
    40 + capabilityIndex * 4 + themeIndex * CAPABILITIES_V2.length * 4 +
    (kind === "derived" ? 1 : 0);
  const extension = capability.media_class === "audio" ? "ogg" : "png";
  return {
    artifact_id: `${kind}.${themeId}.${capability.id}`,
    revision_id: revision(40 + themeIndex * 20 + capabilityIndex),
    sha256: hexDigest(seed),
    reference: `artifacts/${themeId}/${capability.id}/${kind}.${extension}`,
    media_type: capability.media_class === "audio" ? "audio/ogg" : "image/png",
    role: `${kind}.asset`,
    byte_length: 2_000 + seed,
    states: capability.required_states,
    variants: capability.required_variants,
  };
}

function packMemberV2(
  capability: DualThemeCapabilityRequirementV2,
  themeId: string,
  capabilityIndex: number,
  themeIndex: number,
) {
  const temporalRequirement = capability.temporal_requirement;
  return {
    id: `member.v2.${themeId}.${capability.id}`,
    capability_id: capability.id,
    family: capability.family,
    physical_contract_reference: capability.physical_contract_reference,
    media_class: capability.media_class,
    required_states: capability.required_states,
    required_variants: capability.required_variants,
    execution_contracts: capability.execution_contracts,
    source_artifacts: [
      packArtifactV2(
        capability,
        themeId,
        capabilityIndex,
        themeIndex,
        "source",
      ),
    ],
    derived_artifacts: [
      packArtifactV2(
        capability,
        themeId,
        capabilityIndex,
        themeIndex,
        "derived",
      ),
    ],
    provenance: provenance(capability.source_owner, themeId, capability.id),
    review: {
      requirement: capability.review_requirement,
      disposition: "accepted" as const,
      evidence_reference: `reviews/${themeId}/${capability.id}.json`,
    },
    ...(temporalRequirement === undefined
      ? {}
      : {
          temporal: {
            contract_id: DUAL_THEME_TEMPORAL_BINDING_V2_ID,
            media_class: temporalRequirement.media_class,
            signature_contract_reference:
              temporalRequirement.signature_contract_reference,
            requirement_signature_reference:
              temporalRequirement.signature_reference,
            signature_artifact: {
              artifact_id: `signature.${themeId}.${capability.id}`,
              revision_id: revision(
                40 + themeIndex * 20 + capabilityIndex,
              ),
              sha256: temporalRequirement.signature_sha256,
              reference: `artifacts/${themeId}/${capability.id}/temporal-signature.json`,
              media_type: "application/json" as const,
              role: "temporal_signature" as const,
              byte_length: 512,
            },
            covered_states: temporalRequirement.required_states,
          },
        }),
  };
}

function unsignedManifestV2(
  compilation: DualThemeAssetDemandCompilation,
): Omit<DualThemePackManifestV2, "manifest_sha256"> {
  const { requirements } = compilation;
  const themes = requirements.theme_ids.map((themeId, themeIndex) => ({
    theme_id: themeId,
    members: requirements.capabilities.map((capability, capabilityIndex) =>
      packMemberV2(capability, themeId, capabilityIndex, themeIndex),
    ),
  })) as unknown as DualThemePackManifestV2["themes"];
  return {
    contract_id: DUAL_THEME_PACK_MANIFEST_V2_ID,
    program_id: requirements.program_id,
    source_catalog: {
      contract_id: compilation.source_catalog.contract_id,
      catalog_id: compilation.source_catalog.catalog_id,
      catalog_sha256: compilation.source_catalog.catalog_sha256,
    },
    source_compilation: {
      contract_id: compilation.contract_id,
      compilation_sha256: compilation.compilation_sha256,
    },
    requirements: {
      contract_id: DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
      requirements_sha256: requirements.requirements_sha256,
    },
    themes,
  };
}

async function signedManifestV2(
  compilation: DualThemeAssetDemandCompilation,
): Promise<DualThemePackManifestV2> {
  const unsigned = unsignedManifestV2(compilation);
  return {
    ...unsigned,
    manifest_sha256: await digestDualThemePackManifestV2(unsigned),
  };
}

async function resignManifestV2(value: any): Promise<void> {
  value.manifest_sha256 = await digestDualThemePackManifestV2(value);
}

describe("dual-theme assembled manifest v2", () => {
  it("accepts two complete mirrored themes with extensible static and temporal families", async () => {
    const { catalog, compilation } = await compiledManifestInputsV2();
    const requirements = compilation.requirements;
    const manifest = await signedManifestV2(compilation);
    const validated = await validateDualThemePackManifestV2(
      manifest,
      catalog,
      compilation,
    );

    expect(validated.contract_id).toBe(DUAL_THEME_PACK_MANIFEST_V2_ID);
    expect(validated.themes).toHaveLength(2);
    expect(
      validated.themes.every(
        ({ members }) => members.length === requirements.capabilities.length,
      ),
    ).toBe(true);
    expect(
      validated.themes[0].members.find(({ family }) => family === "audio")
        ?.derived_artifacts[0]?.media_type,
    ).toBe("audio/ogg");
    expect(
      validated.themes[0].members.find(
        ({ family }) => family === "projectile",
      )?.temporal?.signature_contract_reference,
    ).toBe("forge.temporal-signature/v1");
  });

  it("binds catalog, requirements, execution evidence, source and derived identities", async () => {
    const { catalog, compilation } = await compiledManifestInputsV2();
    const requirements = compilation.requirements;
    const manifest = await signedManifestV2(compilation);
    const validated = await validateDualThemePackManifestV2(
      manifest,
      catalog,
      compilation,
    );

    expect(validated.source_catalog.catalog_sha256).toBe(
      catalog.catalog_sha256,
    );
    expect(validated.requirements.requirements_sha256).toBe(
      requirements.requirements_sha256,
    );
    expect(
      validated.themes[0].members.find(({ family }) => family === "ui")
        ?.execution_contracts[0]?.kind,
    ).toBe("nine_slice_text_safe_area");
    expect(
      validated.themes
        .flatMap(({ members }) => members)
        .every(
          ({ source_artifacts, derived_artifacts }) =>
            source_artifacts.length > 0 && derived_artifacts.length > 0,
        ),
    ).toBe(true);
    expect(await digestDualThemePackManifestV2(validated)).toBe(
      validated.manifest_sha256,
    );
  });

  it.each([
    {
      name: "missing mirrored capability",
      mutate: (value: any) => {
        value.themes[1].members.pop();
      },
      error: /missing mirrored capability coverage/,
    },
    {
      name: "mismatched family",
      mutate: (value: any) => {
        value.themes[0].members[0].family = "projectile";
      },
      error: /family must be audio/,
    },
    {
      name: "missing source state coverage",
      mutate: (value: any) => {
        const member = value.themes[0].members.find(
          ({ family }: { family: string }) => family === "character",
        );
        member.source_artifacts[0].states = [];
      },
      error: /source_artifacts missing required state idle/,
    },
    {
      name: "missing derived variant coverage",
      mutate: (value: any) => {
        value.themes[0].members[0].derived_artifacts[0].variants = [];
      },
      error: /derived_artifacts missing required variant loop/,
    },
    {
      name: "missing temporal signature",
      mutate: (value: any) => {
        const member = value.themes[0].members.find(
          ({ family }: { family: string }) => family === "projectile",
        );
        delete member.temporal;
      },
      error: /temporal is required/,
    },
    {
      name: "wrong temporal signature contract",
      mutate: (value: any) => {
        const member = value.themes[0].members.find(
          ({ family }: { family: string }) => family === "projectile",
        );
        member.temporal.signature_contract_reference =
          "temporal.visual-signature/v1";
      },
      error: /signature_contract_reference must be forge\.temporal-signature\/v1/,
    },
    {
      name: "incomplete temporal state coverage",
      mutate: (value: any) => {
        const member = value.themes[0].members.find(
          ({ family }: { family: string }) => family === "prop",
        );
        member.temporal.covered_states = [];
      },
      error: /covered_states must exactly cover/,
    },
    {
      name: "random temporal signature content digest",
      mutate: (value: any) => {
        const member = value.themes[0].members.find(
          ({ family }: { family: string }) => family === "projectile",
        );
        member.temporal.signature_artifact.sha256 = "f".repeat(64);
      },
      error: /signature_artifact\.sha256 must be/,
    },
    {
      name: "missing execution binding",
      mutate: (value: any) => {
        const member = value.themes[0].members.find(
          ({ family }: { family: string }) => family === "ui",
        );
        member.execution_contracts = [];
      },
      error: /bind every required execution contract/,
    },
    {
      name: "duplicate cross-theme artifact identity",
      mutate: (value: any) => {
        value.themes[1].members[0].source_artifacts[0] =
          structuredClone(value.themes[0].members[0].source_artifacts[0]);
      },
      error: /duplicate artifact identity/,
    },
    {
      name: "unsafe Forge provenance",
      mutate: (value: any) => {
        const member = value.themes[0].members.find(
          ({ family }: { family: string }) => family === "character",
        );
        member.provenance = {
          source_kind: "third_party",
          ownership: "licensed",
          license_label: "unknown",
          evidence_reference: "evidence/license.json",
          source_url: "https://example.com/asset",
        };
      },
      error: /Forge source ownership must be project_generated and project_owned/,
    },
    {
      name: "audio artifact with visual media",
      mutate: (value: any) => {
        value.themes[0].members[0].derived_artifacts[0].media_type =
          "image/png";
      },
      error: /media_type must be audio/,
    },
    {
      name: "catalog binding drift",
      mutate: (value: any) => {
        value.source_catalog.catalog_sha256 = "f".repeat(64);
      },
      error: /catalog_sha256 must be/,
    },
    {
      name: "unknown layout field",
      mutate: (value: any) => {
        value.sheet_layout = { columns: 12 };
      },
      error: /unexpected key.*sheet_layout/,
    },
  ])("rejects $name", async ({ mutate, error }) => {
    const { catalog, compilation } = await compiledManifestInputsV2();
    const manifest: any = structuredClone(await signedManifestV2(compilation));
    mutate(manifest);
    await resignManifestV2(manifest);
    await expect(
      validateDualThemePackManifestV2(
        manifest,
        catalog,
        compilation,
      ),
    ).rejects.toThrow(error);
  });

  it("rejects manifest and catalog-source digest or theme drift", async () => {
    const { catalog, compilation } = await compiledManifestInputsV2();
    const manifest: any = structuredClone(await signedManifestV2(compilation));
    manifest.manifest_sha256 = "f".repeat(64);
    await expect(
      validateDualThemePackManifestV2(
        manifest,
        catalog,
        compilation,
      ),
    ).rejects.toThrow(/manifest_sha256 mismatch/);

    const catalogDrift: any = structuredClone(catalog);
    catalogDrift.catalog_id = "reading_advantage.other_catalog";
    catalogDrift.catalog_sha256 =
      await digestDualThemeAssetDemandCatalog(catalogDrift);
    await expect(
      validateDualThemePackManifestV2(
        await signedManifestV2(compilation),
        catalogDrift,
        compilation,
      ),
    ).rejects.toThrow(/compilation v2 does not exactly match the signed catalog output/);
  });
});

describe("dual-theme assembled manifest", () => {
  it("accepts two mirrored, reviewed themes with exact semantic bindings", async () => {
    const requirements = await signedRequirements();
    const manifest = await signedManifest(requirements);

    await expect(validateDualThemePackManifest(manifest, requirements)).resolves.toEqual(
      manifest,
    );
    expect(canonicalizeDualThemePackManifest(manifest)).not.toContain("manifest_sha256");
    expect(await digestDualThemePackManifest(manifest)).toBe(manifest.manifest_sha256);
  });

  it("accepts an atlas without a pose sheet when the physical contract requires an atlas", async () => {
    const capabilities = CAPABILITIES.map((capability) =>
      capability.id === "pose_clip.hero"
        ? {
            ...capability,
            physical_contract_reference: "sprite.animation.sprite-atlas/v1",
          }
        : capability,
    );
    const requirements = await signedRequirements(capabilities);
    const manifest = await signedManifest(requirements);
    const temporalMembers = manifest.themes.map(({ members }) =>
      members.find(({ capability_id }) => capability_id === "pose_clip.hero")!,
    );

    expect(temporalMembers.every(({ role }) => role === "sprite_atlas")).toBe(true);
    expect(
      temporalMembers.every(({ animation }) =>
        animation?.derived_surfaces.every(({ role }) => role === "sprite_atlas"),
      ),
    ).toBe(true);
    await expect(validateDualThemePackManifest(manifest, requirements)).resolves.toEqual(manifest);
  });

  it("accepts both derived surfaces when the physical contract requires both", async () => {
    const capabilities = CAPABILITIES.map((capability) =>
      capability.id === "pose_clip.hero"
        ? {
            ...capability,
            physical_contract_reference: "sprite.animation.pose-sheet-and-atlas/v1",
          }
        : capability,
    );
    const requirements = await signedRequirements(capabilities);
    const manifest: any = structuredClone(await signedManifest(requirements));
    manifest.themes.forEach((theme: any, themeIndex: number) => {
      const temporal = theme.members.find(
        ({ capability_id }: { capability_id: string }) => capability_id === "pose_clip.hero",
      );
      temporal.animation.derived_surfaces.push({
        artifact_id: `atlas.${theme.theme_id}.pose_clip.hero`,
        revision_id: temporal.artifact.revision_id,
        sha256: hexDigest(230 + themeIndex),
        reference: `artifacts/${theme.theme_id}/pose_clip.hero/atlas.png`,
        media_type: "image/png",
        role: "sprite_atlas",
        width: 256,
        height: 128,
        transparent: true,
      });
    });
    await resignManifest(manifest);

    await expect(validateDualThemePackManifest(manifest, requirements)).resolves.toEqual(
      manifest,
    );
  });

  it.each([
    {
      name: "unknown member field",
      mutate: (value: any) => {
        value.themes[0].members[0].host_path = "/tmp/asset.png";
      },
      error: /unexpected key.*host_path/,
    },
    {
      name: "missing mirrored capability",
      mutate: (value: any) => {
        value.themes[1].members.pop();
      },
      error: /missing mirrored capability coverage/,
    },
    {
      name: "mismatched family",
      mutate: (value: any) => {
        value.themes[0].members[0].family = "monster";
      },
      error: /family mismatch/,
    },
    {
      name: "mismatched required states",
      mutate: (value: any) => {
        value.themes[0].members[0].required_states = ["defeated"];
      },
      error: /required_states mismatch/,
    },
    {
      name: "mismatched physical contract",
      mutate: (value: any) => {
        value.themes[0].members[0].physical_contract_reference = "sprite.other/v1";
      },
      error: /physical_contract_reference mismatch/,
    },
    {
      name: "duplicate member identity",
      mutate: (value: any) => {
        value.themes[1].members[0].id = value.themes[0].members[0].id;
      },
      error: /duplicate member id/,
    },
    {
      name: "unreviewed member",
      mutate: (value: any) => {
        value.themes[0].members[0].review.disposition = "pending";
      },
      error: /disposition must be accepted/,
    },
    {
      name: "nonportable artifact reference",
      mutate: (value: any) => {
        value.themes[0].members[0].artifact.reference = "../private/asset.png";
      },
      error: /portable relative reference/,
    },
    {
      name: "unsafe Forge source ownership",
      mutate: (value: any) => {
        value.themes[0].members[0].provenance = {
          source_kind: "third_party",
          ownership: "licensed",
          license_label: "unknown-license",
          evidence_reference: "evidence/license.json",
          source_url: "https://example.com/asset",
        };
      },
      error: /Forge source ownership must be project_generated and project_owned/,
    },
    {
      name: "derived role forbidden by physical contract",
      mutate: (value: any) => {
        const temporal = value.themes[0].members.find(
          ({ capability_id }: { capability_id: string }) => capability_id === "pose_clip.hero",
        );
        temporal.role = "sprite_atlas";
        temporal.animation.derived_surfaces[0].role = "sprite_atlas";
      },
      error: /role is forbidden by sprite\.animation\.pose-sheet\/v1/,
    },
  ])("rejects $name", async ({ mutate, error }) => {
    const requirements = await signedRequirements();
    const manifest: any = structuredClone(await signedManifest(requirements));
    mutate(manifest);
    await resignManifest(manifest);
    await expect(validateDualThemePackManifest(manifest, requirements)).rejects.toThrow(
      error,
    );
  });

  it.each([
    {
      name: "missing animation binding",
      mutate: (member: any) => {
        delete member.animation;
      },
      error: /animation is required for temporal capability/,
    },
    {
      name: "atlas-only delivery",
      mutate: (member: any) => {
        const surface = structuredClone(member.animation.derived_surfaces[0]);
        surface.role = "sprite_atlas";
        member.animation = {
          contract_id: DUAL_THEME_ANIMATION_MEMBER_ID,
          derived_surfaces: [surface],
        };
      },
      error: /missing required key.*source_frames.*source_glb.*metadata/,
    },
    {
      name: "pose-sheet-only delivery",
      mutate: (member: any) => {
        member.animation = {
          contract_id: DUAL_THEME_ANIMATION_MEMBER_ID,
          derived_surfaces: structuredClone(member.animation.derived_surfaces),
        };
      },
      error: /missing required key.*source_frames.*source_glb.*metadata/,
    },
    {
      name: "source-frame-only delivery",
      mutate: (member: any) => {
        member.animation = {
          contract_id: DUAL_THEME_ANIMATION_MEMBER_ID,
          source_frames: structuredClone(member.animation.source_frames),
        };
      },
      error: /missing required key.*source_glb.*metadata.*derived_surfaces/,
    },
    {
      name: "metadata-only delivery",
      mutate: (member: any) => {
        member.animation = {
          contract_id: DUAL_THEME_ANIMATION_MEMBER_ID,
          metadata: structuredClone(member.animation.metadata),
        };
      },
      error: /missing required key.*source_frames.*source_glb.*derived_surfaces/,
    },
    {
      name: "missing source GLB",
      mutate: (member: any) => {
        delete member.animation.source_glb;
      },
      error: /missing required key.*source_glb/,
    },
    {
      name: "missing derived PNG surface",
      mutate: (member: any) => {
        delete member.animation.derived_surfaces;
      },
      error: /missing required key.*derived_surfaces/,
    },
    {
      name: "incomplete source frames",
      mutate: (member: any) => {
        member.animation.source_frames.pop();
      },
      error: /source_frames must contain at least two/,
    },
    {
      name: "missing metadata",
      mutate: (member: any) => {
        delete member.animation.metadata;
      },
      error: /missing required key.*metadata/,
    },
    {
      name: "missing required state coverage",
      mutate: (member: any) => {
        member.animation.source_frames[0].state = "idle";
      },
      error: /source_frames missing required state attack/,
    },
  ])("rejects animation delivery with $name", async ({ mutate, error }) => {
    const requirements = await signedRequirements();
    const manifest: any = structuredClone(await signedManifest(requirements));
    const poseMember = manifest.themes[0].members.find(
      ({ capability_id }: { capability_id: string }) => capability_id === "pose_clip.hero",
    );
    mutate(poseMember);
    await resignManifest(manifest);
    await expect(validateDualThemePackManifest(manifest, requirements)).rejects.toThrow(
      error,
    );
  });

  it("rejects manifest digest drift after otherwise valid changes", async () => {
    const requirements = await signedRequirements();
    const manifest: any = structuredClone(await signedManifest(requirements));
    manifest.themes[0].members[0].byte_length += 1;

    await expect(validateDualThemePackManifest(manifest, requirements)).rejects.toThrow(
      DualThemePackValidationError,
    );
    await expect(validateDualThemePackManifest(manifest, requirements)).rejects.toThrow(
      /manifest_sha256 mismatch/,
    );
  });
});
