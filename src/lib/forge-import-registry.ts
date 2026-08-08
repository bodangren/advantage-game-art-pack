import {
  type EducationAppPackMember,
} from "./education-app-pack-profile";
import {
  FORGE_INTERCHANGE_CONTRACT_ID,
} from "./forge-interchange";
import {
  FORGE_REPLAY_STAGING_CONTRACT_ID,
  digestForgeReplayStagingRegistry,
  type ForgeReplayStagedFile,
  type ForgeReplayStagedRecord,
  type StagedForgeReplayDossier,
} from "./forge-replay-admission";
import {
  CODE_OWNED_FORGE_STATIC_INTERCHANGE_ACCEPTANCE,
  validateForgeStaticInterchangeAcceptance,
  type ForgeStaticInterchangeAcceptance,
} from "./forge-static-interchange-acceptance";
import { sha256 } from "./svg-assets";

export const FORGE_DELIVERY_RESOLUTION_REVIEW_CONTRACT_ID =
  "pixel-delivery-resolution-review/v1" as const;
export const FORGE_IMPORT_REGISTRY_CONTRACT_ID =
  "pixel-forge-import-registry/v1" as const;
export const FORGE_IMPORT_ADMISSION_CONTRACT_ID =
  "pixel-forge-import-admission/v1" as const;

const SHA256_RE = /^[a-f0-9]{64}$/;
const SEMANTIC_ID_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const REVIEWED_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
type UnknownRecord = Record<string, unknown>;
type Direction = (typeof DIRECTIONS)[number];

export interface ForgeDeliveryResolutionReviewArtifact {
  readonly id: string;
  readonly direction: Direction;
  readonly sha256: string;
  readonly natural_width: 128;
  readonly natural_height: 128;
  readonly display_width: 128;
  readonly display_height: 128;
  readonly overflow: false;
  readonly verdict: "accepted" | "transport_verified";
}

export interface ForgeDeliveryResolutionReview {
  readonly contract_id: typeof FORGE_DELIVERY_RESOLUTION_REVIEW_CONTRACT_ID;
  readonly source: {
    readonly contract_id: typeof FORGE_INTERCHANGE_CONTRACT_ID;
    readonly asset_id: string;
    readonly revision_id: string;
    readonly manifest_sha256: string;
    readonly staging_registry_sha256: string;
  };
  readonly review_scope: "static_directional_frames";
  readonly status: "accepted_for_pack" | "transport_only";
  readonly reviewer: { readonly kind: "human"; readonly id: string };
  readonly reviewed_at: string;
  readonly artifacts: readonly ForgeDeliveryResolutionReviewArtifact[];
  readonly quality_debt: readonly string[];
  readonly review_sha256: string;
}

export interface ForgeImportAdmissionPending {
  readonly contract_id: typeof FORGE_IMPORT_ADMISSION_CONTRACT_ID;
  readonly status: "validated_pending_review";
  readonly source: StagedForgeReplayDossier["registry"]["source"];
  readonly staging_registry_sha256: string;
  readonly acceptance_binding_sha256: string;
  readonly delivery_review_sha256?: string;
  readonly blockers: readonly [
    | "delivery_resolution_review_evidence_missing"
    | "delivery_resolution_review_not_accepted",
  ];
}

export interface ForgeImportRegistry {
  readonly contract_id: typeof FORGE_IMPORT_REGISTRY_CONTRACT_ID;
  readonly status: "admitted_static";
  readonly source: StagedForgeReplayDossier["registry"]["source"];
  readonly staging_registry_sha256: string;
  readonly acceptance_binding_sha256: string;
  readonly delivery_review_sha256: string;
  readonly acceptance_binding: ForgeStaticInterchangeAcceptance;
  readonly delivery_review: ForgeDeliveryResolutionReview;
  readonly records: readonly ForgeReplayStagedRecord[];
  readonly verification: {
    readonly record_count: number;
    readonly object_count: number;
    readonly education_member_count: number;
    readonly object_digests_verified: true;
  };
  readonly registry_sha256: string;
}

export interface AdmittedForgeImportRegistry {
  readonly registry: ForgeImportRegistry;
  readonly files: readonly ForgeReplayStagedFile[];
  readonly registry_json: string;
  readonly education_members: readonly EducationAppPackMember[];
}

export class ForgeImportRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForgeImportRegistryError";
  }
}

function fail(message: string): never {
  throw new ForgeImportRegistryError(message);
}

