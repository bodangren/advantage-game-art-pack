import { describe, expect, it } from "vitest";

import { sha256 } from "./svg-assets";
import { SVG_PARTS } from "./catalog";
import { DEFAULT_SPEC } from "./default-spec";
// Phase 3 Green: both contracts now resolve against production
// modules; the Phase 1 `__tests__/` stubs were deleted when
// `src/lib/timeline.ts` (Phase 2) and `src/lib/atlas.ts` (Phase 3)
// landed.
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
  // Named timeline: packAtlas uses `id` as the Phaser load key (this is
  // what makes the frozen `key: "walk-cycle"` contract below achievable;
  // Phase 1 authored the fixture without the field — see the Phase 3
  // deviation note in the track metadata).
  id: "walk-cycle",
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

    // Use the real sha256 helper from src/lib/svg-assets (per §4.5
    // of the Phase 1 test strategy). The helper is the canonical
    // digest algorithm; no hand-rolled hex literals or third-party
    // crypto.
    const expectedDigest = await sha256(first.sheet_svg);

    expect(first.atlas_json.sheet_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.atlas_json.sheet_digest).toBe(expectedDigest);
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

describe("atlas: json round-trip", () => {
  it("atlas: atlas_json survives a JSON round-trip deep-equal", async () => {
    const timeline = await compileTimeline(TWO_FRAME_TIMELINE, SVG_PARTS);
    const packed = await packAtlas(timeline, {
      cols: 2,
      frame_w: 32,
      frame_h: 32,
    });
    expect(JSON.parse(JSON.stringify(packed.atlas_json))).toEqual(
      packed.atlas_json,
    );
  });
});

describe("atlas: sheet safety", () => {
  it("atlas: sheet svg contains no script, style, event, or external references", async () => {
    const timeline = await compileTimeline(TWO_FRAME_TIMELINE, SVG_PARTS);
    const packed = await packAtlas(timeline, {
      cols: 2,
      frame_w: 32,
      frame_h: 32,
    });
    expect(packed.sheet_svg).not.toMatch(/<\s*script/i);
    expect(packed.sheet_svg).not.toMatch(/<\s*style/i);
    expect(packed.sheet_svg).not.toMatch(/\son[a-z-]+\s*=/i);
    expect(packed.sheet_svg).not.toMatch(/javascript:/i);
    expect(packed.sheet_svg).not.toMatch(/url\(/i);
  });

  it("atlas: malicious frame content is rejected by the packer", async () => {
    const timeline = await compileTimeline(TWO_FRAME_TIMELINE, SVG_PARTS);
    const [frame0, frame1] = timeline.frames;
    if (!frame0 || !frame1) throw new Error("missing frames");
    const evil = {
      id: timeline.id,
      frames: [
        {
          ...frame0,
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><script>alert(1)</script></svg>',
        },
        frame1,
      ],
    };
    await expect(
      packAtlas(evil, { cols: 2, frame_w: 32, frame_h: 32 }),
    ).rejects.toThrow(AtlasValidationError);
  });
});

describe("atlas: palette resolution", () => {
  it("atlas: sheet inlines every palette reference with no orphan vars", async () => {
    const timeline = await compileTimeline(
      {
        version: 1 as const,
        id: "walk-cycle",
        frames: [
          {
            id: "walk-1",
            duration_ms: 120,
            composition: BASE_COMPOSITION,
            overrides: { palette: { skin: "#abcdef" } },
          },
          { id: "walk-2", duration_ms: 120, composition: BASE_COMPOSITION },
        ],
      },
      SVG_PARTS,
    );
    const packed = await packAtlas(timeline, {
      cols: 2,
      frame_w: 32,
      frame_h: 32,
    });
    // No unresolved var() refs survive into the sheet.
    expect(packed.sheet_svg).not.toMatch(/var\(--/);
    // The overridden frame value and the base frame value both land inline.
    expect(packed.sheet_svg).toContain("#abcdef");
    expect(packed.sheet_svg).toContain("#f2c18d");
  });
});

describe("atlas: layout ordering", () => {
  it("atlas: frame rects sort by id before layout, shuffled input yields equal rects", async () => {
    const shuffled = {
      version: 1 as const,
      id: "walk-cycle",
      frames: [TWO_FRAME_TIMELINE.frames[1]!, TWO_FRAME_TIMELINE.frames[0]!],
    };
    const options = { cols: 2, frame_w: 32, frame_h: 32 };
    const base = await packAtlas(
      await compileTimeline(TWO_FRAME_TIMELINE, SVG_PARTS),
      options,
    );
    const mixed = await packAtlas(
      await compileTimeline(shuffled, SVG_PARTS),
      options,
    );
    expect(mixed.atlas_json.frame_rects).toEqual(base.atlas_json.frame_rects);
    expect(mixed.atlas_json.durations_ms).toEqual(base.atlas_json.durations_ms);
  });
});

describe("atlas: negative paths", () => {
  it("atlas: packer throws on a timeline with zero frames", async () => {
    await expect(
      packAtlas({ id: "empty", frames: [] }, { cols: 2, frame_w: 32, frame_h: 32 }),
    ).rejects.toThrow(AtlasValidationError);
  });

  it("atlas: packer throws on an unnamed timeline", async () => {
    const timeline = await compileTimeline(
      { version: 1 as const, frames: [TWO_FRAME_TIMELINE.frames[0]!] },
      SVG_PARTS,
    );
    await expect(
      packAtlas(timeline, { cols: 1, frame_w: 32, frame_h: 32 }),
    ).rejects.toThrow(/timeline\.id/);
  });

  it("atlas: rejects metadata with a non-hex digest", () => {
    expect(() =>
      validateAtlasMetadata({
        version: 1,
        frames: [
          { id: "f", x: 0, y: 0, width: 32, height: 32, duration_ms: 100 },
        ],
        digest: "not-hex",
      }),
    ).toThrow(/sheet_digest/);
  });
});
