import { describe, expect, it } from "vitest";

import walkCycleExample from "../../examples/animation/walk-cycle.json";
import frozenFrameDigests from "../../examples/animation/walk-cycle.frame-digests.json";
import frozenAtlas from "../../examples/animation/walk-cycle.atlas.json";
import frozenPhaserLoad from "../../examples/animation/atlas-phaser.json";

import { packAtlas } from "./atlas";
import { SVG_PARTS } from "./catalog";
import { compileTimeline, validateTimelineSpec } from "./timeline";

// The example atlas options are part of the frozen contract: 4 frames in
// a single row (see test-strategy §15, cols: 4 default).
const EXAMPLE_ATLAS_OPTIONS = { cols: 4, frame_w: 32, frame_h: 32 } as const;

describe("examples: walk-cycle timeline", () => {
  it("examples: walk-cycle parses through validateTimelineSpec", () => {
    const validated = validateTimelineSpec(walkCycleExample);
    expect(validated.id).toBe("walk-cycle");
    expect(validated.frames.map((frame) => frame.id)).toEqual([
      "walk-1",
      "walk-2",
      "walk-3",
      "walk-4",
    ]);
  });

  it("examples: walk-cycle has at least four frames", () => {
    const validated = validateTimelineSpec(walkCycleExample);
    expect(Number.isInteger(validated.frames.length)).toBe(true);
    expect(validated.frames.length).toBeGreaterThanOrEqual(4);
  });

  it("examples: walk-cycle per-frame digests match the frozen fixture", async () => {
    const compiled = await compileTimeline(walkCycleExample, SVG_PARTS);
    const actual = compiled.frames.map((frame) => ({
      id: frame.id,
      digest: frame.digest,
    }));
    expect(actual).toEqual(frozenFrameDigests.frames);
  });

  it("examples: walk-cycle atlas metadata matches the frozen fixture", async () => {
    const compiled = await compileTimeline(walkCycleExample, SVG_PARTS);
    const packed = await packAtlas(compiled, EXAMPLE_ATLAS_OPTIONS);
    expect(packed.atlas_json).toEqual(frozenAtlas);
  });

  it("examples: walk-cycle phaser load matches the frozen contract fixture", async () => {
    const compiled = await compileTimeline(walkCycleExample, SVG_PARTS);
    const packed = await packAtlas(compiled, EXAMPLE_ATLAS_OPTIONS);
    expect(packed.phaser_load).toEqual(frozenPhaserLoad);
  });
});

describe("desk: walk-cycle preview data", () => {
  it("desk: example compiles and packs deterministically for the desk preview", async () => {
    const first = await packAtlas(
      await compileTimeline(walkCycleExample, SVG_PARTS),
      EXAMPLE_ATLAS_OPTIONS,
    );
    const second = await packAtlas(
      await compileTimeline(walkCycleExample, SVG_PARTS),
      EXAMPLE_ATLAS_OPTIONS,
    );
    expect(first.atlas_json.frame_count).toBe(frozenFrameDigests.frames.length);
    expect(first.sheet_svg).toBe(second.sheet_svg);
    expect(first.atlas_json.sheet_digest).toBe(second.atlas_json.sheet_digest);
  });
});
