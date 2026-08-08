import { describe, expect, it } from "vitest";

import {
  DUAL_THEME_ASSET_DEMAND_CATALOG_ID,
  digestDualThemeAssetDemandCatalog,
  type DualThemeAssetDemand,
  type DualThemeAssetDemandCatalog,
} from "./dual-theme-asset-demand-catalog";
import {
  THEME_PACK_PRODUCTION_INVENTORY_ID,
  createThemePackProductionPlan,
  digestThemePackProductionInventory,
  validateThemePackProductionInventory,
  validateThemePackProductionPlan,
  type ThemePackProductionArtifact,
  type ThemePackProductionInventory,
} from "./theme-pack-production";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const TARGET_FAMILIES = [
  "audio",
  "equipment",
  "presentation",
  "projectile",
  "prop",
  "tile_environment",
  "ui",
  "vfx",
] as const;

function demand(
  family: string,
  options: {
    temporal?: boolean;
    executionKind?: string;
    sourceOwner?: "forge" | "pixel";
  } = {},
): DualThemeAssetDemand {
  const temporal = options.temporal ?? false;
  const executionKind = options.executionKind;
  return {
    id: `${family}.primary`,
    family,
    theme_scope: "mirrored",
    usage_demands: [
      {
        usage_context: `${family}.usage`,
        basis: "authored_requirement",
        evidence_reference: `requirements/${family}.md`,
      },
    ],
    required_states: temporal ? ["active", "idle"] : [],
    required_variants: ["default"],
    physical_contract_reference: `${family}.artifact/v1`,
    source_owner: options.sourceOwner ?? "pixel",
    review_requirement: "delivery_resolution",
    delivery_kind: temporal ? "temporal_artifact" : "static_artifact",
    media_class: family === "audio" ? "audio" : "visual",
    execution_contracts:
      executionKind === undefined
        ? []
        : [
            {
              kind: executionKind,
              contract_reference: `${family}.execution/v1`,
              evidence_reference: `requirements/${family}-execution.md`,
            },
          ],
    demand_reference: `requirements/${family}-demand.json`,
    ...(temporal
      ? {
          temporal_requirement: {
            media_class: family === "audio" ? ("audio" as const) : ("visual" as const),
            signature_contract_reference:
              options.sourceOwner === "forge"
                ? "forge.temporal-signature/v1"
                : `${family}.temporal-signature/v1`,
            signature_reference: `requirements/${family}-temporal.json`,
            signature_sha256: SHA_A,
            required_states: ["active", "idle"],
          },
        }
      : {}),
  };
}

async function catalog(
  options: { omitTargets?: readonly string[] } = {},
): Promise<DualThemeAssetDemandCatalog> {
  const requiredCore = [
    demand("character", { temporal: true, sourceOwner: "forge" }),
    demand("monster", { temporal: true, sourceOwner: "forge" }),
    demand("pose_clip", { temporal: true, sourceOwner: "forge" }),
  ];
  const targetDemands = [
    demand("audio", { temporal: true }),
    demand("equipment", { sourceOwner: "forge" }),
    demand("presentation", { executionKind: "crop_focal_derivation" }),
    demand("projectile", { temporal: true }),
    demand("prop", { temporal: true }),
    demand("tile_environment", { executionKind: "tiling_adjacency" }),
    demand("ui", { executionKind: "nine_slice_text_safe_area" }),
    demand("vfx", { temporal: true }),
  ].filter(({ family }) => !(options.omitTargets ?? []).includes(family));
  const unsigned = {
    contract_id: DUAL_THEME_ASSET_DEMAND_CATALOG_ID,
    catalog_id: "dual_theme.production_fixture",
    program_id: "apk.dual_theme_asset_packs",
    themes: [
      { id: "chibi_quest", display_name: "Chibi Quest", audience: "younger" },
      { id: "riven_lands", display_name: "Riven Lands", audience: "older" },
    ] as const,
    demands: [...requiredCore, ...targetDemands].sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    ),
  };
  return {
    ...unsigned,
    catalog_sha256: await digestDualThemeAssetDemandCatalog(unsigned),
  };
}

