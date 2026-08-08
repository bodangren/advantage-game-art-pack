export const FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID =
  "forge-temporal-render-batch-artifacts/v1" as const;
export const FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID =
  "forge-reference-five-clip-authoring/v1" as const;
export const PIXEL_FORGE_FIVE_CLIP_STAGING_PLAN_ID =
  "pixel-forge-five-clip-staging-plan/v1" as const;

const FRAME_SIZE = 128;
const ACTIONS = ["idle", "walk_forward", "walk_right", "attack", "receive_damage"] as const;
const SAMPLES = [4, 6, 6, 6, 4] as const;
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const BLOCKERS = [
  "accepted_model_missing",
  "motion_acceptance_missing",
  "kimi_acceptance_missing",
  "playback_acceptance_missing",
  "pack_admission_not_evaluated",
] as const;
const SHA256_RE = /^[a-f0-9]{64}$/;
const SEMANTIC_ID_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const REVISION_RE = /^revision\.[a-f0-9]{64}$/;
const MORPHOLOGY_RE = /^morphology\.[a-f0-9]{64}$/;
const RIG_RE = /^rig\.[a-f0-9]{64}$/;
const EQUIPMENT_RE = /^equipment\.[a-f0-9]{64}$/;
const CLIP_RE = /^clip\.[a-f0-9]{64}$/;
const FRAME_PLAN_RE = /^frame-plan\.[a-f0-9]{64}$/;
const FRAME_RE = /^frame\.[a-f0-9]{64}$/;
const DELIVERY_RE = /^delivery\.[a-f0-9]{64}$/;
const GLB_RE = /^glb\.[a-f0-9]{64}$/;
const BUNDLE_RE = /^bundle\.[a-f0-9]{64}$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

type UnknownRecord = Record<string, unknown>;
type Action = (typeof ACTIONS)[number];
type Direction = (typeof DIRECTIONS)[number];

export interface FantasyAssetForgeFiveClipDescriptor {
  readonly id: string;
  readonly classification: "source";
  readonly mediaType: "model/gltf-binary" | "application/json";
  readonly fileName: string;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface FantasyAssetForgeFiveClipFrame {
  readonly id: string;
  readonly sequence: number;
  readonly clipId: string;
  readonly action: Action;
  readonly framePlanId: string;
  readonly direction: Direction;
  readonly sampleTimeMs: number;
  readonly fileName: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly metrics: {
    readonly groundAnchorDeviationPixels: number;
    readonly clippedEdges: readonly [];
    readonly framingEvidence: {
      readonly topMarginPixels: number | null;
      readonly centerDeviationPixels: number | null;
      readonly worldUnitsPerPixel: number;
    };
  };
}

export interface FantasyAssetForgeFiveClipImage {
  readonly id: string;
  readonly classification: "derived";
  readonly role: "pose_sheet" | "sprite_atlas";
  readonly mediaType: "image/png";
  readonly fileName: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly columns: number;
  readonly rows: number;
  readonly rects: readonly {
    readonly frameId: string;
    readonly x: number;
    readonly y: number;
    readonly width: 128;
    readonly height: 128;
  }[];
}

export interface FantasyAssetForgeFiveClipManifest {
  readonly contractId: typeof FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID;
  readonly authoringContractId: typeof FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID;
  readonly assetId: string;
  readonly revisionId: string;
  readonly morphologyRevisionId: string;
  readonly rigSignature: string;
  readonly equipmentSignature: string;
  readonly renderProfile: { readonly id: "fantasy.sprite.orthographic.v1"; readonly version: "1.0.0" };
  readonly sourceGlb: FantasyAssetForgeFiveClipDescriptor;
  readonly animationBundle: FantasyAssetForgeFiveClipDescriptor;
  readonly clips: readonly {
    readonly clipId: string;
    readonly action: Action;
    readonly framePlanId: string;
    readonly durationMs: number;
    readonly loop: { readonly mode: "once" } | { readonly mode: "loop"; readonly startMs: number; readonly endMs: number };
    readonly interpolation: "step" | "linear";
    readonly directions: readonly Direction[];
    readonly samplesPerDirection: 4 | 6;
    readonly frameIds: readonly string[];
    readonly poseSheetId: string;
  }[];
  readonly frames: readonly FantasyAssetForgeFiveClipFrame[];
  readonly poseSheets: readonly FantasyAssetForgeFiveClipImage[];
  readonly atlas: FantasyAssetForgeFiveClipImage;
  readonly deliveryId: string;
}

export interface FantasyAssetForgeFiveClipDelivery {
  readonly manifest_bytes: Uint8Array;
  readonly manifest_sha256: string;
  readonly files: readonly { readonly file_name: string; readonly bytes: Uint8Array }[];
}

export interface FantasyAssetForgeFiveClipStagingRecord {
  readonly role: "source_frame" | "derived_pose_sheet" | "derived_atlas" | "source_glb" | "animation_bundle" | "temporal_manifest";
  readonly source_file_name: string;
  readonly media_type: "image/png" | "model/gltf-binary" | "application/json";
  readonly byte_length: number;
  readonly sha256: string;
  readonly local_reference: string;
  readonly source_id?: string;
  readonly clip_id?: string;
  readonly action?: Action;
  readonly sequence?: number;
  readonly sample_time_ms?: number;
}

export interface FantasyAssetForgeFiveClipStagingPlan {
  readonly contract_id: typeof PIXEL_FORGE_FIVE_CLIP_STAGING_PLAN_ID;
  readonly status: "validated_unadmitted";
  readonly source: {
    readonly contract_id: typeof FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID;
    readonly authoring_contract_id: typeof FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID;
    readonly asset_id: string;
    readonly revision_id: string;
    readonly morphology_revision_id: string;
    readonly rig_signature: string;
    readonly equipment_signature: string;
    readonly delivery_id: string;
    readonly manifest_sha256: string;
  };
  readonly records: readonly FantasyAssetForgeFiveClipStagingRecord[];
  readonly verification: {
    readonly clip_count: 5;
    readonly source_frame_count: number;
    readonly pose_sheet_count: 5;
    readonly artifact_count: number;
    readonly total_bytes: number;
    readonly hashes_verified: true;
    readonly byte_lengths_verified: true;
    readonly png_layouts_verified: true;
    readonly source_glb_verified: true;
    readonly animation_bundle_verified: true;
    readonly artifact_set_verified: true;
  };
  readonly blockers: typeof BLOCKERS;
  readonly plan_sha256: string;
}

export interface StagedFantasyAssetForgeFiveClipDelivery {
  readonly manifest: FantasyAssetForgeFiveClipManifest;
  readonly plan: FantasyAssetForgeFiveClipStagingPlan;
  readonly files: readonly {
    readonly local_reference: string;
    readonly media_type: "image/png" | "model/gltf-binary" | "application/json";
    readonly sha256: string;
    readonly bytes: Uint8Array;
  }[];
}

export class FantasyAssetForgeFiveClipIngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FantasyAssetForgeFiveClipIngestionError";
  }
}

function fail(message: string): never {
  throw new FantasyAssetForgeFiveClipIngestionError(message);
}

function record(value: unknown, context: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) fail(`${context} must be an object`);
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, required: readonly string[], context: string, optional: readonly string[] = []): void {
  const missing = required.filter((field) => !(field in value));
  if (missing.length > 0) fail(`${context} missing required key(s): ${missing.join(", ")}`);
  const allowed = new Set([...required, ...optional]);
  const unexpected = Object.keys(value).filter((field) => !allowed.has(field));
  if (unexpected.length > 0) fail(`${context} contains unexpected key(s): ${unexpected.join(", ")}`);
}

