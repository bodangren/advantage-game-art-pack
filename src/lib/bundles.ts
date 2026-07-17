import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import walkCycleSpec from "../../examples/animation/walk-cycle.json";
import bossDragonSpec from "../../examples/boss-dragon.json";
import knightSpec from "../../examples/directional/knight.json";
import enemyGoblinSpec from "../../examples/enemy-goblin.json";
import enemySpectreSpec from "../../examples/enemy-spectre.json";
import fxSetSpec from "../../examples/fx-set.json";
import npcPrisonerSpec from "../../examples/npc-prisoner.json";
import propSetLibrarySpec from "../../examples/prop-set-library.json";
import svgCharacterSpec from "../../examples/svg_character.json";

import { type AtlasPackerOptions, packAtlas } from "./atlas";
import { compileDirectionalSheets } from "./directional";
import { SVG_PARTS } from "./catalog";
import {
  type SvgCompositionSpec,
  composeSvgAsset,
  sha256,
} from "./svg-assets";
import { compileTimeline } from "./timeline";

export const BUNDLE_VERSION = 1 as const;

export const BUNDLE_SLOTS = [
  "characters",
  "enemies",
  "props",
  "fx",
  "tiles",
  "ui",
  "surfaces",
] as const;
export type BundleSlotId = (typeof BUNDLE_SLOTS)[number];

export const BUNDLE_REF_KINDS = ["composition", "timeline", "sheet"] as const;
export type BundleRefKind = (typeof BUNDLE_REF_KINDS)[number];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class BundleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleValidationError";
  }
}

export interface BundleRef {
  readonly kind: BundleRefKind;
  readonly id: string;
  readonly atlas: AtlasPackerOptions | null;
}

export interface BundleSlot {
  readonly slot: BundleSlotId;
  readonly refs: readonly BundleRef[];
}

export interface BundleManifest {
  readonly version: typeof BUNDLE_VERSION;
  readonly game: string;
  readonly slots: readonly BundleSlot[];
}

export interface SpecRegistryEntry {
  readonly kind: BundleRefKind;
  readonly load: () => unknown;
}

export type SpecRegistry = Readonly<Record<string, SpecRegistryEntry>>;

export interface BundleAsset {
  readonly slot: BundleSlotId;
  readonly id: string;
  readonly kind: BundleRefKind;
  readonly file: string;
  readonly svg: string;
  readonly digest: string;
}

export interface CompiledBundle {
  readonly version: typeof BUNDLE_VERSION;
  readonly game: string;
  readonly assets: readonly BundleAsset[];
  readonly bundle_digest: string;
}

export interface BundleJsonAsset {
  readonly slot: BundleSlotId;
  readonly id: string;
  readonly kind: BundleRefKind;
  readonly file: string;
  readonly digest: string;
}

export interface BundleJson {
  readonly version: typeof BUNDLE_VERSION;
  readonly game: string;
  readonly assets: readonly BundleJsonAsset[];
  readonly bundle_digest: string;
}

export interface BundleExportResult {
  readonly files: readonly string[];
  readonly bundle_json: BundleJson;
  readonly audit: string;
}

// The checked-in spec registry. Bundle manifests reference specs by id;
// every id must map to a checked-in spec whose own declared id matches
// (asset_id for compositions, id for timelines and directional sheets).
export const SPEC_REGISTRY: SpecRegistry = {
  knight: { kind: "sheet", load: () => knightSpec },
  "walk-cycle": { kind: "timeline", load: () => walkCycleSpec },
  "lpc-style-character": { kind: "composition", load: () => svgCharacterSpec },
  "enemy-goblin": { kind: "composition", load: () => enemyGoblinSpec },
  "enemy-spectre": { kind: "composition", load: () => enemySpectreSpec },
  "boss-dragon": { kind: "composition", load: () => bossDragonSpec },
  "npc-prisoner": { kind: "composition", load: () => npcPrisonerSpec },
  "prop-set-library": { kind: "composition", load: () => propSetLibrarySpec },
  "fx-set": { kind: "composition", load: () => fxSetSpec },
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertKeys(
  value: UnknownRecord,
  required: readonly string[],
  allowed: readonly string[],
  context: string,
): void {
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0) {
    throw new BundleValidationError(
      `${context} missing required key(s): ${missing.join(", ")}`,
    );
  }
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    throw new BundleValidationError(
      `${context} contains unexpected key(s): ${extra.join(", ")}`,
    );
  }
}

function positiveInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new BundleValidationError(`${context} must be a positive integer`);
  }
  return value;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as UnknownRecord)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, sortKeys(item)]),
    );
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function declaredSpecId(kind: BundleRefKind, spec: unknown): string | null {
  if (!isRecord(spec)) return null;
  if (kind === "composition") {
    return typeof spec.asset_id === "string" ? spec.asset_id : null;
  }
  return typeof spec.id === "string" ? spec.id : null;
}

