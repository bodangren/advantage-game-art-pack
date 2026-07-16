import { type PhaserLoadConfig, sha256 } from "./svg-assets";
import type {
  TimelineCompilation,
  TimelineCompiledFrame,
} from "./timeline";

export const ATLAS_VERSION = 1 as const;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const HEX_DIGEST_RE = /^[a-f0-9]{64}$/;
const PALETTE_REFERENCE_RE = /var\(--([a-z][a-z0-9-]*)\)/g;

// The sheet safety allowlists mirror the composition engine's
// ALLOWED_SVG_TAGS / ALLOWED_SVG_ATTRIBUTES with one deliberate delta:
// `data-part-id` and `data-slot` are permitted so frame groups keep the
// provenance attributes the engine stamps. Everything else — banned
// elements, event attributes, external references, well-formedness —
// follows the same rules as validateSvgSource.
const ALLOWED_SHEET_TAGS = new Set([
  "circle",
  "ellipse",
  "g",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
]);
const ALLOWED_SHEET_ATTRIBUTES = new Set([
  "cx",
  "cy",
  "d",
  "data-part-id",
  "data-slot",
  "fill",
  "fill-opacity",
  "fill-rule",
  "height",
  "id",
  "opacity",
  "points",
  "preserveAspectRatio",
  "r",
  "rx",
  "ry",
  "stroke",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "transform",
  "viewBox",
  "visibility",
  "width",
  "x",
  "x1",
  "x2",
  "y",
  "y1",
  "y2",
  "xmlns",
]);

export class AtlasValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlasValidationError";
  }
}

export interface AtlasFrameRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AtlasMetadata {
  readonly version: typeof ATLAS_VERSION;
  readonly frame_count: number;
  readonly frame_rects: ReadonlyArray<AtlasFrameRect>;
  readonly durations_ms: readonly number[];
  readonly sheet_digest: string;
  readonly sheet_width: number;
  readonly sheet_height: number;
}

export interface AtlasPackerOptions {
  readonly cols: number;
  readonly frame_w: number;
  readonly frame_h: number;
}

export interface AtlasPhaserLoadConfig {
  readonly key: string;
  readonly url: string;
  readonly svgConfig: { readonly width: number; readonly height: number };
}

export interface AtlasPacked {
  readonly sheet_svg: string;
  readonly atlas_json: AtlasMetadata;
  readonly phaser_load: AtlasPhaserLoadConfig;
}

type UnknownRecord = Record<string, unknown>;
type ViewBox = readonly [number, number, number, number];

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
    throw new AtlasValidationError(
      `${context} missing required key(s): ${missing.join(", ")}`,
    );
  }
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    throw new AtlasValidationError(
      `${context} contains unexpected key(s): ${extra.join(", ")}`,
    );
  }
}

function positiveInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new AtlasValidationError(`${context} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new AtlasValidationError(`${context} must be a non-negative integer`);
  }
  return value;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new AtlasValidationError("atlas sheet produced a non-finite number");
  }
  return Number.isInteger(value) ? String(value) : value.toString();
}

function assertSafeSheetSvg(source: string, context: string): void {
  if (
    /<!DOCTYPE|<!ENTITY|<\/?(script|style|image|use|text|foreignObject|iframe)\b/i.test(
      source,
    )
  ) {
    throw new AtlasValidationError(
      `${context} contains an unsupported or unsafe element`,
    );
  }
  const withoutNamespace = source.replace(
    /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/gi,
    "",
  );
  if (/url\(|javascript:|https?:\/\//i.test(withoutNamespace)) {
    throw new AtlasValidationError(`${context} contains an external reference`);
  }
  if (/<\s*[a-z][^>]*\son[a-z-]+\s*=/i.test(source)) {
    throw new AtlasValidationError(`${context} contains an event attribute`);
  }
  if (!/^\s*<svg\b[^>]*>[\s\S]*<\/svg>\s*$/i.test(source)) {
    throw new AtlasValidationError(`${context} is not well-formed XML`);
  }
  const tagMatches = [
    ...source.matchAll(/<\s*(\/?)\s*([a-z][a-z0-9:-]*)\b([^>]*)>/gi),
  ];
  const stack: string[] = [];
  for (const match of tagMatches) {
    const name = match[2]?.toLowerCase();
    if (!name) continue;
    if (name !== "svg" && !ALLOWED_SHEET_TAGS.has(name)) {
      throw new AtlasValidationError(
        `${context} contains an unsupported SVG element`,
      );
    }
    if (match[1] === "/") {
      if (stack.pop() !== name) {
        throw new AtlasValidationError(`${context} is not well-formed XML`);
      }
    } else if (!/\/\s*$/.test(match[3] ?? "")) {
      stack.push(name);
    }
  }
  if (stack.length !== 0) {
    throw new AtlasValidationError(`${context} is not well-formed XML`);
  }
  const attributes = [
    ...source.matchAll(/\s([a-z_:][a-z0-9:._-]*)\s*=\s*["']/gi),
  ].map((match) => match[1]);
  if (attributes.some((name) => !ALLOWED_SHEET_ATTRIBUTES.has(name ?? ""))) {
    throw new AtlasValidationError(
      `${context} contains an unsupported SVG attribute`,
    );
  }
}

interface ParsedFrame {
  readonly viewBox: ViewBox;
  readonly body: string;
}

function parseFrameSvg(frame: TimelineCompiledFrame): ParsedFrame {
  const context = `atlas frame ${frame.id}`;
  const root = frame.svg.match(/^\s*<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i);
  if (!root) {
    throw new AtlasValidationError(`${context} is not a well-formed SVG document`);
  }
  const viewBoxMatch = (root[1] ?? "").match(
    /\bviewBox\s*=\s*["']([^"']+)["']/i,
  );
  if (!viewBoxMatch?.[1]) {
    throw new AtlasValidationError(`${context} root requires a viewBox`);
  }
  const pieces = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
  if (
    pieces.length !== 4 ||
    pieces.some((value) => !Number.isFinite(value)) ||
    (pieces[2] ?? 0) <= 0 ||
    (pieces[3] ?? 0) <= 0
  ) {
    throw new AtlasValidationError(`${context} has an invalid viewBox`);
  }
  const viewBox = pieces as unknown as ViewBox;
  let body = root[2] ?? "";
  // Lift the engine's palette declarations out of the frame and resolve
  // every var(--slot) reference inline, so the packed sheet carries no
  // <style> element and no CSS custom-property indirection.
  const palette = new Map<string, string>();
  const styleMatch = body.match(/<style id="asf-palette">([\s\S]*?)<\/style>/);
  if (styleMatch) {
    for (const declaration of (styleMatch[1] ?? "").matchAll(
      /--([a-z][a-z0-9-]*):\s*(#[0-9a-f]{6}(?:[0-9a-f]{2})?);/gi,
    )) {
      if (declaration[1] && declaration[2]) {
        palette.set(declaration[1], declaration[2].toLowerCase());
      }
    }
    body = body.replace(styleMatch[0], "");
  }
  body = body.replace(PALETTE_REFERENCE_RE, (_match, name: string) => {
    const color = palette.get(name);
    if (!color) {
      throw new AtlasValidationError(
        `${context} references unresolved palette slot --${name}`,
      );
    }
    return color;
  });
  const trimmed = body.trim();
  // Per-frame injection guard; the assembled sheet is validated again
  // end-to-end before packing completes.
  assertSafeSheetSvg(
    `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 1 1">${trimmed}</svg>`,
    context,
  );
  return { viewBox, body: trimmed };
}

export function validateAtlasMetadata(metadata: unknown): AtlasMetadata {
  if (!isRecord(metadata)) {
    throw new AtlasValidationError("atlas metadata must be an object");
  }
  assertKeys(
    metadata,
    ["version", "frames", "digest"],
    ["version", "frames", "digest", "sheet_width", "sheet_height"],
    "atlas metadata",
  );
  if (metadata.version !== ATLAS_VERSION) {
    throw new AtlasValidationError("atlas metadata.version must be 1");
  }
  if (!Array.isArray(metadata.frames) || metadata.frames.length === 0) {
    throw new AtlasValidationError(
      "atlas metadata frame_count must be positive: frames must be a non-empty array",
    );
  }
  if (typeof metadata.digest !== "string" || !HEX_DIGEST_RE.test(metadata.digest)) {
    throw new AtlasValidationError(
      "atlas metadata sheet_digest must be a 64-character hex string",
    );
  }
  const seen = new Set<string>();
  const frameRects: AtlasFrameRect[] = [];
  const durations: number[] = [];
  metadata.frames.forEach((raw, index) => {
    const context = `atlas metadata.frames[${index}]`;
    if (!isRecord(raw)) {
      throw new AtlasValidationError(`${context} must be an object`);
    }
    assertKeys(
      raw,
      ["id", "x", "y", "width", "height", "duration_ms"],
      ["id", "x", "y", "width", "height", "duration_ms"],
      context,
    );
    if (typeof raw.id !== "string" || raw.id.length === 0) {
      throw new AtlasValidationError(`${context}.id must be a non-empty string`);
    }
    if (seen.has(raw.id)) {
      throw new AtlasValidationError(
        `atlas metadata contains duplicate frame id ${raw.id}`,
      );
    }
    seen.add(raw.id);
    frameRects.push({
      id: raw.id,
      x: nonNegativeInteger(raw.x, `${context}.x`),
      y: nonNegativeInteger(raw.y, `${context}.y`),
      width: positiveInteger(raw.width, `${context}.width`),
      height: positiveInteger(raw.height, `${context}.height`),
    });
    durations.push(positiveInteger(raw.duration_ms, `${context}.duration_ms`));
  });
  const derivedWidth = Math.max(
    ...frameRects.map((rect) => rect.x + rect.width),
  );
  const derivedHeight = Math.max(
    ...frameRects.map((rect) => rect.y + rect.height),
  );
  const sheetWidth =
    metadata.sheet_width === undefined
      ? derivedWidth
      : positiveInteger(metadata.sheet_width, "atlas metadata.sheet_width");
  const sheetHeight =
    metadata.sheet_height === undefined
      ? derivedHeight
      : positiveInteger(metadata.sheet_height, "atlas metadata.sheet_height");
  return {
    version: ATLAS_VERSION,
    frame_count: frameRects.length,
    frame_rects: frameRects,
    durations_ms: durations,
    sheet_digest: metadata.digest,
    sheet_width: sheetWidth,
    sheet_height: sheetHeight,
  };
}

