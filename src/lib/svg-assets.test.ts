import { describe, expect, it } from "vitest";

import { SVG_PARTS } from "./catalog";
import { DEFAULT_SPEC } from "./default-spec";
import {
  SvgAssetValidationError,
  composeSvg,
  composeSvgAsset,
  normalizeCompositionSpec,
  validateSvgSource,
} from "./svg-assets";

describe("SVG asset compiler", () => {
  it("validates the checked-in catalog", () => {
    expect(SVG_PARTS.map((part) => part.metadata.part_id)).toEqual([
      "body-base",
      "shirt-tunic",
      "hair-short",
      "sword-basic",
      "body-goblin",
      "rags-goblin",
      "ears-goblin",
      "club-goblin",
      "body-spectre",
      "shroud-spectre",
      "eyes-spectre",
      "orb-spectre",
      "body-dragon",
      "plate-dragon",
      "wings-dragon",
      "breath-dragon",
      "body-prisoner",
      "tatters-prisoner",
      "hair-prisoner",
      "shackles-prisoner",
      "chest-wood",
      "gate-stone",
      "potion-red",
      "herb-green",
      "projectile-fire",
      "aura-magic",
      "shadow-ground",
    ]);
    expect(SVG_PARTS).toHaveLength(27);
  });

  it("composes deterministic anchor-attached SVG output", () => {
    const first = composeSvg(DEFAULT_SPEC, SVG_PARTS);
    const second = composeSvg(DEFAULT_SPEC, SVG_PARTS);

    expect(first).toBe(second);
    expect(first).toContain('viewBox="0 0 64 64"');
    expect(first).toContain('width="256" height="256"');
    expect(first).toContain("matrix(1 0 0 1 20 8)");
    expect(first).toContain("matrix(1 0 0 1 20 -2)");
    expect(first).toContain("--hair: #6b3e26;");
    expect(first.indexOf('id="body"')).toBeLessThan(first.indexOf('id="hair"'));
  });

  it("preserves the normalized source spec and Phaser dimensions", async () => {
    const asset = await composeSvgAsset(DEFAULT_SPEC, SVG_PARTS);

    expect(asset.metadata.source_spec).toEqual({
      ...DEFAULT_SPEC,
      view_box: [0, 0, 64, 64],
      output: { width: 256, height: 256 },
      palette: { ...DEFAULT_SPEC.palette },
      parts: DEFAULT_SPEC.parts.map((part) => ({ ...part, position: [...part.position], offset: [...part.offset] })),
    });
    expect(asset.phaserLoad).toEqual({
      key: "lpc-style-character",
      url: "asset.svg",
      svgConfig: { width: 256, height: 256 },
    });
    expect(asset.metadata.svg_sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects unsafe source and unknown palette references", () => {
    const metadata = SVG_PARTS[0].metadata;
    expect(() => validateSvgSource(
      '<svg viewBox="0 0 24 48"><script>alert(1)</script></svg>',
      metadata,
    )).toThrow(SvgAssetValidationError);
    expect(() => validateSvgSource(
      '<svg viewBox="0 0 24 48"><rect fill="var(--missing)"/></svg>',
      metadata,
    )).toThrow(/undeclared palette/);
    expect(() => validateSvgSource(
      '<svg viewBox="0 0 24 48"><svg viewBox="0 0 2 2"/></svg>',
      metadata,
    )).toThrow(/unsupported SVG element/);
    expect(() => validateSvgSource(
      '<svg viewBox="0 0 24 48"><path></svg>',
      metadata,
    )).toThrow(/well-formed/);
    expect(() => validateSvgSource(
      '<svg><rect viewBox="0 0 24 48"/></svg>',
      metadata,
    )).toThrow(/root requires a viewBox/);
  });

  it("defaults optional placement fields while rejecting unknown keys", () => {
    const normalized = normalizeCompositionSpec({
      version: 1,
      asset_id: "minimal",
      view_box: [0, 0, 64, 64],
      palette: {},
      parts: [{ id: "body", part_id: "body-base" }],
    });
    expect(normalized.parts[0]).toMatchObject({
      position: [0, 0],
      offset: [0, 0],
      scale: 1,
      rotate: 0,
      anchor: null,
      attach_to: null,
    });
    expect(() => normalizeCompositionSpec({
      version: 1,
      asset_id: "bad",
      view_box: [0, 0, 64, 64],
      palette: {},
      parts: [{ id: "body", part_id: "body-base", extra: true }],
    })).toThrow(/unexpected key/);
  });
});
