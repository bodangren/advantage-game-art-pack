export const SVG_ASSET_VERSION = 1 as const;
export const SVG_PART_LIBRARY_VERSION = 1 as const;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PART_ID_RE = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SLOT_RE = /^[a-z][a-z0-9-]*$/;
const HEX_COLOR_RE = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
const PALETTE_REFERENCE_RE = /var\(--([a-z][a-z0-9-]*)\)/g;
const MAX_SVG_NUMBER = 1_000_000;
const MAX_SCALE = 1_000;
const MAX_OUTPUT_DIMENSION = 32_768;
const ALLOWED_SVG_TAGS = new Set([
  "circle",
  "ellipse",
  "g",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
]);
const ALLOWED_SVG_ATTRIBUTES = new Set([
  "cx",
  "cy",
  "d",
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

export type NumberPair = readonly [number, number];
export type ViewBox = readonly [number, number, number, number];

export interface SvgAnchor {
  readonly x: number;
  readonly y: number;
}

export interface SvgPartMetadata {
  readonly version: typeof SVG_PART_LIBRARY_VERSION;
  readonly part_id: string;
  readonly slot: string;
  readonly source_file: string;
  readonly view_box: ViewBox;
  readonly anchors: Readonly<Record<string, NumberPair>>;
  readonly z_index: number;
  readonly palette_slots: readonly string[];
  readonly tags: readonly string[];
  readonly description: string;
}

export interface SvgPart {
  readonly metadata: SvgPartMetadata;
  readonly source: string;
}

export interface SvgAttachment {
  readonly placement_id: string;
  readonly anchor: string;
}

export interface SvgPartPlacement {
  readonly id: string;
  readonly part_id: string;
  readonly position: NumberPair;
  readonly anchor: string | null;
  readonly attach_to: SvgAttachment | null;
  readonly offset: NumberPair;
  readonly scale: number;
  readonly rotate: number;
  readonly z_index: number | null;
}

export interface SvgCompositionSpec {
  readonly version: typeof SVG_ASSET_VERSION;
  readonly asset_id: string;
  readonly view_box: ViewBox;
  readonly output: { readonly width: number; readonly height: number } | null;
  readonly palette: Readonly<Record<string, string>>;
  readonly parts: readonly SvgPartPlacement[];
}

export interface PhaserLoadConfig {
  readonly key: string;
  readonly url: string;
  readonly svgConfig: { readonly width: number; readonly height: number };
}

export interface SvgAssetMetadata {
  readonly version: typeof SVG_ASSET_VERSION;
  readonly asset_id: string;
  readonly view_box: ViewBox;
  readonly output: SvgCompositionSpec["output"];
  readonly palette: Readonly<Record<string, string>>;
  readonly parts: readonly {
    readonly id: string;
    readonly part_id: string;
    readonly slot: string;
    readonly z_index: number;
    readonly transform: string;
    readonly anchors: Readonly<Record<string, NumberPair>>;
  }[];
  readonly source_spec: Record<string, unknown>;
  readonly phaser_load: PhaserLoadConfig;
  readonly svg_sha256: string;
}

export interface ComposedSvgAsset {
  readonly svg: string;
  readonly metadata: SvgAssetMetadata;
  readonly phaserLoad: PhaserLoadConfig;
}

export class SvgAssetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SvgAssetValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;
type Matrix = readonly [number, number, number, number, number, number];

interface ResolvedPlacement {
  readonly placement: SvgPartPlacement;
  readonly part: SvgPart;
  readonly matrix: Matrix;
  readonly transformedAnchors: Readonly<Record<string, NumberPair>>;
  readonly zIndex: number;
  readonly sourceIndex: number;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(
  value: UnknownRecord,
  required: readonly string[],
  allowed: readonly string[],
  context: string,
): void {
  const allowedSet = new Set(allowed);
  const missing = required.filter((key) => !(key in value));
  const extra = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (missing.length > 0) {
    throw new SvgAssetValidationError(
      `${context} missing required key(s): ${missing.join(", ")}`,
    );
  }
  if (extra.length > 0) {
    throw new SvgAssetValidationError(
      `${context} contains unexpected key(s): ${extra.join(", ")}`,
    );
  }
}

function finiteNumber(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new SvgAssetValidationError(`${context} must be a finite number`);
  }
  if (Math.abs(value) > MAX_SVG_NUMBER) {
    throw new SvgAssetValidationError(
      `${context} must not exceed ${MAX_SVG_NUMBER} in magnitude`,
    );
  }
  return value === 0 ? 0 : value;
}

function numberPair(value: unknown, context: string): NumberPair {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new SvgAssetValidationError(`${context} must be a two-item array`);
  }
  return [
    finiteNumber(value[0], `${context}[0]`),
    finiteNumber(value[1], `${context}[1]`),
  ];
}

function viewBox(value: unknown, context: string): ViewBox {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new SvgAssetValidationError(`${context} must be a four-item array`);
  }
  const result: ViewBox = [
    finiteNumber(value[0], `${context}[0]`),
    finiteNumber(value[1], `${context}[1]`),
    finiteNumber(value[2], `${context}[2]`),
    finiteNumber(value[3], `${context}[3]`),
  ];
  if (result[2] <= 0 || result[3] <= 0) {
    throw new SvgAssetValidationError(`${context} width and height must be positive`);
  }
  return result;
}