function exact(value: unknown, expected: string | number | boolean, context: string): void {
  if (value !== expected) fail(`${context} must be ${String(expected)}`);
}

function patterned(value: unknown, pattern: RegExp, context: string): string {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${context} is invalid`);
  return value;
}

function integer(value: unknown, context: string, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    fail(`${context} must be a safe integer in ${minimum}..${maximum}`);
  }
  return value as number;
}

function positiveInteger(value: unknown, context: string, maximum = Number.MAX_SAFE_INTEGER): number {
  return integer(value, context, 1, maximum);
}

function finite(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${context} must be finite`);
  return value;
}

function semantic(value: unknown, context: string): string {
  return patterned(value, SEMANTIC_ID_RE, context);
}

function portableFileName(value: unknown, extension: "png" | "glb" | "json", context: string): string {
  if (typeof value !== "string" || value.length < 5 || value.length > 240 ||
      !new RegExp(`^[a-z0-9][a-z0-9._-]*\\.${extension}$`).test(value)) {
    fail(`${context} must be a portable lowercase .${extension} file name`);
  }
  return value;
}

function direction(value: unknown, context: string): Direction {
  if (typeof value !== "string" || !DIRECTIONS.includes(value as Direction)) fail(`${context} must be a supported direction`);
  return value as Direction;
}

function parseLoop(value: unknown, durationMs: number, context: string): FantasyAssetForgeFiveClipManifest["clips"][number]["loop"] {
  const raw = record(value, context);
  if (raw.mode === "once") {
    exactKeys(raw, ["mode"], context);
    return { mode: "once" };
  }
  exactKeys(raw, ["mode", "startMs", "endMs"], context);
  exact(raw.mode, "loop", `${context}.mode`);
  const startMs = integer(raw.startMs, `${context}.startMs`, 0, 60_000);
  const endMs = positiveInteger(raw.endMs, `${context}.endMs`, 60_000);
  if (startMs >= endMs || endMs > durationMs) fail(`${context} bounds must fit durationMs`);
  return { mode: "loop", startMs, endMs };
}

function parseMetrics(value: unknown, context: string): FantasyAssetForgeFiveClipFrame["metrics"] {
  const raw = record(value, context);
  exactKeys(raw, [
    "occupiedBounds", "occupiedPixelCount", "occupiedRatio", "transparentPixelCount", "clippedEdges",
    "groundPixelY", "groundAnchorDeviationPixels", "minimumHorizontalRunPixels", "minimumVerticalRunPixels",
    "representativeFeaturePixels", "requiredFeatureEvidence", "framingEvidence",
  ], context);
  if (!Array.isArray(raw.clippedEdges) || raw.clippedEdges.length !== 0) fail(`${context}.clippedEdges must be empty`);
  const framing = record(raw.framingEvidence, `${context}.framingEvidence`);
  exactKeys(framing, ["topMarginPixels", "centerDeviationPixels", "heightDeviationPixels", "worldUnitsPerPixel"], `${context}.framingEvidence`);
  const nullableFinite = (entry: unknown, child: string): number | null => entry === null ? null : finite(entry, child);
  const scale = finite(framing.worldUnitsPerPixel, `${context}.framingEvidence.worldUnitsPerPixel`);
  if (scale <= 0) fail(`${context}.framingEvidence.worldUnitsPerPixel must be positive`);
  const groundDeviation = finite(raw.groundAnchorDeviationPixels, `${context}.groundAnchorDeviationPixels`);
  if (groundDeviation < -1 || groundDeviation > 1) fail(`${context}.groundAnchorDeviationPixels must be within -1..1`);
  return {
    groundAnchorDeviationPixels: groundDeviation,
    clippedEdges: [],
    framingEvidence: {
      topMarginPixels: nullableFinite(framing.topMarginPixels, `${context}.framingEvidence.topMarginPixels`),
      centerDeviationPixels: nullableFinite(framing.centerDeviationPixels, `${context}.framingEvidence.centerDeviationPixels`),
      worldUnitsPerPixel: scale,
    },
  };
}

function parseDescriptor(
  value: unknown,
  kind: "glb" | "bundle",
): FantasyAssetForgeFiveClipDescriptor {
  const context = `five-clip manifest.${kind === "glb" ? "sourceGlb" : "animationBundle"}`;
  const raw = record(value, context);
  exactKeys(raw, ["id", "classification", "mediaType", "fileName", "byteLength", "sha256"], context);
  const digest = patterned(raw.sha256, SHA256_RE, `${context}.sha256`);
  const id = patterned(raw.id, kind === "glb" ? GLB_RE : BUNDLE_RE, `${context}.id`);
  if (id !== `${kind}.${digest}`) fail(`${context}.id must bind its sha256`);
  exact(raw.classification, "source", `${context}.classification`);
  const mediaType = kind === "glb" ? "model/gltf-binary" : "application/json";
  exact(raw.mediaType, mediaType, `${context}.mediaType`);
  return {
    id,
    classification: "source",
    mediaType,
    fileName: portableFileName(raw.fileName, kind === "glb" ? "glb" : "json", `${context}.fileName`),
    byteLength: positiveInteger(raw.byteLength, `${context}.byteLength`, kind === "glb" ? 64 * 1024 * 1024 : 2 * 1024 * 1024),
    sha256: digest,
  };
}

function parseFrame(value: unknown, index: number): FantasyAssetForgeFiveClipFrame {
  const context = `five-clip manifest.frames[${index}]`;
  const raw = record(value, context);
  exactKeys(raw, [
    "id", "sequence", "clipId", "action", "framePlanId", "direction", "sampleTimeMs",
    "fileName", "byteLength", "sha256", "metrics",
  ], context);
  const action = semantic(raw.action, `${context}.action`);
  if (!ACTIONS.includes(action as Action)) fail(`${context}.action must be one of the exact five actions`);
  return {
    id: patterned(raw.id, FRAME_RE, `${context}.id`),
    sequence: integer(raw.sequence, `${context}.sequence`, 0, 2_047),
    clipId: patterned(raw.clipId, CLIP_RE, `${context}.clipId`),
    action: action as Action,
    framePlanId: patterned(raw.framePlanId, FRAME_PLAN_RE, `${context}.framePlanId`),
    direction: direction(raw.direction, `${context}.direction`),
    sampleTimeMs: integer(raw.sampleTimeMs, `${context}.sampleTimeMs`, 0, 60_000),
    fileName: portableFileName(raw.fileName, "png", `${context}.fileName`),
    byteLength: positiveInteger(raw.byteLength, `${context}.byteLength`, 1024 * 1024),
    sha256: patterned(raw.sha256, SHA256_RE, `${context}.sha256`),
    metrics: parseMetrics(raw.metrics, `${context}.metrics`),
  };
}

