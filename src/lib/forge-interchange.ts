import { sha256 } from "./svg-assets";

export const FORGE_INTERCHANGE_CONTRACT_ID =
  "forge-asset-interchange-manifest/v1" as const;
export const FORGE_INTERCHANGE_PREREQUISITE =
  "engine_interop_evidence_20260719" as const;

const SHA256_RE = /^[a-f0-9]{64}$/;
const REVISION_RE = /^revision\.[a-f0-9]{64}$/;
const SEMANTIC_ID_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
const ARTIFACT_ROLES = [
  "directional_frame",
  "glb",
  "contact_sheet",
  "sprite_atlas",
  "clip_metadata",
] as const;

type UnknownRecord = Record<string, unknown>;

export interface ForgeInterchangeArtifact {
  readonly id: string;
  readonly classification: "source" | "derived";
  readonly role: (typeof ARTIFACT_ROLES)[number];
  readonly media_type: "image/png" | "model/gltf-binary" | "application/json";
  readonly byte_length: number;
  readonly sha256: string;
  readonly width?: number;
  readonly height?: number;
  readonly transparent?: boolean;
  readonly revision_id: string;
  readonly reference: string;
  readonly direction?: (typeof DIRECTIONS)[number];
}

export interface ForgeInterchangeEvidence {
  readonly id: string;
  readonly kind: string;
  readonly reference: string;
  readonly sha256: string;
  readonly byte_length?: number;
}

export interface ForgeAssetInterchangeManifest {
  readonly contract_id: typeof FORGE_INTERCHANGE_CONTRACT_ID;
  readonly manifest_sha256: string;
  readonly source: { readonly asset_id: string; readonly revision_id: string };
  readonly style_profile: {
    readonly id: "cute_chibi_v1" | "heroic_stylized_v1";
    readonly version: "1.0.0";
    readonly review:
      | { readonly status: "not_required" }
      | {
          readonly status: "recorded";
          readonly attestation: "original-project-owned-no-franchise-copy";
          readonly evidence_reference: string;
        };
  };
  readonly render_profile: {
    readonly id: "fantasy.sprite.orthographic.v1";
    readonly version: "1.0.0";
  };
  readonly provenance: {
    readonly source_kind: "project_generated" | "third_party";
    readonly workflow_reference: string;
    readonly ownership: "project_owned" | "licensed";
    readonly license_label: string;
    readonly creator?: string;
    readonly source_url?: string;
  };
  readonly artifacts: readonly ForgeInterchangeArtifact[];
  readonly evidence: readonly ForgeInterchangeEvidence[];
}

export class ForgeInterchangeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForgeInterchangeValidationError";
  }
}

function fail(message: string): never {
  throw new ForgeInterchangeValidationError(message);
}

function record(value: unknown, context: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${context} must be an object`);
  }
  return value as UnknownRecord;
}

function keys(
  value: UnknownRecord,
  required: readonly string[],
  allowed: readonly string[],
  context: string,
): void {
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0) fail(`${context} missing required key(s): ${missing.join(", ")}`);
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) fail(`${context} contains unexpected key(s): ${unexpected.join(", ")}`);
}

function exactString(value: unknown, expected: string, context: string): string {
  if (value !== expected) fail(`${context} must be ${expected}`);
  return expected;
}

function patterned(value: unknown, pattern: RegExp, context: string): string {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${context} is invalid`);
  return value;
}

function positiveInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return fail(`${context} must be a positive integer`);
  }
  return value;
}

function portableReference(value: unknown, context: string): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 500 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    URL_SCHEME_RE.test(value) ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) fail(`${context} must be a portable retrieval reference`);
  return value;
}

function member<T extends readonly string[]>(
  value: unknown,
  options: T,
  context: string,
): T[number] {
  if (typeof value !== "string" || !options.includes(value)) {
    return fail(`${context} must be one of: ${options.join(", ")}`);
  }
  return value as T[number];
}