function slug(value: unknown, context: string): string {
  if (typeof value !== "string" || !PART_ID_RE.test(value)) {
    throw new SvgAssetValidationError(`${context} must be a lowercase slug`);
  }
  return value;
}

function slot(value: unknown, context: string): string {
  if (typeof value !== "string" || !SLOT_RE.test(value)) {
    throw new SvgAssetValidationError(`${context} must be a lowercase slot`);
  }
  return value;
}

function stringValue(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new SvgAssetValidationError(`${context} must be a non-empty string`);
  }
  return value;
}

function stringList(value: unknown, context: string, allowEmpty = false): string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new SvgAssetValidationError(`${context} must be a non-empty array`);
  }
  const result = value.map((item, index) => stringValue(item, `${context}[${index}]`));
  if (new Set(result).size !== result.length) {
    throw new SvgAssetValidationError(`${context} must not contain duplicates`);
  }
  return result;
}

function safeRelativePath(value: unknown, context: string): string {
  const path = stringValue(value, context).replaceAll("\\", "/");
  if (path.startsWith("/") || path.split("/").includes("..") || path === ".") {
    throw new SvgAssetValidationError(`${context} must be a safe relative path`);
  }
  return path;
}

function formatNumber(value: number): string {
  const numeric = finiteNumber(value, "SVG number");
  return Number.isInteger(numeric) ? String(numeric) : numeric.toString();
}

function formatViewBox(value: ViewBox): string {
  return value.map(formatNumber).join(" ");
}

function formatMatrix(matrix: Matrix): string {
  return `matrix(${matrix.map(formatNumber).join(" ")})`;
}

function exactRecord(value: unknown, context: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new SvgAssetValidationError(`${context} must be an object`);
  }
  return value;
}

function parseRootViewBox(source: string, context: string): ViewBox {
  const root = source.match(/^\s*(?:<\?xml[^>]*>\s*)?<svg\b([^>]*)>/i);
  if (!root) {
    throw new SvgAssetValidationError(`${context} must start with an SVG root`);
  }
  const match = (root[1] ?? "").match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  if (!match?.[1]) {
    throw new SvgAssetValidationError(`${context} root requires a viewBox`);
  }
  const pieces = match[1].trim().split(/[\s,]+/).map(Number);
  return viewBox(pieces, `${context}.root.viewBox`);
}

function referencedPaletteSlots(source: string): string[] {
  const slots = new Set<string>();
  for (const match of source.matchAll(PALETTE_REFERENCE_RE)) {
    if (match[1]) slots.add(match[1]);
  }
  return [...slots].sort();
}

