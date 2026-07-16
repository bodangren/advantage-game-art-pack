import { describe, expect, it } from "vitest";

import { SVG_PARTS, SVG_PARTS_BY_ID } from "./catalog";
import { DEFAULT_SPEC } from "./default-spec";
import { sha256 } from "./svg-assets";
// Phase 2 Green: the timeline contract now resolves against the
// production module; the Phase 1 `__tests__/` stub was deleted when
// `src/lib/timeline.ts` landed.
import {
  type TimelineCompilation,
  TimelineValidationError,
  compileTimeline,
  validateTimelineSpec,
} from "./timeline";

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

describe("timeline: per-frame overrides", () => {
  it("timeline: part swap override affects only the named placement", async () => {
    const spec = {
      version: 1 as const,
      frames: [
        {
          id: "walk-1",
          duration_ms: 120,
          composition: BASE_COMPOSITION,
          overrides: { parts: [{ id: "sword", part_id: "shirt-tunic" }] },
        },
        { id: "walk-2", duration_ms: 120, composition: BASE_COMPOSITION },
      ],
    };
    const compiled = await compileTimeline(spec, SVG_PARTS);
    const [swapped, sibling] = compiled.frames;

    // The named placement carries the swapped part.
    expect(swapped?.svg).toContain('id="sword" data-part-id="shirt-tunic"');
    // Sibling placements are untouched.
    expect(swapped?.svg).toContain('id="shirt" data-part-id="shirt-tunic"');
    expect(swapped?.svg).toContain('id="body" data-part-id="body-base"');
    // The sibling frame retains the base spec's part.
    expect(sibling?.svg).toContain('id="sword" data-part-id="sword-basic"');
    expect(swapped?.digest).not.toBe(sibling?.digest);
    // The override merge does not mutate the base spec object.
    expect(BASE_COMPOSITION.parts[3]?.part_id).toBe("sword-basic");
    expect(spec.frames[0]?.composition.parts[3]?.part_id).toBe("sword-basic");
  });

  it("timeline: placement offset override shifts only the named placement", async () => {
    const transformOf = (svg: string, id: string): number[] => {
      const match = svg.match(
        new RegExp(`<g id="${id}"[^>]*transform="matrix\\(([^)]+)\\)"`),
      );
      const captured = match?.[1];
      if (!captured) throw new Error(`no transform found for group ${id}`);
      return captured.split(" ").map(Number);
    };

    const base = await compileTimeline(TWO_FRAME_SPEC, SVG_PARTS);
    const shifted = await compileTimeline(
      {
        version: 1 as const,
        frames: [
          {
            id: "walk-1",
            duration_ms: 120,
            composition: BASE_COMPOSITION,
            overrides: { parts: [{ id: "sword", offset: [3, -2] }] },
          },
        ],
      },
      SVG_PARTS,
    );

    const [baseFrame] = base.frames;
    const [shiftedFrame] = shifted.frames;
    if (!baseFrame || !shiftedFrame) throw new Error("missing frames");
    expect(shiftedFrame.digest).not.toBe(baseFrame.digest);
    const baseTransform = transformOf(baseFrame.svg, "sword");
    const shiftedTransform = transformOf(shiftedFrame.svg, "sword");
    expect(shiftedTransform[4]! - baseTransform[4]!).toBe(3);
    expect(shiftedTransform[5]! - baseTransform[5]!).toBe(-2);
    // Untouched placements keep byte-identical transforms.
    expect(transformOf(shiftedFrame.svg, "body")).toEqual(
      transformOf(baseFrame.svg, "body"),
    );
  });

  it("timeline: palette override lands in the frame style block", async () => {
    const overridden = await compileTimeline(
      {
        version: 1 as const,
        frames: [
          {
            id: "walk-1",
            duration_ms: 120,
            composition: BASE_COMPOSITION,
            overrides: { palette: { skin: "#abcdef" } },
          },
        ],
      },
      SVG_PARTS,
    );
    const [frame] = overridden.frames;
    expect(frame?.svg).toContain("--skin: #abcdef;");
    // Untouched slots keep their base values.
    expect(frame?.svg).toContain("--hair: #6b3e26;");
  });

  it("timeline: override referencing unknown placement throws typed error", () => {
    const attempt = () =>
      validateTimelineSpec({
        version: 1,
        frames: [
          {
            id: "f1",
            duration_ms: 100,
            composition: BASE_COMPOSITION,
            overrides: { parts: [{ id: "ghost", offset: [1, 1] }] },
          },
        ],
      });
    expect(attempt).toThrow(TimelineValidationError);
    expect(attempt).toThrow(/unknown placement/);
  });
});