function parseArtifact(value: unknown, index: number): ForgeInterchangeArtifact {
  const context = `manifest.artifacts[${index}]`;
  const raw = record(value, context);
  const required = ["id", "classification", "role", "media_type", "byte_length", "sha256", "revision_id", "reference"];
  const allowed = [...required, "width", "height", "transparent", "direction"];
  keys(raw, required, allowed, context);
  if (raw.transparent !== undefined && typeof raw.transparent !== "boolean") fail(`.transparent must be a boolean`);
  const result: ForgeInterchangeArtifact = {
    id: patterned(raw.id, SEMANTIC_ID_RE, `${context}.id`),
    classification: member(raw.classification, ["source", "derived"] as const, `${context}.classification`),
    role: member(raw.role, ARTIFACT_ROLES, `${context}.role`),
    media_type: member(raw.media_type, ["image/png", "model/gltf-binary", "application/json"] as const, `${context}.media_type`),
    byte_length: positiveInteger(raw.byte_length, `${context}.byte_length`),
    sha256: patterned(raw.sha256, SHA256_RE, `${context}.sha256`),
    revision_id: patterned(raw.revision_id, REVISION_RE, `${context}.revision_id`),
    reference: portableReference(raw.reference, `${context}.reference`),
    ...(raw.width === undefined ? {} : { width: positiveInteger(raw.width, `${context}.width`) }),
    ...(raw.height === undefined ? {} : { height: positiveInteger(raw.height, `${context}.height`) }),
    ...(raw.transparent === undefined ? {} : { transparent: raw.transparent }),
    ...(raw.direction === undefined ? {} : { direction: member(raw.direction, DIRECTIONS, `${context}.direction`) }),
  };
  return result;
}