function parseImage(
  value: unknown,
  role: "pose_sheet" | "sprite_atlas",
  context: string,
): FantasyAssetForgeFiveClipImage {
  const raw = record(value, context);
  exactKeys(raw, [
    "id", "classification", "role", "mediaType", "fileName", "byteLength", "sha256",
    "width", "height", "columns", "rows", "rects",
  ], context);
  exact(raw.classification, "derived", `${context}.classification`);
  exact(raw.role, role, `${context}.role`);
  exact(raw.mediaType, "image/png", `${context}.mediaType`);
  const digest = patterned(raw.sha256, SHA256_RE, `${context}.sha256`);
  const id = semantic(raw.id, `${context}.id`);
  const expectedPrefix = role === "pose_sheet" ? "sheet" : "atlas";
  if (id !== `${expectedPrefix}.${digest}`) fail(`${context}.id must bind ${expectedPrefix} sha256`);
  const columns = positiveInteger(raw.columns, `${context}.columns`, 128);
  const rows = positiveInteger(raw.rows, `${context}.rows`, 128);
  const width = positiveInteger(raw.width, `${context}.width`, 16_384);
  const height = positiveInteger(raw.height, `${context}.height`, 16_384);
  if (width !== columns * FRAME_SIZE || height !== rows * FRAME_SIZE) {
    fail(`${context} dimensions must exactly match its 128x128 grid`);
  }
  if (!Array.isArray(raw.rects) || raw.rects.length < 2 || raw.rects.length > 2_048) {
    fail(`${context}.rects must contain 2..2048 entries`);
  }
  const rects = raw.rects.map((entry, index) => {
    const rectContext = `${context}.rects[${index}]`;
    const rect = record(entry, rectContext);
    exactKeys(rect, ["frameId", "x", "y", "width", "height"], rectContext);
    const x = integer(rect.x, `${rectContext}.x`, 0, 16_383);
    const y = integer(rect.y, `${rectContext}.y`, 0, 16_383);
    exact(rect.width, FRAME_SIZE, `${rectContext}.width`);
    exact(rect.height, FRAME_SIZE, `${rectContext}.height`);
    if (x !== (index % columns) * FRAME_SIZE || y !== Math.floor(index / columns) * FRAME_SIZE) {
      fail(`${rectContext} must use deterministic row-major layout`);
    }
    if (x + FRAME_SIZE > width || y + FRAME_SIZE > height) fail(`${rectContext} exceeds image bounds`);
    return {
      frameId: patterned(rect.frameId, FRAME_RE, `${rectContext}.frameId`),
      x,
      y,
      width: FRAME_SIZE,
      height: FRAME_SIZE,
    } as const;
  });
  if (columns !== Math.min(128, rects.length) || rows !== Math.ceil(rects.length / columns)) {
    fail(`${context} grid must use the producer deterministic atlas layout`);
  }
  return {
    id,
    classification: "derived",
    role,
    mediaType: "image/png",
    fileName: portableFileName(raw.fileName, "png", `${context}.fileName`),
    byteLength: positiveInteger(raw.byteLength, `${context}.byteLength`, 8 * 1024 * 1024),
    sha256: digest,
    width,
    height,
    columns,
    rows,
    rects,
  };
}

function parseClip(value: unknown, index: number): FantasyAssetForgeFiveClipManifest["clips"][number] {
  const context = `five-clip manifest.clips[${index}]`;
  const raw = record(value, context);
  exactKeys(raw, [
    "clipId", "action", "framePlanId", "durationMs", "loop", "interpolation", "directions",
    "samplesPerDirection", "frameIds", "poseSheetId",
  ], context);
  exact(raw.action, ACTIONS[index]!, `${context}.action`);
  exact(raw.samplesPerDirection, SAMPLES[index]!, `${context}.samplesPerDirection`);
  const durationMs = positiveInteger(raw.durationMs, `${context}.durationMs`, 60_000);
  if (raw.interpolation !== "step" && raw.interpolation !== "linear") {
    fail(`${context}.interpolation must be step or linear`);
  }
  if (!Array.isArray(raw.directions) || raw.directions.length < 1 || raw.directions.length > 8) {
    fail(`${context}.directions must contain 1..8 values`);
  }
  const directions = raw.directions.map((entry, directionIndex) =>
    direction(entry, `${context}.directions[${directionIndex}]`),
  );
  if (new Set(directions).size !== directions.length) fail(`${context}.directions must be unique`);
  if (!Array.isArray(raw.frameIds)) fail(`${context}.frameIds must be an array`);
  const frameIds = raw.frameIds.map((entry, frameIndex) =>
    patterned(entry, FRAME_RE, `${context}.frameIds[${frameIndex}]`),
  );
  if (frameIds.length !== (SAMPLES[index] ?? 0) * directions.length) {
    fail(`${context}.frameIds must exactly match samplesPerDirection * directions`);
  }
  if (new Set(frameIds).size !== frameIds.length) fail(`${context}.frameIds must be unique`);
  return {
    clipId: patterned(raw.clipId, CLIP_RE, `${context}.clipId`),
    action: ACTIONS[index]!,
    framePlanId: patterned(raw.framePlanId, FRAME_PLAN_RE, `${context}.framePlanId`),
    durationMs,
    loop: parseLoop(raw.loop, durationMs, `${context}.loop`),
    interpolation: raw.interpolation,
    directions,
    samplesPerDirection: SAMPLES[index]!,
    frameIds,
    poseSheetId: semantic(raw.poseSheetId, `${context}.poseSheetId`),
  };
}