async function inventory(
  catalogSha256: string,
  artifacts: readonly ThemePackProductionArtifact[] = [],
): Promise<ThemePackProductionInventory> {
  const unsigned = {
    contract_id: THEME_PACK_PRODUCTION_INVENTORY_ID,
    catalog_sha256: catalogSha256,
    artifacts,
  };
  return {
    ...unsigned,
    inventory_sha256: await digestThemePackProductionInventory(unsigned),
  };
}

function admittedArtifact(
  themeId: "chibi_quest" | "riven_lands",
  capabilityId: string,
  overrides: Partial<ThemePackProductionArtifact> = {},
): ThemePackProductionArtifact {
  return {
    id: `${themeId}.${capabilityId}.artifact`,
    theme_id: themeId,
    capability_id: capabilityId,
    artifact_id: `${themeId}.${capabilityId}`,
    revision_id: `revision.${SHA_B}`,
    sha256: SHA_B,
    reference: `artifacts/${themeId}/${capabilityId}.png`,
    media_type: "image/png",
    role: "production_asset",
    physical_contract_reference: "equipment.artifact/v1",
    media_class: "visual",
    source_owner: "forge",
    review_requirement: "delivery_resolution",
    admission_status: "admitted",
    covered_states: [],
    covered_variants: ["default"],
    execution_contract_evidence: [],
    provenance_reference: `provenance/${themeId}-${capabilityId}.json`,
    evidence_reference: `evidence/${themeId}-${capabilityId}.json`,
    ...overrides,
  };
}

function completeArtifactForDemand(
  themeId: "chibi_quest" | "riven_lands",
  sourceDemand: DualThemeAssetDemand,
): ThemePackProductionArtifact {
  const extension = sourceDemand.media_class === "audio" ? "ogg" : "png";
  return {
    id: `${themeId}.${sourceDemand.id}.artifact`,
    theme_id: themeId,
    capability_id: sourceDemand.id,
    artifact_id: `${themeId}.${sourceDemand.id}`,
    revision_id: `revision.${SHA_B}`,
    sha256: SHA_B,
    reference: `artifacts/${themeId}/${sourceDemand.id}.${extension}`,
    media_type: sourceDemand.media_class === "audio" ? "audio/ogg" : "image/png",
    role: "production_asset",
    physical_contract_reference: sourceDemand.physical_contract_reference,
    media_class: sourceDemand.media_class,
    source_owner: sourceDemand.source_owner,
    review_requirement: sourceDemand.review_requirement,
    admission_status: "admitted",
    covered_states: sourceDemand.required_states,
    covered_variants: sourceDemand.required_variants,
    execution_contract_evidence: sourceDemand.execution_contracts.map(
      ({ kind, contract_reference }) => ({
        kind,
        contract_reference,
        evidence_reference: `evidence/${themeId}-${sourceDemand.id}-${kind}.json`,
      }),
    ),
    provenance_reference: `provenance/${themeId}-${sourceDemand.id}.json`,
    evidence_reference: `evidence/${themeId}-${sourceDemand.id}.json`,
    ...(sourceDemand.temporal_requirement === undefined
      ? {}
      : { temporal_signature_sha256: sourceDemand.temporal_requirement.signature_sha256 }),
  };
}