export async function packAtlas(
  timeline: TimelineCompilation,
  options: AtlasPackerOptions,
): Promise<AtlasPacked> {
  if (!isRecord(options)) {
    throw new AtlasValidationError("atlas options must be an object");
  }
  const cols = positiveInteger(options.cols, "atlas options.cols");
  const frameWidth = positiveInteger(options.frame_w, "atlas options.frame_w");
  const frameHeight = positiveInteger(options.frame_h, "atlas options.frame_h");
  if (!isRecord(timeline) || !Array.isArray(timeline.frames) || timeline.frames.length === 0) {
    throw new AtlasValidationError("atlas timeline frames must be a non-empty array");
  }
  // The timeline id becomes the Phaser load key; packing an unnamed
  // timeline would produce a keyless load config, so reject it here.
  if (typeof timeline.id !== "string" || timeline.id.length === 0) {
    throw new AtlasValidationError(
      "atlas requires a named timeline: timeline.id is missing",
    );
  }
  const frames = [...timeline.frames].sort((a, b) => a.id.localeCompare(b.id));
  const rows = Math.ceil(frames.length / cols);
  const sheetWidth = cols * frameWidth;
  const sheetHeight = rows * frameHeight;
  const rects: AtlasFrameRect[] = [];
  const durations: number[] = [];
  const groups: string[] = [];
  for (const [index, frame] of frames.entries()) {
    const x = (index % cols) * frameWidth;
    const y = Math.floor(index / cols) * frameHeight;
    rects.push({ id: frame.id, x, y, width: frameWidth, height: frameHeight });
    durations.push(frame.duration_ms);
    const parsed = parseFrameSvg(frame);
    const scaleX = frameWidth / parsed.viewBox[2];
    const scaleY = frameHeight / parsed.viewBox[3];
    groups.push(
      [
        `  <g id="asf-frame-${frame.id}" transform="translate(${formatNumber(x)} ${formatNumber(y)}) scale(${formatNumber(scaleX)} ${formatNumber(scaleY)})">`,
        parsed.body,
        "  </g>",
      ].join("\n"),
    );
  }
  const sheetSvg = [
    `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${sheetWidth} ${sheetHeight}" width="${sheetWidth}" height="${sheetHeight}">`,
    groups.join("\n"),
    "</svg>",
  ].join("\n");
  // B1 guard: even if one frame's source slipped something past the
  // per-frame check, the assembled sheet must reject before it ships.
  assertSafeSheetSvg(sheetSvg, "atlas sheet");
  const sheetDigest = await sha256(sheetSvg);
  const atlasJson = validateAtlasMetadata({
    version: ATLAS_VERSION,
    frames: rects.map((rect, index) => ({
      ...rect,
      duration_ms: durations[index]!,
    })),
    digest: sheetDigest,
    sheet_width: sheetWidth,
    sheet_height: sheetHeight,
  });
  const phaserLoad: AtlasPhaserLoadConfig = {
    key: timeline.id,
    url: "asset.svg",
    svgConfig: { width: sheetWidth, height: sheetHeight },
  };
  return { sheet_svg: sheetSvg, atlas_json: atlasJson, phaser_load: phaserLoad };
}
