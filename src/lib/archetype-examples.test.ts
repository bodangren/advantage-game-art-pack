import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Phase 1 Red: the seeded example specs and their frozen digest fixture
// do not exist yet. They load through fs (not static imports) so the
// suite stays importable for the post-Green phase-1 sentinel while the
// assertions below fail until the specs land.
import seededBundle from "../../examples/bundles/library-quest.json";

import { SPEC_REGISTRY, compileBundle, validateBundleManifest } from "./bundles";
import { SVG_PARTS } from "./catalog";
import {
  type SvgCompositionSpec,
  composeSvgAsset,
  normalizeCompositionSpec,
} from "./svg-assets";

const here = dirname(fileURLToPath(import.meta.url));
const examplesRoot = resolve(here, "..", "..", "examples");

const EXPECTED_ASSET_IDS = [
  "enemy-goblin",
  "enemy-spectre",
  "boss-dragon",
  "npc-prisoner",
  "prop-set-library",
  "fx-set",
] as const;

function loadExample(assetId: string): unknown {
  try {
    return JSON.parse(
      readFileSync(resolve(examplesRoot, `${assetId}.json`), "utf8"),
    );
  } catch {
    throw new Error(`seeded example spec missing on disk: ${assetId}.json`);
  }
}

function loadFrozenDigests(): Record<string, string> {
  try {
    return JSON.parse(
      readFileSync(resolve(examplesRoot, "composition-digests.json"), "utf8"),
    ) as Record<string, string>;
  } catch {
    throw new Error("frozen digest fixture missing on disk: composition-digests.json");
  }
}

describe("examples: seeded archetype compositions", () => {
  it("examples: every seeded spec normalizes and declares its registry id", () => {
    const ids = EXPECTED_ASSET_IDS.map(
      (assetId) =>
        normalizeCompositionSpec(loadExample(assetId) as SvgCompositionSpec).asset_id,
    );
    expect(ids).toEqual(EXPECTED_ASSET_IDS);
  });

  it("examples: compositions are deterministic across runs", async () => {
    for (const assetId of EXPECTED_ASSET_IDS) {
      const spec = loadExample(assetId) as SvgCompositionSpec;
      const first = await composeSvgAsset(spec, SVG_PARTS);
      const second = await composeSvgAsset(spec, SVG_PARTS);
      expect(first.svg).toBe(second.svg);
      expect(first.metadata.svg_sha256).toBe(second.metadata.svg_sha256);
    }
  });

  it("examples: composition digests match the frozen fixture", async () => {
    const recorded = loadFrozenDigests();
    expect(Object.keys(recorded).sort()).toEqual([...EXPECTED_ASSET_IDS].sort());
    for (const assetId of EXPECTED_ASSET_IDS) {
      const spec = loadExample(assetId) as SvgCompositionSpec;
      const asset = await composeSvgAsset(spec, SVG_PARTS);
      expect(recorded[asset.metadata.asset_id]).toBe(asset.metadata.svg_sha256);
    }
  });

  it("examples: seeded specs are registered as compositions in the bundle spec registry", () => {
    for (const id of EXPECTED_ASSET_IDS) {
      expect(SPEC_REGISTRY).toHaveProperty(id);
      expect(SPEC_REGISTRY[id]?.kind).toBe("composition");
    }
  });
});

describe("examples: seeded bundle references the new archetypes", () => {
  it("examples: library-quest validates with the new composition refs", () => {
    const validated = validateBundleManifest(seededBundle);
    const refsBySlot = new Map(
      validated.slots.map((slot) => [slot.slot, slot.refs.map((ref) => ref.id)]),
    );
    expect(refsBySlot.get("characters")).toContain("npc-prisoner");
    expect(refsBySlot.get("enemies")).toEqual(
      expect.arrayContaining(["enemy-goblin", "enemy-spectre", "boss-dragon"]),
    );
    expect(refsBySlot.get("props")).toContain("prop-set-library");
    expect(refsBySlot.get("fx")).toContain("fx-set");
  });

  it("examples: library-quest compiles every new ref without validation errors", async () => {
    const compiled = await compileBundle(seededBundle);
    // knight sheet (8) + npc-prisoner (1) + 3 enemy compositions +
    // lpc-style-character (1) + prop-set-library (1) +
    // walk-cycle sheet (1) + fx-set (1).
    expect(compiled.assets).toHaveLength(16);
    for (const id of EXPECTED_ASSET_IDS) {
      const asset = compiled.assets.find((candidate) => candidate.id === id);
      expect(asset, `missing compiled asset ${id}`).toBeDefined();
      expect(asset?.digest).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