describe("theme-pack production planning", () => {
  it("expands every catalogued target demand into mirrored, non-shipping missing work", async () => {
    const sourceCatalog = await catalog();
    const plan = await createThemePackProductionPlan(
      sourceCatalog,
      await inventory(sourceCatalog.catalog_sha256),
    );

    expect(plan.shipping).toBe(false);
    expect(plan.status).toBe("incomplete");
    expect(plan.catalog_gaps).toEqual([]);
    expect(plan.work_orders).toHaveLength(TARGET_FAMILIES.length * 2);
    expect(plan.work_orders.every(({ artifact_status }) => artifact_status === "missing_artifacts"))
      .toBe(true);
    expect(plan.work_orders.map(({ theme_id }) => theme_id)).toEqual(
      TARGET_FAMILIES.flatMap(() => ["chibi_quest", "riven_lands"]),
    );
    expect(plan.work_orders.flatMap(({ matched_artifact_ids }) => matched_artifact_ids)).toEqual([]);
  });

  it("preserves exact Chibi Quest and Riven Lands identities and mirrored capability parity", async () => {
    const sourceCatalog = await catalog();
    const plan = await createThemePackProductionPlan(
      sourceCatalog,
      await inventory(sourceCatalog.catalog_sha256),
    );

    expect(plan.themes).toEqual(sourceCatalog.themes);
    for (const family of TARGET_FAMILIES) {
      expect(plan.work_orders.filter((order) => order.family === family).map((order) => order.theme_id))
        .toEqual(["chibi_quest", "riven_lands"]);
    }
  });

  it("keeps temporal signatures orthogonal to static and execution-contract evidence", async () => {
    const sourceCatalog = await catalog();
    const plan = await createThemePackProductionPlan(
      sourceCatalog,
      await inventory(sourceCatalog.catalog_sha256),
    );

    for (const family of ["audio", "projectile", "prop", "vfx"]) {
      const order = plan.work_orders.find(({ family: value }) => value === family)!;
      expect(order.temporal_requirement?.signature_sha256).toBe(SHA_A);
      expect(order.missing_evidence).toContain("temporal_signature_missing");
    }
    expect(plan.work_orders.find(({ family }) => family === "equipment")!.temporal_requirement)
      .toBeUndefined();
    for (const family of ["presentation", "tile_environment", "ui"]) {
      expect(plan.work_orders.find(({ family: value }) => value === family)!.missing_evidence)
        .toContain("execution_contract_evidence_missing");
    }
  });

  it("does not treat a matching candidate as admitted evidence", async () => {
    const sourceCatalog = await catalog();
    const artifact = admittedArtifact("chibi_quest", "equipment.primary", {
      admission_status: "candidate",
    });
    const plan = await createThemePackProductionPlan(
      sourceCatalog,
      await inventory(sourceCatalog.catalog_sha256, [artifact]),
    );
    const order = plan.work_orders.find(({ id }) => id === "equipment.primary.chibi_quest")!;

    expect(order.artifact_status).toBe("evidence_blocked");
    expect(order.matched_artifact_ids).toEqual([artifact.id]);
    expect(order.missing_evidence).toContain("admission_missing");
  });

  it("can satisfy one admitted order without claiming its mirror or pack is complete", async () => {
    const sourceCatalog = await catalog();
    const artifact = admittedArtifact("chibi_quest", "equipment.primary");
    const plan = await createThemePackProductionPlan(
      sourceCatalog,
      await inventory(sourceCatalog.catalog_sha256, [artifact]),
    );

    expect(plan.work_orders.find(({ id }) => id === "equipment.primary.chibi_quest")!.artifact_status)
      .toBe("admitted_evidence_complete");
    expect(plan.work_orders.find(({ id }) => id === "equipment.primary.riven_lands")!.artifact_status)
      .toBe("missing_artifacts");
    expect(plan.status).toBe("incomplete");
    expect(plan.shipping).toBe(false);
  });

  it("never marks a fully evidenced plan as shipping or downstream-accepted", async () => {
    const sourceCatalog = await catalog();
    const artifacts = sourceCatalog.demands
      .filter(({ family }) => (TARGET_FAMILIES as readonly string[]).includes(family))
      .flatMap((sourceDemand) =>
        (["chibi_quest", "riven_lands"] as const).map((themeId) =>
          completeArtifactForDemand(themeId, sourceDemand),
        ),
      )
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
    const plan = await createThemePackProductionPlan(
      sourceCatalog,
      await inventory(sourceCatalog.catalog_sha256, artifacts),
    );

    expect(plan.work_orders.every(({ artifact_status }) =>
      artifact_status === "admitted_evidence_complete"))
      .toBe(true);
    expect(plan.status).toBe("evidence_complete_pending_pack_acceptance");
    expect(plan.shipping).toBe(false);
  });

  it("blocks admitted artifacts whose requirement binding or media encoding drifts", async () => {
    const sourceCatalog = await catalog();
    const mismatched = admittedArtifact("chibi_quest", "equipment.primary", {
      physical_contract_reference: "equipment.other-artifact/v1",
    });
    const plan = await createThemePackProductionPlan(
      sourceCatalog,
      await inventory(sourceCatalog.catalog_sha256, [mismatched]),
    );
    expect(plan.work_orders.find(({ id }) => id === "equipment.primary.chibi_quest")!.missing_evidence)
      .toContain("requirement_binding_mismatch");

    await expect(
      validateThemePackProductionInventory(
        await inventory(sourceCatalog.catalog_sha256, [
          { ...admittedArtifact("chibi_quest", "equipment.primary"), media_type: "audio/ogg" },
        ]),
      ),
    ).rejects.toThrow(/media_type must match media_class/);
  });

  it("reports uncatalogued target families as gaps instead of inventing work orders", async () => {
    const sourceCatalog = await catalog({ omitTargets: ["audio", "projectile"] });
    const plan = await createThemePackProductionPlan(
      sourceCatalog,
      await inventory(sourceCatalog.catalog_sha256),
    );

    expect(plan.catalog_gaps).toEqual(["audio", "projectile"]);
    expect(plan.work_orders.some(({ family }) => family === "audio" || family === "projectile"))
      .toBe(false);
    expect(plan.family_summaries.find(({ family }) => family === "audio")).toMatchObject({
      demand_count: 0,
      work_order_count: 0,
      status: "catalog_gap",
    });
  });

  it("is deterministic and validates a plan by exact recomputation", async () => {
    const sourceCatalog = await catalog();
    const sourceInventory = await inventory(sourceCatalog.catalog_sha256);
    const first = await createThemePackProductionPlan(sourceCatalog, sourceInventory);
    const second = await createThemePackProductionPlan(sourceCatalog, sourceInventory);

    expect(second).toEqual(first);
    await expect(validateThemePackProductionPlan(first, sourceCatalog, sourceInventory))
      .resolves.toEqual(first);
    await expect(
      validateThemePackProductionPlan(
        { ...first, shipping: true },
        sourceCatalog,
        sourceInventory,
      ),
    ).rejects.toThrow(/must exactly match deterministic production planning output/);
  });

  it("rejects stale, non-canonical, unsafe, duplicated, or digest-drifted inventory", async () => {
    const sourceCatalog = await catalog();
    const first = admittedArtifact("chibi_quest", "equipment.primary");
    const second = admittedArtifact("riven_lands", "equipment.primary", {
      id: "riven_lands.equipment.primary.artifact",
    });

    await expect(
      createThemePackProductionPlan(sourceCatalog, await inventory(SHA_B)),
    ).rejects.toThrow(/catalog_sha256 mismatch/);
    await expect(
      validateThemePackProductionInventory(await inventory(sourceCatalog.catalog_sha256, [second, first])),
    ).rejects.toThrow(/canonical artifact-id ordering/);
    await expect(
      validateThemePackProductionInventory(
        await inventory(sourceCatalog.catalog_sha256, [
          { ...first, reference: "../escape.png" },
        ]),
      ),
    ).rejects.toThrow(/portable relative reference/);
    await expect(
      validateThemePackProductionInventory(
        await inventory(sourceCatalog.catalog_sha256, [first, { ...first }]),
      ),
    ).rejects.toThrow(/duplicate artifact id/);
    await expect(
      validateThemePackProductionInventory({
        ...(await inventory(sourceCatalog.catalog_sha256)),
        inventory_sha256: SHA_B,
      }),
    ).rejects.toThrow(/inventory_sha256 mismatch/);
  });

  it("rejects drift from the fixed downstream theme identities", async () => {
    const sourceCatalog = await catalog();
    const unsigned = {
      ...sourceCatalog,
      themes: [
        { id: "chibi_quest", display_name: "Chibi Quest", audience: "younger" },
        { id: "riven_lands", display_name: "Riven Lands Legacy", audience: "older" },
      ] as const,
    };
    const drifted = {
      ...unsigned,
      catalog_sha256: await digestDualThemeAssetDemandCatalog(unsigned),
    };

    await expect(
      createThemePackProductionPlan(drifted, await inventory(drifted.catalog_sha256)),
    ).rejects.toThrow(/fixed downstream theme identity/);
  });
});
