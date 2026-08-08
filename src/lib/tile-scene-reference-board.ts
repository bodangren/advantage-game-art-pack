import { sha256 } from "./svg-assets";

export const TILE_SCENE_REFERENCE_BOARD_CONTRACT = "tile-scene-reference-board/v1" as const;

export const TILE_SCENE_REFERENCE_BOARD_MAPPING = {
  "RB-01": { scene_family: "castle-defense", theme_profile: "cute_chibi_v1" },
  "RB-02": { scene_family: "castle-defense", theme_profile: "heroic_stylized_v1" },
  "RB-03": { scene_family: "potion-rush", theme_profile: "cute_chibi_v1" },
  "RB-04": { scene_family: "potion-rush", theme_profile: "heroic_stylized_v1" },
  "RB-05": { scene_family: "wizard-vs-zombie", theme_profile: "cute_chibi_v1" },
  "RB-06": { scene_family: "wizard-vs-zombie", theme_profile: "heroic_stylized_v1" },
  "RB-07": { scene_family: "rune-match", theme_profile: "cute_chibi_v1" },
  "RB-08": { scene_family: "rune-match", theme_profile: "heroic_stylized_v1" },
} as const;

export type TileSceneReferenceBoardId = keyof typeof TILE_SCENE_REFERENCE_BOARD_MAPPING;
export type TileSceneReferenceState = "test_fixture" | "draft" | "production_ready";
export type TileSceneReferenceArtifactRole =
  | "raw_source"
  | "clean_2x_target"
  | "delivery_preview"
  | "material_sample"
  | "repetition_or_edge_proof"
  | "gameplay_overlay"
  | "cross_theme_comparison";

export interface TileSceneReferenceArtifact {
  readonly artifact_id: string;
  readonly reference: string;
  readonly role: TileSceneReferenceArtifactRole;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
  readonly mime_type: "image/png" | "image/webp" | "image/jpeg";
  readonly byte_length: number;
}

export interface TileSceneGeneratorLineage {
  readonly implementation: "reading_advantage_ai" | "mock_fixture_generator";
  readonly implementation_revision: string;
  readonly provider: "openai" | "google" | "mock";
  readonly requested_model: string;
  readonly resolved_model: string | null;
  readonly prompt: string;
  readonly requested_size: { readonly width: number; readonly height: number };
  readonly requested_seed: number | null;
  readonly provider_forwarded_size: boolean;
  readonly provider_forwarded_seed: boolean;
  readonly deterministic_claim: boolean;
  readonly actual_output: {
    readonly sha256: string;
    readonly width: number;
    readonly height: number;
    readonly mime_type: TileSceneReferenceArtifact["mime_type"];
    readonly byte_length: number;
  };
  readonly generated_at: string;
  readonly latency_ms: number;
  readonly request_id: string | null;
  readonly response_id: string | null;
}

export interface TileSceneReferenceBoard {
  readonly contract_id: typeof TILE_SCENE_REFERENCE_BOARD_CONTRACT;
  readonly board_id: TileSceneReferenceBoardId;
  readonly scene_family: (typeof TILE_SCENE_REFERENCE_BOARD_MAPPING)[TileSceneReferenceBoardId]["scene_family"];
  readonly theme_profile: (typeof TILE_SCENE_REFERENCE_BOARD_MAPPING)[TileSceneReferenceBoardId]["theme_profile"];
  readonly reference_state: TileSceneReferenceState;
  readonly admission: {
    readonly state: "candidate_unadmitted";
    readonly shipping: false;
    readonly visual_review: "pending";
  };
  readonly downstream_bindings: {
    readonly gate_closed: boolean;
    readonly accepted_manifest_sha256: string | null;
    readonly corpus_sha256: string | null;
    readonly mechanic_capability_sha256: string | null;
    readonly responsive_matrix_sha256: string | null;
    readonly usage_matrix_sha256: string | null;
    readonly ontology_sha256: string | null;
    readonly variant_rules_sha256: string | null;
    readonly environment_kits_sha256: string | null;
    readonly audio_roles_sha256: string | null;
    readonly gap_analysis_sha256: string | null;
    readonly owner_approval: {
      readonly approved: boolean;
      readonly approval_id: string | null;
      readonly approval_sha256: string | null;
    };
    readonly unresolved_must_have_ids: readonly string[];
  };
  readonly theme_distinction: {
    readonly paired_board_id: TileSceneReferenceBoardId;
    readonly geometry_reused: false;
    readonly comparison_artifact_id: string;
  };
  readonly source_artifacts: readonly {
    readonly artifact: TileSceneReferenceArtifact & { readonly role: "raw_source" };
    readonly generator: TileSceneGeneratorLineage;
  }[];
  readonly derived_artifacts: readonly TileSceneReferenceArtifact[];
  readonly board_sha256: string;
}