function parseAtlasOptions(value: unknown, context: string): AtlasPackerOptions | null {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) {
    throw new BundleValidationError(`${context}.atlas must be an object`);
  }
  assertKeys(value, ["cols", "frame_w", "frame_h"], ["cols", "frame_w", "frame_h"], `${context}.atlas`);
  return {
    cols: positiveInteger(value.cols, `${context}.atlas.cols`),
    frame_w: positiveInteger(value.frame_w, `${context}.atlas.frame_w`),
    frame_h: positiveInteger(value.frame_h, `${context}.atlas.frame_h`),
  };
}

export function validateBundleManifest(
  manifest: unknown,
  options: { registry?: SpecRegistry } = {},
): BundleManifest {
  const registry = options.registry ?? SPEC_REGISTRY;
  if (!isRecord(manifest)) {
    throw new BundleValidationError("bundle manifest must be an object");
  }
  assertKeys(manifest, ["version", "game", "slots"], ["version", "game", "slots"], "bundle manifest");
  if (manifest.version !== BUNDLE_VERSION) {
    throw new BundleValidationError("bundle manifest.version must be 1");
  }
  if (typeof manifest.game !== "string" || !SLUG_RE.test(manifest.game)) {
    throw new BundleValidationError("bundle manifest.game must be a lowercase slug");
  }
  if (!Array.isArray(manifest.slots) || manifest.slots.length === 0) {
    throw new BundleValidationError("bundle manifest.slots must be a non-empty array");
  }
  const seenRefIds = new Set<string>();
  const seenSlots = new Set<string>();
  const slots = manifest.slots.map((rawSlot, slotIndex) => {
    const slotContext = `bundle manifest.slots[${slotIndex}]`;
    if (!isRecord(rawSlot)) {
      throw new BundleValidationError(`${slotContext} must be an object`);
    }
    assertKeys(rawSlot, ["slot", "refs"], ["slot", "refs"], slotContext);
    if (typeof rawSlot.slot !== "string" || !(BUNDLE_SLOTS as readonly string[]).includes(rawSlot.slot)) {
      throw new BundleValidationError(
        `${slotContext}.slot unknown slot ${String(rawSlot.slot)} (expected one of: ${BUNDLE_SLOTS.join(", ")})`,
      );
    }
    if (seenSlots.has(rawSlot.slot)) {
      throw new BundleValidationError(`bundle manifest contains duplicate slot ${rawSlot.slot}`);
    }
    seenSlots.add(rawSlot.slot);
    if (!Array.isArray(rawSlot.refs) || rawSlot.refs.length === 0) {
      throw new BundleValidationError(`${slotContext}.refs must be a non-empty array`);
    }
    const refs = rawSlot.refs.map((rawRef, refIndex) => {
      const refContext = `${slotContext}.refs[${refIndex}]`;
      if (!isRecord(rawRef)) {
        throw new BundleValidationError(`${refContext} must be an object`);
      }
      assertKeys(rawRef, ["kind", "id"], ["kind", "id", "atlas"], refContext);
      if (typeof rawRef.kind !== "string" || !(BUNDLE_REF_KINDS as readonly string[]).includes(rawRef.kind)) {
        throw new BundleValidationError(
          `${refContext}.kind must be one of: ${BUNDLE_REF_KINDS.join(", ")}`,
        );
      }
      if (typeof rawRef.id !== "string" || !SLUG_RE.test(rawRef.id)) {
        throw new BundleValidationError(`${refContext}.id must be a lowercase slug`);
      }
      if (seenRefIds.has(rawRef.id)) {
        throw new BundleValidationError(`bundle manifest contains duplicate ref id ${rawRef.id}`);
      }
      seenRefIds.add(rawRef.id);
      const kind = rawRef.kind as BundleRefKind;
      const entry = registry[rawRef.id];
      if (!entry) {
        throw new BundleValidationError(
          `${refContext} unknown spec reference ${rawRef.id}`,
        );
      }
      if (entry.kind !== kind) {
        throw new BundleValidationError(
          `${refContext} kind mismatch: ${rawRef.id} is a ${entry.kind} spec, not ${kind}`,
        );
      }
      let loaded: unknown;
      try {
        loaded = entry.load();
      } catch (err) {
        throw new BundleValidationError(
          `${refContext} unknown spec reference ${rawRef.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      if (declaredSpecId(kind, loaded) !== rawRef.id) {
        throw new BundleValidationError(
          `${refContext} unknown spec reference ${rawRef.id}: registry spec declares a different id`,
        );
      }
      return { kind, id: rawRef.id, atlas: parseAtlasOptions(rawRef.atlas, refContext) };
    });
    return { slot: rawSlot.slot as BundleSlotId, refs };
  });
  // Slots serialize in enum order so the manifest is deterministic
  // regardless of author ordering.
  slots.sort(
    (a, b) => BUNDLE_SLOTS.indexOf(a.slot) - BUNDLE_SLOTS.indexOf(b.slot),
  );
  return { version: BUNDLE_VERSION, game: manifest.game, slots };
}

function defaultAtlasOptions(frameCount: number): AtlasPackerOptions {
  return { cols: frameCount, frame_w: 32, frame_h: 32 };
}

export async function compileBundle(
  manifest: unknown,
  options: { registry?: SpecRegistry } = {},
): Promise<CompiledBundle> {
  const registry = options.registry ?? SPEC_REGISTRY;
  const bundle = validateBundleManifest(manifest, { registry });
  const assets: BundleAsset[] = [];
  const seenAssetIds = new Set<string>();
  for (const slot of bundle.slots) {
    for (const ref of slot.refs) {
      const context = `bundle slot ${slot.slot} ref ${ref.id}`;
      const entry = registry[ref.id];
      if (!entry) {
        throw new BundleValidationError(`${context}: unknown spec reference ${ref.id}`);
      }
      const spec = entry.load();
      const compiled: Array<{ id: string; svg: string }> = [];
      try {
        if (ref.kind === "composition") {
          const asset = await composeSvgAsset(spec as SvgCompositionSpec, SVG_PARTS);
          compiled.push({ id: ref.id, svg: asset.svg });
        } else if (ref.kind === "timeline") {
          const timeline = await compileTimeline(spec, SVG_PARTS);
          const packed = await packAtlas(
            timeline,
            ref.atlas ?? defaultAtlasOptions(timeline.frames.length),
          );
          compiled.push({ id: ref.id, svg: packed.sheet_svg });
        } else {
          const sheets = await compileDirectionalSheets(spec, SVG_PARTS, {
            cols: 4,
            frame_w: 32,
            frame_h: 32,
          });
          for (const sheet of sheets.sheets) {
            compiled.push({ id: sheet.timeline_id, svg: sheet.sheet_svg });
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          throw new BundleValidationError(`${context}: ${err.message}`);
        }
        throw err;
      }
      for (const asset of compiled) {
        if (seenAssetIds.has(asset.id)) {
          throw new BundleValidationError(
            `${context}: duplicate asset id ${asset.id} after expansion`,
          );
        }
        seenAssetIds.add(asset.id);
        assets.push({
          slot: slot.slot,
          id: asset.id,
          kind: ref.kind,
          file: `${slot.slot}/${asset.id}.svg`,
          svg: asset.svg,
          digest: await sha256(asset.svg),
        });
      }
    }
  }
  const bundleDigest = await sha256(
    stableStringify({
      version: BUNDLE_VERSION,
      game: bundle.game,
      assets: assets.map((asset) => ({
        slot: asset.slot,
        id: asset.id,
        kind: asset.kind,
        file: asset.file,
        digest: asset.digest,
      })),
    }),
  );
  return {
    version: BUNDLE_VERSION,
    game: bundle.game,
    assets,
    bundle_digest: bundleDigest,
  };
}

export function buildAuditReport(bundle: CompiledBundle): string {
  const lines: string[] = [
    "Sprite Foundry bundle audit",
    `game: ${bundle.game}`,
    `asset_count: ${bundle.assets.length}`,
    `bundle_digest: ${bundle.bundle_digest}`,
    "",
  ];
  for (const slotId of BUNDLE_SLOTS) {
    const slotAssets = bundle.assets.filter((asset) => asset.slot === slotId);
    if (slotAssets.length === 0) continue;
    lines.push(`[slot: ${slotId}] ${slotAssets.length} asset(s)`);
    for (const asset of slotAssets) {
      lines.push(
        `- ${asset.id} -> ${asset.file} (${asset.kind}) sha256:${asset.digest}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export async function exportBundle(
  bundle: CompiledBundle,
  outDir: string,
): Promise<BundleExportResult> {
  const bundleJson: BundleJson = {
    version: BUNDLE_VERSION,
    game: bundle.game,
    assets: bundle.assets.map((asset) => ({
      slot: asset.slot,
      id: asset.id,
      kind: asset.kind,
      file: asset.file,
      digest: asset.digest,
    })),
    bundle_digest: bundle.bundle_digest,
  };
  const audit = buildAuditReport(bundle);
  const root = join(outDir, bundle.game);
  const files: string[] = [];
  for (const asset of bundle.assets) {
    const target = join(root, asset.file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, asset.svg);
    files.push(asset.file);
  }
  await writeFile(join(root, "bundle.json"), JSON.stringify(sortKeys(bundleJson), null, 2) + "\n");
  files.push("bundle.json");
  await writeFile(join(root, "audit.txt"), audit);
  files.push("audit.txt");
  return { files, bundle_json: bundleJson, audit };
}
