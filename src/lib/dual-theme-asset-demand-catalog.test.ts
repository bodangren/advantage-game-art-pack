import { describe, expect, it } from "vitest";

import {
  DUAL_THEME_ASSET_DEMAND_CATALOG_ID,
  DUAL_THEME_ASSET_DEMAND_COMPILATION_ID,
  DualThemeAssetDemandCatalogValidationError,
  canonicalizeDualThemeAssetDemandCatalog,
  compileDualThemeAssetDemandCatalog,
  digestDualThemeAssetDemandCatalog,
  digestDualThemeAssetDemandCompilation,
  validateDualThemeAssetDemandCatalog,
  type DualThemeAssetDemand,
  type DualThemeAssetDemandCatalog,
} from "./dual-theme-asset-demand-catalog";
import {
  DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
  validateDualThemePackRequirementsV2,
  type DualThemeExecutionContractV2,
  type DualThemeTemporalRequirementV2,
} from "./dual-theme-pack-contract";

interface DemandOptions {
  readonly usage?: string;
  readonly basis?: "observed_unaccepted" | "authored_requirement";
  readonly evidence?: string;
  readonly states?: readonly string[];
  readonly variants?: readonly string[];
  readonly physical?: string;
  readonly source?: "forge" | "pixel";
  readonly temporal?: DualThemeTemporalRequirementV2;
  readonly media?: "visual" | "audio";
  readonly execution?: readonly DualThemeExecutionContractV2[];
}

function demand(
  id: string,
  family: string,
  options: DemandOptions = {},
): DualThemeAssetDemand {
  const usage = options.usage ?? "gameplay";
  const source = options.source ?? "pixel";
  return {
    id,
    family,
    theme_scope: "mirrored",
    usage_demands: [
      {
        usage_context: usage,
        basis: options.basis ?? "authored_requirement",
        evidence_reference:
          options.evidence ?? `requirements/${family}/${usage}.json`,
      },
    ],
    required_states: options.states ?? [],
    required_variants: options.variants ?? ["base"],
    physical_contract_reference: options.physical ?? "asset.semantic/v1",
    source_owner: source,
    review_requirement:
      source === "forge" ? "reference_convergence" : "delivery_resolution",
    delivery_kind:
      options.temporal === undefined ? "static_artifact" : "temporal_artifact",
    media_class: options.media ?? "visual",
    execution_contracts: options.execution ?? [],
    demand_reference: `demands/${family}/${id.replaceAll(".", "-")}.json`,
    ...(options.temporal === undefined
      ? {}
      : { temporal_requirement: options.temporal }),
  };
}

const forgeTemporal = (
  name: string,
  states: readonly string[],
): DualThemeTemporalRequirementV2 => ({
  media_class: "visual",
  signature_contract_reference: "forge.temporal-signature/v1",
  signature_reference: `signatures/forge/${name}.json`,
  signature_sha256: "a".repeat(64),
  required_states: states,
});