function parseManifestShape(value: unknown): ForgeAssetInterchangeManifest {
  const raw = record(value, "manifest");
  keys(raw, ["contract_id", "manifest_sha256", "source", "style_profile", "render_profile", "provenance", "artifacts", "evidence"], ["contract_id", "manifest_sha256", "source", "style_profile", "render_profile", "provenance", "artifacts", "evidence"], "manifest");

  exactString(raw.contract_id, FORGE_INTERCHANGE_CONTRACT_ID, "manifest.contract_id");
  const manifestSha = patterned(raw.manifest_sha256, SHA256_RE, "manifest.manifest_sha256");

  const source = record(raw.source, "manifest.source");
  keys(source, ["asset_id", "revision_id"], ["asset_id", "revision_id"], "manifest.source");
  const parsedSource = {
    asset_id: patterned(source.asset_id, SEMANTIC_ID_RE, "manifest.source.asset_id"),
    revision_id: patterned(source.revision_id, REVISION_RE, "manifest.source.revision_id"),
  };

  const style = record(raw.style_profile, "manifest.style_profile");
  keys(style, ["id", "version", "review"], ["id", "version", "review"], "manifest.style_profile");
  const styleId = member(style.id, ["cute_chibi_v1", "heroic_stylized_v1"] as const, "manifest.style_profile.id");
  const styleVersion = exactString(style.version, "1.0.0", "manifest.style_profile.version");
  const review = record(style.review, "manifest.style_profile.review");
  if (styleId === "cute_chibi_v1") {
    keys(review, ["status"], ["status"], "manifest.style_profile.review");
    exactString(review.status, "not_required", "manifest.style_profile.review.status");
  } else {
    keys(review, ["status", "attestation", "evidence_reference"], ["status", "attestation", "evidence_reference"], "manifest.style_profile.review");
    exactString(review.status, "recorded", "manifest.style_profile.review.status");
    exactString(review.attestation, "original-project-owned-no-franchise-copy", "manifest.style_profile.review.attestation");
    portableReference(review.evidence_reference, "manifest.style_profile.review.evidence_reference");
  }

  const render = record(raw.render_profile, "manifest.render_profile");
  keys(render, ["id", "version"], ["id", "version"], "manifest.render_profile");
  exactString(render.id, "fantasy.sprite.orthographic.v1", "manifest.render_profile.id");
  exactString(render.version, "1.0.0", "manifest.render_profile.version");

  const provenance = record(raw.provenance, "manifest.provenance");
  keys(provenance, ["source_kind", "workflow_reference", "ownership", "license_label"], ["source_kind", "workflow_reference", "ownership", "license_label", "creator", "source_url"], "manifest.provenance");
  const sourceKind = member(provenance.source_kind, ["project_generated", "third_party"] as const, "manifest.provenance.source_kind");
  const ownership = member(provenance.ownership, ["project_owned", "licensed"] as const, "manifest.provenance.ownership");
  if (sourceKind === "project_generated" && ownership !== "project_owned") fail("manifest.provenance project_generated requires project_owned ownership");
  portableReference(provenance.workflow_reference, "manifest.provenance.workflow_reference");
  if (typeof provenance.license_label !== "string" || provenance.license_label.length === 0 || provenance.license_label.length > 200) fail("manifest.provenance.license_label is invalid");
  if (provenance.creator !== undefined && (typeof provenance.creator !== "string" || provenance.creator.length === 0 || provenance.creator.length > 200)) fail("manifest.provenance.creator is invalid");
  if (provenance.source_url !== undefined) sourceUrl(provenance.source_url, "manifest.provenance.source_url");

  if (!Array.isArray(raw.artifacts) || raw.artifacts.length < 2 || raw.artifacts.length > 1_000) fail("manifest.artifacts must contain 2..1000 entries");
  const artifacts = raw.artifacts.map(parseArtifact);
  const artifactIds = new Set<string>();
  const artifactRefs = new Set<string>();
  const frameDirections = new Set<string>();
  let frameCount = 0;
  let glbCount = 0;
  for (const [index, artifact] of artifacts.entries()) {
    const context = `manifest.artifacts[${index}]`;
    if (artifact.revision_id !== parsedSource.revision_id) fail(`${context}.revision_id must equal pinned source revision`);
    if (artifactIds.has(artifact.id)) fail(`${context}.id duplicate artifact id`);
    if (artifactRefs.has(artifact.reference)) fail(`${context}.reference duplicate artifact reference`);
    artifactIds.add(artifact.id);
    artifactRefs.add(artifact.reference);
    if (artifact.role === "directional_frame") {
      frameCount += 1;
      if (artifact.classification !== "source" || artifact.media_type !== "image/png" || artifact.width !== 128 || artifact.height !== 128 || artifact.direction === undefined || artifact.transparent !== true) fail(`${context} directional_frame must be a transparent source image/png 128x128 with direction`);
      if (frameDirections.has(artifact.direction)) fail(`${context}.direction duplicate direction`);
      frameDirections.add(artifact.direction);
    } else if (artifact.role === "glb") {
      glbCount += 1;
      if (artifact.classification !== "source" || artifact.media_type !== "model/gltf-binary" || artifact.width !== undefined || artifact.height !== undefined || artifact.direction !== undefined || artifact.transparent !== undefined) fail(`${context} glb classification, dimensions, direction, or transparent field is invalid`);
    } else if (artifact.role === "contact_sheet" || artifact.role === "sprite_atlas") {
      if (artifact.classification !== "derived" || artifact.media_type !== "image/png" || artifact.width === undefined || artifact.height === undefined || artifact.direction !== undefined || artifact.transparent === undefined) fail(`${context} derived raster classification, dimensions, direction, or transparent field is invalid`);
    } else if (artifact.classification !== "derived" || artifact.media_type !== "application/json" || artifact.width !== undefined || artifact.height !== undefined || artifact.direction !== undefined || artifact.transparent !== undefined) {
      fail(`${context} clip_metadata classification or fields are invalid`);
    }
  }
  if (frameCount !== DIRECTIONS.length || DIRECTIONS.some((direction) => !frameDirections.has(direction))) fail("manifest.artifacts requires exactly eight unique directional_frame source artifacts");
  if (glbCount === 0) fail("manifest.artifacts requires at least one source glb");

  if (!Array.isArray(raw.evidence) || raw.evidence.length === 0 || raw.evidence.length > 1_000) fail("manifest.evidence must contain 1..1000 entries");
  const evidenceIds = new Set<string>();
  const evidenceRefs = new Set<string>();
  const evidence = raw.evidence.map((value, index) => {
    const context = `manifest.evidence[${index}]`;
    const item = record(value, context);
    keys(
      item,
      ["id", "kind", "reference", "sha256"],
      ["id", "kind", "reference", "sha256", "byte_length"],
      context,
    );
    const byteLength =
      item.byte_length === undefined
        ? undefined
        : positiveInteger(item.byte_length, `${context}.byte_length`);
    const result = {
      id: patterned(item.id, SEMANTIC_ID_RE, `${context}.id`),
      kind: patterned(item.kind, SEMANTIC_ID_RE, `${context}.kind`),
      reference: portableReference(item.reference, `${context}.reference`),
      sha256: patterned(item.sha256, SHA256_RE, `${context}.sha256`),
      ...(byteLength === undefined ? {} : { byte_length: byteLength }),
    };
    if (evidenceIds.has(result.id)) fail(`${context}.id duplicate evidence id`);
    if (evidenceRefs.has(result.reference)) fail(`${context}.reference duplicate evidence reference`);
    evidenceIds.add(result.id);
    evidenceRefs.add(result.reference);
    return result;
  });

  const workflowReference = provenance.workflow_reference as string;
  if (!evidenceRefs.has(workflowReference)) {
    fail("manifest.provenance.workflow_reference must match a digest-pinned evidence reference");
  }
  if (styleId === "heroic_stylized_v1") {
    const reviewReference = review.evidence_reference as string;
    if (!evidenceRefs.has(reviewReference)) {
      fail("manifest.style_profile.review.evidence_reference must match a digest-pinned evidence reference");
    }
  }

  return {
    contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
    manifest_sha256: manifestSha,
    source: parsedSource,
    style_profile: { id: styleId, version: styleVersion as "1.0.0", review: review as ForgeAssetInterchangeManifest["style_profile"]["review"] },
    render_profile: { id: "fantasy.sprite.orthographic.v1", version: render.version as "1.0.0" },
    provenance: provenance as ForgeAssetInterchangeManifest["provenance"],
    artifacts,
    evidence,
  };
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, entry]) => [key, canonicalValue(entry)]),
  );
}

