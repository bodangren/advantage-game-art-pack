"use client";

import { useState } from "react";

import { DEFAULT_SPEC } from "../src/lib/default-spec";
import { SVG_PARTS, partsForSlot, type SvgSlot } from "../src/lib/catalog";
import {
  buildPhaserLoadConfig,
  composeSvg,
  type SvgCompositionSpec,
} from "../src/lib/svg-assets";

const SLOT_ORDER: readonly SvgSlot[] = ["body", "shirt", "hair", "weapon"];
const PALETTE_ORDER = ["skin", "hair", "cloth", "leather", "metal", "shoe"] as const;
const SELECTABLE_SLOTS = ["shirt", "hair", "weapon"] as const;
type SelectableSlot = (typeof SELECTABLE_SLOTS)[number];

const INITIAL_SELECTION: Record<SelectableSlot, string> = {
  shirt: "shirt-tunic",
  hair: "hair-short",
  weapon: "sword-basic",
};

function replaceSelection(
  spec: SvgCompositionSpec,
  selection: Record<SelectableSlot, string>,
  palette: Record<string, string>,
): SvgCompositionSpec {
  return {
    ...spec,
    palette,
    parts: spec.parts.map((part) => {
      if (part.id in selection) {
        return { ...part, part_id: selection[part.id as SelectableSlot] };
      }
      return part;
    }),
  };
}