function extractSvgChildren(source: string, context: string): string {
  const match = source.match(/^\s*<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/i);
  if (!match?.[1]) {
    throw new SvgAssetValidationError(`${context} must contain a non-empty SVG root`);
  }
  return match[1].trim();
}

export function validateSvgPartMetadata(value: unknown): SvgPartMetadata {
  const payload = exactRecord(value, "SVG part metadata");
  assertAllowedKeys(
    payload,
    [
      "version",
      "part_id",
      "slot",
      "source_file",
      "view_box",
      "anchors",
      "z_index",
      "palette_slots",
      "tags",
      "description",
    ],
    [
      "version",
      "part_id",
      "slot",
      "source_file",
      "view_box",
      "anchors",
      "z_index",
      "palette_slots",
      "tags",
      "description",
    ],
    "SVG part metadata",
  );
  if (payload.version !== SVG_PART_LIBRARY_VERSION) {
    throw new SvgAssetValidationError("SVG part metadata.version must be 1");
  }
  const rawAnchors = exactRecord(payload.anchors, "SVG part metadata.anchors");
  const anchors: Record<string, NumberPair> = {};
  for (const [name, value] of Object.entries(rawAnchors).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    anchors[slot(name, "SVG anchor name")] = numberPair(value, `SVG anchor ${name}`);
  }
  if (typeof payload.z_index !== "number" || !Number.isInteger(payload.z_index)) {
    throw new SvgAssetValidationError("SVG part metadata.z_index must be an integer");
  }
  return {
    version: SVG_PART_LIBRARY_VERSION,
    part_id: slug(payload.part_id, "SVG part metadata.part_id"),
    slot: slot(payload.slot, "SVG part metadata.slot"),
    source_file: safeRelativePath(payload.source_file, "SVG part metadata.source_file"),
    view_box: viewBox(payload.view_box, "SVG part metadata.view_box"),
    anchors,
    z_index: payload.z_index,
    palette_slots: stringList(payload.palette_slots, "SVG part metadata.palette_slots", true)
      .map((item, index) => slot(item, `SVG palette slot ${index}`)),
    tags: stringList(payload.tags, "SVG part metadata.tags"),
    description: stringValue(payload.description, "SVG part metadata.description"),
  };
}

