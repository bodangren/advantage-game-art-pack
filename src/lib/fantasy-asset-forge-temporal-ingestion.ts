import { sha256 } from "./svg-assets";

export const FORGE_TEMPORAL_RENDER_ARTIFACTS_ID =
  "forge-temporal-render-artifacts/v1" as const;
export const PIXEL_FORGE_TEMPORAL_STAGING_PLAN_ID =
  "pixel-forge-temporal-staging-plan/v1" as const;

const FRAME_SIZE = 128;
const PIXEL_COUNT = FRAME_SIZE * FRAME_SIZE;
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const BLOCKERS = [
  "five_clip_set_incomplete",
  "pack_admission_not_evaluated",
  "playback_acceptance_missing",
  "public_temporal_retrieval_contract_reconciliation_pending",
  "visual_quality_acceptance_missing",
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
const ATLAS_RE = /^atlas\.[a-f0-9]{64}$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

type UnknownRecord = Record<string, unknown>;
type Direction = (typeof DIRECTIONS)[number];

export interface FantasyAssetForgeTemporalOccupiedBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

export interface FantasyAssetForgeTemporalFeatureEvidence {
  readonly featureId: string;
  readonly partId: string;
  readonly templateId: string;
  readonly silhouetteWidthPixels: number;
  readonly minimumPixels: number;
  readonly minimumPixelArea: number;
  readonly isolatedPixelArea: number;
  readonly visiblePixelArea: number;
  readonly occlusionRatio: number;
  readonly maximumOcclusionRatio: number;
  readonly materialOklabDistance: number;
  readonly minimumOklabDistance: number;
  readonly passes: true;
}

export interface FantasyAssetForgeTemporalFrameMetrics {
  readonly occupiedBounds: FantasyAssetForgeTemporalOccupiedBounds;
  readonly occupiedPixelCount: number;
  readonly occupiedRatio: number;
  readonly transparentPixelCount: number;
  readonly clippedEdges: readonly [];
  readonly groundPixelY: number;
  readonly groundAnchorDeviationPixels: 0;
  readonly minimumHorizontalRunPixels: number;
  readonly minimumVerticalRunPixels: number;
  readonly representativeFeaturePixels: number;
  readonly requiredFeatureEvidence: readonly FantasyAssetForgeTemporalFeatureEvidence[];
  readonly framingEvidence: {
    readonly topMarginPixels: number;
    readonly centerDeviationPixels: number;
    readonly heightDeviationPixels: number;
    readonly worldUnitsPerPixel: number;
  };
}

export interface FantasyAssetForgeTemporalFrame {
  readonly id: string;
  readonly sequence: number;
  readonly direction: Direction;
  readonly sampleTimeMs: number;
  readonly fileName: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly metrics: FantasyAssetForgeTemporalFrameMetrics;
}

export interface FantasyAssetForgeTemporalAtlasRect {
  readonly frameId: string;
  readonly x: number;
  readonly y: number;
  readonly width: 128;
  readonly height: 128;
}

export interface FantasyAssetForgeTemporalManifest {
  readonly contractId: typeof FORGE_TEMPORAL_RENDER_ARTIFACTS_ID;
  readonly assetId: string;
  readonly revisionId: string;
  readonly morphologyRevisionId: string;
  readonly rigSignature: string;
  readonly equipmentSignature: string;
  readonly clipId: string;
  readonly action: string;
  readonly framePlanId: string;
  readonly durationMs: number;
  readonly loop: {
    readonly mode: "loop" | "once";
    readonly startMs: 0;
    readonly endMs: number;
  };
  readonly interpolation: "linear";
  readonly renderProfile: {
    readonly id: "fantasy.sprite.orthographic.v1";
    readonly version: "1.0.0";
  };
  readonly sourceGlb: {
    readonly id: string;
    readonly classification: "source";
    readonly mediaType: "model/gltf-binary";
    readonly fileName: string;
    readonly byteLength: number;
    readonly sha256: string;
  };
  readonly frames: readonly FantasyAssetForgeTemporalFrame[];
  readonly atlas: {
    readonly id: string;
    readonly fileName: string;
    readonly byteLength: number;
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
    readonly columns: number;
    readonly rows: number;
    readonly rects: readonly FantasyAssetForgeTemporalAtlasRect[];
  };
  readonly deliveryId: string;
}

export interface FantasyAssetForgeTemporalDeliveryFile {
  readonly file_name: string;
  readonly bytes: Uint8Array;
}

export interface FantasyAssetForgeTemporalDelivery {
  readonly manifest_bytes: Uint8Array;
  readonly manifest_sha256: string;
  readonly files: readonly FantasyAssetForgeTemporalDeliveryFile[];
}

export interface FantasyAssetForgeTemporalStagingRecord {
  readonly role: "source_frame" | "source_glb" | "derived_atlas" | "temporal_manifest";
  readonly source_file_name: string;
  readonly media_type: "image/png" | "model/gltf-binary" | "application/json";
  readonly byte_length: number;
  readonly sha256: string;
  readonly local_reference: string;
  readonly frame_id?: string;
  readonly sequence?: number;
  readonly sample_time_ms?: number;
}

export interface FantasyAssetForgeTemporalStagingPlan {
  readonly contract_id: typeof PIXEL_FORGE_TEMPORAL_STAGING_PLAN_ID;
  readonly status: "validated_unadmitted";
  readonly source: {
    readonly contract_id: typeof FORGE_TEMPORAL_RENDER_ARTIFACTS_ID;
    readonly asset_id: string;
    readonly revision_id: string;
    readonly morphology_revision_id: string;
    readonly rig_signature: string;
    readonly equipment_signature: string;
    readonly clip_id: string;
    readonly frame_plan_id: string;
    readonly delivery_id: string;
    readonly manifest_sha256: string;
  };
  readonly records: readonly FantasyAssetForgeTemporalStagingRecord[];
  readonly verification: {
    readonly source_frame_count: number;
    readonly artifact_count: number;
    readonly total_bytes: number;
    readonly hashes_verified: true;
    readonly byte_lengths_verified: true;
    readonly png_dimensions_verified: true;
    readonly source_glb_verified: true;
    readonly temporal_distinctness_verified: true;
    readonly atlas_layout_verified: true;
  };
  readonly blockers: typeof BLOCKERS;
  readonly plan_sha256: string;
}

export interface StagedFantasyAssetForgeTemporalDelivery {
  readonly manifest: FantasyAssetForgeTemporalManifest;
  readonly plan: FantasyAssetForgeTemporalStagingPlan;
  readonly files: readonly {
    readonly local_reference: string;
    readonly media_type: "image/png" | "model/gltf-binary" | "application/json";
    readonly sha256: string;
    readonly bytes: Uint8Array;
  }[];
}

export class FantasyAssetForgeTemporalIngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FantasyAssetForgeTemporalIngestionError";
  }
}