function record(value: unknown, context: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${context} must be an object`);
  }
  return value as UnknownRecord;
}

function exactKeys(
  value: UnknownRecord,
  required: readonly string[],
  context: string,
): void {
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0) fail(`${context} missing required key(s): ${missing.join(", ")}`);
  const unexpected = Object.keys(value).filter((key) => !required.includes(key));
  if (unexpected.length > 0) fail(`${context} contains unexpected key(s): ${unexpected.join(", ")}`);
}

function exact(value: unknown, expected: string | number | boolean, context: string): void {
  if (value !== expected) fail(`${context} must be ${String(expected)}`);
}

function digest(value: unknown, context: string): string {
  if (typeof value !== "string" || !SHA256_RE.test(value)) {
    return fail(`${context} must be a lowercase SHA-256`);
  }
  return value;
}

function semanticId(value: unknown, context: string): string {
  if (typeof value !== "string" || !SEMANTIC_ID_RE.test(value)) {
    return fail(`${context} is invalid`);
  }
  return value;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalValue(entry)]),
  );
}

export function canonicalizeForgeDeliveryResolutionReview(value: unknown): string {
  const raw = record(value, "Forge delivery-resolution review");
  const { review_sha256: _reviewSha256, ...unsigned } = raw;
  return JSON.stringify(canonicalValue(unsigned));
}

export async function digestForgeDeliveryResolutionReview(
  value: unknown,
): Promise<string> {
  return sha256(canonicalizeForgeDeliveryResolutionReview(value));
}

function canonicalizeForgeImportRegistry(value: unknown): string {
  const raw = record(value, "Forge import registry");
  const { registry_sha256: _registrySha256, ...unsigned } = raw;
  return JSON.stringify(canonicalValue(unsigned));
}

async function digestForgeImportRegistry(value: unknown): Promise<string> {
  return sha256(canonicalizeForgeImportRegistry(value));
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const hashed = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashed), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function validateStaged(
  staged: StagedForgeReplayDossier,
): Promise<ForgeStaticInterchangeAcceptance> {
  if (staged.registry.contract_id !== FORGE_REPLAY_STAGING_CONTRACT_ID) {
    fail("staging registry contract is invalid");
  }
  if (staged.registry.status !== "validated_pending_review") {
    fail("staging registry must be validated_pending_review");
  }
  const acceptance = await validateForgeStaticInterchangeAcceptance(
    CODE_OWNED_FORGE_STATIC_INTERCHANGE_ACCEPTANCE,
  );
  if (
    staged.registry.acceptance.contract_id !== acceptance.contract_id ||
    staged.registry.acceptance.binding_sha256 !== acceptance.binding_sha256 ||
    staged.registry.acceptance.prerequisite_track !== acceptance.prerequisite_track ||
    staged.registry.acceptance.scope !== acceptance.decision.scope
  ) {
    fail("staging acceptance binding does not match the code-owned accepted binding");
  }
  const calculatedRegistryDigest = await digestForgeReplayStagingRegistry(
    staged.registry,
  );
  if (calculatedRegistryDigest !== staged.registry.registry_sha256) {
    fail("staging registry digest mismatch");
  }
  if (
    staged.registry.blockers.length !== 1 ||
    staged.registry.blockers[0] !== "delivery_resolution_review_evidence_missing"
  ) {
    fail("staging registry blockers are invalid");
  }
  if (
    staged.registry.records.length !== staged.registry.verification.record_count ||
    staged.files.length !== staged.registry.records.length
  ) {
    fail("staging record/object count mismatch");
  }
  const recordsByReference = new Map(
    staged.registry.records.map((entry) => [entry.local_reference, entry]),
  );
  if (recordsByReference.size !== staged.registry.records.length) {
    fail("staging registry contains duplicate object references");
  }
  const seenFileReferences = new Set<string>();
  for (const file of staged.files) {
    if (seenFileReferences.has(file.reference)) {
      fail(`staging files contain duplicate object reference ${file.reference}`);
    }
    seenFileReferences.add(file.reference);
    const stagedRecord = recordsByReference.get(file.reference);
    if (!stagedRecord) fail(`staging object ${file.reference} is not allowlisted`);
    if (
      stagedRecord.sha256 !== file.sha256 ||
      stagedRecord.media_type !== file.media_type ||
      stagedRecord.byte_length !== file.bytes.byteLength
    ) {
      fail(`staging object metadata mismatch for ${file.reference}`);
    }
    if ((await sha256Bytes(file.bytes)) !== file.sha256) {
      fail(`staging object digest mismatch for ${file.reference}`);
    }
  }
  for (const reference of recordsByReference.keys()) {
    if (!seenFileReferences.has(reference)) {
      fail(`staging registry object ${reference} is uncovered by staged files`);
    }
  }
  return acceptance;
}

export async function validateForgeDeliveryResolutionReview(
  value: unknown,
  staged: StagedForgeReplayDossier,
): Promise<ForgeDeliveryResolutionReview> {
  const context = "Forge delivery-resolution review";
  const raw = record(value, context);
  const fields = [
    "contract_id",
    "source",
    "review_scope",
    "status",
    "reviewer",
    "reviewed_at",
    "artifacts",
    "quality_debt",
    "review_sha256",
  ];
  exactKeys(raw, fields, context);
  exact(raw.contract_id, FORGE_DELIVERY_RESOLUTION_REVIEW_CONTRACT_ID, `${context}.contract_id`);
  exact(raw.review_scope, "static_directional_frames", `${context}.review_scope`);
  if (raw.status !== "accepted_for_pack" && raw.status !== "transport_only") {
    fail(`${context}.status must be accepted_for_pack or transport_only`);
  }
  const reviewDigest = digest(raw.review_sha256, `${context}.review_sha256`);
  const calculated = await digestForgeDeliveryResolutionReview(raw);
  if (calculated !== reviewDigest) fail(`${context}.review_sha256 digest mismatch`);

  const source = record(raw.source, `${context}.source`);
  const sourceFields = [
    "contract_id",
    "asset_id",
    "revision_id",
    "manifest_sha256",
    "staging_registry_sha256",
  ];
  exactKeys(source, sourceFields, `${context}.source`);
  exact(source.contract_id, staged.registry.source.contract_id, `${context}.source.contract_id`);
  exact(source.asset_id, staged.registry.source.asset_id, `${context}.source.asset_id`);
  exact(source.revision_id, staged.registry.source.revision_id, `${context}.source.revision_id`);
  exact(source.manifest_sha256, staged.registry.source.manifest_sha256, `${context}.source.manifest_sha256`);
  exact(source.staging_registry_sha256, staged.registry.registry_sha256, `${context}.source.staging_registry_sha256`);

  const reviewer = record(raw.reviewer, `${context}.reviewer`);
  exactKeys(reviewer, ["kind", "id"], `${context}.reviewer`);
  exact(reviewer.kind, "human", `${context}.reviewer.kind`);
  semanticId(reviewer.id, `${context}.reviewer.id`);
  if (typeof raw.reviewed_at !== "string" || !REVIEWED_AT_RE.test(raw.reviewed_at)) {
    fail(`${context}.reviewed_at must be a UTC second-resolution timestamp`);
  }

  const expectedFrames = staged.registry.records.filter(
    (entry) => entry.record_kind === "artifact" && entry.role === "directional_frame",
  );
  if (!Array.isArray(raw.artifacts) || raw.artifacts.length !== DIRECTIONS.length) {
    fail(`${context}.artifacts must contain exactly eight directional frames`);
  }
  if (expectedFrames.length !== DIRECTIONS.length) {
    fail("staging registry does not contain exactly eight directional frames");
  }
  const artifacts = raw.artifacts.map((value, index) => {
    const artifactContext = `${context}.artifacts[${index}]`;
    const artifact = record(value, artifactContext);
    const artifactFields = [
      "id",
      "direction",
      "sha256",
      "natural_width",
      "natural_height",
      "display_width",
      "display_height",
      "overflow",
      "verdict",
    ];
    exactKeys(artifact, artifactFields, artifactContext);
    const expected = expectedFrames[index]!;
    exact(artifact.id, expected.id, `${artifactContext}.id`);
    exact(artifact.direction, expected.direction!, `${artifactContext}.direction`);
    exact(artifact.sha256, expected.sha256, `${artifactContext}.sha256`);
    for (const dimension of [
      "natural_width",
      "natural_height",
      "display_width",
      "display_height",
    ]) exact(artifact[dimension], 128, `${artifactContext}.${dimension}`);
    exact(artifact.overflow, false, `${artifactContext}.overflow`);
    exact(
      artifact.verdict,
      raw.status === "accepted_for_pack" ? "accepted" : "transport_verified",
      `${artifactContext}.verdict`,
    );
    return artifact as unknown as ForgeDeliveryResolutionReviewArtifact;
  });

  if (!Array.isArray(raw.quality_debt) || raw.quality_debt.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    fail(`${context}.quality_debt must be a string array`);
  }
  if (new Set(raw.quality_debt).size !== raw.quality_debt.length) {
    fail(`${context}.quality_debt contains duplicate entries`);
  }
  if (raw.status === "accepted_for_pack" && raw.quality_debt.length !== 0) {
    fail(`${context} accepted_for_pack must not retain quality debt`);
  }
  if (raw.status === "transport_only" && raw.quality_debt.length === 0) {
    fail(`${context} transport_only must name its blocking quality debt`);
  }
  return {
    contract_id: FORGE_DELIVERY_RESOLUTION_REVIEW_CONTRACT_ID,
    source: source as unknown as ForgeDeliveryResolutionReview["source"],
    review_scope: "static_directional_frames",
    status: raw.status,
    reviewer: reviewer as unknown as ForgeDeliveryResolutionReview["reviewer"],
    reviewed_at: raw.reviewed_at,
    artifacts,
    quality_debt: raw.quality_debt as string[],
    review_sha256: reviewDigest,
  };
}

export async function prepareForgeImportAdmission(
  staged: StagedForgeReplayDossier,
  reviewValue?: unknown,
): Promise<ForgeImportAdmissionPending> {
  const acceptance = await validateStaged(staged);
  if (reviewValue === undefined) {
    return {
      contract_id: FORGE_IMPORT_ADMISSION_CONTRACT_ID,
      status: "validated_pending_review",
      source: staged.registry.source,
      staging_registry_sha256: staged.registry.registry_sha256,
      acceptance_binding_sha256: acceptance.binding_sha256,
      blockers: ["delivery_resolution_review_evidence_missing"],
    };
  }
  const review = await validateForgeDeliveryResolutionReview(reviewValue, staged);
  return {
    contract_id: FORGE_IMPORT_ADMISSION_CONTRACT_ID,
    status: "validated_pending_review",
    source: staged.registry.source,
    staging_registry_sha256: staged.registry.registry_sha256,
    acceptance_binding_sha256: acceptance.binding_sha256,
    delivery_review_sha256: review.review_sha256,
    blockers: ["delivery_resolution_review_not_accepted"],
  };
}

export function projectForgeEducationMembers(
  registry: ForgeImportRegistry,
): readonly EducationAppPackMember[] {
  return registry.records
    .filter((entry) => entry.record_kind === "artifact")
    .map((entry) => {
      if (entry.role !== "directional_frame" && entry.role !== "glb") {
        return fail(`unsupported admitted education artifact role ${String(entry.role)}`);
      }
      const base = {
        id: `forge.${registry.source.asset_id}.${entry.id}`,
        semantic_role: entry.role,
        media_type: entry.media_type,
        byte_length: entry.byte_length,
        sha256: entry.sha256,
      };
      if (entry.role === "directional_frame") {
        return {
          ...base,
          width: entry.width!,
          height: entry.height!,
          transparent: true,
          source: {
            kind: "forge" as const,
            contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
            asset_id: registry.source.asset_id,
            revision_id: registry.source.revision_id,
            manifest_sha256: registry.source.manifest_sha256,
            artifact_id: entry.id,
            artifact_sha256: entry.sha256,
            artifact_role: "directional_frame" as const,
            direction: entry.direction!,
          },
        };
      }
      return {
        ...base,
        source: {
          kind: "forge" as const,
          contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
          asset_id: registry.source.asset_id,
          revision_id: registry.source.revision_id,
          manifest_sha256: registry.source.manifest_sha256,
          artifact_id: entry.id,
          artifact_sha256: entry.sha256,
          artifact_role: "glb" as const,
        },
      };
    });
}

export async function admitForgeImportRegistry(
  staged: StagedForgeReplayDossier,
  reviewValue: unknown,
): Promise<AdmittedForgeImportRegistry> {
  const acceptance = await validateStaged(staged);
  const review = await validateForgeDeliveryResolutionReview(reviewValue, staged);
  if (review.status !== "accepted_for_pack") {
    fail("delivery-resolution review is not accepted for pack admission");
  }
  const source = structuredClone(staged.registry.source);
  const acceptanceBinding = structuredClone(acceptance);
  const deliveryReview = structuredClone(review);
  const records = structuredClone(staged.registry.records);
  const files = staged.files.map((file) => ({
    ...file,
    bytes: file.bytes.slice(),
  }));
  const unsigned = {
    contract_id: FORGE_IMPORT_REGISTRY_CONTRACT_ID,
    status: "admitted_static" as const,
    source,
    staging_registry_sha256: staged.registry.registry_sha256,
    acceptance_binding_sha256: acceptanceBinding.binding_sha256,
    delivery_review_sha256: deliveryReview.review_sha256,
    acceptance_binding: acceptanceBinding,
    delivery_review: deliveryReview,
    records,
    verification: {
      record_count: records.length,
      object_count: files.length,
      education_member_count: records.filter(
        (entry) => entry.record_kind === "artifact",
      ).length,
      object_digests_verified: true as const,
    },
  };
  const registry = {
    ...unsigned,
    registry_sha256: await digestForgeImportRegistry(unsigned),
  };
  const educationMembers = projectForgeEducationMembers(registry);
  return {
    registry,
    files,
    registry_json: `${JSON.stringify(canonicalValue(registry), null, 2)}\n`,
    education_members: educationMembers,
  };
}