const DEMANDS: readonly DualThemeAssetDemand[] = [
  demand("audio.ambience", "audio", {
    usage: "world",
    basis: "observed_unaccepted",
    evidence: "observations/t10/audio-usage.json",
    variants: ["loop"],
    physical: "audio.loop/v1",
    media: "audio",
    temporal: {
      media_class: "audio",
      signature_contract_reference: "temporal.audio-signature/v1",
      signature_reference: "signatures/audio/ambience.json",
      signature_sha256: "b".repeat(64),
      required_states: [],
    },
  }),
  demand("character.hero", "character", {
    usage: "roster",
    source: "forge",
    states: ["idle"],
    physical: "sprite.directional/v1",
  }),
  demand("equipment.primary", "equipment", {
    source: "forge",
    states: ["equipped"],
    physical: "sprite.directional/v1",
  }),
  demand("monster.enemy", "monster", {
    source: "forge",
    states: ["idle"],
    physical: "sprite.directional/v1",
  }),
  demand("pose_clip.hero", "pose_clip", {
    source: "forge",
    states: ["attack", "idle"],
    physical: "sprite.animation.pose-sheet-or-atlas/v1",
    temporal: forgeTemporal("pose-clip-hero", ["attack", "idle"]),
  }),
  demand("presentation.cover", "presentation", {
    usage: "loading",
    variants: ["landscape"],
    physical: "presentation.cover/v1",
    execution: [
      {
        kind: "crop_focal_derivation",
        contract_reference: "presentation.crop-focal/v1",
        evidence_reference: "requirements/presentation/crop-focal.json",
      },
    ],
  }),
  demand("projectile.primary", "projectile", {
    usage: "combat",
    basis: "observed_unaccepted",
    evidence: "observations/t9/projectile-usage.json",
    source: "forge",
    states: ["flight", "impact"],
    physical: "sprite.projectile/v1",
    temporal: forgeTemporal("projectile-primary", ["flight", "impact"]),
  }),
  demand("prop.torch", "prop", {
    usage: "world",
    basis: "observed_unaccepted",
    evidence: "observations/t8/animated-prop.json",
    source: "forge",
    states: ["burning"],
    physical: "sprite.state-bank/v1",
    temporal: forgeTemporal("prop-torch", ["burning"]),
  }),
  demand("tile_environment.ground", "tile_environment", {
    usage: "world",
    physical: "tile.grid/v1",
    execution: [
      {
        kind: "tiling_adjacency",
        contract_reference: "environment.tiling-adjacency/v1",
        evidence_reference: "requirements/environment/tiling-adjacency.json",
      },
    ],
  }),
  demand("ui.panel", "ui", {
    states: ["default"],
    variants: ["desktop"],
    physical: "ui.panel/v1",
    execution: [
      {
        kind: "nine_slice_text_safe_area",
        contract_reference: "ui.nine-slice-text-safe-area/v1",
        evidence_reference: "requirements/ui/panel-execution.json",
      },
    ],
  }),
  demand("vfx.impact", "vfx", {
    usage: "feedback",
    basis: "observed_unaccepted",
    evidence: "observations/t9/vfx-impact.json",
    states: ["active"],
    physical: "vfx.sequence/v1",
    temporal: {
      media_class: "visual",
      signature_contract_reference: "temporal.visual-signature/v1",
      signature_reference: "signatures/vfx/impact.json",
      signature_sha256: "c".repeat(64),
      required_states: ["active"],
    },
  }),
];

function unsignedCatalog(
  demands: readonly DualThemeAssetDemand[] = DEMANDS,
): Omit<DualThemeAssetDemandCatalog, "catalog_sha256"> {
  return {
    contract_id: DUAL_THEME_ASSET_DEMAND_CATALOG_ID,
    catalog_id: "reading_advantage.dual_theme",
    program_id: "reading_advantage.dual_theme",
    themes: [
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
    ],
    demands,
  };
}

async function signedCatalog(
  demands: readonly DualThemeAssetDemand[] = DEMANDS,
): Promise<DualThemeAssetDemandCatalog> {
  const unsigned = unsignedCatalog(demands);
  return {
    ...unsigned,
    catalog_sha256: await digestDualThemeAssetDemandCatalog(unsigned),
  };
}

async function resign(value: any): Promise<void> {
  value.catalog_sha256 = await digestDualThemeAssetDemandCatalog(value);
}

