import {
  type AtlasMetadata,
  type AtlasPackerOptions,
  type AtlasPhaserLoadConfig,
  packAtlas,
} from "./atlas";
import {
  type SvgCompositionSpec,
  type SvgPart,
  SvgAssetValidationError,
  normalizeCompositionSpec,
  sha256,
} from "./svg-assets";
import {
  type TimelineCompiledFrame,
  type TimelineFrameOverrides,
  type TimelineSpec,
  compileTimeline,
  validateTimelineSpec,
} from "./timeline";

export const DIRECTIONAL_VERSION = 1 as const;

export const DIRECTION_SETS = {
  "4-way": ["north", "south", "east", "west"],
  "8-way": [
    "north",
    "south",
    "east",
    "west",
    "north-east",
    "south-east",
    "south-west",
    "north-west",
  ],
} as const;
export type DirectionSetId = keyof typeof DIRECTION_SETS;
export type Direction = (typeof DIRECTION_SETS)[DirectionSetId][number];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class DirectionalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectionalValidationError";
  }
}

export interface DirectionalFrameSpec {
  readonly overrides: TimelineFrameOverrides | null;
}

export interface DirectionalExplicitEntry {
  readonly kind: "explicit";
  readonly frames: readonly DirectionalFrameSpec[];
}

export interface DirectionalMirrorEntry {
  readonly kind: "mirror";
  readonly mirror_of: Direction;
  readonly flip: "horizontal";
}

export type DirectionalEntry = DirectionalExplicitEntry | DirectionalMirrorEntry;

export interface DirectionalAnimation {
  readonly frame_count: number;
  readonly duration_ms: number;
  readonly composition: SvgCompositionSpec;
  readonly directions: Readonly<Record<string, DirectionalEntry>>;
}

export interface DirectionalSpec {
  readonly version: typeof DIRECTIONAL_VERSION;
  readonly id: string;
  readonly direction_set: DirectionSetId;
  readonly animations: Readonly<Record<string, DirectionalAnimation>>;
}

export interface ExpandedTimeline {
  readonly direction: Direction;
  readonly flip: "horizontal" | null;
  readonly timeline_id: string;
  readonly spec: TimelineSpec;
}

export interface ExpandedAnimation {
  readonly animation: string;
  readonly timelines: readonly ExpandedTimeline[];
}

export interface DirectionalSheet {
  readonly animation: string;
  readonly direction: Direction;
  readonly timeline_id: string;
  readonly flip: "horizontal" | null;
  readonly frames: ReadonlyArray<TimelineCompiledFrame>;
  readonly sheet_svg: string;
  readonly atlas_json: AtlasMetadata;
  readonly phaser_load: AtlasPhaserLoadConfig;
}

export interface SheetManifestEntry {
  readonly animation: string;
  readonly direction: Direction;
  readonly timeline_id: string;
  readonly flip: "horizontal" | null;
  readonly frame_count: number;
  readonly frame_rects: AtlasMetadata["frame_rects"];
  readonly frame_digests: readonly string[];
  readonly sheet_digest: string;
  readonly phaser_load: AtlasPhaserLoadConfig;
}

export interface SheetManifest {
  readonly version: typeof DIRECTIONAL_VERSION;
  readonly id: string;
  readonly direction_set: DirectionSetId;
  readonly sheets: readonly SheetManifestEntry[];
  readonly manifest_digest: string;
}

export interface DirectionalSheetSet {
  readonly sheets: readonly DirectionalSheet[];
  readonly manifest: SheetManifest;
}

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
    throw new DirectionalValidationError(
      `${context} missing required key(s): ${missing.join(", ")}`,
    );
  }
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    throw new DirectionalValidationError(
      `${context} contains unexpected key(s): ${extra.join(", ")}`,
    );
  }
}

function positiveInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new DirectionalValidationError(`${context} must be a positive integer`);
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

