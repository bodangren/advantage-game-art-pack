import { describe, expect, it } from "vitest";

import { SVG_PARTS } from "./catalog";
import { DEFAULT_SPEC } from "./default-spec";
// Phase 1 Red: the directional module does not exist yet; these tests
// define its contract and must fail until the production module lands.
import {
  DirectionalValidationError,
  compileDirectionalSheets,
  expandDirectionalSpec,
  validateDirectionalSpec,
} from "./directional";

const BASE_COMPOSITION = {
  ...DEFAULT_SPEC,
  parts: DEFAULT_SPEC.parts.map((part) => ({ ...part })),
};

const ATLAS_OPTIONS = { cols: 2, frame_w: 32, frame_h: 32 } as const;

const KNIGHT_SPEC = {
  version: 1 as const,
  id: "knight",
  direction_set: "4-way" as const,
  animations: {
    walk: {
      frame_count: 2,
      duration_ms: 120,
      composition: BASE_COMPOSITION,
      directions: {
        south: {
          frames: [
            { overrides: { parts: [{ id: "sword", rotate: 15, offset: [2, 1] }] } },
            { overrides: { parts: [{ id: "sword", rotate: -15, offset: [-2, 1] }] } },
          ],
        },
        north: {
          frames: [
            { overrides: { parts: [{ id: "sword", rotate: 10 }] } },
            { overrides: { parts: [{ id: "sword", rotate: -10 }] } },
          ],
        },
        east: {
          frames: [
            { overrides: { parts: [{ id: "sword", offset: [3, 0] }] } },
            { overrides: { parts: [{ id: "sword", offset: [-3, 0] }] } },
          ],
        },
        west: { mirror_of: "east", flip: "horizontal" as const },
      },
    },
  },
};

describe("directional: contract-first validation", () => {
  it("directional: rejects empty animations map", () => {
    const attempt = () =>
      validateDirectionalSpec({
        version: 1,
        id: "knight",
        direction_set: "4-way",
        animations: {},
      });
    expect(attempt).toThrow(DirectionalValidationError);
    expect(attempt).toThrow(/animations must be a non-empty object/);
  });

  it("directional: rejects unknown direction_set", () => {
    const attempt = () =>
      validateDirectionalSpec({ ...KNIGHT_SPEC, direction_set: "5-way" });
    expect(attempt).toThrow(DirectionalValidationError);
    expect(attempt).toThrow(/direction_set must be one of/);
  });

  it("directional: rejects a missing direction", () => {
    const spec = structuredClone(KNIGHT_SPEC) as Record<string, any>;
    delete spec.animations.walk.directions.west;
    const attempt = () => validateDirectionalSpec(spec);
    expect(attempt).toThrow(DirectionalValidationError);
    expect(attempt).toThrow(/missing direction/);
  });

  it("directional: rejects an unknown extra direction", () => {
    const spec = structuredClone(KNIGHT_SPEC) as Record<string, any>;
    spec.animations.walk.directions["north-north"] = { frames: [] };
    const attempt = () => validateDirectionalSpec(spec);
    expect(attempt).toThrow(DirectionalValidationError);
    expect(attempt).toThrow(/unknown direction/);
  });

  it("directional: rejects inconsistent frame counts across directions", () => {
    const spec = structuredClone(KNIGHT_SPEC) as Record<string, any>;
    spec.animations.walk.directions.south.frames = [
      { overrides: { parts: [{ id: "sword", rotate: 15 }] } },
    ];
    const attempt = () => validateDirectionalSpec(spec);
    expect(attempt).toThrow(DirectionalValidationError);
    expect(attempt).toThrow(/frame count/);
  });

  it("directional: rejects undeclared flip rules", () => {
    const spec = structuredClone(KNIGHT_SPEC) as Record<string, any>;
    spec.animations.walk.directions.west = {
      mirror_of: "east",
      flip: "vertical",
    };
    const attempt = () => validateDirectionalSpec(spec);
    expect(attempt).toThrow(DirectionalValidationError);
    expect(attempt).toThrow(/flip must be "horizontal"/);
  });

  it("directional: rejects mirror_of pointing at another mirror", () => {
    const spec = structuredClone(KNIGHT_SPEC) as Record<string, any>;
    spec.animations.walk.directions.east = {
      mirror_of: "south",
      flip: "horizontal",
    };
    const attempt = () => validateDirectionalSpec(spec);
    expect(attempt).toThrow(DirectionalValidationError);
    expect(attempt).toThrow(/mirror_of must reference an explicit direction/);
  });

  it("directional: accepts a valid 4-way spec", () => {
    const validated = validateDirectionalSpec(KNIGHT_SPEC);
    expect(validated.id).toBe("knight");
    expect(validated.direction_set).toBe("4-way");
    expect(Object.keys(validated.animations)).toEqual(["walk"]);
    const walk = validated.animations.walk;
    expect(walk?.frame_count).toBe(2);
    expect(Object.keys(walk?.directions ?? {})).toEqual([
      "north",
      "south",
      "east",
      "west",
    ]);
  });
});

