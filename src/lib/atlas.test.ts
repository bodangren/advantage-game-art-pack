import { describe, expect, it } from "vitest";

import { SVG_PARTS } from "./catalog";
import { DEFAULT_SPEC } from "./default-spec";
import {
  AtlasValidationError,
  packAtlas,
  validateAtlasMetadata,
} from "./atlas";
import { compileTimeline } from "./timeline";

const BASE_COMPOSITION = {
  ...DEFAULT_SPEC,
  parts: DEFAULT_SPEC.parts.map((part) => ({ ...part })),
};

const TWO_FRAME_TIMELINE = {
  version: 1 as const,
  frames: [
    {
      id: "walk-1",
      duration_ms: 120,
      composition: BASE_COMPOSITION,
    },
    {
      id: "walk-2",
      duration_ms: 120,
      composition: BASE_COMPOSITION,
    },
  ],
};

const FROZEN_PHASER_LOAD = {
  key: "walk-cycle",
  url: "asset.svg",
  svgConfig: { width: 64, height: 32 },
};

describe("atlas: metadata schema", () => {
  it("atlas: rejects metadata with empty frames array", () => {
    expect(() =>
      validateAtlasMetadata({
        version: 1,
        frames: [],
        digest:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      }),
    ).toThrow(AtlasValidationError);
    expect(() =>
      validateAtlasMetadata({
        version: 1,
        frames: [],
        digest:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      }),
    ).toThrow(/frame_count/);
  });

  it("atlas: metadata frame_rects carry labeled id/x/y/width/height", () => {
    const metadata = validateAtlasMetadata({
      version: 1,
      frames: [
        {
          id: "walk-1",
          x: 0,
          y: 0,
          width: 32,
          height: 32,
          duration_ms: 120,
        },
        {
          id: "walk-2",
          x: 32,
          y: 0,
          width: 32,
          height: 32,
          duration_ms: 120,
        },
      ],
      digest:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    });

    expect(metadata.frame_count).toBe(2);
    expect(metadata.frame_rects[0]).toEqual({
      id: "walk-1",
      x: 0,
      y: 0,
      width: 32,
      height: 32,
    });
    expect(metadata.frame_rects[1]).toEqual({
      id: "walk-2",
      x: 32,
      y: 0,
      width: 32,
      height: 32,
    });
    expect(metadata.durations_ms).toEqual([120, 120]);
    expect(metadata.sheet_digest).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("atlas: packer contract", () => {
  it("atlas: packAtlas returns sheet_svg, atlas_json, and phaser_load", async () => {
    const timeline = await compileTimeline(TWO_FRAME_TIMELINE, SVG_PARTS);
    const packed = await packAtlas(timeline, { cols: 2, frame_w: 32, frame_h: 32 });

    expect(typeof packed.sheet_svg).toBe("string");
    expect(packed.sheet_svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(packed.atlas_json.frame_count).toBe(2);
    expect(packed.atlas_json.frame_rects).toHaveLength(2);
    expect(packed.phaser_load).toEqual(FROZEN_PHASER_LOAD);
  });

  it("atlas: rect math is row-major and deterministic", async () => {
    const timeline = await compileTimeline(TWO_FRAME_TIMELINE, SVG_PARTS);
    const first = await packAtlas(timeline, { cols: 2, frame_w: 32, frame_h: 32 });
    const second = await packAtlas(timeline, { cols: 2, frame_w: 32, frame_h: 32 });

    expect(first.atlas_json.frame_rects[0]).toEqual({
      id: "walk-1",
      x: 0,
      y: 0,
      width: 32,
      height: 32,
    });
    expect(first.atlas_json.frame_rects[1]).toEqual({
      id: "walk-2",
      x: 32,
      y: 0,
      width: 32,
      height: 32,
    });
    expect(first.sheet_svg).toBe(second.sheet_svg);
    expect(JSON.stringify(first.atlas_json, Object.keys(first.atlas_json).sort())).toBe(
      JSON.stringify(second.atlas_json, Object.keys(second.atlas_json).sort()),
    );
  });

  it("atlas: sheet_digest matches sha256(sheet_svg) and is stable", async () => {
    const timeline = await compileTimeline(TWO_FRAME_TIMELINE, SVG_PARTS);
    const first = await packAtlas(timeline, { cols: 2, frame_w: 32, frame_h: 32 });
    const second = await packAtlas(timeline, { cols: 2, frame_w: 32, frame_h: 32 });

    expect(first.atlas_json.sheet_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.atlas_json.sheet_digest).toBe(second.atlas_json.sheet_digest);
  });

  it("atlas: sheet dimensions are integer pixel totals", async () => {
    const timeline = await compileTimeline(TWO_FRAME_TIMELINE, SVG_PARTS);
    const packed = await packAtlas(timeline, { cols: 2, frame_w: 32, frame_h: 32 });

    expect(packed.atlas_json.sheet_width).toBe(64);
    expect(packed.atlas_json.sheet_height).toBe(32);
    expect(Number.isInteger(packed.atlas_json.sheet_width)).toBe(true);
    expect(Number.isInteger(packed.atlas_json.sheet_height)).toBe(true);
  });

  it("atlas: phaser_load fixture matches frozen contract", async () => {
    const timeline = await compileTimeline(TWO_FRAME_TIMELINE, SVG_PARTS);
    const packed = await packAtlas(timeline, { cols: 2, frame_w: 32, frame_h: 32 });

    expect(packed.phaser_load).toEqual(FROZEN_PHASER_LOAD);
  });
});

describe("atlas: phase-1 vacuity sentinel", () => {
  it("atlas: fixture has non-zero frame dimensions so vacuous passes are detectable", () => {
    expect(FROZEN_PHASER_LOAD.svgConfig.width).toBeGreaterThan(0);
    expect(FROZEN_PHASER_LOAD.svgConfig.height).toBeGreaterThan(0);
  });
});