function parseManifest(value: unknown): FantasyAssetForgeFiveClipManifest {
  const context = "five-clip manifest";
  const raw = record(value, context);
  exactKeys(raw, [
    "contractId", "authoringContractId", "assetId", "revisionId", "morphologyRevisionId",
    "rigSignature", "equipmentSignature", "renderProfile", "sourceGlb", "animationBundle",
    "clips", "frames", "poseSheets", "atlas", "deliveryId",
  ], context);
  exact(raw.contractId, FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID, `${context}.contractId`);
  exact(raw.authoringContractId, FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID, `${context}.authoringContractId`);
  const revisionId = patterned(raw.revisionId, REVISION_RE, `${context}.revisionId`);
  const morphologyRevisionId = patterned(raw.morphologyRevisionId, MORPHOLOGY_RE, `${context}.morphologyRevisionId`);
  const rigSignature = patterned(raw.rigSignature, RIG_RE, `${context}.rigSignature`);
  const equipmentSignature = patterned(raw.equipmentSignature, EQUIPMENT_RE, `${context}.equipmentSignature`);
  const render = record(raw.renderProfile, `${context}.renderProfile`);
  exactKeys(render, ["id", "version"], `${context}.renderProfile`);
  exact(render.id, "fantasy.sprite.orthographic.v1", `${context}.renderProfile.id`);
  exact(render.version, "1.0.0", `${context}.renderProfile.version`);
  const sourceGlb = parseDescriptor(raw.sourceGlb, "glb");
  const animationBundle = parseDescriptor(raw.animationBundle, "bundle");
  if (!Array.isArray(raw.clips) || raw.clips.length !== 5) fail(`${context}.clips must contain the exact ordered five clips`);
  const clips = raw.clips.map(parseClip);
  if (new Set(clips.map(({ clipId }) => clipId)).size !== 5 ||
      new Set(clips.map(({ framePlanId }) => framePlanId)).size !== 5) {
    fail(`${context}.clips require unique clip and frame-plan identities`);
  }
  if (!Array.isArray(raw.frames) || raw.frames.length < 26 || raw.frames.length > 2_048) {
    fail(`${context}.frames must contain 26..2048 source frames`);
  }
  const frames = raw.frames.map(parseFrame);
  const frameIds = new Set<string>();
  const frameHashesByGroup = new Map<string, Set<string>>();
  const frameNames = new Set<string>();
  const tupleKeys = new Set<string>();
  for (const [index, frame] of frames.entries()) {
    if (frame.sequence !== index) fail(`${context}.frames must use contiguous global sequences`);
    if (frameIds.has(frame.id)) fail(`${context}.frames contains duplicate frame identity`);
    const frameGroup = `${frame.clipId}:${frame.direction}`;
    const groupHashes = frameHashesByGroup.get(frameGroup) ?? new Set<string>();
    if (groupHashes.has(frame.sha256)) fail(`${context}.frames contains duplicate source-frame bytes within one clip direction`);
    if (frameNames.has(frame.fileName)) fail(`${context}.frames contains duplicate fileName`);
    const tuple = `${frame.clipId}:${frame.direction}:${frame.sampleTimeMs}`;
    if (tupleKeys.has(tuple)) fail(`${context}.frames contains duplicate clip/direction/time`);
    const expectedFile = `${String(index).padStart(4, "0")}-${frame.action}-${frame.direction.toLowerCase()}-${frame.sampleTimeMs}.png`;
    if (frame.fileName !== expectedFile) fail(`${context}.frames[${index}].fileName must bind sequence/action/direction/time`);
    frameIds.add(frame.id);
    groupHashes.add(frame.sha256);
    frameHashesByGroup.set(frameGroup, groupHashes);
    frameNames.add(frame.fileName);
    tupleKeys.add(tuple);
  }
  for (const [clipIndex, clip] of clips.entries()) {
    const clipFrames = frames.filter(({ clipId }) => clipId === clip.clipId);
    if (clipFrames.length !== clip.frameIds.length ||
        clip.frameIds.some((id, index) => id !== clipFrames[index]?.id)) {
      fail(`${context}.clips[${clipIndex}].frameIds must exactly cover its global frame slice`);
    }
    const seenDirections = [...new Set(clipFrames.map(({ direction: value }) => value))];
    if (seenDirections.length !== clip.directions.length ||
        seenDirections.some((value, index) => value !== clip.directions[index])) {
      fail(`${context}.clips[${clipIndex}].directions must match source-frame order`);
    }
    for (const clipDirection of clip.directions) {
      const group = clipFrames.filter(({ direction: value }) => value === clipDirection);
      if (group.length !== clip.samplesPerDirection ||
          new Set(group.map(({ sampleTimeMs }) => sampleTimeMs)).size !== clip.samplesPerDirection ||
          new Set(group.map(({ sha256 }) => sha256)).size < 2 ||
          new Set(group.map(({ metrics }) => metrics.framingEvidence.worldUnitsPerPixel)).size !== 1) {
        fail(`${context}.clips[${clipIndex}] direction ${clipDirection} requires exact distinct timed samples at one camera scale`);
      }
      if (group.some((frame) => frame.action !== clip.action || frame.framePlanId !== clip.framePlanId || frame.sampleTimeMs >= clip.durationMs)) {
        fail(`${context}.clips[${clipIndex}] frame bindings are inconsistent`);
      }
    }
  }
  if (frames.some(({ clipId }) => !clips.some((clip) => clip.clipId === clipId))) {
    fail(`${context}.frames references an unknown clip`);
  }
  if (!Array.isArray(raw.poseSheets) || raw.poseSheets.length !== 5) fail(`${context}.poseSheets must contain exactly five images`);
  const poseSheets = raw.poseSheets.map((entry, index) => parseImage(entry, "pose_sheet", `${context}.poseSheets[${index}]`));
  if (new Set(poseSheets.map(({ id }) => id)).size !== 5) fail(`${context}.poseSheets require unique identities`);
  for (const [index, sheet] of poseSheets.entries()) {
    const clip = clips[index]!;
    if (sheet.id !== clip.poseSheetId || sheet.rects.length !== clip.frameIds.length ||
        sheet.rects.some((rect, rectIndex) => rect.frameId !== clip.frameIds[rectIndex])) {
      fail(`${context}.poseSheets[${index}] must exactly bind ${clip.action} frame order`);
    }
  }
  const atlas = parseImage(raw.atlas, "sprite_atlas", `${context}.atlas`);
  if (atlas.rects.length !== frames.length || atlas.rects.some((rect, index) => rect.frameId !== frames[index]?.id)) {
    fail(`${context}.atlas must exactly cover all frames in global order`);
  }
  const artifactNames = [
    ...frameNames,
    ...poseSheets.map(({ fileName }) => fileName),
    atlas.fileName,
    sourceGlb.fileName,
    animationBundle.fileName,
  ];
  if (new Set(artifactNames).size !== artifactNames.length) fail(`${context} artifact file names must be unique`);
  return {
    contractId: FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID,
    authoringContractId: FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID,
    assetId: semantic(raw.assetId, `${context}.assetId`),
    revisionId,
    morphologyRevisionId,
    rigSignature,
    equipmentSignature,
    renderProfile: { id: "fantasy.sprite.orthographic.v1", version: "1.0.0" },
    sourceGlb,
    animationBundle,
    clips,
    frames,
    poseSheets,
    atlas,
    deliveryId: patterned(raw.deliveryId, DELIVERY_RE, `${context}.deliveryId`),
  };
}

function decodeJsonBytes(bytes: unknown, context: string): unknown {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) fail(`${context} must be a non-empty Uint8Array`);
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail(`${context} must be valid UTF-8`);
  }
  try {
    return JSON.parse(source!);
  } catch {
    fail(`${context} must contain valid JSON`);
  }
}