describe("directional: expansion", () => {
  it("directional: expansion yields one stable timeline id per direction", () => {
    const expanded = expandDirectionalSpec(validateDirectionalSpec(KNIGHT_SPEC));
    expect(expanded).toHaveLength(1);
    const [walk] = expanded;
    expect(walk?.animation).toBe("walk");
    expect(walk?.timelines.map((timeline) => timeline.timeline_id)).toEqual([
      "knight-walk-north",
      "knight-walk-south",
      "knight-walk-east",
      "knight-walk-west",
    ]);
    const west = walk?.timelines.find((timeline) => timeline.direction === "west");
    expect(west?.flip).toBe("horizontal");
    expect(west?.spec.frames.map((frame) => frame.id)).toEqual([
      "walk-west-1",
      "walk-west-2",
    ]);
  });

  it("directional: expansion rejects unknown part references", () => {
    const spec = structuredClone(KNIGHT_SPEC) as Record<string, any>;
    spec.animations.walk.composition = {
      ...BASE_COMPOSITION,
      parts: [
        ...BASE_COMPOSITION.parts.slice(0, 3),
        { id: "sword", part_id: "unknown-part" },
      ],
    };
    const attempt = () =>
      expandDirectionalSpec(validateDirectionalSpec(spec));
    expect(attempt).toThrow(/unknown SVG part/);
  });
});

describe("directional: determinism and sheets", () => {
  it("directional: identical input yields byte-identical sheets and digests", async () => {
    const first = await compileDirectionalSheets(KNIGHT_SPEC, SVG_PARTS, ATLAS_OPTIONS);
    const second = await compileDirectionalSheets(KNIGHT_SPEC, SVG_PARTS, ATLAS_OPTIONS);
    expect(first.sheets).toHaveLength(4);
    for (const [index, sheet] of first.sheets.entries()) {
      expect(sheet.sheet_svg).toBe(second.sheets[index]?.sheet_svg);
      expect(sheet.atlas_json.sheet_digest).toBe(
        second.sheets[index]?.atlas_json.sheet_digest,
      );
    }
    expect(first.manifest.manifest_digest).toBe(second.manifest.manifest_digest);
    expect(first.manifest.manifest_digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("directional: mirrored sheet differs from its source and carries the flip", async () => {
    const compiled = await compileDirectionalSheets(KNIGHT_SPEC, SVG_PARTS, ATLAS_OPTIONS);
    const east = compiled.sheets.find((sheet) => sheet.direction === "east");
    const west = compiled.sheets.find((sheet) => sheet.direction === "west");
    expect(west?.flip).toBe("horizontal");
    expect(west?.atlas_json.sheet_digest).not.toBe(east?.atlas_json.sheet_digest);
    for (const frame of west?.frames ?? []) {
      expect(frame.svg).toContain("scale(-1 1)");
    }
    // Mirrored frames are re-digested: digest matches sha256 of the
    // mirrored svg, not the source frame's digest.
    const [westFrame] = west?.frames ?? [];
    const [eastFrame] = east?.frames ?? [];
    expect(westFrame?.digest).not.toBe(eastFrame?.digest);
  });

  it("directional: manifest lists every sheet with frames, rects, and digests", async () => {
    const compiled = await compileDirectionalSheets(KNIGHT_SPEC, SVG_PARTS, ATLAS_OPTIONS);
    expect(compiled.manifest.version).toBe(1);
    expect(compiled.manifest.id).toBe("knight");
    expect(compiled.manifest.direction_set).toBe("4-way");
    expect(compiled.manifest.sheets).toHaveLength(4);
    for (const entry of compiled.manifest.sheets) {
      expect(entry.frame_count).toBe(2);
      expect(entry.frame_digests).toHaveLength(2);
      for (const digest of entry.frame_digests) {
        expect(digest).toMatch(/^[a-f0-9]{64}$/);
      }
      expect(entry.sheet_digest).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.phaser_load.key).toBe(`knight-walk-${entry.direction}`);
    }
  });

  it("directional: manifest survives a JSON round-trip deep-equal", async () => {
    const compiled = await compileDirectionalSheets(KNIGHT_SPEC, SVG_PARTS, ATLAS_OPTIONS);
    expect(JSON.parse(JSON.stringify(compiled.manifest))).toEqual(
      compiled.manifest,
    );
  });
});

describe("directional: phase-1 vacuity sentinel", () => {
  it("directional: fixture exercises mirrors so vacuous passes are detectable", () => {
    const west = KNIGHT_SPEC.animations.walk.directions.west;
    expect(west).toHaveProperty("mirror_of", "east");
    expect(west).toHaveProperty("flip", "horizontal");
  });
});