function downloadSvg(svg: string, fileName: string): void {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const [palette, setPalette] = useState({ ...DEFAULT_SPEC.palette });
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const spec = replaceSelection(DEFAULT_SPEC, selection, palette);
  const svg = composeSvg(spec, SVG_PARTS);

  const updateSelection = (slot: SelectableSlot, partId: string) => {
    setSelection((current) => ({ ...current, [slot]: partId }));
  };

  const updatePalette = (name: string, value: string) => {
    setPalette((current) => ({ ...current, [name]: value }));
  };

  const copyPhaserConfig = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildPhaserLoadConfig(spec), null, 2));
      setCopied(true);
      setCopyError(null);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
      setCopyError("Clipboard unavailable. Use a secure browser context to copy the config.");
    }
  };

  const reset = () => {
    setSelection(INITIAL_SELECTION);
    setPalette({ ...DEFAULT_SPEC.palette });
    setCopied(false);
    setCopyError(null);
  };

  return (
    <main className="foundry-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#top" aria-label="Sprite Foundry home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>SPRITE FOUNDRY</span>
        </a>
        <div className="topbar-meta">
          <span className="live-dot" />
          <span>LOCAL COMPILER</span>
          <span className="build-tag">TS7 / SVG 1.0</span>
        </div>
      </header>

      <section className="intro" id="top">
        <div>
          <p className="eyebrow">COMPOSABLE ASSET DESK / 001</p>
          <h1>Make a character<br /><em>from atoms.</em></h1>
        </div>
        <p className="intro-copy">
          Assemble named SVG parts into a game-ready texture. Every anchor,
          palette token, and layer is deterministic by design.
        </p>
      </section>

      <section className="workspace" aria-label="SVG character workspace">
        <aside className="control-rail">
          <div className="panel-heading">
            <span className="panel-index">01</span>
            <div>
              <p className="eyebrow">ASSEMBLY</p>
              <h2>Choose parts</h2>
            </div>
          </div>

          <div className="control-list">
            {SELECTABLE_SLOTS.map((slot) => (
              <label className="field-group" key={slot}>
                <span className="field-label"><span className="field-kicker">{slot === "shirt" ? "02" : slot === "hair" ? "03" : "04"}</span>{slot}</span>
                <select value={selection[slot]} onChange={(event) => updateSelection(slot, event.target.value)}>
                  {partsForSlot(slot).map((part) => (
                    <option value={part.metadata.part_id} key={part.metadata.part_id}>
                      {part.metadata.part_id.replace("-", " ")}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="panel-divider" />
          <div className="panel-heading compact-heading">
            <span className="panel-index">02</span>
            <div>
              <p className="eyebrow">MATERIALS</p>
              <h2>Palette slots</h2>
            </div>
          </div>
          <div className="palette-grid">
            {PALETTE_ORDER.map((name) => (
              <label className="swatch-field" key={name}>
                <input
                  aria-label={`${name} color`}
                  type="color"
                  value={palette[name]}
                  onChange={(event) => updatePalette(name, event.target.value)}
                />
                <span>
                  <strong>{name}</strong>
                  <small>{palette[name]}</small>
                </span>
              </label>
            ))}
          </div>

          <button className="reset-button" type="button" onClick={reset}>Reset composition <span>↺</span></button>
        </aside>

        <section className="preview-column">
          <div className="preview-head">
            <div>
              <p className="eyebrow">LIVE PREVIEW / {spec.asset_id}</p>
              <h2>Character study</h2>
            </div>
            <div className="preview-actions">
              <button className="button button-quiet" type="button" onClick={copyPhaserConfig} aria-describedby="copy-status">
                {copied ? "Copied config" : copyError ? "Copy unavailable" : "Copy Phaser config"}
              </button>
              <span className="sr-only" id="copy-status" role="status" aria-live="polite">
                {copied ? "Phaser configuration copied." : copyError ?? ""}
              </span>
              {copyError ? <span className="copy-error" role="status">{copyError}</span> : null}
              <button className="button button-primary" type="button" onClick={() => downloadSvg(svg, "asset.svg")}>
                Export SVG <span>↓</span>
              </button>
            </div>
          </div>

          <div className="preview-stage">
            <div className="stage-note stage-note-top">VIEWBOX / 64 × 64</div>
            <div className="stage-note stage-note-bottom">OUTPUT / 256 × 256</div>
            <div className="svg-frame">
              {/* The compiler only emits validated, checked-in SVG primitives. */}
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
            <div className="crosshair crosshair-left" />
            <div className="crosshair crosshair-right" />
          </div>

          <div className="preview-footer">
            <span><i className="status-dot" /> DETERMINISTIC OUTPUT</span>
            <span className="footer-code">SHA-256 READY / PHASER TEXTURE</span>
          </div>
        </section>

        <aside className="inspector-rail">
          <div className="panel-heading">
            <span className="panel-index">03</span>
            <div>
              <p className="eyebrow">INSPECTOR</p>
              <h2>Under the hood</h2>
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric"><strong>04</strong><span>PARTS</span></div>
            <div className="metric"><strong>06</strong><span>PALETTE</span></div>
            <div className="metric"><strong>64</strong><span>VIEWBOX</span></div>
            <div className="metric"><strong>01</strong><span>ASSET</span></div>
          </div>

          <div className="layer-stack">
            <div className="stack-label">LAYER STACK <span>Z-INDEX</span></div>
            {[...spec.parts].sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0)).map((part) => (
              <div className="layer-row" key={part.id}>
                <span className="layer-swatch" style={{ backgroundColor: palette[part.id === "hair" ? "hair" : part.id === "sword" ? "metal" : part.id === "shirt" ? "cloth" : "skin"] }} />
                <span>{part.part_id}</span>
                <small>{String(part.z_index ?? "--").padStart(2, "0")}</small>
              </div>
            ))}
          </div>

          <div className="anchor-card">
            <div className="stack-label">ANCHOR GRAPH <span>CONNECTED</span></div>
            <div className="anchor-line"><span>body.root</span><b>→</b><span>shirt.root</span></div>
            <div className="anchor-line"><span>body.head</span><b>→</b><span>hair.root</span></div>
            <div className="anchor-line"><span>body.hand</span><b>→</b><span>sword.root</span></div>
          </div>
        </aside>
      </section>

      <footer className="site-footer">
        <span>PART CATALOG / {String(SVG_PARTS.length).padStart(2, "0")} APPROVED ATOMS</span>
        <span>SVG SOURCE → RASTER TEXTURE → GAME</span>
        <span>NO PIXELS LOST</span>
      </footer>
    </main>
  );
}
