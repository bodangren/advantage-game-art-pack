import { SVG_PARTS } from "./catalog";
import {
  type NumberPair,
  type SvgAttachment,
  type SvgCompositionSpec,
  type SvgPart,
  type SvgPartPlacement,
  SvgAssetValidationError,
  composeSvg,
  normalizeCompositionSpec,
  sha256,
} from "./svg-assets";

export const TIMELINE_VERSION = 1 as const;

const FRAME_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class TimelineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineValidationError";
  }
}

export interface TimelinePlacementOverride {
  readonly id: string;
  readonly part_id?: string;
  readonly position?: NumberPair;
  readonly anchor?: string | null;
  readonly attach_to?: SvgAttachment | null;
  readonly offset?: NumberPair;
  readonly scale?: number;
  readonly rotate?: number;
  readonly z_index?: number | null;
}

export interface TimelineFrameOverrides {
  readonly parts?: readonly TimelinePlacementOverride[];
  readonly palette?: Readonly<Record<string, string>>;
}

export interface TimelineFrame {
  readonly id: string;
  readonly duration_ms: number;
  readonly composition: SvgCompositionSpec;
  readonly overrides: TimelineFrameOverrides | null;
}

export interface TimelineSpec {
  readonly version: typeof TIMELINE_VERSION;
  readonly id: string | null;
  readonly frames: readonly TimelineFrame[];
}

export interface TimelineCompiledFrame {
  readonly id: string;
  readonly duration_ms: number;
  readonly svg: string;
  readonly digest: string;
}

export interface TimelineCompilation {
  readonly id: string | null;
  readonly frames: ReadonlyArray<TimelineCompiledFrame>;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function frameContext(index: number): string {
  return `timeline.frames[${index}]`;
}

function assertKeys(
  value: UnknownRecord,
  required: readonly string[],
  allowed: readonly string[],
  context: string,
): void {
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0) {
    throw new TimelineValidationError(
      `${context} missing required key(s): ${missing.join(", ")}`,
    );
  }
  const extra = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extra.length > 0) {
    throw new TimelineValidationError(
      `${context} contains unexpected key(s): ${extra.join(", ")}`,
    );
  }
}

function parsePlacementOverrides(
  value: unknown,
  context: string,
): readonly TimelinePlacementOverride[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new TimelineValidationError(`${context}.overrides.parts must be an array`);
  }
  const allowed = [
    "id",
    "part_id",
    "position",
    "anchor",
    "attach_to",
    "offset",
    "scale",
    "rotate",
    "z_index",
  ];
  return value.map((raw, index) => {
    const itemContext = `${context}.overrides.parts[${index}]`;
    if (!isRecord(raw)) {
      throw new TimelineValidationError(`${itemContext} must be an object`);
    }
    assertKeys(raw, ["id"], allowed, itemContext);
    if (typeof raw.id !== "string" || raw.id.length === 0) {
      throw new TimelineValidationError(`${itemContext}.id must be a non-empty string`);
    }
    // Field values are validated when the merged composition passes through
    // normalizeCompositionSpec; here they are carried through untyped.
    return { ...raw, id: raw.id } as unknown as TimelinePlacementOverride;
  });
}

function parseOverrides(
  value: unknown,
  context: string,
): TimelineFrameOverrides | null {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) {
    throw new TimelineValidationError(`${context}.overrides must be an object`);
  }
  assertKeys(value, [], ["parts", "palette"], `${context}.overrides`);
  const parts = parsePlacementOverrides(value.parts, context);
  let palette: Readonly<Record<string, string>> | undefined;
  if (value.palette !== undefined) {
    if (!isRecord(value.palette)) {
      throw new TimelineValidationError(`${context}.overrides.palette must be an object`);
    }
    const entries: Record<string, string> = {};
    for (const [name, color] of Object.entries(value.palette)) {
      if (typeof color !== "string") {
        throw new TimelineValidationError(
          `${context}.overrides.palette.${name} must be a string`,
        );
      }
      entries[name] = color;
    }
    palette = entries;
  }
  return { parts, palette };
}

