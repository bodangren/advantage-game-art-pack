import { describe, expect, it } from "vitest";

import { SVG_PARTS, SVG_PARTS_BY_ID } from "./catalog";
import { DEFAULT_SPEC } from "./default-spec";
// Phase 1 Red imports resolve through the `__tests__/` stub. The
// stub satisfies `tsc --noEmit` and throws a deterministic Error at
// runtime, so each test below fails at the assertion level (not at
// suite/import level). Phase 2 (Timeline Compiler) Green replaces
// this import with `./timeline` once the production module lands
// and the stub is deleted.
import {
  TimelineValidationError,
  compileTimeline,
  validateTimelineSpec,
} from "./__tests__/timeline";

const BASE_COMPOSITION = {
  ...DEFAULT_SPEC,
  parts: DEFAULT_SPEC.parts.map((part) => ({ ...part })),
};

const TWO_FRAME_SPEC = {
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
} as const;

describe("timeline: contract-first validation", () => {
  it("timeline: rejects empty frame list", () => {
    expect(() =>
      validateTimelineSpec({ version: 1, frames: [] }),
    ).toThrow(TimelineValidationError);
    expect(() =>
      validateTimelineSpec({ version: 1, frames: [] }),
    ).toThrow(/timeline\.frames must be a non-empty array/);
  });

  it("timeline: rejects unknown part_id against sample library", () => {
    const badComposition = {
      ...BASE_COMPOSITION,
      parts: [{ id: "body", part_id: "unknown-part" }],
    };
    expect(() =>
      validateTimelineSpec({
        version: 1,
        frames: [{ id: "f1", duration_ms: 100, composition: badComposition }],
      }),
    ).toThrow(TimelineValidationError);
    expect(() =>
      validateTimelineSpec({
        version: 1,
        frames: [{ id: "f1", duration_ms: 100, composition: badComposition }],
      }),
    ).toThrow(/unknown SVG part/);
  });

  it("timeline: rejects non-positive frame duration", () => {
    expect(() =>
      validateTimelineSpec({
        version: 1,
        frames: [{ id: "f1", duration_ms: 0, composition: BASE_COMPOSITION }],
      }),
    ).toThrow(TimelineValidationError);
    expect(() =>
      validateTimelineSpec({
        version: 1,
        frames: [{ id: "f1", duration_ms: -1, composition: BASE_COMPOSITION }],
      }),
    ).toThrow(/duration_ms must be positive/);
  });

  it("timeline: rejects duplicate stable frame ids", () => {
    expect(() =>
      validateTimelineSpec({
        version: 1,
        frames: [
          { id: "f1", duration_ms: 100, composition: BASE_COMPOSITION },
          { id: "f1", duration_ms: 100, composition: BASE_COMPOSITION },
        ],
      }),
    ).toThrow(TimelineValidationError);
    expect(() =>
      validateTimelineSpec({
        version: 1,
        frames: [
          { id: "f1", duration_ms: 100, composition: BASE_COMPOSITION },
          { id: "f1", duration_ms: 100, composition: BASE_COMPOSITION },
        ],
      }),
    ).toThrow(/duplicate frame id/);
  });

  it("timeline: rejects unknown anchor reference", () => {
    const badComposition = {
      ...BASE_COMPOSITION,
      parts: [
        {
          ...BASE_COMPOSITION.parts[0],
          anchor: "nonexistent-anchor",
        },
      ],
    };
    expect(() =>
      validateTimelineSpec({
        version: 1,
        frames: [{ id: "f1", duration_ms: 100, composition: badComposition }],
      }),
    ).toThrow(TimelineValidationError);
    expect(() =>
      validateTimelineSpec({
        version: 1,
        frames: [{ id: "f1", duration_ms: 100, composition: badComposition }],
      }),
    ).toThrow(/unknown anchor/);
  });

  it("timeline: accepts valid two-frame spec", () => {
    const validated = validateTimelineSpec(TWO_FRAME_SPEC);
    expect(validated.frames).toHaveLength(2);
    const [first, second] = validated.frames;
    expect(first?.id).toBe("walk-1");
    expect(second?.id).toBe("walk-2");
    expect(validated.frames.map((f) => f.id)).toEqual(["walk-1", "walk-2"]);
  });
});

describe("timeline: determinism", () => {
  it("timeline: identical input yields byte-identical frame SVGs", async () => {
    const first = await compileTimeline(TWO_FRAME_SPEC, SVG_PARTS);
    const second = await compileTimeline(TWO_FRAME_SPEC, SVG_PARTS);

    expect(first.frames).toHaveLength(2);
    expect(second.frames).toHaveLength(2);
    const [firstFrame0, firstFrame1] = first.frames;
    const [secondFrame0, secondFrame1] = second.frames;
    expect(firstFrame0?.svg).toBe(secondFrame0?.svg);
    expect(firstFrame1?.svg).toBe(secondFrame1?.svg);
    expect(firstFrame0?.svg).toContain('viewBox="0 0 64 64"');
    expect(firstFrame0?.svg).toContain("matrix(1 0 0 1");
    expect(firstFrame0?.svg).toContain("--hair: #6b3e26;");
  });

  it("timeline: identical input yields identical per-frame digests", async () => {
    const first = await compileTimeline(TWO_FRAME_SPEC, SVG_PARTS);
    const second = await compileTimeline(TWO_FRAME_SPEC, SVG_PARTS);

    const [firstFrame0, firstFrame1] = first.frames;
    const [secondFrame0, secondFrame1] = second.frames;
    expect(firstFrame0?.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(firstFrame0?.digest).toBe(secondFrame0?.digest);
    expect(firstFrame1?.digest).toBe(secondFrame1?.digest);
  });

  it("timeline: per-frame palette override changes the digest", async () => {
    const base = await compileTimeline(TWO_FRAME_SPEC, SVG_PARTS);
    const overridden = await compileTimeline(
      {
        version: 1,
        frames: [
          {
            id: "walk-1",
            duration_ms: 120,
            composition: {
              ...BASE_COMPOSITION,
              palette: { ...BASE_COMPOSITION.palette, hair: "#abcdef" },
            },
          },
        ],
      },
      SVG_PARTS,
    );

    const [baseFrame0] = base.frames;
    const [overriddenFrame0] = overridden.frames;
    expect(overriddenFrame0?.digest).not.toBe(baseFrame0?.digest);
    expect(overriddenFrame0?.svg).toContain("--hair: #abcdef;");
  });
});

describe("timeline: phase-1 vacuity sentinel", () => {
  it("timeline: part library is populated so vacuous passes are detectable", () => {
    expect(SVG_PARTS_BY_ID.size).toBeGreaterThanOrEqual(2);
    expect(SVG_PARTS_BY_ID.has("body-base")).toBe(true);
    expect(SVG_PARTS_BY_ID.has("shirt-tunic")).toBe(true);
  });
});