function parseDirectionEntry(
  raw: unknown,
  direction: Direction,
  directionSet: readonly string[],
  rawDirections: UnknownRecord,
  frameCount: number,
  context: string,
): DirectionalEntry {
  const entryContext = `${context}.${direction}`;
  if (!isRecord(raw)) {
    throw new DirectionalValidationError(`${entryContext} must be an object`);
  }
  if ("frames" in raw) {
    assertKeys(raw, ["frames"], ["frames"], entryContext);
    if (!Array.isArray(raw.frames)) {
      throw new DirectionalValidationError(`${entryContext}.frames must be an array`);
    }
    if (raw.frames.length !== frameCount) {
      throw new DirectionalValidationError(
        `${entryContext}.frames length ${raw.frames.length} does not match the declared frame count ${frameCount}`,
      );
    }
    const frames = raw.frames.map((rawFrame, index) => {
      const frameContext = `${entryContext}.frames[${index}]`;
      if (!isRecord(rawFrame)) {
        throw new DirectionalValidationError(`${frameContext} must be an object`);
      }
      assertKeys(rawFrame, [], ["overrides"], frameContext);
      // Override contents are validated when the expanded timeline passes
      // through validateTimelineSpec.
      return {
        overrides: (rawFrame.overrides ?? null) as TimelineFrameOverrides | null,
      };
    });
    return { kind: "explicit", frames };
  }
  if ("mirror_of" in raw || "flip" in raw) {
    assertKeys(raw, ["mirror_of", "flip"], ["mirror_of", "flip"], entryContext);
    if (raw.flip !== "horizontal") {
      throw new DirectionalValidationError(
        `${entryContext}.flip must be "horizontal" (declared flips only)`,
      );
    }
    const source = raw.mirror_of;
    if (typeof source !== "string" || !directionSet.includes(source)) {
      throw new DirectionalValidationError(
        `${entryContext}.mirror_of must reference an explicit direction in the same animation`,
      );
    }
    const sourceEntry = rawDirections[source];
    if (!isRecord(sourceEntry) || !("frames" in sourceEntry)) {
      throw new DirectionalValidationError(
        `${entryContext}.mirror_of must reference an explicit direction in the same animation`,
      );
    }
    return { kind: "mirror", mirror_of: source as Direction, flip: "horizontal" };
  }
  throw new DirectionalValidationError(
    `${entryContext} must declare frames or a mirror_of/flip rule`,
  );
}

