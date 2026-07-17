import { describe, expect, it } from "vitest";

import bossDragon from "../../examples/boss-dragon.json";
import propSetLibrary from "../../examples/prop-set-library.json";

import { SVG_PARTS } from "./catalog";
import { inlinePalette, renderSpecToPng } from "./render";
import {
  type SvgCompositionSpec,
  composeSvg,
  normalizeCompositionSpec,
} from "./svg-assets";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("render: palette inlining", () => {
  it("render: inlinePalette replaces every var() with concrete hex and drops the style block", async () => {
    const spec = normalizeCompositionSpec(bossDragon as unknown as SvgCompositionSpec);
    const composed = composeSvg(spec, SVG_PARTS);
    expect(composed).toContain("var(--");
    const inlined = inlinePalette(composed, { ...spec.palette });
    expect(inlined).not.toContain("var(");
    expect(inlined).not.toContain("<style");
    expect(inlined).toContain("#8c3b2e");
    expect(inlined).toContain('data-part-id="body-dragon"');
  });

  it("render: inlinePalette is deterministic", async () => {
    const spec = normalizeCompositionSpec(bossDragon as unknown as SvgCompositionSpec);
    const composed = composeSvg(spec, SVG_PARTS);
    expect(inlinePalette(composed, { ...spec.palette })).toBe(
      inlinePalette(composed, { ...spec.palette }),
    );
  });
});

describe("render: PNG rasterization", () => {
  it("render: renderSpecToPng emits PNG magic bytes at the spec output dimensions", async () => {
    const { png, width, height } = await renderSpecToPng(bossDragon, SVG_PARTS);
    expect([...png.slice(0, 8)]).toEqual(PNG_MAGIC);
    expect(width).toBe(256);
    expect(height).toBe(256);
    const propSet = await renderSpecToPng(propSetLibrary, SVG_PARTS);
    expect(propSet.width).toBe(384);
    expect(propSet.height).toBe(192);
  });

  it("render: renderSpecToPng falls back to the viewBox when no output is declared", async () => {
    const spec = {
      ...bossDragon,
      output: null,
    };
    const { width, height } = await renderSpecToPng(spec, SVG_PARTS);
    expect(width).toBe(64);
    expect(height).toBe(64);
  });

  it("render: renderSpecToPng is byte-identical across calls and not blank", async () => {
    const first = await renderSpecToPng(bossDragon, SVG_PARTS);
    const second = await renderSpecToPng(bossDragon, SVG_PARTS);
    expect([...first.png]).toEqual([...second.png]);
    // A composed 256x256 character PNG with real content is far larger
    // than a solid-color blank frame.
    expect(first.png.length).toBeGreaterThan(1000);
  });
});