describe("timeline: digest contract", () => {
  it("timeline: frame digest equals sha256 of the frame svg", async () => {
    const compiled = await compileTimeline(TWO_FRAME_SPEC, SVG_PARTS);
    for (const frame of compiled.frames) {
      expect(frame.digest).toBe(await sha256(frame.svg));
    }
  });
});

describe("timeline: frame ordering", () => {
  it("timeline: per-frame output is order-independent", async () => {
    const shuffled = {
      version: 1 as const,
      frames: [TWO_FRAME_SPEC.frames[1]!, TWO_FRAME_SPEC.frames[0]!],
    };
    const base = await compileTimeline(TWO_FRAME_SPEC, SVG_PARTS);
    const mixed = await compileTimeline(shuffled, SVG_PARTS);

    // Output preserves input order.
    expect(mixed.frames.map((frame) => frame.id)).toEqual([
      "walk-2",
      "walk-1",
    ]);
    // Per-frame content depends on the frame, not its position.
    const sortById = (frames: TimelineCompilation["frames"]) =>
      [...frames].sort((a, b) => a.id.localeCompare(b.id));
    expect(sortById(mixed.frames).map((frame) => frame.svg)).toEqual(
      sortById(base.frames).map((frame) => frame.svg),
    );
    expect(sortById(mixed.frames).map((frame) => frame.digest)).toEqual(
      sortById(base.frames).map((frame) => frame.digest),
    );
  });
});

describe("timeline: injection surface", () => {
  it("timeline: compiled frames contain no script or event attributes", async () => {
    const compiled = await compileTimeline(TWO_FRAME_SPEC, SVG_PARTS);
    for (const frame of compiled.frames) {
      expect(frame.svg).not.toMatch(/<\s*script/i);
      expect(frame.svg).not.toMatch(/\son[a-z-]+\s*=/i);
      expect(frame.svg).not.toMatch(/javascript:/i);
    }
  });

  it("timeline: malicious part source is rejected at compile time", async () => {
    const sword = SVG_PARTS_BY_ID.get("sword-basic");
    if (!sword) throw new Error("sword-basic missing from catalog");
    const evilPart = {
      metadata: { ...sword.metadata, part_id: "sword-evil" },
      source:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 28"><script>alert(1)</script></svg>',
    };
    await expect(
      compileTimeline(TWO_FRAME_SPEC, [...SVG_PARTS, evilPart]),
    ).rejects.toThrow(/unsafe/);
  });
});

describe("timeline: typed validation errors", () => {
  it("timeline: missing frame id throws TimelineValidationError, not TypeError", () => {
    const attempt = () =>
      validateTimelineSpec({
        version: 1,
        frames: [{ duration_ms: 100, composition: BASE_COMPOSITION }],
      });
    expect(attempt).toThrow(TimelineValidationError);
    expect(attempt).not.toThrow(TypeError);
  });

  it("timeline: rejects unexpected frame keys", () => {
    const attempt = () =>
      validateTimelineSpec({
        version: 1,
        frames: [
          {
            id: "f1",
            duration_ms: 100,
            composition: BASE_COMPOSITION,
            bogus: true,
          },
        ],
      });
    expect(attempt).toThrow(TimelineValidationError);
    expect(attempt).toThrow(/unexpected key/);
  });
});