describe("dual-theme semantic asset-demand catalog v2", () => {
  it("represents mirrored core and extensible demand without accepting observed IDs", async () => {
    const validated = await validateDualThemeAssetDemandCatalog(
      await signedCatalog(),
    );

    expect(validated.themes.map(({ display_name }) => display_name)).toEqual([
      "Chibi Quest",
      "Riven Lands",
    ]);
    expect(validated.demands.map(({ family }) => family)).toContain("audio");
    expect(validated.demands.map(({ family }) => family)).toContain("projectile");
    expect(
      validated.demands
        .flatMap(({ usage_demands }) => usage_demands)
        .filter(({ basis }) => basis === "observed_unaccepted")
        .every(({ evidence_reference }) =>
          evidence_reference.startsWith("observations/"),
        ),
    ).toBe(true);
  });

  it("compiles losslessly to deterministic v2 requirements", async () => {
    const catalog = await signedCatalog();
    const compilation = await compileDualThemeAssetDemandCatalog(catalog);

    expect(compilation.contract_id).toBe(
      DUAL_THEME_ASSET_DEMAND_COMPILATION_ID,
    );
    expect(compilation.source_catalog).toEqual({
      contract_id: DUAL_THEME_ASSET_DEMAND_CATALOG_ID,
      catalog_id: catalog.catalog_id,
      catalog_sha256: catalog.catalog_sha256,
      theme_scope: "mirrored",
      themes: catalog.themes,
    });
    expect(compilation.requirements.contract_id).toBe(
      DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
    );
    expect(compilation.requirements.theme_ids).toEqual([
      "chibi_quest",
      "riven_lands",
    ]);
    expect(compilation.requirements.capabilities).toEqual(
      catalog.demands.map(({ theme_scope: _themeScope, ...entry }) => entry),
    );
    await expect(
      validateDualThemePackRequirementsV2(compilation.requirements),
    ).resolves.toEqual(compilation.requirements);
    expect(await digestDualThemeAssetDemandCompilation(compilation)).toBe(
      compilation.compilation_sha256,
    );
  });

  it("keeps temporality orthogonal and carries executable surface semantics", async () => {
    const { requirements } = await compileDualThemeAssetDemandCatalog(
      await signedCatalog(),
    );

    expect(
      requirements.capabilities
        .filter(({ delivery_kind }) => delivery_kind === "temporal_artifact")
        .map(({ family }) => family),
    ).toEqual(["audio", "pose_clip", "projectile", "prop", "vfx"]);
    expect(
      requirements.capabilities.find(({ family }) => family === "prop")
        ?.temporal_requirement?.signature_contract_reference,
    ).toBe("forge.temporal-signature/v1");
    expect(
      requirements.capabilities.find(
        ({ family }) => family === "tile_environment",
      )?.execution_contracts[0]?.kind,
    ).toBe("tiling_adjacency");
    expect(
      requirements.capabilities.find(({ family }) => family === "ui")
        ?.execution_contracts[0]?.kind,
    ).toBe("nine_slice_text_safe_area");
    expect(
      requirements.capabilities.find(({ family }) => family === "presentation")
        ?.execution_contracts[0]?.kind,
    ).toBe("crop_focal_derivation");
  });

  it("allows additive future families and capabilities without fixed roster or layout", async () => {
    const extra = demand("dialogue_portrait.guide", "dialogue_portrait", {
      usage: "dialogue",
      evidence: "requirements/dialogue/guide.json",
    });
    const demands = [...DEMANDS, extra].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
    const compilation = await compileDualThemeAssetDemandCatalog(
      await signedCatalog(demands),
    );

    expect(compilation.requirements.capabilities).toHaveLength(
      DEMANDS.length + 1,
    );
    expect(
      compilation.requirements.capabilities.map(({ family }) => family),
    ).toContain("dialogue_portrait");
    expect(JSON.stringify(compilation)).not.toMatch(
      /columns|rows|sheet_layout|roster_count/,
    );
  });

  it("canonicalizes object keys while binding semantic order", async () => {
    const unsigned = unsignedCatalog();
    const reordered = {
      demands: unsigned.demands,
      themes: unsigned.themes,
      program_id: unsigned.program_id,
      catalog_id: unsigned.catalog_id,
      contract_id: unsigned.contract_id,
    };
    expect(await digestDualThemeAssetDemandCatalog(reordered)).toBe(
      await digestDualThemeAssetDemandCatalog(unsigned),
    );
    expect(
      canonicalizeDualThemeAssetDemandCatalog(await signedCatalog()),
    ).not.toContain("catalog_sha256");

    const noncanonical: any = structuredClone(await signedCatalog());
    noncanonical.demands.reverse();
    await resign(noncanonical);
    await expect(
      validateDualThemeAssetDemandCatalog(noncanonical),
    ).rejects.toThrow(/canonical demand-id ordering/);
  });

  it.each([
    {
      name: "unknown layout field",
      mutate: (value: any) => {
        value.sheet_layout = { columns: 12, rows: 8 };
      },
      error: /unexpected key.*sheet_layout/,
    },
    {
      name: "non-mirrored demand",
      mutate: (value: any) => {
        value.demands[0].theme_scope = "chibi_only";
      },
      error: /theme_scope must be mirrored/,
    },
    {
      name: "duplicate demand ID",
      mutate: (value: any) => {
        value.demands.splice(1, 0, structuredClone(value.demands[0]));
      },
      error: /duplicate demand id audio\.ambience/,
    },
    {
      name: "nonportable observed evidence",
      mutate: (value: any) => {
        value.demands[0].usage_demands[0].evidence_reference =
          "../private/guess.json";
      },
      error: /portable relative reference/,
    },
    {
      name: "self-superseding demand",
      mutate: (value: any) => {
        value.demands[0].supersedes_capability_id = value.demands[0].id;
      },
      error: /cannot supersede itself/,
    },
    {
      name: "duplicate theme ID",
      mutate: (value: any) => {
        value.themes[1].id = value.themes[0].id;
      },
      error: /duplicate theme id/,
    },
    {
      name: "temporal demand without signature",
      mutate: (value: any) => {
        delete value.demands.find(
          ({ family }: { family: string }) => family === "projectile",
        ).temporal_requirement;
      },
      error: /temporal_requirement is required/,
    },
    {
      name: "static demand with temporal signature",
      mutate: (value: any) => {
        value.demands.find(
          ({ family }: { family: string }) => family === "projectile",
        ).delivery_kind = "static_artifact";
      },
      error: /temporal_requirement is forbidden/,
    },
    {
      name: "observed usage with authored evidence namespace",
      mutate: (value: any) => {
        value.demands[0].usage_demands[0].evidence_reference =
          "requirements/audio/guess.json";
      },
      error: /must start with observations\//,
    },
    {
      name: "Forge temporal signature with non-Forge contract",
      mutate: (value: any) => {
        value.demands.find(
          ({ family }: { family: string }) => family === "projectile",
        ).temporal_requirement.signature_contract_reference =
          "temporal.visual-signature/v1";
      },
      error: /Forge temporal artifacts require/,
    },
    {
      name: "temporal signature state mismatch",
      mutate: (value: any) => {
        value.demands.find(
          ({ family }: { family: string }) => family === "prop",
        ).temporal_requirement.required_states = [];
      },
      error: /required_states must match/,
    },
    {
      name: "UI without executable nine-slice text safe area",
      mutate: (value: any) => {
        value.demands.find(
          ({ family }: { family: string }) => family === "ui",
        ).execution_contracts = [];
      },
      error: /requires nine_slice_text_safe_area/,
    },
  ])("rejects $name", async ({ mutate, error }) => {
    const value: any = structuredClone(await signedCatalog());
    mutate(value);
    await resign(value);
    await expect(validateDualThemeAssetDemandCatalog(value)).rejects.toThrow(
      error,
    );
  });

  it("requires core completeness while permitting extension families", async () => {
    const missingCore = DEMANDS.filter(({ family }) => family !== "character");
    await expect(
      validateDualThemeAssetDemandCatalog(await signedCatalog(missingCore)),
    ).rejects.toThrow(/missing required core family character/);
  });

  it("rejects catalog digest drift", async () => {
    const value: any = structuredClone(await signedCatalog());
    value.catalog_sha256 = "f".repeat(64);

    await expect(validateDualThemeAssetDemandCatalog(value)).rejects.toThrow(
      DualThemeAssetDemandCatalogValidationError,
    );
    await expect(validateDualThemeAssetDemandCatalog(value)).rejects.toThrow(
      /catalog_sha256 mismatch/,
    );
  });
});
