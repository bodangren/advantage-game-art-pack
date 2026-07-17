/**
 * Review-page scratch: regenerates measure/review.html from the on-disk
 * part library and example specs, and can rasterize per-row PNGs for
 * headless art review.
 *
 * Usage:
 *   node --experimental-strip-types measure/review-scratch.mts [--only <substr>] [--out <path>] [--png <dir>]
 *
 * The scratch intentionally avoids src/lib/render.ts: that module imports
 * "./svg-assets" extensionless, which Node's strip-types resolver cannot
 * load. svg-assets.ts itself has no imports, and the palette inlining is
 * mirrored here (keep in sync with render.ts inlinePalette).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type SvgCompositionSpec,
  type SvgPart,
  composeSvgAsset,
} from "../src/lib/svg-assets.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const partsRoot = join(repoRoot, "src", "assets", "svg-parts");
const examplesRoot = join(repoRoot, "examples");

interface ReviewRow {
  readonly title: string;
  readonly specFile: string;
  readonly refs: readonly string[];
}

const ROWS: readonly ReviewRow[] = [
  { title: "knight (base humanoid)", specFile: "svg_character.json", refs: ["knight-mockup_001.jpg"] },
  { title: "goblin (enemy)", specFile: "enemy-goblin.json", refs: ["goblin-mockup_001.jpg"] },
  { title: "spectre (enemy)", specFile: "enemy-spectre.json", refs: ["spectre-mockup_001.jpg"] },
  { title: "dragon (boss)", specFile: "boss-dragon.json", refs: ["dragon-mockup_001.jpg"] },
  { title: "prisoner (npc)", specFile: "npc-prisoner.json", refs: ["prisoner-mockup_002.jpg"] },
  {
    title: "prop set",
    specFile: "prop-set-library.json",
    refs: ["chest-mockup_001.jpg", "gate-mockup_001.jpg", "potion-mockup_001.jpg", "herb-mockup_001.jpg"],
  },
  { title: "fx set", specFile: "fx-set.json", refs: ["projectile-mockup_001.jpg", "aura-mockup_001.jpg"] },
];

const PALETTE_REFERENCE_RE = /var\(--([a-z][a-z0-9-]*)\)/g;
const PALETTE_STYLE_RE = /\s*<style id="asf-palette">[\s\S]*?<\/style>\n/;

// Mirror of src/lib/render.ts inlinePalette (rasterizers cannot resolve CSS
// custom properties, so review cells inline concrete hex values).
function inlinePalette(svg: string, palette: Record<string, string>): string {
  return svg
    .replace(PALETTE_STYLE_RE, "\n")
    .replace(PALETTE_REFERENCE_RE, (_match, name: string) => {
      const value = palette[name];
      if (!value) throw new Error(`missing palette value for --${name}`);
      return value;
    });
}

function loadParts(): SvgPart[] {
  const parts: SvgPart[] = [];
  for (const slotDir of readdirSync(partsRoot, { withFileTypes: true })) {
    if (!slotDir.isDirectory()) continue;
    const slotPath = join(partsRoot, slotDir.name);
    for (const partDir of readdirSync(slotPath, { withFileTypes: true })) {
      if (!partDir.isDirectory()) continue;
      const partPath = join(slotPath, partDir.name);
      const metadata = JSON.parse(readFileSync(join(partPath, "part.json"), "utf8"));
      const source = readFileSync(join(partPath, metadata.source_file), "utf8");
      parts.push({ metadata, source });
    }
  }
  return parts;
}

function rowHtml(row: ReviewRow, svg: string, digest: string): string {
  const refs = row.refs
    .map(
      (file) => `      <figure>
        <img src="../demo-assets/reference/${file}" alt="${row.title} reference" loading="lazy">
        <figcaption>REFERENCE · ${file}</figcaption>
      </figure>`,
    )
    .join("\n");
  return `    <section class="row">
      <div class="refs">
${refs}
      </div>
      <figure class="ours">
        <div class="svg-cell">${svg.trimEnd()}</div>
        <figcaption>SVG · ${digest}</figcaption>
      </figure>
      <h2>${row.title}</h2>
    </section>`;
}

const PAGE_HEAD = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sprite Foundry — SVG vs reference</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; background: #0c0e10; color: #e8e5dc;
         font-family: ui-monospace, "IBM Plex Mono", Menlo, monospace; }
  header { margin-bottom: 28px; }
  h1 { font-size: 16px; letter-spacing: 0.12em; margin: 0 0 6px; }
  header p { margin: 0; color: #9a9d96; font-size: 11px; }
  .row { display: flex; align-items: flex-end; gap: 24px; padding: 20px 0;
         border-top: 1px solid #262c31; position: relative; }
  .row h2 { position: absolute; top: 4px; left: 0; font-size: 10px;
            letter-spacing: 0.14em; text-transform: uppercase; color: #9a9d96;
            font-weight: 500; margin: 0; }
  .refs { display: flex; gap: 12px; flex-wrap: wrap; }
  figure { margin: 0; }
  img, .svg-cell { width: 256px; height: 256px; display: block;
         image-rendering: pixelated; background: #16191c;
         border: 1px solid #262c31; }
  .refs img { width: 128px; height: 128px; }
  .refs figure:only-child img { width: 256px; height: 256px; }
  .svg-cell svg { width: 100%; height: 100%; }
  figcaption { margin-top: 6px; font-size: 9px; color: #9a9d96;
               letter-spacing: 0.08em; }
  .ours figcaption { color: #d8ff4f; }
</style>
</head>
<body>
  <header>
    <h1>SVG COMPOSITIONS vs MMX REFERENCES</h1>
    <p>Left: mmx mockup targets (demo-assets/reference/). Right: deterministic output of the composition engine (palette-inlined SVG). Regenerate via the review-page scratch after any art change.</p>
  </header>`;

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

let wasmInit: Promise<void> | null = null;

async function rasterize(svg: string): Promise<Uint8Array> {
  const { Resvg, initWasm } = await import("@resvg/resvg-wasm");
  if (!wasmInit) {
    const require = createRequire(import.meta.url);
    const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
    wasmInit = initWasm(readFileSync(wasmPath));
  }
  await wasmInit;
  const renderer = new Resvg(svg, {
    fitTo: { mode: "original" },
    imageRendering: 1,
    shapeRendering: 1,
  });
  try {
    const image = renderer.render();
    try {
      return image.asPng();
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}

async function main(): Promise<void> {
  const only = argValue("--only");
  const outPath = argValue("--out") ?? join(repoRoot, "measure", "review.html");
  const pngDir = argValue("--png");
  const rows = only ? ROWS.filter((row) => row.title.includes(only) || row.specFile.includes(only)) : ROWS;
  if (rows.length === 0) throw new Error(`--only ${only} matched no rows`);
  const parts = loadParts();
  const sections: string[] = [];
  if (pngDir) mkdirSync(pngDir, { recursive: true });
  for (const row of rows) {
    const spec = JSON.parse(readFileSync(join(examplesRoot, row.specFile), "utf8")) as SvgCompositionSpec;
    const asset = await composeSvgAsset(spec, parts);
    const inlined = inlinePalette(asset.svg, { ...spec.palette });
    const caption = `${spec.asset_id} · sha256 ${asset.metadata.svg_sha256.slice(0, 12)}…`;
    sections.push(rowHtml(row, inlined, caption));
    if (pngDir) {
      const png = await rasterize(inlined);
      writeFileSync(join(pngDir, `${spec.asset_id}.png`), png);
      console.log(`png: ${spec.asset_id}.png`);
    }
  }
  const page = `${PAGE_HEAD}\n${sections.join("\n")}\n</body>\n</html>\n`;
  writeFileSync(outPath, page);
  console.log(`wrote ${outPath} (${rows.length} rows)`);
}

await main();