export function canonicalizeForgeInterchangeManifest(value: unknown): string {
  const raw = record(value, "manifest");
  const { manifest_sha256: _manifestSha256, ...signed } = raw;
  return JSON.stringify(canonicalValue(signed));
}

export async function digestForgeInterchangeManifest(value: unknown): Promise<string> {
  return sha256(canonicalizeForgeInterchangeManifest(value));
}

export async function validateForgeInterchangeManifest(value: unknown): Promise<ForgeAssetInterchangeManifest> {
  const manifest = parseManifestShape(value);
  const expected = await digestForgeInterchangeManifest(manifest);
  if (manifest.manifest_sha256 !== expected) fail(`manifest_sha256 mismatch: expected ${expected}, received ${manifest.manifest_sha256}`);
  return manifest;
}

export function negotiateForgeInterchangeContract(offeredContractIds: unknown): typeof FORGE_INTERCHANGE_CONTRACT_ID {
  if (!Array.isArray(offeredContractIds) || offeredContractIds.length === 0 || offeredContractIds.some((id) => typeof id !== "string")) fail("contract offer must be a non-empty string array");
  if (new Set(offeredContractIds).size !== offeredContractIds.length) fail("contract offer is ambiguous due to duplicate IDs");
  const supported = offeredContractIds.filter((id) => id === FORGE_INTERCHANGE_CONTRACT_ID);
  if (supported.length !== 1) fail(`unsupported contract: requires exact ${FORGE_INTERCHANGE_CONTRACT_ID}`);
  return FORGE_INTERCHANGE_CONTRACT_ID;
}

export function validateForgeMcpDiscoveryContract(value: unknown): { readonly manifest_tool: string; readonly artifact_tool: string; readonly contract_id: typeof FORGE_INTERCHANGE_CONTRACT_ID } {
  const raw = record(value, "MCP discovery contract");
  keys(raw, ["tools"], ["tools"], "MCP discovery contract");
  if (!Array.isArray(raw.tools)) fail("MCP discovery contract.tools must be an array");
  const parsed = raw.tools.map((value, index) => {
    const context = `ingestion gate.tools[${index}]`;
    const tool = record(value, context);
    keys(
      tool,
      ["name", "visibility", "capability", "contract_ids", "revision_pinned"],
      ["name", "visibility", "capability", "contract_ids", "revision_pinned", "transfer", "record_kinds"],
      context,
    );
    const name = patterned(tool.name, SEMANTIC_ID_RE, context + ".name");
    exactString(tool.visibility, "public", context + ".visibility (public required)");
    const capability = member(tool.capability, ["manifest_retrieval", "artifact_retrieval"] as const, context + ".capability");
    const expectedName = capability === "manifest_retrieval"
      ? "get_interchange_manifest"
      : "get_interchange_artifact_chunk";
    exactString(name, expectedName, context + ".name");
    negotiateForgeInterchangeContract(tool.contract_ids);
    if (tool.revision_pinned !== true) fail(`${context} must provide revision-pinned retrieval`);
    if (capability === "artifact_retrieval") {
      if (tool.transfer !== "chunked_or_mcp_resource") {
        fail(`${context} must use chunked_or_mcp_resource transfer for the 64KiB-safe public MCP boundary`);
      }
      if (
        !Array.isArray(tool.record_kinds) ||
        tool.record_kinds.length !== 2 ||
        new Set(tool.record_kinds).size !== 2 ||
        !tool.record_kinds.includes("artifact") ||
        !tool.record_kinds.includes("evidence")
      ) {
        fail(`${context}.record_kinds must advertise exactly artifact and evidence`);
      }
    } else {
      if (tool.transfer !== undefined) fail(`${context}.transfer is not valid for manifest retrieval`);
      if (tool.record_kinds !== undefined) fail(`${context}.record_kinds is not valid for manifest retrieval`);
    }
    return { name, capability };
  });
  const manifestTools = parsed.filter(({ capability }) => capability === "manifest_retrieval");
  const artifactTools = parsed.filter(({ capability }) => capability === "artifact_retrieval");
  if (manifestTools.length !== 1) fail("ingestion gate requires exactly one manifest_retrieval capability");
  if (artifactTools.length !== 1) fail("ingestion gate requires exactly one artifact_retrieval capability");
  return { manifest_tool: manifestTools[0]!.name, artifact_tool: artifactTools[0]!.name, contract_id: FORGE_INTERCHANGE_CONTRACT_ID };
}

