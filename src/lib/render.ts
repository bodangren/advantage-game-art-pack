import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { Resvg, initWasm } from "@resvg/resvg-wasm";

import {
  type SvgPart,
  composeSvgAsset,
  normalizeCompositionSpec,
} from "./svg-assets";

export class RenderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RenderValidationError";
  }
}

const PALETTE_REFERENCE_RE = /var\(--([a-z][a-z0-9-]*)\)/g;
const PALETTE_STYLE_RE = /\s*<style id="asf-palette">[\s\S]*?<\/style>\n/;

export interface RenderedPng {
  readonly png: Uint8Array;
  readonly width: number;
  readonly height: number;
}

// Rasterizers cannot resolve CSS custom properties (the same constraint
// the atlas packer works around), so the raster path inlines concrete hex
// values and drops the palette style block entirely.
export function inlinePalette(svg: string, palette: Record<string, string>): string {
  return svg
    .replace(PALETTE_STYLE_RE, "\n")
    .replace(PALETTE_REFERENCE_RE, (_match, name: string) => {
      const value = palette[name];
      if (!value) {
        throw new RenderValidationError(`missing palette value for --${name}`);
      }
      return value;
    });
}

let wasmInit: Promise<void> | null = null;

function ensureWasm(): Promise<void> {
  if (!wasmInit) {
    const require = createRequire(import.meta.url);
    const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
    wasmInit = initWasm(readFileSync(wasmPath));
  }
  return wasmInit;
}

// Server-side PNG export for pixel-art games: validate, compose, inline
// the palette, then rasterize at the spec's output size (or viewBox) with
// nearest-neighbor scaling and crisp edges.
export async function renderSpecToPng(
  spec: unknown,
  parts: readonly SvgPart[],
): Promise<RenderedPng> {
  const normalized = normalizeCompositionSpec(spec);
  const asset = await composeSvgAsset(normalized, parts);
  const inlined = inlinePalette(asset.svg, { ...normalized.palette });
  await ensureWasm();
  const renderer = new Resvg(inlined, {
    fitTo: { mode: "original" },
    imageRendering: 1,
    shapeRendering: 1,
  });
  try {
    const image = renderer.render();
    try {
      return { png: image.asPng(), width: image.width, height: image.height };
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}
