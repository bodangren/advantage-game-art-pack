import { describe, expect, it } from "vitest";

import knightExample from "../../examples/directional/knight.json";
import frozenManifest from "../../examples/directional/knight.manifest.json";

import { SVG_PARTS } from "./catalog";
import {
  compileDirectionalSheets,
  expandDirectionalSpec,
  validateDirectionalSpec,
} from "./directional";

// The example atlas options are part of the frozen contract: every
// direction sheet is a single 4-column row of 32x32 frames.
const KNIGHT_ATLAS_OPTIONS = { cols: 4, frame_w: 32, frame_h: 32 } as const;

describe("examples: knight directional sheet", () => {
  it("examples: knight example parses through validateDirectionalSpec", () => {
    const validated = validateDirectionalSpec(knightExample);
    expect(validated.id).toBe("knight");
    expect(validated.direction_set).toBe("4-way");
    expect(Object.keys(validated.animations)).toEqual(["idle", "walk"]);
  });

  it("examples: knight example expands to walk and idle in four directions", () => {
    const expanded = expandDirectionalSpec(validateDirectionalSpec(knightExample));
    expect(expanded.map((animation) => animation.animation)).toEqual([
      "idle",
      "walk",
    ]);
    for (const animation of expanded) {
      expect(animation.timelines).toHaveLength(4);
      expect(
        animation.timelines.map((timeline) => timeline.direction),
      ).toEqual(["north", "south", "east", "west"]);
    }
    const walk = expanded.find((animation) => animation.animation === "walk");
    expect(walk?.timelines[0]?.timeline_id).toBe("knight-walk-north");
  });

  it("examples: knight sheet manifest matches the frozen fixture", async () => {
    const compiled = await compileDirectionalSheets(
      knightExample,
      SVG_PARTS,
      KNIGHT_ATLAS_OPTIONS,
    );
    expect(compiled.manifest).toEqual(frozenManifest);
  });

  it("examples: knight sheets are deterministic across runs", async () => {
    const first = await compileDirectionalSheets(
      knightExample,
      SVG_PARTS,
      KNIGHT_ATLAS_OPTIONS,
    );
    const second = await compileDirectionalSheets(
      knightExample,
      SVG_PARTS,
      KNIGHT_ATLAS_OPTIONS,
    );
    expect(first.manifest.manifest_digest).toBe(second.manifest.manifest_digest);
    for (const [index, sheet] of first.sheets.entries()) {
      expect(sheet.sheet_svg).toBe(second.sheets[index]?.sheet_svg);
    }
  });
});

describe("desk: knight preview data", () => {
  it("desk: every sheet exposes frames for selector playback", async () => {
    const compiled = await compileDirectionalSheets(
      knightExample,
      SVG_PARTS,
      KNIGHT_ATLAS_OPTIONS,
    );
    const walkSheets = compiled.sheets.filter(
      (sheet) => sheet.animation === "walk",
    );
    const idleSheets = compiled.sheets.filter(
      (sheet) => sheet.animation === "idle",
    );
    expect(walkSheets).toHaveLength(4);
    expect(idleSheets).toHaveLength(4);
    for (const sheet of walkSheets) {
      expect(sheet.frames).toHaveLength(4);
    }
    for (const sheet of idleSheets) {
      expect(sheet.frames).toHaveLength(2);
    }
  });
});