export async function digestFantasyAssetForgeTemporalBytes(
  value: Uint8Array,
): Promise<string> {
  const owned = new Uint8Array(value.byteLength);
  owned.set(value);
  const digest = await crypto.subtle.digest("SHA-256", owned);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fail(message: string): never {
  throw new FantasyAssetForgeTemporalIngestionError(message);
}

function record(value: unknown, context: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${context} must be an object`);
  }
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, fields: readonly string[], context: string): void {
  const missing = fields.filter((field) => !(field in value));
  if (missing.length > 0) fail(`${context} missing required key(s): ${missing.join(", ")}`);
  const unexpected = Object.keys(value).filter((field) => !fields.includes(field));
  if (unexpected.length > 0) fail(`${context} contains unexpected key(s): ${unexpected.join(", ")}`);
}

function exact(value: unknown, expected: string | number | boolean, context: string): void {
  if (value !== expected) fail(`${context} must be ${String(expected)}`);
}

function patterned(value: unknown, pattern: RegExp, context: string): string {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${context} is invalid`);
  return value;
}

function finite(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${context} must be finite`);
  return value;
}

function nonnegative(value: unknown, context: string): number {
  const parsed = finite(value, context);
  if (parsed < 0) fail(`${context} must be non-negative`);
  return parsed;
}

function integer(value: unknown, context: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    return fail(`${context} must be a safe integer >= ${minimum}`);
  }
  return value as number;
}

function positiveInteger(value: unknown, context: string): number {
  return integer(value, context, 1);
}

function ratio(value: unknown, context: string): number {
  const parsed = finite(value, context);
  if (parsed < 0 || parsed > 1) fail(`${context} must be between 0 and 1`);
  return parsed;
}

function semantic(value: unknown, context: string): string {
  return patterned(value, SEMANTIC_ID_RE, context);
}

function portableFileName(value: unknown, context: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 200 ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    return fail(`${context} must be a portable file name`);
  }
  return value;
}

function direction(value: unknown, context: string): Direction {
  if (typeof value !== "string" || !DIRECTIONS.includes(value as Direction)) {
    return fail(`${context} must be a supported direction`);
  }
  return value as Direction;
}

function digestSuffix(identity: string): string {
  return identity.slice(identity.indexOf(".") + 1);
}

function parseBounds(value: unknown, context: string): FantasyAssetForgeTemporalOccupiedBounds {
  const raw = record(value, context);
  const fields = ["minX", "minY", "maxX", "maxY", "width", "height"];
  exactKeys(raw, fields, context);
  const minX = integer(raw.minX, `${context}.minX`);
  const minY = integer(raw.minY, `${context}.minY`);
  const maxX = integer(raw.maxX, `${context}.maxX`);
  const maxY = integer(raw.maxY, `${context}.maxY`);
  if (maxX >= FRAME_SIZE || maxY >= FRAME_SIZE || maxX < minX || maxY < minY) {
    fail(`${context} must fit inside a 128x128 frame`);
  }
  const width = positiveInteger(raw.width, `${context}.width`);
  const height = positiveInteger(raw.height, `${context}.height`);
  if (width !== maxX - minX + 1 || height !== maxY - minY + 1) {
    fail(`${context} dimensions must match inclusive bounds`);
  }
  return { minX, minY, maxX, maxY, width, height };
}

function parseFeatureEvidence(
  value: unknown,
  frameIndex: number,
  evidenceIndex: number,
): FantasyAssetForgeTemporalFeatureEvidence {
  const context = `temporal manifest.frames[${frameIndex}].metrics.requiredFeatureEvidence[${evidenceIndex}]`;
  const raw = record(value, context);
  const fields = [
    "featureId",
    "partId",
    "templateId",
    "silhouetteWidthPixels",
    "minimumPixels",
    "minimumPixelArea",
    "isolatedPixelArea",
    "visiblePixelArea",
    "occlusionRatio",
    "maximumOcclusionRatio",
    "materialOklabDistance",
    "minimumOklabDistance",
    "passes",
  ];
  exactKeys(raw, fields, context);
  const isolatedPixelArea = positiveInteger(raw.isolatedPixelArea, `${context}.isolatedPixelArea`);
  const visiblePixelArea = positiveInteger(raw.visiblePixelArea, `${context}.visiblePixelArea`);
  if (visiblePixelArea > isolatedPixelArea) fail(`${context}.visiblePixelArea exceeds isolatedPixelArea`);
  const occlusionRatio = ratio(raw.occlusionRatio, `${context}.occlusionRatio`);
  if (Math.abs(occlusionRatio - (1 - visiblePixelArea / isolatedPixelArea)) > 1e-12) {
    fail(`${context}.occlusionRatio does not match pixel evidence`);
  }
  exact(raw.passes, true, `${context}.passes`);
  return {
    featureId: semantic(raw.featureId, `${context}.featureId`),
    partId: semantic(raw.partId, `${context}.partId`),
    templateId: semantic(raw.templateId, `${context}.templateId`),
    silhouetteWidthPixels: positiveInteger(raw.silhouetteWidthPixels, `${context}.silhouetteWidthPixels`),
    minimumPixels: positiveInteger(raw.minimumPixels, `${context}.minimumPixels`),
    minimumPixelArea: positiveInteger(raw.minimumPixelArea, `${context}.minimumPixelArea`),
    isolatedPixelArea,
    visiblePixelArea,
    occlusionRatio,
    maximumOcclusionRatio: ratio(raw.maximumOcclusionRatio, `${context}.maximumOcclusionRatio`),
    materialOklabDistance: nonnegative(raw.materialOklabDistance, `${context}.materialOklabDistance`),
    minimumOklabDistance: nonnegative(raw.minimumOklabDistance, `${context}.minimumOklabDistance`),
    passes: true,
  };
}

function parseMetrics(value: unknown, frameIndex: number): FantasyAssetForgeTemporalFrameMetrics {
  const context = `temporal manifest.frames[${frameIndex}].metrics`;
  const raw = record(value, context);
  const fields = [
    "occupiedBounds",
    "occupiedPixelCount",
    "occupiedRatio",
    "transparentPixelCount",
    "clippedEdges",
    "groundPixelY",
    "groundAnchorDeviationPixels",
    "minimumHorizontalRunPixels",
    "minimumVerticalRunPixels",
    "representativeFeaturePixels",
    "requiredFeatureEvidence",
    "framingEvidence",
  ];
  exactKeys(raw, fields, context);
  const occupiedPixelCount = positiveInteger(raw.occupiedPixelCount, `${context}.occupiedPixelCount`);
  const transparentPixelCount = integer(raw.transparentPixelCount, `${context}.transparentPixelCount`);
  if (occupiedPixelCount + transparentPixelCount !== PIXEL_COUNT) {
    fail(`${context} pixel counts must total 128x128`);
  }
  const occupiedRatio = ratio(raw.occupiedRatio, `${context}.occupiedRatio`);
  if (occupiedRatio !== occupiedPixelCount / PIXEL_COUNT) {
    fail(`${context}.occupiedRatio must match occupiedPixelCount`);
  }
  if (!Array.isArray(raw.clippedEdges) || raw.clippedEdges.length !== 0) {
    fail(`${context}.clippedEdges must be empty for complete source frames`);
  }
  const groundPixelY = integer(raw.groundPixelY, `${context}.groundPixelY`);
  if (groundPixelY >= FRAME_SIZE) fail(`${context}.groundPixelY must fit the frame`);
  exact(raw.groundAnchorDeviationPixels, 0, `${context}.groundAnchorDeviationPixels`);
  if (!Array.isArray(raw.requiredFeatureEvidence) || raw.requiredFeatureEvidence.length === 0) {
    fail(`${context}.requiredFeatureEvidence must be non-empty`);
  }
  const requiredFeatureEvidence = raw.requiredFeatureEvidence.map((entry, index) =>
    parseFeatureEvidence(entry, frameIndex, index),
  );
  const featureIds = requiredFeatureEvidence.map(({ featureId }) => featureId);
  if (new Set(featureIds).size !== featureIds.length) {
    fail(`${context}.requiredFeatureEvidence contains duplicate feature identity`);
  }
  const framingContext = `${context}.framingEvidence`;
  const framing = record(raw.framingEvidence, framingContext);
  const framingFields = [
    "topMarginPixels",
    "centerDeviationPixels",
    "heightDeviationPixels",
    "worldUnitsPerPixel",
  ];
  exactKeys(framing, framingFields, framingContext);
  const worldUnitsPerPixel = finite(framing.worldUnitsPerPixel, `${framingContext}.worldUnitsPerPixel`);
  if (worldUnitsPerPixel <= 0) fail(`${framingContext}.worldUnitsPerPixel must be positive`);
  return {
    occupiedBounds: parseBounds(raw.occupiedBounds, `${context}.occupiedBounds`),
    occupiedPixelCount,
    occupiedRatio,
    transparentPixelCount,
    clippedEdges: [],
    groundPixelY,
    groundAnchorDeviationPixels: 0,
    minimumHorizontalRunPixels: positiveInteger(raw.minimumHorizontalRunPixels, `${context}.minimumHorizontalRunPixels`),
    minimumVerticalRunPixels: positiveInteger(raw.minimumVerticalRunPixels, `${context}.minimumVerticalRunPixels`),
    representativeFeaturePixels: positiveInteger(raw.representativeFeaturePixels, `${context}.representativeFeaturePixels`),
    requiredFeatureEvidence,
    framingEvidence: {
      topMarginPixels: integer(framing.topMarginPixels, `${framingContext}.topMarginPixels`),
      centerDeviationPixels: nonnegative(framing.centerDeviationPixels, `${framingContext}.centerDeviationPixels`),
      heightDeviationPixels: nonnegative(framing.heightDeviationPixels, `${framingContext}.heightDeviationPixels`),
      worldUnitsPerPixel,
    },
  };
}

function parseFrame(value: unknown, index: number): FantasyAssetForgeTemporalFrame {
  const context = `temporal manifest.frames[${index}]`;
  const raw = record(value, context);
  const fields = [
    "id",
    "sequence",
    "direction",
    "sampleTimeMs",
    "fileName",
    "byteLength",
    "sha256",
    "metrics",
  ];
  exactKeys(raw, fields, context);
  const parsedDirection = direction(raw.direction, `${context}.direction`);
  const sequence = integer(raw.sequence, `${context}.sequence`);
  const sampleTimeMs = integer(raw.sampleTimeMs, `${context}.sampleTimeMs`);
  const fileName = portableFileName(raw.fileName, `${context}.fileName`);
  return {
    id: patterned(raw.id, FRAME_RE, `${context}.id`),
    sequence,
    direction: parsedDirection,
    sampleTimeMs,
    fileName,
    byteLength: positiveInteger(raw.byteLength, `${context}.byteLength`),
    sha256: patterned(raw.sha256, SHA256_RE, `${context}.sha256`),
    metrics: parseMetrics(raw.metrics, index),
  };
}

function parseSourceGlb(value: unknown): FantasyAssetForgeTemporalManifest["sourceGlb"] {
  const context = "temporal manifest.sourceGlb";
  const raw = record(value, context);
  exactKeys(
    raw,
    ["id", "classification", "mediaType", "fileName", "byteLength", "sha256"],
    context,
  );
  const id = patterned(raw.id, GLB_RE, `${context}.id`);
  exact(raw.classification, "source", `${context}.classification`);
  exact(raw.mediaType, "model/gltf-binary", `${context}.mediaType`);
  const fileName = portableFileName(raw.fileName, `${context}.fileName`);
  if (!fileName.endsWith(".glb")) fail(`${context}.fileName must end in .glb`);
  const digest = patterned(raw.sha256, SHA256_RE, `${context}.sha256`);
  if (id !== `glb.${digest}`) fail(`${context}.id must bind sourceGlb.sha256`);
  return {
    id,
    classification: "source",
    mediaType: "model/gltf-binary",
    fileName,
    byteLength: positiveInteger(raw.byteLength, `${context}.byteLength`),
    sha256: digest,
  };
}

function parseManifest(value: unknown): FantasyAssetForgeTemporalManifest {
  const context = "temporal manifest";
  const raw = record(value, context);
  const fields = [
    "contractId",
    "assetId",
    "revisionId",
    "morphologyRevisionId",
    "rigSignature",
    "equipmentSignature",
    "clipId",
    "action",
    "framePlanId",
    "durationMs",
    "loop",
    "interpolation",
    "renderProfile",
    "sourceGlb",
    "frames",
    "atlas",
    "deliveryId",
  ];
  exactKeys(raw, fields, context);
  exact(raw.contractId, FORGE_TEMPORAL_RENDER_ARTIFACTS_ID, `${context}.contractId`);
  const revisionId = patterned(raw.revisionId, REVISION_RE, `${context}.revisionId`);
  const morphologyRevisionId = patterned(
    raw.morphologyRevisionId,
    MORPHOLOGY_RE,
    `${context}.morphologyRevisionId`,
  );
  const rigSignature = patterned(raw.rigSignature, RIG_RE, `${context}.rigSignature`);
  const equipmentSignature = patterned(
    raw.equipmentSignature,
    EQUIPMENT_RE,
    `${context}.equipmentSignature`,
  );
  const clipId = patterned(raw.clipId, CLIP_RE, `${context}.clipId`);
  const framePlanId = patterned(raw.framePlanId, FRAME_PLAN_RE, `${context}.framePlanId`);
  const deliveryId = patterned(raw.deliveryId, DELIVERY_RE, `${context}.deliveryId`);
  const topLevelIdentities = [
    revisionId,
    morphologyRevisionId,
    rigSignature,
    equipmentSignature,
    clipId,
    framePlanId,
    deliveryId,
  ];
  const identityDigests = topLevelIdentities.map(digestSuffix);
  if (new Set(identityDigests).size !== identityDigests.length) {
    const fieldsByIdentity = [
      "revisionId",
      "morphologyRevisionId",
      "rigSignature",
      "equipmentSignature",
      "clipId",
      "framePlanId",
      "deliveryId",
    ];
    const duplicateIndex = identityDigests.findIndex(
      (digest, index) => identityDigests.indexOf(digest) !== index,
    );
    fail(`${context}.${fieldsByIdentity[duplicateIndex]} identity collides with another immutable identity`);
  }
  const durationMs = positiveInteger(raw.durationMs, `${context}.durationMs`);
  const loopRaw = record(raw.loop, `${context}.loop`);
  exactKeys(loopRaw, ["mode", "startMs", "endMs"], `${context}.loop`);
  if (loopRaw.mode !== "loop" && loopRaw.mode !== "once") {
    fail(`${context}.loop.mode must be loop or once`);
  }
  exact(loopRaw.startMs, 0, `${context}.loop.startMs`);
  exact(loopRaw.endMs, durationMs, `${context}.loop.endMs`);
  exact(raw.interpolation, "linear", `${context}.interpolation`);
  const render = record(raw.renderProfile, `${context}.renderProfile`);
  exactKeys(render, ["id", "version"], `${context}.renderProfile`);
  exact(render.id, "fantasy.sprite.orthographic.v1", `${context}.renderProfile.id`);
  exact(render.version, "1.0.0", `${context}.renderProfile.version`);
  const sourceGlb = parseSourceGlb(raw.sourceGlb);
  if (!Array.isArray(raw.frames) || raw.frames.length < 2 || raw.frames.length > 256) {
    fail(`${context}.frames must contain 2..256 temporal source frames`);
  }
  const frames = raw.frames.map(parseFrame);
  const frameIds = new Set<string>();
  const frameHashes = new Set<string>();
  const frameNames = new Set<string>();
  for (const [index, frame] of frames.entries()) {
    if (frame.sequence !== index) fail(`${context}.frames must use contiguous sequences from zero`);
    if (frame.sampleTimeMs >= durationMs) fail(`${context}.frames[${index}].sampleTimeMs must be before durationMs`);
    if (index === 0 && frame.sampleTimeMs !== 0) fail(`${context}.frames must begin at sampleTimeMs zero`);
    if (index > 0 && frame.sampleTimeMs <= frames[index - 1]!.sampleTimeMs) {
      fail(`${context}.frames sample times must be strictly increasing`);
    }
    if (frame.direction !== frames[0]!.direction) {
      fail(`${context}.frames require a stable direction; a static directional dossier is not temporal delivery`);
    }
    if (frame.metrics.framingEvidence.worldUnitsPerPixel !== frames[0]!.metrics.framingEvidence.worldUnitsPerPixel) {
      fail(`${context}.frames require stable camera scale`);
    }
    if (
      frame.metrics.groundPixelY !== frames[0]!.metrics.groundPixelY ||
      frame.metrics.groundAnchorDeviationPixels !== 0
    ) {
      fail(`${context}.frames require a stable ground anchor`);
    }
    if (frameIds.has(frame.id)) fail(`${context}.frames contains duplicate frame identity`);
    if (frameHashes.has(frame.sha256)) fail(`${context}.frames contains duplicate source frame bytes or filler digest`);
    if (frameNames.has(frame.fileName)) fail(`${context}.frames contains duplicate fileName`);
    frameIds.add(frame.id);
    frameHashes.add(frame.sha256);
    frameNames.add(frame.fileName);
  }
  if (frameNames.has(sourceGlb.fileName)) {
    fail(`${context}.sourceGlb.fileName must be distinct from source frame files`);
  }
  for (const [index, frame] of frames.entries()) {
    const expectedFileName = `${String(frame.sequence).padStart(4, "0")}-${frame.direction.toLowerCase()}-${frame.sampleTimeMs}.png`;
    if (frame.fileName !== expectedFileName) {
      fail(`${context}.frames[${index}].fileName must bind sequence, direction, and sample time`);
    }
  }

  const atlasContext = `${context}.atlas`;
  const atlasRaw = record(raw.atlas, atlasContext);
  const atlasFields = [
    "id",
    "fileName",
    "byteLength",
    "sha256",
    "width",
    "height",
    "columns",
    "rows",
    "rects",
  ];
  exactKeys(atlasRaw, atlasFields, atlasContext);
  const atlasId = patterned(atlasRaw.id, ATLAS_RE, `${atlasContext}.id`);
  const atlasSha = patterned(atlasRaw.sha256, SHA256_RE, `${atlasContext}.sha256`);
  if (atlasId !== `atlas.${atlasSha}`) {
    fail(`${atlasContext}.id must bind atlas.sha256`);
  }
  const atlasFileName = portableFileName(atlasRaw.fileName, `${atlasContext}.fileName`);
  if (
    atlasFileName !== "atlas.png" ||
    frameNames.has(atlasFileName) ||
    atlasFileName === sourceGlb.fileName
  ) {
    fail(`${atlasContext}.fileName must be the distinct atlas.png artifact`);
  }
  const columns = positiveInteger(atlasRaw.columns, `${atlasContext}.columns`);
  const rows = positiveInteger(atlasRaw.rows, `${atlasContext}.rows`);
  const width = positiveInteger(atlasRaw.width, `${atlasContext}.width`);
  const height = positiveInteger(atlasRaw.height, `${atlasContext}.height`);
  if (
    columns * rows !== frames.length ||
    width !== columns * FRAME_SIZE ||
    height !== rows * FRAME_SIZE
  ) {
    fail(`${atlasContext} dimensions and grid must exactly cover all 128x128 frames`);
  }
  if (!Array.isArray(atlasRaw.rects) || atlasRaw.rects.length !== frames.length) {
    fail(`${atlasContext}.rects must cover every source frame exactly once`);
  }
  const rects = atlasRaw.rects.map((value, index): FantasyAssetForgeTemporalAtlasRect => {
    const rectContext = `${atlasContext}.rects[${index}]`;
    const rect = record(value, rectContext);
    exactKeys(rect, ["frameId", "x", "y", "width", "height"], rectContext);
    exact(rect.frameId, frames[index]!.id, `${rectContext}.frameId`);
    exact(rect.x, (index % columns) * FRAME_SIZE, `${rectContext}.x`);
    exact(rect.y, Math.floor(index / columns) * FRAME_SIZE, `${rectContext}.y`);
    exact(rect.width, FRAME_SIZE, `${rectContext}.width`);
    exact(rect.height, FRAME_SIZE, `${rectContext}.height`);
    return {
      frameId: frames[index]!.id,
      x: rect.x as number,
      y: rect.y as number,
      width: FRAME_SIZE,
      height: FRAME_SIZE,
    };
  });

  return {
    contractId: FORGE_TEMPORAL_RENDER_ARTIFACTS_ID,
    assetId: semantic(raw.assetId, `${context}.assetId`),
    revisionId,
    morphologyRevisionId,
    rigSignature,
    equipmentSignature,
    clipId,
    action: semantic(raw.action, `${context}.action`),
    framePlanId,
    durationMs,
    loop: { mode: loopRaw.mode, startMs: 0, endMs: durationMs } as FantasyAssetForgeTemporalManifest["loop"],
    interpolation: "linear",
    renderProfile: { id: "fantasy.sprite.orthographic.v1", version: "1.0.0" },
    sourceGlb,
    frames,
    atlas: {
      id: atlasId,
      fileName: atlasFileName,
      byteLength: positiveInteger(atlasRaw.byteLength, `${atlasContext}.byteLength`),
      sha256: atlasSha,
      width,
      height,
      columns,
      rows,
      rects,
    },
    deliveryId,
  };
}

function decodeManifest(bytes: unknown): unknown {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    return fail("temporal manifest bytes must be a non-empty Uint8Array");
  }
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return fail("temporal manifest bytes must be valid UTF-8");
  }
  try {
    return JSON.parse(source);
  } catch {
    return fail("temporal manifest bytes must contain valid JSON");
  }
}

export async function validateFantasyAssetForgeTemporalManifest(
  manifestBytes: unknown,
): Promise<FantasyAssetForgeTemporalManifest> {
  return parseManifest(decodeManifest(manifestBytes));
}

function parsePngDimensions(bytes: Uint8Array, context: string): { width: number; height: number } {
  if (
    bytes.byteLength < 26 ||
    PNG_SIGNATURE.some((value, index) => bytes[index] !== value) ||
    bytes[12] !== 0x49 ||
    bytes[13] !== 0x48 ||
    bytes[14] !== 0x44 ||
    bytes[15] !== 0x52
  ) {
    return fail(`${context} must be a PNG with an IHDR header`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let width: number | undefined;
  let height: number | undefined;
  let sawIdat = false;
  let sawIend = false;
  while (offset < bytes.byteLength) {
    if (offset + 12 > bytes.byteLength) fail(`${context} must be a complete PNG ending in IEND`);
    const length = view.getUint32(offset);
    const end = offset + 12 + length;
    if (end > bytes.byteLength) fail(`${context} must be a complete PNG ending in IEND`);
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    if (offset === 8 && (type !== "IHDR" || length !== 13)) {
      fail(`${context} must begin with a 13-byte IHDR chunk`);
    }
    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      const colorType = bytes[offset + 17];
      if (colorType !== 4 && colorType !== 6) {
        fail(`${context} must declare an alpha-bearing PNG color type`);
      }
    } else if (type === "IDAT") {
      sawIdat = true;
    } else if (type === "IEND") {
      if (length !== 0 || end !== bytes.byteLength) {
        fail(`${context} must be a complete PNG ending in IEND`);
      }
      sawIend = true;
    }
    offset = end;
  }
  if (width === undefined || height === undefined || !sawIdat || !sawIend) {
    fail(`${context} must be a complete PNG with IHDR, IDAT, and IEND`);
  }
  return { width, height };
}

function validateGlb(bytes: Uint8Array, context: string): void {
  if (
    bytes.byteLength < 20 ||
    bytes[0] !== 0x67 ||
    bytes[1] !== 0x6c ||
    bytes[2] !== 0x54 ||
    bytes[3] !== 0x46
  ) {
    fail(`${context} must have GLB magic glTF`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4, true) !== 2) fail(`${context} must use GLB version 2`);
  if (view.getUint32(8, true) !== bytes.byteLength) {
    fail(`${context} GLB declared length must equal exact file bytes`);
  }

  let offset = 12;
  let chunkIndex = 0;
  let sawJson = false;
  let sawBin = false;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) fail(`${context} must contain a complete GLB chunk header`);
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > bytes.byteLength || chunkLength % 4 !== 0) {
      fail(`${context} must contain complete GLB chunks with four-byte alignment`);
    }
    if (chunkIndex === 0) {
      if (chunkType !== 0x4e4f534a || chunkLength === 0) {
        fail(`${context} first GLB chunk must be non-empty JSON`);
      }
      let jsonSource: string;
      try {
        jsonSource = new TextDecoder("utf-8", { fatal: true }).decode(
          bytes.subarray(chunkStart, chunkEnd),
        );
      } catch {
        fail(`${context} GLB JSON chunk must be valid UTF-8`);
      }
      try {
        const parsed = JSON.parse(jsonSource!.replace(/[\u0000\u0020]+$/u, ""));
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          fail(`${context} GLB JSON chunk must contain an object`);
        }
      } catch (error) {
        if (error instanceof FantasyAssetForgeTemporalIngestionError) throw error;
        fail(`${context} GLB JSON chunk must contain valid JSON`);
      }
      sawJson = true;
    } else if (chunkIndex === 1 && chunkType === 0x004e4942) {
      sawBin = true;
    } else {
      fail(`${context} GLB chunks must be one JSON chunk followed by at most one BIN chunk`);
    }
    offset = chunkEnd;
    chunkIndex += 1;
  }
  if (!sawJson || chunkIndex === 0 || chunkIndex > 2 || (chunkIndex === 2 && !sawBin)) {
    fail(`${context} must contain a valid GLB chunk structure`);
  }
}

function canonicalValue(value: unknown, context: string): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${context} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => canonicalValue(entry, `${context}[${index}]`));
  if (typeof value !== "object") return fail(`${context} contains a non-JSON value`);
  const raw = value as UnknownRecord;
  return Object.fromEntries(
    Object.keys(raw)
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
      .map((key) => {
        if (raw[key] === undefined) fail(`${context}.${key} is undefined`);
        return [key, canonicalValue(raw[key], `${context}.${key}`)];
      }),
  );
}

export function canonicalizeFantasyAssetForgeTemporalStagingPlan(value: unknown): string {
  const raw = record(value, "Forge temporal staging plan");
  const unsigned = Object.fromEntries(
    Object.entries(raw).filter(([key]) => key !== "plan_sha256"),
  );
  return JSON.stringify(canonicalValue(unsigned, "Forge temporal staging plan"));
}

export async function digestFantasyAssetForgeTemporalStagingPlan(value: unknown): Promise<string> {
  return sha256(canonicalizeFantasyAssetForgeTemporalStagingPlan(value));
}

function localReference(
  manifest: FantasyAssetForgeTemporalManifest,
  digest: string,
  extension: "png" | "glb" | "json",
): string {
  return [
    "staging",
    "forge-temporal",
    manifest.assetId,
    manifest.revisionId,
    manifest.clipId,
    manifest.framePlanId,
    "sha256",
    `${digest}.${extension}`,
  ].join("/");
}

function parseDelivery(value: unknown): FantasyAssetForgeTemporalDelivery {
  const raw = record(value, "Forge temporal delivery");
  const fields = ["manifest_bytes", "manifest_sha256", "files"];
  exactKeys(raw, fields, "Forge temporal delivery");
  if (!(raw.manifest_bytes instanceof Uint8Array) || raw.manifest_bytes.byteLength === 0) {
    fail("Forge temporal delivery.manifest_bytes must be a non-empty Uint8Array");
  }
  if (!Array.isArray(raw.files)) fail("Forge temporal delivery.files must be an array");
  const names = new Set<string>();
  const files = raw.files.map((value, index) => {
    const context = `Forge temporal delivery.files[${index}]`;
    const file = record(value, context);
    exactKeys(file, ["file_name", "bytes"], context);
    const fileName = portableFileName(file.file_name, `${context}.file_name`);
    if (names.has(fileName)) fail(`${context}.file_name duplicates ${fileName}`);
    names.add(fileName);
    if (!(file.bytes instanceof Uint8Array) || file.bytes.byteLength === 0) {
      fail(`${context}.bytes must be a non-empty Uint8Array`);
    }
    return { file_name: fileName, bytes: file.bytes };
  });
  return {
    manifest_bytes: raw.manifest_bytes,
    manifest_sha256: patterned(
      raw.manifest_sha256,
      SHA256_RE,
      "Forge temporal delivery.manifest_sha256",
    ),
    files,
  };
}

export async function stageFantasyAssetForgeTemporalDelivery(
  value: unknown,
): Promise<StagedFantasyAssetForgeTemporalDelivery> {
  const delivery = parseDelivery(value);
  const actualManifestSha = await digestFantasyAssetForgeTemporalBytes(delivery.manifest_bytes);
  if (actualManifestSha !== delivery.manifest_sha256) {
    fail("Forge temporal delivery.manifest_sha256 mismatch");
  }
  const manifest = await validateFantasyAssetForgeTemporalManifest(delivery.manifest_bytes);
  const expectedNames = new Set([
    ...manifest.frames.map(({ fileName }) => fileName),
    manifest.atlas.fileName,
    manifest.sourceGlb.fileName,
  ]);
  for (const expected of expectedNames) {
    if (!delivery.files.some(({ file_name }) => file_name === expected)) {
      fail(`missing temporal artifact ${expected}`);
    }
  }
  for (const { file_name } of delivery.files) {
    if (!expectedNames.has(file_name)) fail(`unexpected temporal artifact ${file_name}`);
  }

  const records: FantasyAssetForgeTemporalStagingRecord[] = [];
  const stagedFiles: StagedFantasyAssetForgeTemporalDelivery["files"][number][] = [];
  const actualFrameDigests = new Set<string>();
  for (const frame of manifest.frames) {
    const file = delivery.files.find(({ file_name }) => file_name === frame.fileName)!;
    if (file.bytes.byteLength !== frame.byteLength) {
      fail(`${frame.fileName} byteLength mismatch`);
    }
    const digest = await digestFantasyAssetForgeTemporalBytes(file.bytes);
    if (digest !== frame.sha256) fail(`${frame.fileName} sha256 hash drift`);
    if (actualFrameDigests.has(digest)) {
      fail(`${frame.fileName} contains duplicate source frame bytes or filler`);
    }
    actualFrameDigests.add(digest);
    const dimensions = parsePngDimensions(file.bytes, frame.fileName);
    if (dimensions.width !== FRAME_SIZE || dimensions.height !== FRAME_SIZE) {
      fail(`${frame.fileName} must be a 128x128 source frame`);
    }
    const reference = localReference(manifest, digest, "png");
    records.push({
      role: "source_frame",
      source_file_name: frame.fileName,
      media_type: "image/png",
      byte_length: frame.byteLength,
      sha256: digest,
      local_reference: reference,
      frame_id: frame.id,
      sequence: frame.sequence,
      sample_time_ms: frame.sampleTimeMs,
    });
    stagedFiles.push({
      local_reference: reference,
      media_type: "image/png",
      sha256: digest,
      bytes: file.bytes.slice(),
    });
  }

  const atlasFile = delivery.files.find(({ file_name }) => file_name === manifest.atlas.fileName)!;
  if (atlasFile.bytes.byteLength !== manifest.atlas.byteLength) {
    fail(`${manifest.atlas.fileName} byteLength mismatch`);
  }
  const atlasDigest = await digestFantasyAssetForgeTemporalBytes(atlasFile.bytes);
  if (atlasDigest !== manifest.atlas.sha256) fail(`${manifest.atlas.fileName} sha256 hash drift`);
  const atlasDimensions = parsePngDimensions(atlasFile.bytes, manifest.atlas.fileName);
  if (
    atlasDimensions.width !== manifest.atlas.width ||
    atlasDimensions.height !== manifest.atlas.height
  ) {
    fail(`${manifest.atlas.fileName} PNG dimensions do not match declared atlas dimensions`);
  }
  const atlasReference = localReference(manifest, atlasDigest, "png");
  records.push({
    role: "derived_atlas",
    source_file_name: manifest.atlas.fileName,
    media_type: "image/png",
    byte_length: manifest.atlas.byteLength,
    sha256: atlasDigest,
    local_reference: atlasReference,
  });
  stagedFiles.push({
    local_reference: atlasReference,
    media_type: "image/png",
    sha256: atlasDigest,
    bytes: atlasFile.bytes.slice(),
  });

  const sourceGlbFile = delivery.files.find(
    ({ file_name }) => file_name === manifest.sourceGlb.fileName,
  )!;
  if (sourceGlbFile.bytes.byteLength !== manifest.sourceGlb.byteLength) {
    fail(`${manifest.sourceGlb.fileName} byteLength mismatch`);
  }
  const sourceGlbDigest = await digestFantasyAssetForgeTemporalBytes(sourceGlbFile.bytes);
  if (sourceGlbDigest !== manifest.sourceGlb.sha256) {
    fail(`${manifest.sourceGlb.fileName} sha256 hash drift`);
  }
  validateGlb(sourceGlbFile.bytes, manifest.sourceGlb.fileName);
  const sourceGlbReference = localReference(manifest, sourceGlbDigest, "glb");
  records.push({
    role: "source_glb",
    source_file_name: manifest.sourceGlb.fileName,
    media_type: "model/gltf-binary",
    byte_length: manifest.sourceGlb.byteLength,
    sha256: sourceGlbDigest,
    local_reference: sourceGlbReference,
  });
  stagedFiles.push({
    local_reference: sourceGlbReference,
    media_type: "model/gltf-binary",
    sha256: sourceGlbDigest,
    bytes: sourceGlbFile.bytes.slice(),
  });

  const manifestReference = localReference(manifest, actualManifestSha, "json");
  records.push({
    role: "temporal_manifest",
    source_file_name: "temporal-manifest.json",
    media_type: "application/json",
    byte_length: delivery.manifest_bytes.byteLength,
    sha256: actualManifestSha,
    local_reference: manifestReference,
  });
  stagedFiles.push({
    local_reference: manifestReference,
    media_type: "application/json",
    sha256: actualManifestSha,
    bytes: delivery.manifest_bytes.slice(),
  });

  const unsignedPlan = {
    contract_id: PIXEL_FORGE_TEMPORAL_STAGING_PLAN_ID,
    status: "validated_unadmitted" as const,
    source: {
      contract_id: manifest.contractId,
      asset_id: manifest.assetId,
      revision_id: manifest.revisionId,
      morphology_revision_id: manifest.morphologyRevisionId,
      rig_signature: manifest.rigSignature,
      equipment_signature: manifest.equipmentSignature,
      clip_id: manifest.clipId,
      frame_plan_id: manifest.framePlanId,
      delivery_id: manifest.deliveryId,
      manifest_sha256: actualManifestSha,
    },
    records,
    verification: {
      source_frame_count: manifest.frames.length,
      artifact_count: records.length,
      total_bytes: records.reduce((total, record) => total + record.byte_length, 0),
      hashes_verified: true as const,
      byte_lengths_verified: true as const,
      png_dimensions_verified: true as const,
      source_glb_verified: true as const,
      temporal_distinctness_verified: true as const,
      atlas_layout_verified: true as const,
    },
    blockers: BLOCKERS,
  };
  return {
    manifest,
    plan: {
      ...unsignedPlan,
      plan_sha256: await digestFantasyAssetForgeTemporalStagingPlan(unsignedPlan),
    },
    files: stagedFiles,
  };
}