export function assertForgeIngestionReady(value: unknown): never {
  validateForgeMcpDiscoveryContract(value);
  return fail(
    "Live Forge ingestion is unavailable until " + FORGE_INTERCHANGE_PREREQUISITE + " has a code-owned accepted evidence binding.",
  );
}

export async function validateRetrievedForgeChunkBinding(
  manifestValue: unknown,
  retrievedValue: unknown,
): Promise<ForgeInterchangeArtifact | ForgeInterchangeEvidence> {
  const manifest = await validateForgeInterchangeManifest(manifestValue);
  const context = "retrieved Forge chunk";
  const retrieved = record(retrievedValue, context);
  const fields = [
    "record_kind",
    "asset_id",
    "revision_id",
    "artifact_id",
    "artifact_sha256",
    "chunk_sha256",
    "offset",
    "length",
    "total",
    "bytes_base64",
  ];
  keys(retrieved, fields, fields, context);
  const recordKind = member(
    retrieved.record_kind,
    ["artifact", "evidence"] as const,
    context + ".record_kind",
  );
  const assetId = patterned(
    retrieved.asset_id,
    SEMANTIC_ID_RE,
    context + ".asset_id",
  );
  const revisionId = patterned(
    retrieved.revision_id,
    REVISION_RE,
    context + ".revision_id",
  );
  const recordId = patterned(
    retrieved.artifact_id,
    SEMANTIC_ID_RE,
    context + ".artifact_id",
  );
  const recordSha256 = patterned(
    retrieved.artifact_sha256,
    SHA256_RE,
    context + ".artifact_sha256",
  );
  const chunkSha256 = patterned(
    retrieved.chunk_sha256,
    SHA256_RE,
    context + ".chunk_sha256",
  );
  const offset =
    typeof retrieved.offset === "number" &&
    Number.isSafeInteger(retrieved.offset) &&
    retrieved.offset >= 0
      ? retrieved.offset
      : fail(context + ".offset must be a nonnegative safe integer");
  const length = positiveInteger(retrieved.length, context + ".length");
  if (length > 32_768) fail(context + ".length must not exceed 32768");
  const total = positiveInteger(retrieved.total, context + ".total");
  if (offset + length > total || !Number.isSafeInteger(offset + length)) {
    fail(context + " range exceeds total");
  }
  if (typeof retrieved.bytes_base64 !== "string") {
    fail(context + ".bytes_base64 must be a string");
  }
  const decoded = decodeCanonicalBase64(retrieved.bytes_base64, context);
  if (decoded.length !== length) {
    fail(
      context +
        " decoded length mismatch: declared " +
        length +
        ", actual " +
        decoded.length,
    );
  }
  const calculatedChunkSha256 = await sha256Bytes(decoded);
  if (calculatedChunkSha256 !== chunkSha256) {
    fail(
      context +
        ".chunk_sha256 mismatch: declared " +
        chunkSha256 +
        ", calculated " +
        calculatedChunkSha256,
    );
  }
  if (assetId !== manifest.source.asset_id) {
    fail(context + ".asset_id mismatch");
  }
  if (revisionId !== manifest.source.revision_id) {
    fail(context + ".revision_id mismatch");
  }

  if (recordKind === "artifact") {
    const artifact = manifest.artifacts.find(({ id }) => id === recordId);
    if (!artifact) fail(context + " unknown artifact " + recordId);
    if (recordSha256 !== artifact.sha256) {
      fail(context + ".artifact_sha256 mismatch for " + recordId);
    }
    if (total !== artifact.byte_length) {
      fail(context + ".total mismatch for " + recordId);
    }
    return artifact;
  }

  const evidence = manifest.evidence.find(({ id }) => id === recordId);
  if (!evidence) fail(context + " unknown evidence " + recordId);
  if (evidence.byte_length === undefined) {
    fail(context + " evidence " + recordId + " has no signed byte_length");
  }
  if (recordSha256 !== evidence.sha256) {
    fail(context + ".artifact_sha256 mismatch for evidence " + recordId);
  }
  if (total !== evidence.byte_length) {
    fail(context + ".total mismatch for evidence " + recordId);
  }
  return evidence;
}