export function validateSvgSource(
  source: string,
  metadata: SvgPartMetadata,
  context = `SVG part ${metadata.part_id}`,
): string[] {
  if (typeof source !== "string" || source.length === 0) {
    throw new SvgAssetValidationError(`${context} source must be a non-empty string`);
  }
  if (/<!DOCTYPE|<!ENTITY|<\/?(script|style|image|use|text|foreignObject|iframe)\b/i.test(source)) {
    throw new SvgAssetValidationError(`${context} contains an unsupported or unsafe element`);
  }
  const sourceWithoutSvgNamespace = source.replace(
    /xmlns\s*=\s*["']http:\/\/www\.w3\.org\/2000\/svg["']/gi,
    "",
  );
  if (/url\(|javascript:|https?:\/\//i.test(sourceWithoutSvgNamespace)) {
    throw new SvgAssetValidationError(`${context} contains an external reference`);
  }
  if (!/^\s*(?:<\?xml[^>]*>\s*)?<svg\b[^>]*>[\s\S]*<\/svg>\s*$/i.test(source)) {
    throw new SvgAssetValidationError(`${context} is not well-formed XML`);
  }
  const tagMatches = [...source.matchAll(/<\s*(\/?)\s*([a-z][a-z0-9:-]*)\b([^>]*)>/gi)];
  const tags = tagMatches.map((match) => match[2]?.toLowerCase());
  const openingTags = tagMatches
    .filter((match) => match[1] !== "/")
    .map((match) => match[2]?.toLowerCase());
  const closingTags = tagMatches
    .filter((match) => match[1] === "/")
    .map((match) => match[2]?.toLowerCase());
  if (
    openingTags[0] !== "svg" ||
    openingTags.filter((tag) => tag === "svg").length !== 1 ||
    closingTags.filter((tag) => tag === "svg").length !== 1 ||
    tags.some((tag) => tag !== "svg" && !ALLOWED_SVG_TAGS.has(tag ?? ""))
  ) {
    throw new SvgAssetValidationError(
      `${context} contains an unsupported SVG element`,
    );
  }
  const stack: string[] = [];
  for (const match of tagMatches) {
    const name = match[2]?.toLowerCase();
    if (!name) continue;
    if (match[1] === "/") {
      if (stack.pop() !== name) {
        throw new SvgAssetValidationError(`${context} is not well-formed XML`);
      }
    } else if (!/\/\s*$/.test(match[3] ?? "")) {
      stack.push(name);
    }
  }
  if (stack.length !== 0) {
    throw new SvgAssetValidationError(`${context} is not well-formed XML`);
  }
  if (/<\s*[a-z][^>]*\son[a-z-]+\s*=/i.test(source)) {
    throw new SvgAssetValidationError(`${context} contains an event attribute`);
  }
  const sourceBox = parseRootViewBox(source, context);
  if (sourceBox.some((value, index) => value !== metadata.view_box[index])) {
    throw new SvgAssetValidationError(`${context} viewBox does not match metadata`);
  }
  const attributes = [...source.matchAll(/\s([a-z_:][a-z0-9:._-]*)\s*=\s*["']/gi)]
    .map((match) => match[1]);
  if (attributes.some((name) => !ALLOWED_SVG_ATTRIBUTES.has(name ?? ""))) {
    throw new SvgAssetValidationError(`${context} contains an unsupported SVG attribute`);
  }
  const colorAttributes = [...source.matchAll(/\b(fill|stroke)\s*=\s*["']([^"']+)["']/gi)];
  if (colorAttributes.some((match) => match[2]?.includes("var(") && !/^var\(--[a-z][a-z0-9-]*\)$/.test(match[2]))) {
    throw new SvgAssetValidationError(`${context} palette values must be var(--slot)`);
  }
  const references = referencedPaletteSlots(source);
  const declared = new Set(metadata.palette_slots);
  const undeclared = references.filter((name) => !declared.has(name));
  if (undeclared.length > 0) {
    throw new SvgAssetValidationError(
      `${context} uses undeclared palette slot(s): ${undeclared.join(", ")}`,
    );
  }
  return references;
}

export function validateSvgPart(part: SvgPart): SvgPart {
  const metadata = validateSvgPartMetadata(part.metadata);
  validateSvgSource(part.source, metadata);
  return { metadata, source: part.source };
}

export function normalizeCompositionSpec(value: unknown): SvgCompositionSpec {
  const payload = exactRecord(value, "SVG composition spec");
  assertAllowedKeys(
    payload,
    ["version", "asset_id", "view_box", "palette", "parts"],
    ["version", "asset_id", "view_box", "output", "palette", "parts"],
    "SVG composition spec",
  );
  if (payload.version !== SVG_ASSET_VERSION) {
    throw new SvgAssetValidationError("SVG composition spec.version must be 1");
  }
  const rawPalette = exactRecord(payload.palette, "SVG composition spec.palette");
  const palette: Record<string, string> = {};
  for (const name of Object.keys(rawPalette).sort()) {
    slot(name, `SVG palette slot ${name}`);
    const color = rawPalette[name];
    if (typeof color !== "string" || !HEX_COLOR_RE.test(color)) {
      throw new SvgAssetValidationError(`SVG palette ${name} must be a hex color`);
    }
    palette[name] = color.toLowerCase();
  }
  const outputValue = payload.output;
  let output: SvgCompositionSpec["output"] = null;
  if (outputValue !== undefined && outputValue !== null) {
    const rawOutput = exactRecord(outputValue, "SVG composition spec.output");
    assertAllowedKeys(rawOutput, ["width", "height"], ["width", "height"], "SVG output");
    const width = rawOutput.width;
    const height = rawOutput.height;
    if (
      typeof width !== "number" ||
      !Number.isInteger(width) ||
      typeof height !== "number" ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new SvgAssetValidationError("SVG output dimensions must be positive integers");
    }
    if (width > MAX_OUTPUT_DIMENSION || height > MAX_OUTPUT_DIMENSION) {
      throw new SvgAssetValidationError(
        `SVG output dimensions must not exceed ${MAX_OUTPUT_DIMENSION}`,
      );
    }
    output = { width, height };
  }
  if (!Array.isArray(payload.parts)) {
    throw new SvgAssetValidationError("SVG composition spec.parts must be an array");
  }
  const ids = new Set<string>();
  const parts = payload.parts.map((value, index) => {
    const context = `SVG composition spec.parts[${index}]`;
    const rawPart = exactRecord(value, context);
    assertAllowedKeys(
      rawPart,
      ["id", "part_id"],
      [
        "id",
        "part_id",
        "position",
        "anchor",
        "attach_to",
        "offset",
        "scale",
        "rotate",
        "z_index",
      ],
      context,
    );
    const id = slug(rawPart.id, `${context}.id`);
    if (ids.has(id)) throw new SvgAssetValidationError(`${context}.id duplicates ${id}`);
    ids.add(id);
    const rawAnchor = rawPart.anchor;
    const anchor = rawAnchor === undefined || rawAnchor === null
      ? null
      : stringValue(rawAnchor, `${context}.anchor`);
    let attachTo: SvgAttachment | null = null;
    if (rawPart.attach_to !== undefined && rawPart.attach_to !== null) {
      const attachment = exactRecord(rawPart.attach_to, `${context}.attach_to`);
      assertAllowedKeys(
        attachment,
        ["placement_id", "anchor"],
        ["placement_id", "anchor"],
        `${context}.attach_to`,
      );
      attachTo = {
        placement_id: slug(attachment.placement_id, `${context}.attach_to.placement_id`),
        anchor: stringValue(attachment.anchor, `${context}.attach_to.anchor`),
      };
    }
    const scale = rawPart.scale === undefined ? 1 : finiteNumber(rawPart.scale, `${context}.scale`);
    if (scale <= 0 || scale > MAX_SCALE) {
      throw new SvgAssetValidationError(`${context}.scale must be between 0 and ${MAX_SCALE}`);
    }
    const rotate = rawPart.rotate === undefined ? 0 : finiteNumber(rawPart.rotate, `${context}.rotate`);
    const zIndex = rawPart.z_index === undefined || rawPart.z_index === null
      ? null
      : rawPart.z_index;
    if (zIndex !== null && (typeof zIndex !== "number" || !Number.isInteger(zIndex))) {
      throw new SvgAssetValidationError(`${context}.z_index must be null or an integer`);
    }
    return {
      id,
      part_id: slug(rawPart.part_id, `${context}.part_id`),
      position: numberPair(rawPart.position ?? [0, 0], `${context}.position`),
      anchor,
      attach_to: attachTo,
      offset: numberPair(rawPart.offset ?? [0, 0], `${context}.offset`),
      scale,
      rotate,
      z_index: zIndex,
    } satisfies SvgPartPlacement;
  });
  return {
    version: SVG_ASSET_VERSION,
    asset_id: slug(payload.asset_id, "SVG composition spec.asset_id"),
    view_box: viewBox(payload.view_box, "SVG composition spec.view_box"),
    output,
    palette,
    parts,
  };
}

export function serializeCompositionSpec(spec: SvgCompositionSpec): Record<string, unknown> {
  return {
    version: spec.version,
    asset_id: spec.asset_id,
    view_box: [...spec.view_box],
    output: spec.output ? { ...spec.output } : null,
    palette: Object.fromEntries(Object.entries(spec.palette).sort(([a], [b]) => a.localeCompare(b))),
    parts: spec.parts.map((part) => ({
      id: part.id,
      part_id: part.part_id,
      position: [...part.position],
      anchor: part.anchor,
      attach_to: part.attach_to ? { ...part.attach_to } : null,
      offset: [...part.offset],
      scale: part.scale,
      rotate: part.rotate,
      z_index: part.z_index,
    })),
  };
}

function matrixPoint(matrix: Matrix, point: NumberPair): NumberPair {
  const [a, b, c, d, e, f] = matrix;
  return [a * point[0] + c * point[1] + e, b * point[0] + d * point[1] + f];
}

function matrixForPlacement(
  placement: SvgPartPlacement,
  part: SvgPart,
  target: NumberPair,
): Matrix {
  const sourceAnchor = placement.anchor === null
    ? [0, 0] as const
    : part.metadata.anchors[placement.anchor];
  if (!sourceAnchor) {
    throw new SvgAssetValidationError(
      `part ${placement.part_id} has unknown anchor ${placement.anchor}`,
    );
  }
  const radians = placement.rotate * Math.PI / 180;
  const cosine = Math.abs(Math.cos(radians)) < 1e-12 ? 0 : Math.cos(radians);
  const sine = Math.abs(Math.sin(radians)) < 1e-12 ? 0 : Math.sin(radians);
  const a = placement.scale * cosine;
  const b = placement.scale * sine;
  const c = -placement.scale * sine;
  const d = placement.scale * cosine;
  const e = target[0] + placement.offset[0] - (a * sourceAnchor[0] + c * sourceAnchor[1]);
  const f = target[1] + placement.offset[1] - (b * sourceAnchor[0] + d * sourceAnchor[1]);
  const matrix: Matrix = [a, b, c, d, e, f];
  if (matrix.some((value) => !Number.isFinite(value))) {
    throw new SvgAssetValidationError(`placement ${placement.id} produced a non-finite transform`);
  }
  return matrix;
}

function resolvePlacements(
  spec: SvgCompositionSpec,
  library: ReadonlyMap<string, SvgPart>,
): ResolvedPlacement[] {
  const byId = new Map(spec.parts.map((part) => [part.id, part]));
  const sourceIndices = new Map(spec.parts.map((part, index) => [part.id, index]));
  const resolved = new Map<string, ResolvedPlacement>();
  const resolving = new Set<string>();

  const resolve = (id: string): ResolvedPlacement => {
    const cached = resolved.get(id);
    if (cached) return cached;
    if (resolving.has(id)) {
      throw new SvgAssetValidationError(`cyclic SVG attachment involving ${id}`);
    }
    const placement = byId.get(id);
    if (!placement) throw new SvgAssetValidationError(`unknown placement ${id}`);
    const part = library.get(placement.part_id);
    if (!part) throw new SvgAssetValidationError(`unknown SVG part ${placement.part_id}`);
    resolving.add(id);
    const missingPalette = part.metadata.palette_slots.filter((name) => !(name in spec.palette));
    if (missingPalette.length > 0) {
      throw new SvgAssetValidationError(
        `missing palette value(s) for ${placement.part_id}: ${missingPalette.join(", ")}`,
      );
    }
    const target = placement.attach_to === null
      ? placement.position
      : resolve(placement.attach_to.placement_id).transformedAnchors[placement.attach_to.anchor];
    if (!target) {
      throw new SvgAssetValidationError(
        `placement ${id} references an unknown attachment anchor`,
      );
    }
    const matrix = matrixForPlacement(placement, part, target);
    const transformedAnchors: Record<string, NumberPair> = {};
    for (const [name, anchor] of Object.entries(part.metadata.anchors)) {
      const point = matrixPoint(matrix, anchor);
      if (point.some((value) => !Number.isFinite(value))) {
        throw new SvgAssetValidationError(`placement ${id} produced non-finite anchors`);
      }
      transformedAnchors[name] = point;
    }
    const item: ResolvedPlacement = {
      placement,
      part,
      matrix,
      transformedAnchors,
      zIndex: placement.z_index ?? part.metadata.z_index,
      sourceIndex: sourceIndices.get(id) ?? 0,
    };
    resolving.delete(id);
    resolved.set(id, item);
    return item;
  };

  for (const placement of spec.parts) resolve(placement.id);
  return [...resolved.values()].sort((a, b) => a.zIndex - b.zIndex || a.sourceIndex - b.sourceIndex);
}

function paletteStyle(palette: Readonly<Record<string, string>>): string {
  const declarations = Object.entries(palette)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, color]) => `  --${name}: ${color};`)
    .join("\n");
  return `:root {\n${declarations}\n}`;
}

export function buildPhaserLoadConfig(spec: SvgCompositionSpec): PhaserLoadConfig {
  const normalizedSpec = normalizeCompositionSpec(spec);
  const width = normalizedSpec.output?.width ?? normalizedSpec.view_box[2];
  const height = normalizedSpec.output?.height ?? normalizedSpec.view_box[3];
  if (width > MAX_OUTPUT_DIMENSION || height > MAX_OUTPUT_DIMENSION) {
    throw new SvgAssetValidationError(
      `Phaser SVG dimensions must not exceed ${MAX_OUTPUT_DIMENSION}`,
    );
  }
  return {
    key: normalizedSpec.asset_id,
    url: "asset.svg",
    svgConfig: { width, height },
  };
}

export function composeSvg(
  spec: SvgCompositionSpec,
  parts: readonly SvgPart[],
): string {
  const normalizedSpec = normalizeCompositionSpec(spec);
  const library = new Map<string, SvgPart>();
  for (const rawPart of parts) {
    const part = validateSvgPart(rawPart);
    if (library.has(part.metadata.part_id)) {
      throw new SvgAssetValidationError(`duplicate SVG part ${part.metadata.part_id}`);
    }
    library.set(part.metadata.part_id, part);
  }
  const resolved = resolvePlacements(normalizedSpec, library);
  const outputAttributes = normalizedSpec.output
    ? ` width="${normalizedSpec.output.width}" height="${normalizedSpec.output.height}"`
    : "";
  const style = Object.keys(normalizedSpec.palette).length > 0
    ? `  <style id="asf-palette">${paletteStyle(normalizedSpec.palette)}</style>\n`
    : "";
  const groups = resolved.map((item) => {
    const children = extractSvgChildren(item.part.source, `part ${item.part.metadata.part_id}`);
    return [
      `  <g id="${item.placement.id}" data-part-id="${item.part.metadata.part_id}" data-slot="${item.part.metadata.slot}" transform="${formatMatrix(item.matrix)}">`,
      children,
      "  </g>",
    ].join("\n");
  });
  return [
    `<svg xmlns="${SVG_NAMESPACE}" viewBox="${formatViewBox(normalizedSpec.view_box)}"${outputAttributes}>`,
    style.trimEnd(),
    groups.join("\n"),
    "</svg>",
    "",
  ].filter((line) => line.length > 0).join("\n");
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new SvgAssetValidationError("Web Crypto SHA-256 is unavailable");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(digest));
}

export async function composeSvgAsset(
  spec: SvgCompositionSpec,
  parts: readonly SvgPart[],
): Promise<ComposedSvgAsset> {
  const normalizedSpec = normalizeCompositionSpec(spec);
  const svg = composeSvg(normalizedSpec, parts);
  const phaserLoad = buildPhaserLoadConfig(normalizedSpec);
  const library = new Map(parts.map((part) => [part.metadata.part_id, part]));
  const resolved = resolvePlacements(normalizedSpec, library);
  const metadata: SvgAssetMetadata = {
    version: SVG_ASSET_VERSION,
    asset_id: normalizedSpec.asset_id,
    view_box: normalizedSpec.view_box,
    output: normalizedSpec.output,
    palette: Object.fromEntries(Object.entries(normalizedSpec.palette).sort(([a], [b]) => a.localeCompare(b))),
    parts: resolved.map((item) => ({
      id: item.placement.id,
      part_id: item.part.metadata.part_id,
      slot: item.part.metadata.slot,
      z_index: item.zIndex,
      transform: formatMatrix(item.matrix),
      anchors: item.transformedAnchors,
    })),
    source_spec: serializeCompositionSpec(normalizedSpec),
    phaser_load: phaserLoad,
    svg_sha256: await sha256(svg),
  };
  return { svg, metadata, phaserLoad };
}