export function validateDirectionalSpec(spec: unknown): DirectionalSpec {
  if (!isRecord(spec)) {
    throw new DirectionalValidationError("directional spec must be an object");
  }
  assertKeys(
    spec,
    ["version", "id", "direction_set", "animations"],
    ["version", "id", "direction_set", "animations"],
    "directional spec",
  );
  if (spec.version !== DIRECTIONAL_VERSION) {
    throw new DirectionalValidationError("directional spec.version must be 1");
  }
  if (typeof spec.id !== "string" || !SLUG_RE.test(spec.id)) {
    throw new DirectionalValidationError("directional spec.id must be a lowercase slug");
  }
  if (typeof spec.direction_set !== "string" || !(spec.direction_set in DIRECTION_SETS)) {
    throw new DirectionalValidationError(
      `directional spec.direction_set must be one of: ${Object.keys(DIRECTION_SETS).join(", ")}`,
    );
  }
  const directionSetId = spec.direction_set as DirectionSetId;
  const directionSet: readonly string[] = DIRECTION_SETS[directionSetId];
  if (!isRecord(spec.animations) || Object.keys(spec.animations).length === 0) {
    throw new DirectionalValidationError(
      "directional spec.animations must be a non-empty object",
    );
  }
  const animations: Record<string, DirectionalAnimation> = {};
  for (const animationId of Object.keys(spec.animations).sort((a, b) => a.localeCompare(b))) {
    const context = `directional spec.animations.${animationId}`;
    if (!SLUG_RE.test(animationId)) {
      throw new DirectionalValidationError(`${context} must be a lowercase slug`);
    }
    const rawAnimation = spec.animations[animationId];
    if (!isRecord(rawAnimation)) {
      throw new DirectionalValidationError(`${context} must be an object`);
    }
    assertKeys(
      rawAnimation,
      ["frame_count", "duration_ms", "composition", "directions"],
      ["frame_count", "duration_ms", "composition", "directions"],
      context,
    );
    const frameCount = positiveInteger(rawAnimation.frame_count, `${context}.frame_count`);
    const durationMs = positiveInteger(rawAnimation.duration_ms, `${context}.duration_ms`);
    let composition: SvgCompositionSpec;
    try {
      composition = normalizeCompositionSpec(rawAnimation.composition);
    } catch (err) {
      if (err instanceof SvgAssetValidationError) {
        throw new DirectionalValidationError(err.message);
      }
      throw err;
    }
    if (!isRecord(rawAnimation.directions)) {
      throw new DirectionalValidationError(`${context}.directions must be an object`);
    }
    const missingDirections = directionSet.filter(
      (direction) => !(direction in (rawAnimation.directions as UnknownRecord)),
    );
    if (missingDirections.length > 0) {
      throw new DirectionalValidationError(
        `${context}.directions missing direction(s): ${missingDirections.join(", ")}`,
      );
    }
    const extraDirections = Object.keys(rawAnimation.directions).filter(
      (direction) => !directionSet.includes(direction),
    );
    if (extraDirections.length > 0) {
      throw new DirectionalValidationError(
        `${context}.directions contains unknown direction(s): ${extraDirections.join(", ")}`,
      );
    }
    const directions: Record<string, DirectionalEntry> = {};
    for (const direction of directionSet) {
      directions[direction] = parseDirectionEntry(
        rawAnimation.directions[direction],
        direction as Direction,
        directionSet,
        rawAnimation.directions,
        frameCount,
        `${context}.directions`,
      );
    }
    animations[animationId] = {
      frame_count: frameCount,
      duration_ms: durationMs,
      composition,
      directions,
    };
  }
  return {
    version: DIRECTIONAL_VERSION,
    id: spec.id,
    direction_set: directionSetId,
    animations,
  };
}

export function expandDirectionalSpec(spec: DirectionalSpec): readonly ExpandedAnimation[] {
  const directionSet: readonly Direction[] = [
    ...DIRECTION_SETS[spec.direction_set],
  ] as Direction[];
  const expanded: ExpandedAnimation[] = [];
  for (const [animationId, animation] of Object.entries(spec.animations)) {
    const byDirection = new Map<Direction, ExpandedTimeline>();
    for (const direction of directionSet) {
      const entry = animation.directions[direction];
      if (!entry) continue;
      const timelineId = `${spec.id}-${animationId}-${direction}`;
      const sourceFrames =
        entry.kind === "explicit"
          ? entry.frames.map((frame, index) => ({
              id: `${animationId}-${direction}-${index + 1}`,
              duration_ms: animation.duration_ms,
              composition: animation.composition,
              overrides: frame.overrides,
            }))
          : null;
      if (sourceFrames !== null) {
        byDirection.set(direction, {
          direction,
          flip: null,
          timeline_id: timelineId,
          spec: validateTimelineSpec({
            version: 1,
            id: timelineId,
            frames: sourceFrames,
          }),
        });
      }
    }
    // Mirrors expand in a second pass so mirror_of always resolves to a
    // fully expanded explicit direction, independent of declaration order.
    for (const direction of directionSet) {
      const entry = animation.directions[direction];
      if (!entry || entry.kind !== "mirror") continue;
      const timelineId = `${spec.id}-${animationId}-${direction}`;
      const source = byDirection.get(entry.mirror_of);
      if (!source) {
        throw new DirectionalValidationError(
          `directional spec.animations.${animationId}.directions.${direction}.mirror_of must reference an explicit direction in the same animation`,
        );
      }
      byDirection.set(direction, {
        direction,
        flip: "horizontal",
        timeline_id: timelineId,
        spec: validateTimelineSpec({
          version: 1,
          id: timelineId,
          frames: source.spec.frames.map((frame, index) => ({
            id: `${animationId}-${direction}-${index + 1}`,
            duration_ms: frame.duration_ms,
            composition: frame.composition,
            overrides: frame.overrides,
          })),
        }),
      });
    }
    expanded.push({
      animation: animationId,
      timelines: directionSet.map((direction) => {
        const timeline = byDirection.get(direction);
        if (!timeline) {
          throw new DirectionalValidationError(
            `directional spec.animations.${animationId}.directions.${direction} could not be expanded`,
          );
        }
        return timeline;
      }),
    });
  }
  return expanded;
}

