import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Phase 1 Red: the archetype part fixtures do not exist on disk yet.
// Fixtures load through fs (not static imports) so the suite stays
// importable for the post-Green phase-1 sentinel while the assertions
// below fail until the parts land.
import {
  type SvgPart,
  type SvgPartMetadata,
  validateSvgPart,
  validateSvgSource,
} from "./svg-assets";

const here = dirname(fileURLToPath(import.meta.url));
const partsRoot = resolve(here, "..", "assets", "svg-parts");

const METADATA_KEYS = [
  "version",
  "part_id",
  "slot",
  "source_file",
  "view_box",
  "anchors",
  "z_index",
  "palette_slots",
  "tags",
  "description",
] as const;

interface PartFixture {
  readonly path: string;
  readonly partId: string;
  readonly slot: string;
  readonly archetype: string;
  readonly theme: string;
}

function fixture(
  partId: string,
  slot: string,
  archetype: string,
  theme: string,
): PartFixture {
  return { path: `${slot}/${partId}`, partId, slot, archetype, theme };
}

const ARCHETYPE_FIXTURES: readonly PartFixture[] = [
  fixture("body-goblin", "body", "goblin", "ruins"),
  fixture("ears-goblin", "feature", "goblin", "ruins"),
  fixture("rags-goblin", "shirt", "goblin", "ruins"),
  fixture("club-goblin", "weapon", "goblin", "ruins"),
  fixture("body-spectre", "body", "spectre", "library"),
  fixture("eyes-spectre", "feature", "spectre", "library"),
  fixture("shroud-spectre", "shirt", "spectre", "library"),
  fixture("orb-spectre", "weapon", "spectre", "library"),
  fixture("body-dragon", "body", "dragon", "ruins"),
  fixture("wings-dragon", "feature", "dragon", "ruins"),
  fixture("plate-dragon", "shirt", "dragon", "ruins"),
  fixture("breath-dragon", "weapon", "dragon", "ruins"),
  fixture("body-prisoner", "body", "prisoner", "library"),
  fixture("hair-prisoner", "hair", "prisoner", "library"),
  fixture("tatters-prisoner", "shirt", "prisoner", "library"),
  fixture("shackles-prisoner", "weapon", "prisoner", "library"),
];

const PROP_FX_FIXTURES: readonly PartFixture[] = [
  fixture("chest-wood", "prop", "prop", "ruins"),
  fixture("gate-stone", "prop", "prop", "ruins"),
  fixture("potion-red", "prop", "prop", "library"),
  fixture("herb-green", "prop", "prop", "library"),
  fixture("projectile-fire", "fx", "fx", "ruins"),
  fixture("aura-magic", "fx", "fx", "library"),
];

const ALL_FIXTURES = [...ARCHETYPE_FIXTURES, ...PROP_FX_FIXTURES];

function loadFixture(item: PartFixture): SvgPart {
  const directory = resolve(partsRoot, item.path);
  let rawMetadata: string;
  let source: string;
  try {
    rawMetadata = readFileSync(resolve(directory, "part.json"), "utf8");
    source = readFileSync(resolve(directory, "part.svg"), "utf8");
  } catch {
    throw new Error(`part fixture missing on disk: ${item.path}`);
  }
  return validateSvgPart({
    metadata: JSON.parse(rawMetadata) as SvgPartMetadata,
    source,
  });
}

describe("archetype parts: safe-dialect validation", () => {
  it("archetype parts: every fixture exists and passes full part validation", () => {
    for (const item of ALL_FIXTURES) {
      const part = loadFixture(item);
      expect(part.metadata.part_id).toBe(item.partId);
      expect(part.metadata.slot).toBe(item.slot);
    }
    expect(ALL_FIXTURES).toHaveLength(22);
  });

  it("archetype parts: metadata carries the exact contract keys", () => {
    for (const item of ALL_FIXTURES) {
      const part = loadFixture(item);
      expect(Object.keys(part.metadata).sort()).toEqual([...METADATA_KEYS].sort());
    }
  });

  it("archetype parts: tags include the archetype and theme for catalog selection", () => {
    for (const item of ALL_FIXTURES) {
      const part = loadFixture(item);
      expect(part.metadata.tags).toContain(item.archetype);
      expect(part.metadata.tags).toContain(item.theme);
    }
  });

  it("archetype parts: every declared palette slot is referenced by the source", () => {
    for (const item of ALL_FIXTURES) {
      const part = loadFixture(item);
      const referenced = validateSvgSource(part.source, part.metadata);
      expect([...part.metadata.palette_slots].sort()).toEqual(referenced);
      expect(part.metadata.palette_slots.length).toBeGreaterThan(0);
    }
  });
});

describe("archetype parts: anchors", () => {
  it("archetype parts: character bodies expose the stable anchor set", () => {
    const bodies = ARCHETYPE_FIXTURES.filter((item) => item.slot === "body");
    expect(bodies).toHaveLength(4);
    for (const item of bodies) {
      const part = loadFixture(item);
      for (const anchor of ["root", "head", "torso", "hand"]) {
        expect(part.metadata.anchors).toHaveProperty(anchor);
      }
    }
  });

  it("archetype parts: attachable parts expose a root or grip anchor", () => {
    const attachable = ARCHETYPE_FIXTURES.filter((item) => item.slot !== "body");
    expect(attachable).toHaveLength(12);
    for (const item of attachable) {
      const part = loadFixture(item);
      const names = Object.keys(part.metadata.anchors);
      expect(names.some((name) => name === "root" || name === "grip")).toBe(true);
    }
  });

  it("archetype parts: props expose placement anchors and FX expose palette slots", () => {
    const props = PROP_FX_FIXTURES.filter((item) => item.slot === "prop");
    expect(props).toHaveLength(4);
    for (const item of props) {
      const part = loadFixture(item);
      expect(part.metadata.anchors).toHaveProperty("root");
    }
    const fx = PROP_FX_FIXTURES.filter((item) => item.slot === "fx");
    expect(fx).toHaveLength(2);
    for (const item of fx) {
      const part = loadFixture(item);
      expect(Object.keys(part.metadata.anchors).length).toBeGreaterThan(0);
      expect(part.metadata.palette_slots.length).toBeGreaterThan(0);
    }
  });
});