type UnknownRecord = Record<string, unknown>;

const SHA256_RE = /^[0-9a-f]{64}$/;
const ID_RE = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const BOARD_ID_RE = /^RB-0[1-8]$/;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const URI_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const MIME_TYPES = new Set(["image/png", "image/webp", "image/jpeg"]);
const DERIVED_ROLES = new Set<TileSceneReferenceArtifactRole>([
  "clean_2x_target",
  "delivery_preview",
  "material_sample",
  "repetition_or_edge_proof",
  "gameplay_overlay",
  "cross_theme_comparison",
]);
const HASH_BINDING_FIELDS = [
  "accepted_manifest_sha256",
  "corpus_sha256",
  "mechanic_capability_sha256",
  "responsive_matrix_sha256",
  "usage_matrix_sha256",
  "ontology_sha256",
  "variant_rules_sha256",
  "environment_kits_sha256",
  "audio_roles_sha256",
  "gap_analysis_sha256",
] as const;

export class TileSceneReferenceBoardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TileSceneReferenceBoardValidationError";
  }
}

function fail(message: string): never {
  throw new TileSceneReferenceBoardValidationError(message);
}

function record(value: unknown, context: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${context} must be an object`);
  }
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, fields: readonly string[], context: string): void {
  const allowed = new Set(fields);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${context} has unexpected field ${key}`);
  }
  for (const key of fields) {
    if (!Object.hasOwn(value, key)) fail(`${context} is missing field ${key}`);
  }
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], context: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    return fail(`${context} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function nonemptyString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fail(`${context} must be a non-empty string`);
  }
  return value;
}

function matchingString(value: unknown, pattern: RegExp, context: string): string {
  const text = nonemptyString(value, context);
  if (!pattern.test(text)) fail(`${context} has an invalid format`);
  return text;
}

function nullableString(value: unknown, context: string): string | null {
  return value === null ? null : nonemptyString(value, context);
}

function bool(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") return fail(`${context} must be boolean`);
  return value;
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

function nullableSha(value: unknown, context: string): string | null {
  return value === null ? null : matchingString(value, SHA256_RE, context);
}

function portableReference(value: unknown, context: string): string {
  const reference = nonemptyString(value, context);
  if (
    reference.startsWith("/") ||
    reference.includes("\\") ||
    URI_SCHEME_RE.test(reference) ||
    reference.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    return fail(`${context} must be a portable relative reference`);
  }
  return reference;
}

function validateArtifact(
  value: unknown,
  expectedRole: "raw_source" | null,
  context: string,
): TileSceneReferenceArtifact {
  const artifact = record(value, context);
  exactKeys(
    artifact,
    ["artifact_id", "reference", "role", "sha256", "width", "height", "mime_type", "byte_length"],
    context,
  );
  const role = oneOf(
    artifact.role,
    [
      "raw_source",
      "clean_2x_target",
      "delivery_preview",
      "material_sample",
      "repetition_or_edge_proof",
      "gameplay_overlay",
      "cross_theme_comparison",
    ] as const,
    `${context}.role`,
  );
  if (expectedRole !== null && role !== expectedRole) {
    fail(`${context}.role must be ${expectedRole}`);
  }
  if (expectedRole === null && !DERIVED_ROLES.has(role)) {
    fail(`${context}.role must be a derived artifact role`);
  }
  const mime = oneOf(artifact.mime_type, [...MIME_TYPES] as TileSceneReferenceArtifact["mime_type"][], `${context}.mime_type`);
  return {
    artifact_id: matchingString(artifact.artifact_id, ID_RE, `${context}.artifact_id`),
    reference: portableReference(artifact.reference, `${context}.reference`),
    role,
    sha256: matchingString(artifact.sha256, SHA256_RE, `${context}.sha256`),
    width: positiveInteger(artifact.width, `${context}.width`),
    height: positiveInteger(artifact.height, `${context}.height`),
    mime_type: mime,
    byte_length: positiveInteger(artifact.byte_length, `${context}.byte_length`),
  };
}

function validateActualOutput(value: unknown, context: string) {
  const output = record(value, context);
  exactKeys(output, ["sha256", "width", "height", "mime_type", "byte_length"], context);
  return {
    sha256: matchingString(output.sha256, SHA256_RE, `${context}.sha256`),
    width: positiveInteger(output.width, `${context}.width`),
    height: positiveInteger(output.height, `${context}.height`),
    mime_type: oneOf(output.mime_type, [...MIME_TYPES] as TileSceneReferenceArtifact["mime_type"][], `${context}.mime_type`),
    byte_length: positiveInteger(output.byte_length, `${context}.byte_length`),
  };
}

function validateGenerator(
  value: unknown,
  artifact: TileSceneReferenceArtifact,
  referenceState: TileSceneReferenceState,
  context: string,
): TileSceneGeneratorLineage {
  const generator = record(value, context);
  exactKeys(
    generator,
    [
      "implementation",
      "implementation_revision",
      "provider",
      "requested_model",
      "resolved_model",
      "prompt",
      "requested_size",
      "requested_seed",
      "provider_forwarded_size",
      "provider_forwarded_seed",
      "deterministic_claim",
      "actual_output",
      "generated_at",
      "latency_ms",
      "request_id",
      "response_id",
    ],
    context,
  );
  const implementation = oneOf(
    generator.implementation,
    ["reading_advantage_ai", "mock_fixture_generator"] as const,
    `${context}.implementation`,
  );
  const provider = oneOf(generator.provider, ["openai", "google", "mock"] as const, `${context}.provider`);
  const requestedSize = record(generator.requested_size, `${context}.requested_size`);
  exactKeys(requestedSize, ["width", "height"], `${context}.requested_size`);
  const requestedSeed = generator.requested_seed === null
    ? null
    : integer(generator.requested_seed, `${context}.requested_seed`);
  const forwardedSize = bool(generator.provider_forwarded_size, `${context}.provider_forwarded_size`);
  const forwardedSeed = bool(generator.provider_forwarded_seed, `${context}.provider_forwarded_seed`);
  const deterministicClaim = bool(generator.deterministic_claim, `${context}.deterministic_claim`);
  const actualOutput = validateActualOutput(generator.actual_output, `${context}.actual_output`);

  if (provider === "mock") {
    if (implementation !== "mock_fixture_generator") fail(`${context} mock provider requires mock implementation`);
    if (referenceState !== "test_fixture") fail(`${context} mock generation is allowed only in test_fixture state`);
    if (!deterministicClaim) fail(`${context}.deterministic_claim must be true for a mock fixture`);
    if (!forwardedSize || requestedSeed === null || !forwardedSeed) {
      fail(`${context} mock fixture must actually forward requested size and seed`);
    }
  } else {
    if (implementation !== "reading_advantage_ai") fail(`${context} production provider requires reading_advantage_ai`);
    if (deterministicClaim) fail(`${context}.deterministic_claim must be false for generative providers`);
    if (referenceState === "production_ready" && !forwardedSize) {
      fail(`${context}.provider_forwarded_size must be true for production_ready state`);
    }
  }
  if (requestedSeed === null && forwardedSeed) {
    fail(`${context}.provider_forwarded_seed cannot be true without a requested seed`);
  }
  const requestedWidth = positiveInteger(requestedSize.width, `${context}.requested_size.width`);
  const requestedHeight = positiveInteger(requestedSize.height, `${context}.requested_size.height`);
  if (forwardedSize && (requestedWidth !== actualOutput.width || requestedHeight !== actualOutput.height)) {
    fail(`${context}.provider_forwarded_size requires requested dimensions to match actual_output`);
  }
  if (
    actualOutput.sha256 !== artifact.sha256 ||
    actualOutput.width !== artifact.width ||
    actualOutput.height !== artifact.height ||
    actualOutput.mime_type !== artifact.mime_type ||
    actualOutput.byte_length !== artifact.byte_length
  ) {
    fail(`${context}.actual_output must exactly match its raw source artifact`);
  }

  return {
    implementation,
    implementation_revision: matchingString(generator.implementation_revision, SHA256_RE, `${context}.implementation_revision`),
    provider,
    requested_model: nonemptyString(generator.requested_model, `${context}.requested_model`),
    resolved_model: nullableString(generator.resolved_model, `${context}.resolved_model`),
    prompt: nonemptyString(generator.prompt, `${context}.prompt`),
    requested_size: {
      width: requestedWidth,
      height: requestedHeight,
    },
    requested_seed: requestedSeed,
    provider_forwarded_size: forwardedSize,
    provider_forwarded_seed: forwardedSeed,
    deterministic_claim: deterministicClaim,
    actual_output: actualOutput,
    generated_at: matchingString(generator.generated_at, ISO_UTC_RE, `${context}.generated_at`),
    latency_ms: integer(generator.latency_ms, `${context}.latency_ms`),
    request_id: nullableString(generator.request_id, `${context}.request_id`),
    response_id: nullableString(generator.response_id, `${context}.response_id`),
  };
}

function canonicalValue(value: unknown, context: string): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${context} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => canonicalValue(entry, `${context}[${index}]`));
  }
  if (typeof value !== "object" || value === null) fail(`${context} contains a non-JSON value`);
  const output: UnknownRecord = {};
  for (const key of Object.keys(value as UnknownRecord).sort()) {
    const entry = (value as UnknownRecord)[key];
    if (entry === undefined) fail(`${context}.${key} is undefined`);
    output[key] = canonicalValue(entry, `${context}.${key}`);
  }
  return output;
}

export function canonicalizeTileSceneReferenceBoard(value: unknown): string {
  const board = record(value, "tile scene reference board");
  const unsigned: UnknownRecord = {};
  for (const [key, entry] of Object.entries(board)) {
    if (key !== "board_sha256") unsigned[key] = entry;
  }
  return JSON.stringify(canonicalValue(unsigned, "tile scene reference board"));
}

export async function digestTileSceneReferenceBoard(value: unknown): Promise<string> {
  return sha256(canonicalizeTileSceneReferenceBoard(value));
}

function parseBoard(value: unknown): TileSceneReferenceBoard {
  const board = record(value, "tile scene reference board");
  exactKeys(
    board,
    [
      "contract_id",
      "board_id",
      "scene_family",
      "theme_profile",
      "reference_state",
      "admission",
      "downstream_bindings",
      "theme_distinction",
      "source_artifacts",
      "derived_artifacts",
      "board_sha256",
    ],
    "tile scene reference board",
  );
  if (board.contract_id !== TILE_SCENE_REFERENCE_BOARD_CONTRACT) {
    fail(`tile scene reference board.contract_id must be ${TILE_SCENE_REFERENCE_BOARD_CONTRACT}`);
  }
  const boardId = matchingString(board.board_id, BOARD_ID_RE, "tile scene reference board.board_id") as TileSceneReferenceBoardId;
  const mapping = TILE_SCENE_REFERENCE_BOARD_MAPPING[boardId];
  if (board.scene_family !== mapping.scene_family) {
    fail(`tile scene reference board.scene_family does not match ${boardId}`);
  }
  if (board.theme_profile !== mapping.theme_profile) {
    fail(`tile scene reference board.theme_profile does not match ${boardId}`);
  }
  const referenceState = oneOf(
    board.reference_state,
    ["test_fixture", "draft", "production_ready"] as const,
    "tile scene reference board.reference_state",
  );

  const admission = record(board.admission, "tile scene reference board.admission");
  exactKeys(admission, ["state", "shipping", "visual_review"], "tile scene reference board.admission");
  if (admission.state !== "candidate_unadmitted" || admission.shipping !== false || admission.visual_review !== "pending") {
    fail("tile scene reference board admission and shipping must remain false/pending");
  }

  const bindings = record(board.downstream_bindings, "tile scene reference board.downstream_bindings");
  exactKeys(
    bindings,
    ["gate_closed", ...HASH_BINDING_FIELDS, "owner_approval", "unresolved_must_have_ids"],
    "tile scene reference board.downstream_bindings",
  );
  const parsedHashes = Object.fromEntries(
    HASH_BINDING_FIELDS.map((field) => [field, nullableSha(bindings[field], `downstream_bindings.${field}`)]),
  ) as Record<(typeof HASH_BINDING_FIELDS)[number], string | null>;
  const owner = record(bindings.owner_approval, "downstream_bindings.owner_approval");
  exactKeys(owner, ["approved", "approval_id", "approval_sha256"], "downstream_bindings.owner_approval");
  const ownerApproved = bool(owner.approved, "downstream_bindings.owner_approval.approved");
  const approvalId = nullableString(owner.approval_id, "downstream_bindings.owner_approval.approval_id");
  const approvalSha = nullableSha(owner.approval_sha256, "downstream_bindings.owner_approval.approval_sha256");
  if (ownerApproved !== (approvalId !== null && approvalSha !== null)) {
    fail("downstream_bindings.owner_approval must bind both approval id and SHA-256 exactly when approved");
  }
  if (!Array.isArray(bindings.unresolved_must_have_ids)) {
    fail("downstream_bindings.unresolved_must_have_ids must be an array");
  }
  const unresolved = bindings.unresolved_must_have_ids.map((entry, index) =>
    matchingString(entry, ID_RE, `downstream_bindings.unresolved_must_have_ids[${index}]`),
  );
  if (new Set(unresolved).size !== unresolved.length) fail("unresolved Must-have ids must be unique");
  const gateClosed = bool(bindings.gate_closed, "downstream_bindings.gate_closed");
  if (referenceState === "production_ready") {
    const missingHash = HASH_BINDING_FIELDS.find((field) => parsedHashes[field] === null);
    if (missingHash) fail(`production_ready requires accepted hash binding ${missingHash}`);
    if (!ownerApproved) fail("production_ready requires owner approval");
    if (gateClosed) fail("production_ready requires the downstream gate to be open");
    if (unresolved.length > 0) fail("production_ready cannot contain unresolved Must-have requirements");
  } else if (!gateClosed) {
    fail(`${referenceState} requires the downstream gate to remain closed`);
  }
  if (referenceState === "test_fixture") {
    if (HASH_BINDING_FIELDS.some((field) => parsedHashes[field] !== null) || ownerApproved) {
      fail("test_fixture cannot claim accepted downstream hashes or owner approval");
    }
  }

  const distinction = record(board.theme_distinction, "tile scene reference board.theme_distinction");
  exactKeys(distinction, ["paired_board_id", "geometry_reused", "comparison_artifact_id"], "tile scene reference board.theme_distinction");
  const pairedBoardId = matchingString(distinction.paired_board_id, BOARD_ID_RE, "theme_distinction.paired_board_id") as TileSceneReferenceBoardId;
  const boardNumber = Number(boardId.slice(-2));
  const expectedPair = `RB-${String(boardNumber % 2 === 1 ? boardNumber + 1 : boardNumber - 1).padStart(2, "0")}`;
  if (pairedBoardId !== expectedPair) fail(`theme_distinction.paired_board_id must be ${expectedPair}`);
  if (distinction.geometry_reused !== false) fail("theme_distinction.geometry_reused must be false");
  const comparisonArtifactId = matchingString(distinction.comparison_artifact_id, ID_RE, "theme_distinction.comparison_artifact_id");

  if (!Array.isArray(board.source_artifacts) || board.source_artifacts.length === 0) {
    fail("tile scene reference board.source_artifacts must contain at least one raw source");
  }
  const sources = board.source_artifacts.map((entry, index) => {
    const context = `tile scene reference board.source_artifacts[${index}]`;
    const source = record(entry, context);
    exactKeys(source, ["artifact", "generator"], context);
    const artifact = validateArtifact(source.artifact, "raw_source", `${context}.artifact`) as TileSceneReferenceArtifact & { role: "raw_source" };
    return { artifact, generator: validateGenerator(source.generator, artifact, referenceState, `${context}.generator`) };
  });

  if (!Array.isArray(board.derived_artifacts)) {
    fail("tile scene reference board.derived_artifacts must be an array");
  }
  const derived = board.derived_artifacts.map((entry, index) =>
    validateArtifact(entry, null, `tile scene reference board.derived_artifacts[${index}]`),
  );
  const requiredCounts: Readonly<Record<Exclude<TileSceneReferenceArtifactRole, "raw_source">, number>> = {
    clean_2x_target: 1,
    delivery_preview: 1,
    material_sample: 1,
    repetition_or_edge_proof: 1,
    gameplay_overlay: 1,
    cross_theme_comparison: 1,
  };
  for (const [role, minimum] of Object.entries(requiredCounts)) {
    const count = derived.filter((item) => item.role === role).length;
    const allowsMultiple = role === "material_sample" || role === "repetition_or_edge_proof";
    if (count < minimum || (!allowsMultiple && count !== minimum)) {
      fail(`derived_artifacts requires ${allowsMultiple ? "at least " : "exactly "}${minimum} ${role}`);
    }
  }

  const allArtifacts = [...sources.map((source) => source.artifact), ...derived];
  const ids = new Set<string>();
  const references = new Set<string>();
  for (const artifact of allArtifacts) {
    if (ids.has(artifact.artifact_id)) fail(`duplicate artifact id ${artifact.artifact_id}`);
    if (references.has(artifact.reference)) fail(`duplicate artifact reference ${artifact.reference}`);
    ids.add(artifact.artifact_id);
    references.add(artifact.reference);
  }
  const comparison = derived.find((artifact) => artifact.artifact_id === comparisonArtifactId);
  if (comparison?.role !== "cross_theme_comparison") {
    fail("theme_distinction.comparison_artifact_id must identify the cross_theme_comparison artifact");
  }
  const clean = derived.find((artifact) => artifact.role === "clean_2x_target")!;
  const preview = derived.find((artifact) => artifact.role === "delivery_preview")!;
  const overlay = derived.find((artifact) => artifact.role === "gameplay_overlay")!;
  if (clean.width !== preview.width * 2 || clean.height !== preview.height * 2) {
    fail("clean_2x_target dimensions must be exactly twice the delivery_preview dimensions");
  }
  if (overlay.width !== clean.width || overlay.height !== clean.height) {
    fail("gameplay_overlay dimensions must match clean_2x_target dimensions");
  }

  const downstreamBindings = {
    gate_closed: gateClosed,
    ...parsedHashes,
    owner_approval: { approved: ownerApproved, approval_id: approvalId, approval_sha256: approvalSha },
    unresolved_must_have_ids: unresolved,
  };
  return {
    contract_id: TILE_SCENE_REFERENCE_BOARD_CONTRACT,
    board_id: boardId,
    scene_family: mapping.scene_family,
    theme_profile: mapping.theme_profile,
    reference_state: referenceState,
    admission: { state: "candidate_unadmitted", shipping: false, visual_review: "pending" },
    downstream_bindings: downstreamBindings,
    theme_distinction: {
      paired_board_id: pairedBoardId,
      geometry_reused: false,
      comparison_artifact_id: comparisonArtifactId,
    },
    source_artifacts: sources,
    derived_artifacts: derived,
    board_sha256: matchingString(board.board_sha256, SHA256_RE, "tile scene reference board.board_sha256"),
  };
}

export async function validateTileSceneReferenceBoard(value: unknown): Promise<TileSceneReferenceBoard> {
  const parsed = parseBoard(value);
  const expected = await digestTileSceneReferenceBoard(value);
  if (parsed.board_sha256 !== expected) {
    fail(`tile scene reference board.board_sha256 mismatch: expected ${expected}`);
  }
  return parsed;
}

async function sha256Bytes(value: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) fail("Web Crypto SHA-256 is unavailable");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new Uint8Array(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyTileSceneReferenceBoardArtifacts(
  value: unknown,
  artifactBytes: ReadonlyMap<string, Uint8Array>,
): Promise<TileSceneReferenceBoard> {
  const board = await validateTileSceneReferenceBoard(value);
  const artifacts = [
    ...board.source_artifacts.map((source) => source.artifact),
    ...board.derived_artifacts,
  ];
  for (const artifact of artifacts) {
    const bytes = artifactBytes.get(artifact.reference);
    if (!bytes) fail(`missing artifact bytes for ${artifact.reference}`);
    if (bytes.byteLength !== artifact.byte_length) {
      fail(`byte-length drift for ${artifact.reference}`);
    }
    const actualHash = await sha256Bytes(bytes);
    if (actualHash !== artifact.sha256) {
      fail(`SHA-256 drift for ${artifact.reference}`);
    }
  }
  return board;
}