function applyOverrides(
  base: SvgCompositionSpec,
  overrides: TimelineFrameOverrides | null,
  context: string,
): SvgCompositionSpec {
  if (overrides === null) return base;
  let parts: readonly SvgPartPlacement[] = base.parts;
  if (overrides.parts !== undefined) {
    const known = new Set(base.parts.map((part) => part.id));
    const overridesById = new Map<string, TimelinePlacementOverride>();
    for (const override of overrides.parts) {
      if (!known.has(override.id)) {
        throw new TimelineValidationError(
          `${context}.overrides.parts references unknown placement ${override.id}`,
        );
      }
      if (overridesById.has(override.id)) {
        throw new TimelineValidationError(
          `${context}.overrides.parts contains duplicate placement id ${override.id}`,
        );
      }
      overridesById.set(override.id, override);
    }
    parts = base.parts.map((part) => {
      const override = overridesById.get(part.id);
      if (!override) return part;
      return {
        id: part.id,
        part_id: override.part_id ?? part.part_id,
        position: override.position ?? part.position,
        anchor: override.anchor === undefined ? part.anchor : override.anchor,
        attach_to:
          override.attach_to === undefined ? part.attach_to : override.attach_to,
        offset: override.offset ?? part.offset,
        scale: override.scale ?? part.scale,
        rotate: override.rotate ?? part.rotate,
        z_index: override.z_index === undefined ? part.z_index : override.z_index,
      };
    });
  }
  const palette =
    overrides.palette === undefined
      ? base.palette
      : { ...base.palette, ...overrides.palette };
  return { ...base, parts, palette };
}

function resolveFrameComposition(
  composition: unknown,
  overrides: TimelineFrameOverrides | null,
  context: string,
): SvgCompositionSpec {
  try {
    const base = normalizeCompositionSpec(composition);
    const merged = applyOverrides(base, overrides, context);
    // Re-normalize the merged spec so override field values (hex colors,
    // number pairs, scale bounds) are validated by the composition engine.
    return normalizeCompositionSpec(merged);
  } catch (err) {
    if (err instanceof SvgAssetValidationError) {
      throw new TimelineValidationError(err.message);
    }
    throw err;
  }
}

export function validateTimelineSpec(spec: unknown): TimelineSpec {
  if (!isRecord(spec)) {
    throw new TimelineValidationError("timeline must be an object");
  }
  assertKeys(spec, ["version", "frames"], ["version", "id", "frames"], "timeline");
  if (spec.version !== TIMELINE_VERSION) {
    throw new TimelineValidationError("timeline.version must be 1");
  }
  // The timeline id is optional at validation time; the atlas packer
  // requires it (it becomes the Phaser load key).
  let id: string | null = null;
  if (spec.id !== undefined && spec.id !== null) {
    if (typeof spec.id !== "string" || !FRAME_ID_RE.test(spec.id)) {
      throw new TimelineValidationError("timeline.id must be a lowercase slug");
    }
    id = spec.id;
  }
  if (!Array.isArray(spec.frames) || spec.frames.length === 0) {
    throw new TimelineValidationError("timeline.frames must be a non-empty array");
  }
  const seen = new Set<string>();
  const frames = spec.frames.map((raw, index) => {
    const context = frameContext(index);
    if (!isRecord(raw)) {
      throw new TimelineValidationError(`${context} must be an object`);
    }
    assertKeys(
      raw,
      ["id", "duration_ms", "composition"],
      ["id", "duration_ms", "composition", "overrides"],
      context,
    );
    if (typeof raw.id !== "string" || raw.id.length === 0) {
      throw new TimelineValidationError(`${context}.id must be a non-empty string`);
    }
    if (!FRAME_ID_RE.test(raw.id)) {
      throw new TimelineValidationError(`${context}.id must be a lowercase slug`);
    }
    if (seen.has(raw.id)) {
      throw new TimelineValidationError(
        `timeline.frames contains duplicate frame id ${raw.id}`,
      );
    }
    seen.add(raw.id);
    if (
      typeof raw.duration_ms !== "number" ||
      !Number.isInteger(raw.duration_ms) ||
      raw.duration_ms <= 0
    ) {
      throw new TimelineValidationError(`${context}.duration_ms must be positive`);
    }
    const overrides = parseOverrides(raw.overrides, context);
    const composition = resolveFrameComposition(raw.composition, overrides, context);
    // Validate the merged composition against the checked-in library so
    // unknown part/anchor references and palette gaps surface at validation
    // time rather than at atlas packing time.
    try {
      composeSvg(composition, SVG_PARTS);
    } catch (err) {
      if (err instanceof SvgAssetValidationError) {
        throw new TimelineValidationError(err.message);
      }
      throw err;
    }
    return { id: raw.id, duration_ms: raw.duration_ms, composition, overrides };
  });
  return { version: TIMELINE_VERSION, id, frames };
}

export async function compileTimeline(
  spec: unknown,
  parts: readonly SvgPart[],
): Promise<TimelineCompilation> {
  const timeline = validateTimelineSpec(spec);
  const frames: TimelineCompiledFrame[] = [];
  for (const [index, frame] of timeline.frames.entries()) {
    let svg: string;
    try {
      svg = composeSvg(frame.composition, parts);
    } catch (err) {
      if (err instanceof SvgAssetValidationError) {
        throw new TimelineValidationError(`${frameContext(index)}: ${err.message}`);
      }
      throw err;
    }
    frames.push({
      id: frame.id,
      duration_ms: frame.duration_ms,
      svg,
      digest: await sha256(svg),
    });
  }
  return { id: timeline.id, frames };
}