function canonicalValue(value: unknown, context: string): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${context} contains a non-finite number`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => canonicalValue(entry, `${context}[${index}]`));
  if (typeof value !== "object") fail(`${context} contains a non-JSON value`);
  const raw = value as UnknownRecord;
  return Object.fromEntries(
    Object.keys(raw).sort().map((key) => [key, canonicalValue(raw[key], `${context}.${key}`)]),
  );
}

function canonicalJson(value: unknown, context: string): string {
  return `${JSON.stringify(canonicalValue(value, context), null, 2)}\n`;
}

export async function digestFantasyAssetForgeFiveClipBytes(value: Uint8Array): Promise<string> {
  const owned = new Uint8Array(value.byteLength);
  owned.set(value);
  const digest = await crypto.subtle.digest("SHA-256", owned);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digestCanonical(value: unknown, context: string): Promise<string> {
  return digestFantasyAssetForgeFiveClipBytes(new TextEncoder().encode(canonicalJson(value, context)));
}

export async function validateFantasyAssetForgeFiveClipManifest(
  manifestBytes: unknown,
): Promise<FantasyAssetForgeFiveClipManifest> {
  const decoded = decodeJsonBytes(manifestBytes, "five-clip manifest bytes");
  const manifest = parseManifest(decoded);
  const raw = record(decoded, "five-clip manifest");
  const unsigned = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "deliveryId"));
  const expectedDeliveryId = `delivery.${await digestCanonical(unsigned, "five-clip delivery identity")}`;
  if (manifest.deliveryId !== expectedDeliveryId) fail("five-clip manifest.deliveryId must bind the canonical manifest content");
  return manifest;
}

function exactBinding(raw: UnknownRecord, manifest: FantasyAssetForgeFiveClipManifest, context: string): void {
  exact(raw.assetRevisionId, manifest.revisionId, `${context}.assetRevisionId`);
  exact(raw.morphologyRevisionId, manifest.morphologyRevisionId, `${context}.morphologyRevisionId`);
  exact(raw.rigSignature, manifest.rigSignature, `${context}.rigSignature`);
  exact(raw.equipmentSignature, manifest.equipmentSignature, `${context}.equipmentSignature`);
}

function validateRenderProfile(value: unknown, context: string): void {
  const raw = record(value, context);
  exactKeys(raw, ["id", "version"], context);
  exact(raw.id, "fantasy.sprite.orthographic.v1", `${context}.id`);
  exact(raw.version, "1.0.0", `${context}.version`);
}

function validateBundleLoop(value: unknown, durationMs: number, context: string): void {
  parseLoop(value, durationMs, context);
}

function validateAnimationBundle(
  bytes: Uint8Array,
  manifest: FantasyAssetForgeFiveClipManifest,
): void {
  const decoded = decodeJsonBytes(bytes, "animation bundle bytes");
  const canonicalBytes = new TextEncoder().encode(canonicalJson(decoded, "animation bundle"));
  if (canonicalBytes.byteLength !== bytes.byteLength || canonicalBytes.some((byte, index) => byte !== bytes[index])) {
    fail("animation bundle bytes must use canonical sorted pretty JSON with one trailing newline");
  }
  const bundle = record(decoded, "animation bundle");
  exactKeys(bundle, ["contractId", "rig", "poses", "clips", "framePlans"], "animation bundle");
  exact(bundle.contractId, "forge-rigid-animation-bundle/v1", "animation bundle.contractId");

  const rig = record(bundle.rig, "animation bundle.rig");
  exactKeys(rig, [
    "contractId", "rigId", "assetRevisionId", "morphologyRevisionId", "rigSignature",
    "equipmentSignature", "rootJointId", "joints",
  ], "animation bundle.rig");
  exact(rig.contractId, "forge-rig-definition/v1", "animation bundle.rig.contractId");
  semantic(rig.rigId, "animation bundle.rig.rigId");
  const rootJointId = semantic(rig.rootJointId, "animation bundle.rig.rootJointId");
  exactBinding(rig, manifest, "animation bundle.rig");
  if (!Array.isArray(rig.joints) || rig.joints.length < 1 || rig.joints.length > 64) {
    fail("animation bundle.rig.joints must contain 1..64 joints");
  }
  const jointIds = new Set<string>();
  for (const [index, entry] of rig.joints.entries()) {
    const context = `animation bundle.rig.joints[${index}]`;
    const joint = record(entry, context);
    exactKeys(joint, ["id", "partId", "axis", "minimumDegrees", "maximumDegrees", "restDegrees"], context, ["parentJointId", "mirrorJointId"]);
    const id = semantic(joint.id, `${context}.id`);
    if (jointIds.has(id)) fail(`${context}.id duplicates another joint`);
    jointIds.add(id);
    semantic(joint.partId, `${context}.partId`);
    if (joint.parentJointId !== undefined) semantic(joint.parentJointId, `${context}.parentJointId`);
    if (joint.mirrorJointId !== undefined) semantic(joint.mirrorJointId, `${context}.mirrorJointId`);
    if (joint.axis !== "x" && joint.axis !== "y" && joint.axis !== "z") fail(`${context}.axis is invalid`);
    const minimum = finite(joint.minimumDegrees, `${context}.minimumDegrees`);
    const maximum = finite(joint.maximumDegrees, `${context}.maximumDegrees`);
    const rest = finite(joint.restDegrees, `${context}.restDegrees`);
    if (minimum < -180 || maximum > 180 || minimum > maximum || rest < minimum || rest > maximum) {
      fail(`${context} joint limits are invalid`);
    }
  }
  if (!jointIds.has(rootJointId)) fail("animation bundle.rig.rootJointId must reference a known joint");

  if (!Array.isArray(bundle.poses) || bundle.poses.length < 1 || bundle.poses.length > 256) {
    fail("animation bundle.poses must contain 1..256 poses");
  }
  const poseIds = new Set<string>();
  for (const [index, entry] of bundle.poses.entries()) {
    const context = `animation bundle.poses[${index}]`;
    const pose = record(entry, context);
    exactKeys(pose, [
      "contractId", "poseSnapshotId", "assetRevisionId", "morphologyRevisionId", "rigSignature",
      "equipmentSignature", "channels",
    ], context, ["rootMotion"]);
    exact(pose.contractId, "forge-pose-snapshot/v1", `${context}.contractId`);
    exactBinding(pose, manifest, context);
    const poseId = patterned(pose.poseSnapshotId, /^pose\.[a-f0-9]{64}$/, `${context}.poseSnapshotId`);
    if (poseIds.has(poseId)) fail(`${context}.poseSnapshotId duplicates another pose`);
    poseIds.add(poseId);
    if (!Array.isArray(pose.channels) || pose.channels.length > 64) fail(`${context}.channels is invalid`);
    const channelJoints = new Set<string>();
    for (const [channelIndex, channelValue] of pose.channels.entries()) {
      const channelContext = `${context}.channels[${channelIndex}]`;
      const channel = record(channelValue, channelContext);
      exactKeys(channel, ["jointId", "valueDegrees"], channelContext);
      const jointId = semantic(channel.jointId, `${channelContext}.jointId`);
      if (!jointIds.has(jointId) || channelJoints.has(jointId)) fail(`${channelContext}.jointId must be known and unique`);
      channelJoints.add(jointId);
      const degrees = finite(channel.valueDegrees, `${channelContext}.valueDegrees`);
      if (degrees < -180 || degrees > 180) fail(`${channelContext}.valueDegrees is out of range`);
    }
    if (pose.rootMotion !== undefined) {
      const rootMotion = record(pose.rootMotion, `${context}.rootMotion`);
      exactKeys(rootMotion, ["offset", "yawDegrees"], `${context}.rootMotion`);
      if (!Array.isArray(rootMotion.offset) || rootMotion.offset.length !== 3 ||
          rootMotion.offset.some((value, offsetIndex) => Math.abs(finite(value, `${context}.rootMotion.offset[${offsetIndex}]`)) > 2)) {
        fail(`${context}.rootMotion.offset is invalid`);
      }
      const yaw = finite(rootMotion.yawDegrees, `${context}.rootMotion.yawDegrees`);
      if (yaw < -180 || yaw > 180) fail(`${context}.rootMotion.yawDegrees is invalid`);
    }
  }

  if (!Array.isArray(bundle.clips) || bundle.clips.length !== 5) fail("animation bundle.clips must contain the exact ordered five clips");
  for (const [index, entry] of bundle.clips.entries()) {
    const context = `animation bundle.clips[${index}]`;
    const clip = record(entry, context);
    exactKeys(clip, [
      "contractId", "clipId", "action", "assetRevisionId", "morphologyRevisionId", "rigSignature",
      "equipmentSignature", "durationMs", "interpolation", "rootAnchorPolicy", "loop", "keyframes",
    ], context);
    const manifestClip = manifest.clips[index]!;
    exact(clip.contractId, "forge-clip-document/v1", `${context}.contractId`);
    exact(clip.clipId, manifestClip.clipId, `${context}.clipId`);
    exact(clip.action, manifestClip.action, `${context}.action`);
    exact(clip.durationMs, manifestClip.durationMs, `${context}.durationMs`);
    exact(clip.interpolation, manifestClip.interpolation, `${context}.interpolation`);
    exactBinding(clip, manifest, context);
    if (clip.rootAnchorPolicy !== "locked" && clip.rootAnchorPolicy !== "in_place" && clip.rootAnchorPolicy !== "bounded_motion") {
      fail(`${context}.rootAnchorPolicy is invalid`);
    }
    validateBundleLoop(clip.loop, manifestClip.durationMs, `${context}.loop`);
    if (canonicalJson(clip.loop, `${context}.loop`) !== canonicalJson(manifestClip.loop, `${context}.loop`)) {
      fail(`${context}.loop must match the batch manifest`);
    }
    if (!Array.isArray(clip.keyframes) || clip.keyframes.length < 2 || clip.keyframes.length > 240) fail(`${context}.keyframes is invalid`);
    let previousTime = -1;
    const keyIds = new Set<string>();
    for (const [keyIndex, keyValue] of clip.keyframes.entries()) {
      const keyContext = `${context}.keyframes[${keyIndex}]`;
      const key = record(keyValue, keyContext);
      exactKeys(key, ["id", "phase", "timeMs", "poseSnapshotId"], keyContext);
      const keyId = semantic(key.id, `${keyContext}.id`);
      semantic(key.phase, `${keyContext}.phase`);
      if (keyIds.has(keyId)) fail(`${keyContext}.id duplicates another keyframe`);
      keyIds.add(keyId);
      const time = integer(key.timeMs, `${keyContext}.timeMs`, 0, 60_000);
      if (time <= previousTime) fail(`${keyContext}.timeMs must be strictly increasing`);
      previousTime = time;
      const poseId = patterned(key.poseSnapshotId, /^pose\.[a-f0-9]{64}$/, `${keyContext}.poseSnapshotId`);
      if (!poseIds.has(poseId)) fail(`${keyContext}.poseSnapshotId is unknown`);
    }
    if ((clip.keyframes[0] as UnknownRecord).timeMs !== 0 ||
        (clip.keyframes.at(-1) as UnknownRecord).timeMs !== manifestClip.durationMs) {
      fail(`${context}.keyframes must begin at zero and end at durationMs`);
    }
  }

  if (!Array.isArray(bundle.framePlans) || bundle.framePlans.length !== 5) fail("animation bundle.framePlans must contain five plans");
  for (const [index, entry] of bundle.framePlans.entries()) {
    const context = `animation bundle.framePlans[${index}]`;
    const plan = record(entry, context);
    exactKeys(plan, [
      "contractId", "framePlanId", "assetRevisionId", "morphologyRevisionId", "rigSignature",
      "equipmentSignature", "clipId", "durationMs", "renderProfile", "seed", "frames",
    ], context);
    const manifestClip = manifest.clips[index]!;
    exact(plan.contractId, "forge-frame-plan/v1", `${context}.contractId`);
    exact(plan.framePlanId, manifestClip.framePlanId, `${context}.framePlanId`);
    exact(plan.clipId, manifestClip.clipId, `${context}.clipId`);
    exact(plan.durationMs, manifestClip.durationMs, `${context}.durationMs`);
    exactBinding(plan, manifest, context);
    validateRenderProfile(plan.renderProfile, `${context}.renderProfile`);
    const seed = integer(plan.seed, `${context}.seed`, 0, 2_147_483_647);
    if (!Array.isArray(plan.frames) || plan.frames.length !== manifestClip.frameIds.length) {
      fail(`${context}.frames must match the manifest clip frame count`);
    }
    const manifestFrames = manifest.frames.filter(({ clipId }) => clipId === manifestClip.clipId);
    for (const [frameIndex, frameValue] of plan.frames.entries()) {
      const frameContext = `${context}.frames[${frameIndex}]`;
      const frame = record(frameValue, frameContext);
      exactKeys(frame, ["id", "sequence", "key", "output"], frameContext);
      const manifestFrame = manifestFrames[frameIndex]!;
      exact(frame.id, manifestFrame.id, `${frameContext}.id`);
      exact(frame.sequence, frameIndex, `${frameContext}.sequence`);
      const key = record(frame.key, `${frameContext}.key`);
      exactKeys(key, [
        "assetRevisionId", "morphologyRevisionId", "rigSignature", "equipmentSignature", "clipId",
        "sampleTimeMs", "renderProfile", "direction", "seed",
      ], `${frameContext}.key`);
      exactBinding(key, manifest, `${frameContext}.key`);
      exact(key.clipId, manifestClip.clipId, `${frameContext}.key.clipId`);
      exact(key.sampleTimeMs, manifestFrame.sampleTimeMs, `${frameContext}.key.sampleTimeMs`);
      exact(key.direction, manifestFrame.direction, `${frameContext}.key.direction`);
      exact(key.seed, seed, `${frameContext}.key.seed`);
      validateRenderProfile(key.renderProfile, `${frameContext}.key.renderProfile`);
      const output = record(frame.output, `${frameContext}.output`);
      exactKeys(output, ["mediaType", "width", "height", "transparent"], `${frameContext}.output`);
      exact(output.mediaType, "image/png", `${frameContext}.output.mediaType`);
      exact(output.width, 128, `${frameContext}.output.width`);
      exact(output.height, 128, `${frameContext}.output.height`);
      exact(output.transparent, true, `${frameContext}.output.transparent`);
    }
  }
}

function parsePngDimensions(bytes: Uint8Array, context: string): { width: number; height: number } {
  if (bytes.byteLength < 45 || PNG_SIGNATURE.some((value, index) => bytes[index] !== value)) {
    fail(`${context} must be a complete PNG`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let width: number | undefined;
  let height: number | undefined;
  let sawIdat = false;
  let sawIend = false;
  while (offset < bytes.byteLength) {
    if (offset + 12 > bytes.byteLength) fail(`${context} has an incomplete PNG chunk`);
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.byteLength) fail(`${context} has an incomplete PNG chunk`);
    const type = String.fromCharCode(bytes[offset + 4]!, bytes[offset + 5]!, bytes[offset + 6]!, bytes[offset + 7]!);
    if (offset === 8 && (type !== "IHDR" || length !== 13)) fail(`${context} must begin with a 13-byte IHDR`);
    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      const colorType = bytes[offset + 17];
      if (colorType !== 4 && colorType !== 6) fail(`${context} must use an alpha-bearing PNG color type`);
    } else if (type === "IDAT") {
      sawIdat = true;
    } else if (type === "IEND") {
      if (length !== 0 || end !== bytes.byteLength) fail(`${context} must end exactly at IEND`);
      sawIend = true;
    }
    offset = end;
  }
  if (width === undefined || height === undefined || !sawIdat || !sawIend) fail(`${context} must include IHDR, IDAT, and IEND`);
  return { width, height };
}

function validateGlb(bytes: Uint8Array, context: string): void {
  if (bytes.byteLength < 20 || bytes[0] !== 0x67 || bytes[1] !== 0x6c || bytes[2] !== 0x54 || bytes[3] !== 0x46) {
    fail(`${context} must have GLB magic glTF`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) !== 2) fail(`${context} must use GLB version 2`);
  if (view.getUint32(8, true) !== bytes.byteLength) fail(`${context} declared GLB length must equal exact bytes`);
  let offset = 12;
  let chunkIndex = 0;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) fail(`${context} contains an incomplete GLB chunk header`);
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + length;
    if (end > bytes.byteLength || length % 4 !== 0) fail(`${context} GLB chunks must be complete and four-byte aligned`);
    if (chunkIndex === 0) {
      if (type !== 0x4e4f534a || length === 0) fail(`${context} first GLB chunk must be non-empty JSON`);
      let source: string;
      try {
        source = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(start, end));
      } catch {
        fail(`${context} GLB JSON must be valid UTF-8`);
      }
      try {
        const json = JSON.parse(source!.replace(/[\u0000\u0020]+$/u, ""));
        if (typeof json !== "object" || json === null || Array.isArray(json)) fail(`${context} GLB JSON must be an object`);
      } catch (error) {
        if (error instanceof FantasyAssetForgeFiveClipIngestionError) throw error;
        fail(`${context} GLB JSON must be valid JSON`);
      }
    } else if (chunkIndex !== 1 || type !== 0x004e4942) {
      fail(`${context} must contain JSON followed by at most one BIN chunk`);
    }
    chunkIndex += 1;
    offset = end;
  }
  if (chunkIndex < 1 || chunkIndex > 2) fail(`${context} has invalid GLB chunk structure`);
}

function parseDelivery(value: unknown): FantasyAssetForgeFiveClipDelivery {
  const raw = record(value, "five-clip delivery");
  exactKeys(raw, ["manifest_bytes", "manifest_sha256", "files"], "five-clip delivery");
  if (!(raw.manifest_bytes instanceof Uint8Array) || raw.manifest_bytes.byteLength === 0) {
    fail("five-clip delivery.manifest_bytes must be a non-empty Uint8Array");
  }
  if (!Array.isArray(raw.files)) fail("five-clip delivery.files must be an array");
  const names = new Set<string>();
  const files = raw.files.map((entry, index) => {
    const context = `five-clip delivery.files[${index}]`;
    const file = record(entry, context);
    exactKeys(file, ["file_name", "bytes"], context);
    if (typeof file.file_name !== "string" || file.file_name.includes("/") || file.file_name.includes("\\") ||
        file.file_name === "." || file.file_name === "..") fail(`${context}.file_name must be portable`);
    if (names.has(file.file_name)) fail(`${context}.file_name duplicates ${file.file_name}`);
    names.add(file.file_name);
    if (!(file.bytes instanceof Uint8Array) || file.bytes.byteLength === 0) fail(`${context}.bytes must be non-empty Uint8Array`);
    return { file_name: file.file_name, bytes: file.bytes };
  });
  return {
    manifest_bytes: raw.manifest_bytes,
    manifest_sha256: patterned(raw.manifest_sha256, SHA256_RE, "five-clip delivery.manifest_sha256"),
    files,
  };
}

function decodePublicChunkBase64(value: unknown, context: string): Uint8Array {
  if (typeof value !== "string") fail(context + ".bytes_base64 must be a string");
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    return fail(context + ".bytes_base64 must be valid base64");
  }
  if (btoa(binary) !== value) {
    fail(context + ".bytes_base64 must use canonical base64 encoding");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deliveryFromPublicRetrieval(
  value: unknown,
): Promise<FantasyAssetForgeFiveClipDelivery> {
  const root = record(value, "five-clip public retrieval");
  exactKeys(
    root,
    ["deliveryId", "manifestSha256", "manifest", "chunks"],
    "five-clip public retrieval",
  );
  const deliveryId = patterned(
    root.deliveryId,
    DELIVERY_RE,
    "five-clip public retrieval.deliveryId",
  );
  const declaredManifestSha256 = patterned(
    root.manifestSha256,
    SHA256_RE,
    "five-clip public retrieval.manifestSha256",
  );
  const manifestValue = record(
    root.manifest,
    "five-clip public retrieval.manifest",
  );
  const manifestBytes = new TextEncoder().encode(
    JSON.stringify(manifestValue, null, 2) + "\n",
  );
  const actualManifestSha256 =
    await digestFantasyAssetForgeFiveClipBytes(manifestBytes);
  if (actualManifestSha256 !== declaredManifestSha256) {
    fail("five-clip public retrieval.manifestSha256 mismatch");
  }
  const manifest =
    await validateFantasyAssetForgeFiveClipManifest(manifestBytes);
  if (manifest.deliveryId !== deliveryId) {
    fail("five-clip public retrieval deliveryId does not match manifest");
  }
  if (!Array.isArray(root.chunks)) {
    fail("five-clip public retrieval.chunks must be an array");
  }
  const chunksByArtifact = new Map<string, UnknownRecord[]>();
  for (const [index, value] of root.chunks.entries()) {
    const context = "five-clip public retrieval.chunks[" + index + "]";
    const chunk = record(value, context);
    const fields = [
      "delivery_id",
      "asset_id",
      "revision_id",
      "artifact_id",
      "artifact_sha256",
      "chunk_sha256",
      "offset",
      "length",
      "total",
      "record_kind",
      "bytes_base64",
    ];
    exactKeys(chunk, fields, context);
    exact(chunk.delivery_id, manifest.deliveryId, context + ".delivery_id");
    exact(chunk.asset_id, manifest.assetId, context + ".asset_id");
    exact(chunk.revision_id, manifest.revisionId, context + ".revision_id");
    exact(chunk.record_kind, "artifact", context + ".record_kind");
    const artifactId = semantic(chunk.artifact_id, context + ".artifact_id");
    patterned(chunk.artifact_sha256, SHA256_RE, context + ".artifact_sha256");
    patterned(chunk.chunk_sha256, SHA256_RE, context + ".chunk_sha256");
    integer(chunk.offset, context + ".offset");
    positiveInteger(chunk.length, context + ".length");
    positiveInteger(chunk.total, context + ".total");
    const entries = chunksByArtifact.get(artifactId) ?? [];
    entries.push(chunk);
    chunksByArtifact.set(artifactId, entries);
  }

  const artifacts = [
    ...manifest.frames,
    ...manifest.poseSheets,
    manifest.atlas,
    manifest.sourceGlb,
    manifest.animationBundle,
  ];
  const expectedIds = new Set(artifacts.map(({ id }) => id));
  for (const artifactId of chunksByArtifact.keys()) {
    if (!expectedIds.has(artifactId)) {
      fail("five-clip public retrieval contains unexpected artifact " + artifactId);
    }
  }
  const files: FantasyAssetForgeFiveClipDelivery["files"][number][] = [];
  for (const artifact of artifacts) {
    const chunks = chunksByArtifact.get(artifact.id);
    if (chunks === undefined || chunks.length === 0) {
      fail("five-clip public retrieval is missing artifact " + artifact.id);
    }
    chunks.sort(
      (left, right) => (left.offset as number) - (right.offset as number),
    );
    const bytes = new Uint8Array(artifact.byteLength);
    let expectedOffset = 0;
    for (const [index, chunk] of chunks.entries()) {
      const context =
        "five-clip public retrieval artifact " +
        artifact.id +
        " chunk[" +
        index +
        "]";
      exact(chunk.artifact_id, artifact.id, context + ".artifact_id");
      exact(
        chunk.artifact_sha256,
        artifact.sha256,
        context + ".artifact_sha256",
      );
      exact(chunk.total, artifact.byteLength, context + ".total");
      exact(chunk.offset, expectedOffset, context + ".offset");
      const chunkBytes = decodePublicChunkBase64(chunk.bytes_base64, context);
      exact(chunk.length, chunkBytes.byteLength, context + ".length");
      const chunkDigest =
        await digestFantasyAssetForgeFiveClipBytes(chunkBytes);
      exact(chunk.chunk_sha256, chunkDigest, context + ".chunk_sha256");
      if (expectedOffset + chunkBytes.byteLength > bytes.byteLength) {
        fail(context + " exceeds declared artifact length");
      }
      bytes.set(chunkBytes, expectedOffset);
      expectedOffset += chunkBytes.byteLength;
    }
    if (expectedOffset !== artifact.byteLength) {
      fail("five-clip public retrieval artifact " + artifact.id + " is incomplete");
    }
    const digest = await digestFantasyAssetForgeFiveClipBytes(bytes);
    if (digest !== artifact.sha256) {
      fail("five-clip public retrieval artifact " + artifact.id + " sha256 mismatch");
    }
    files.push({ file_name: artifact.fileName, bytes });
  }
  return {
    manifest_bytes: manifestBytes,
    manifest_sha256: declaredManifestSha256,
    files,
  };
}

function localReference(
  manifest: FantasyAssetForgeFiveClipManifest,
  digest: string,
  extension: "png" | "glb" | "json",
): string {
  return [
    "staging", "forge-five-clip", manifest.assetId, manifest.revisionId, manifest.deliveryId,
    "sha256", `${digest}.${extension}`,
  ].join("/");
}

export async function digestFantasyAssetForgeFiveClipStagingPlan(value: unknown): Promise<string> {
  const raw = record(value, "five-clip staging plan");
  const unsigned = Object.fromEntries(Object.entries(raw).filter(([key]) => key !== "plan_sha256"));
  return digestCanonical(unsigned, "five-clip staging plan");
}

export async function stageFantasyAssetForgeFiveClipDelivery(
  value: unknown,
): Promise<StagedFantasyAssetForgeFiveClipDelivery> {
  const delivery = parseDelivery(value);
  const manifestDigest = await digestFantasyAssetForgeFiveClipBytes(delivery.manifest_bytes);
  if (manifestDigest !== delivery.manifest_sha256) fail("five-clip delivery.manifest_sha256 mismatch");
  const manifest = await validateFantasyAssetForgeFiveClipManifest(delivery.manifest_bytes);
  const expectedNames = new Set([
    ...manifest.frames.map(({ fileName }) => fileName),
    ...manifest.poseSheets.map(({ fileName }) => fileName),
    manifest.atlas.fileName,
    manifest.sourceGlb.fileName,
    manifest.animationBundle.fileName,
  ]);
  for (const expected of expectedNames) {
    if (!delivery.files.some(({ file_name }) => file_name === expected)) fail(`missing five-clip artifact ${expected}`);
  }
  for (const { file_name } of delivery.files) {
    if (!expectedNames.has(file_name)) fail(`unexpected five-clip artifact ${file_name}`);
  }

  const records: FantasyAssetForgeFiveClipStagingRecord[] = [];
  const stagedFiles: StagedFantasyAssetForgeFiveClipDelivery["files"][number][] = [];
  const stageBytes = (
    role: FantasyAssetForgeFiveClipStagingRecord["role"],
    sourceFileName: string,
    mediaType: FantasyAssetForgeFiveClipStagingRecord["media_type"],
    digest: string,
    bytes: Uint8Array,
    sourceId?: string,
    frame?: FantasyAssetForgeFiveClipFrame,
  ): void => {
    const extension = mediaType === "image/png" ? "png" : mediaType === "model/gltf-binary" ? "glb" : "json";
    const reference = localReference(manifest, digest, extension);
    records.push({
      role,
      source_file_name: sourceFileName,
      media_type: mediaType,
      byte_length: bytes.byteLength,
      sha256: digest,
      local_reference: reference,
      ...(sourceId === undefined ? {} : { source_id: sourceId }),
      ...(frame === undefined ? {} : {
        clip_id: frame.clipId,
        action: frame.action,
        sequence: frame.sequence,
        sample_time_ms: frame.sampleTimeMs,
      }),
    });
    stagedFiles.push({ local_reference: reference, media_type: mediaType, sha256: digest, bytes: bytes.slice() });
  };

  for (const frame of manifest.frames) {
    const file = delivery.files.find(({ file_name }) => file_name === frame.fileName)!;
    if (file.bytes.byteLength !== frame.byteLength) fail(`${frame.fileName} byteLength mismatch`);
    const digest = await digestFantasyAssetForgeFiveClipBytes(file.bytes);
    if (digest !== frame.sha256) fail(`${frame.fileName} sha256 hash drift`);
    const dimensions = parsePngDimensions(file.bytes, frame.fileName);
    if (dimensions.width !== FRAME_SIZE || dimensions.height !== FRAME_SIZE) fail(`${frame.fileName} must be 128x128`);
    stageBytes("source_frame", frame.fileName, "image/png", digest, file.bytes, frame.id, frame);
  }

  for (const sheet of manifest.poseSheets) {
    const file = delivery.files.find(({ file_name }) => file_name === sheet.fileName)!;
    if (file.bytes.byteLength !== sheet.byteLength) fail(`${sheet.fileName} byteLength mismatch`);
    const digest = await digestFantasyAssetForgeFiveClipBytes(file.bytes);
    if (digest !== sheet.sha256) fail(`${sheet.fileName} sha256 hash drift`);
    const dimensions = parsePngDimensions(file.bytes, sheet.fileName);
    if (dimensions.width !== sheet.width || dimensions.height !== sheet.height) fail(`${sheet.fileName} dimensions mismatch`);
    stageBytes("derived_pose_sheet", sheet.fileName, "image/png", digest, file.bytes, sheet.id);
  }

  const atlasFile = delivery.files.find(({ file_name }) => file_name === manifest.atlas.fileName)!;
  if (atlasFile.bytes.byteLength !== manifest.atlas.byteLength) fail(`${manifest.atlas.fileName} byteLength mismatch`);
  const atlasDigest = await digestFantasyAssetForgeFiveClipBytes(atlasFile.bytes);
  if (atlasDigest !== manifest.atlas.sha256) fail(`${manifest.atlas.fileName} sha256 hash drift`);
  const atlasDimensions = parsePngDimensions(atlasFile.bytes, manifest.atlas.fileName);
  if (atlasDimensions.width !== manifest.atlas.width || atlasDimensions.height !== manifest.atlas.height) {
    fail(`${manifest.atlas.fileName} dimensions mismatch`);
  }
  stageBytes("derived_atlas", manifest.atlas.fileName, "image/png", atlasDigest, atlasFile.bytes, manifest.atlas.id);

  const glbFile = delivery.files.find(({ file_name }) => file_name === manifest.sourceGlb.fileName)!;
  if (glbFile.bytes.byteLength !== manifest.sourceGlb.byteLength) fail(`${manifest.sourceGlb.fileName} byteLength mismatch`);
  const glbDigest = await digestFantasyAssetForgeFiveClipBytes(glbFile.bytes);
  if (glbDigest !== manifest.sourceGlb.sha256) fail(`${manifest.sourceGlb.fileName} sha256 hash drift`);
  validateGlb(glbFile.bytes, manifest.sourceGlb.fileName);
  stageBytes("source_glb", manifest.sourceGlb.fileName, "model/gltf-binary", glbDigest, glbFile.bytes, manifest.sourceGlb.id);

  const bundleFile = delivery.files.find(({ file_name }) => file_name === manifest.animationBundle.fileName)!;
  if (bundleFile.bytes.byteLength !== manifest.animationBundle.byteLength) fail(`${manifest.animationBundle.fileName} byteLength mismatch`);
  const bundleDigest = await digestFantasyAssetForgeFiveClipBytes(bundleFile.bytes);
  if (bundleDigest !== manifest.animationBundle.sha256) fail(`${manifest.animationBundle.fileName} sha256 hash drift`);
  validateAnimationBundle(bundleFile.bytes, manifest);
  stageBytes("animation_bundle", manifest.animationBundle.fileName, "application/json", bundleDigest, bundleFile.bytes, manifest.animationBundle.id);

  stageBytes("temporal_manifest", "temporal-manifest.json", "application/json", manifestDigest, delivery.manifest_bytes);
  const unsignedPlan = {
    contract_id: PIXEL_FORGE_FIVE_CLIP_STAGING_PLAN_ID,
    status: "validated_unadmitted" as const,
    source: {
      contract_id: manifest.contractId,
      authoring_contract_id: manifest.authoringContractId,
      asset_id: manifest.assetId,
      revision_id: manifest.revisionId,
      morphology_revision_id: manifest.morphologyRevisionId,
      rig_signature: manifest.rigSignature,
      equipment_signature: manifest.equipmentSignature,
      delivery_id: manifest.deliveryId,
      manifest_sha256: manifestDigest,
    },
    records,
    verification: {
      clip_count: 5 as const,
      source_frame_count: manifest.frames.length,
      pose_sheet_count: 5 as const,
      artifact_count: records.length,
      total_bytes: records.reduce((total, record) => total + record.byte_length, 0),
      hashes_verified: true as const,
      byte_lengths_verified: true as const,
      png_layouts_verified: true as const,
      source_glb_verified: true as const,
      animation_bundle_verified: true as const,
      artifact_set_verified: true as const,
    },
    blockers: BLOCKERS,
  };
  return {
    manifest,
    plan: { ...unsignedPlan, plan_sha256: await digestFantasyAssetForgeFiveClipStagingPlan(unsignedPlan) },
    files: stagedFiles,
  };
}

export async function stageFantasyAssetForgeFiveClipPublicRetrieval(
  value: unknown,
): Promise<StagedFantasyAssetForgeFiveClipDelivery> {
  return stageFantasyAssetForgeFiveClipDelivery(
    await deliveryFromPublicRetrieval(value),
  );
}