export async function reconstructRetrievedForgeRecord(
  manifestValue: unknown,
  chunkValues: unknown,
): Promise<Uint8Array> {
  const manifest = await validateForgeInterchangeManifest(manifestValue);
  if (!Array.isArray(chunkValues) || chunkValues.length === 0) {
    return fail("reconstructed Forge record requires a non-empty chunk array");
  }

  const chunks = [];
  for (const [index, value] of chunkValues.entries()) {
    await validateRetrievedForgeChunkBinding(manifest, value);
    const chunk = record(value, "reconstructed Forge record chunks[" + index + "]");
    chunks.push({
      record_kind: chunk.record_kind,
      artifact_id: chunk.artifact_id,
      artifact_sha256: chunk.artifact_sha256,
      offset: chunk.offset as number,
      length: chunk.length as number,
      total: chunk.total as number,
      bytes: decodeCanonicalBase64(
        chunk.bytes_base64,
        "reconstructed Forge record chunks[" + index + "]",
      ),
    });
  }

  const first = chunks[0]!;
  for (const chunk of chunks) {
    if (
      chunk.record_kind !== first.record_kind ||
      chunk.artifact_id !== first.artifact_id ||
      chunk.artifact_sha256 !== first.artifact_sha256 ||
      chunk.total !== first.total
    ) {
      fail("reconstructed Forge record chunks must bind one record identity");
    }
  }
  chunks.sort((left, right) => left.offset - right.offset);
  let expectedOffset = 0;
  for (const chunk of chunks) {
    if (chunk.offset !== expectedOffset) {
      fail(
        "reconstructed Forge record has a gap or overlap at offset " +
          expectedOffset,
      );
    }
    expectedOffset += chunk.length;
  }
  if (expectedOffset !== first.total) {
    fail(
      "reconstructed Forge record is incomplete: expected " +
        first.total +
        " bytes, received " +
        expectedOffset,
    );
  }

  const bytes = new Uint8Array(first.total);
  for (const chunk of chunks) bytes.set(chunk.bytes, chunk.offset);
  const reconstructedSha256 = await sha256Bytes(bytes);
  if (reconstructedSha256 !== first.artifact_sha256) {
    fail(
      "reconstructed Forge record sha256 mismatch: expected " +
        first.artifact_sha256 +
        ", calculated " +
        reconstructedSha256,
    );
  }
  return bytes;
}

function decodeCanonicalBase64(value: unknown, context: string): Uint8Array {
  if (typeof value !== "string") {
    return fail(context + ".bytes_base64 must be a string");
  }
  let decoded: string;
  try {
    decoded = atob(value);
  } catch {
    return fail(context + ".bytes_base64 must be valid base64");
  }
  if (btoa(decoded) !== value) {
    return fail(context + ".bytes_base64 must be canonical base64");
  }
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    return fail("Web Crypto SHA-256 is unavailable");
  }
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sourceUrl(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    return fail(`${context} must be 1..2048 characters`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return fail(`${context} must be a valid absolute HTTP(S) URL`);
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.hostname.length === 0 ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    return fail(`${context} must be credential-free HTTP(S) with a hostname`);
  }
  return value;
}