function mirrorFrameSvg(svg: string, context: string): string {
  const root = svg.match(/^\s*<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i);
  if (!root) {
    throw new DirectionalValidationError(`${context} is not a well-formed SVG document`);
  }
  const attributes = root[1] ?? "";
  const viewBoxMatch = attributes.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  if (!viewBoxMatch?.[1]) {
    throw new DirectionalValidationError(`${context} root requires a viewBox`);
  }
  const pieces = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
  const width = pieces[2];
  if (!Number.isFinite(width) || (width ?? 0) <= 0) {
    throw new DirectionalValidationError(`${context} has an invalid viewBox`);
  }
  const body = (root[2] ?? "").trim();
  // The palette style block stays outside the mirror transform so palette
  // resolution is untouched; everything else mirrors around the vertical
  // center line of the frame viewBox.
  const styleMatch = body.match(/^(<style id="asf-palette">[\s\S]*?<\/style>)/);
  const style = styleMatch?.[1] ?? "";
  const content = style ? body.slice(style.length).trim() : body;
  return [
    `<svg${attributes}>`,
    style,
    `  <g transform="translate(${width} 0) scale(-1 1)">`,
    content,
    "  </g>",
    "</svg>",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

export async function compileDirectionalSheets(
  spec: unknown,
  parts: readonly SvgPart[],
  options: AtlasPackerOptions,
): Promise<DirectionalSheetSet> {
  const directional = validateDirectionalSpec(spec);
  const expanded = expandDirectionalSpec(directional);
  const sheets: DirectionalSheet[] = [];
  for (const animation of expanded) {
    for (const timeline of animation.timelines) {
      const compiled = await compileTimeline(timeline.spec, parts);
      let frames = compiled.frames;
      if (timeline.flip === "horizontal") {
        frames = await Promise.all(
          compiled.frames.map(async (frame) => {
            const svg = mirrorFrameSvg(frame.svg, `directional frame ${frame.id}`);
            return { ...frame, svg, digest: await sha256(svg) };
          }),
        );
      }
      const packed = await packAtlas(
        { id: timeline.timeline_id, frames },
        options,
      );
      sheets.push({
        animation: animation.animation,
        direction: timeline.direction,
        timeline_id: timeline.timeline_id,
        flip: timeline.flip,
        frames,
        sheet_svg: packed.sheet_svg,
        atlas_json: packed.atlas_json,
        phaser_load: packed.phaser_load,
      });
    }
  }
  const manifestSheets: SheetManifestEntry[] = sheets.map((sheet) => ({
    animation: sheet.animation,
    direction: sheet.direction,
    timeline_id: sheet.timeline_id,
    flip: sheet.flip,
    frame_count: sheet.atlas_json.frame_count,
    frame_rects: sheet.atlas_json.frame_rects,
    frame_digests: sheet.frames.map((frame) => frame.digest),
    sheet_digest: sheet.atlas_json.sheet_digest,
    phaser_load: sheet.phaser_load,
  }));
  const manifestDigest = await sha256(
    stableStringify({
      version: DIRECTIONAL_VERSION,
      id: directional.id,
      direction_set: directional.direction_set,
      sheets: manifestSheets,
    }),
  );
  return {
    sheets,
    manifest: {
      version: DIRECTIONAL_VERSION,
      id: directional.id,
      direction_set: directional.direction_set,
      sheets: manifestSheets,
      manifest_digest: manifestDigest,
    },
  };
}
