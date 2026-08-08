import { sha256 } from "./svg-assets";

export const DUAL_THEME_PACK_REQUIREMENTS_ID =
  "dual-theme-pack-requirements/v1" as const;
export const DUAL_THEME_PACK_MANIFEST_ID =
  "dual-theme-assembled-pack/v1" as const;
export const DUAL_THEME_ANIMATION_MEMBER_ID =
  "dual-theme-animation-member/v1" as const;

export const DUAL_THEME_CAPABILITY_FAMILIES = [
  "character",
  "monster",
  "equipment",
  "pose_clip",
  "tile_environment",
  "prop",
  "vfx",
  "ui",
  "presentation",
] as const;

export const DUAL_THEME_TEMPORAL_PHYSICAL_CONTRACTS = {
  "sprite.animation.pose-sheet/v1": ["pose_sheet"],
  "sprite.animation.sprite-atlas/v1": ["sprite_atlas"],
  "sprite.animation.pose-sheet-or-atlas/v1": ["pose_sheet", "sprite_atlas"],
  "sprite.animation.pose-sheet-and-atlas/v1": ["pose_sheet", "sprite_atlas"],
} as const;

type UnknownRecord = Record<string, unknown>;
export type DualThemeCapabilityFamily =
  (typeof DUAL_THEME_CAPABILITY_FAMILIES)[number];
export type DualThemeSourceOwner = "forge" | "pixel";
export type DualThemeReviewRequirement =
  | "delivery_resolution"
  | "reference_convergence";

export interface DualThemeCapabilityRequirement {
  readonly id: string;
  readonly family: DualThemeCapabilityFamily;
  readonly usage_contexts: readonly string[];
  readonly required_states: readonly string[];
  readonly required_variants: readonly string[];
  readonly physical_contract_reference: string;
  readonly source_owner: DualThemeSourceOwner;
  readonly review_requirement: DualThemeReviewRequirement;
  readonly delivery_kind: "static_artifact" | "temporal_animation";
  readonly supersedes_capability_id?: string;
}

export interface DualThemePackRequirements {
  readonly contract_id: typeof DUAL_THEME_PACK_REQUIREMENTS_ID;
  readonly program_id: string;
  readonly theme_ids: readonly [string, string];
  readonly capabilities: readonly DualThemeCapabilityRequirement[];
  readonly requirements_sha256: string;
}

export interface DualThemeArtifactIdentity {
  readonly artifact_id: string;
  readonly revision_id: string;
  readonly sha256: string;
  readonly reference: string;
}

export interface DualThemeProvenance {
  readonly source_kind: "project_generated" | "third_party";
  readonly ownership: "project_owned" | "licensed";
  readonly license_label: string;
  readonly evidence_reference: string;
  readonly source_url?: string;
}

export interface DualThemeReviewDisposition {
  readonly requirement: DualThemeReviewRequirement;
  readonly disposition: "accepted";
  readonly evidence_reference: string;
}

export interface DualThemeAnimationSourceFrame extends DualThemeArtifactIdentity {
  readonly frame_id: string;
  readonly state: string;
  readonly media_type: "image/png";
  readonly width: number;
  readonly height: number;
  readonly transparent: true;
  readonly role: "animation_frame";
}

export interface DualThemeAnimationMetadata extends DualThemeArtifactIdentity {
  readonly media_type: "application/json";
  readonly role: "clip_metadata";
}

export interface DualThemeAnimationSourceGlb extends DualThemeArtifactIdentity {
  readonly media_type: "model/gltf-binary";
  readonly role: "glb";
}

export interface DualThemeAnimationDerivedSurface extends DualThemeArtifactIdentity {
  readonly media_type: "image/png";
  readonly role: "pose_sheet" | "sprite_atlas";
  readonly width: number;
  readonly height: number;
  readonly transparent: true;
}

export interface DualThemeAnimationBinding {
  readonly contract_id: typeof DUAL_THEME_ANIMATION_MEMBER_ID;
  readonly source_frames: readonly DualThemeAnimationSourceFrame[];
  readonly source_glb: DualThemeAnimationSourceGlb;
  readonly metadata: DualThemeAnimationMetadata;
  readonly derived_surfaces: readonly DualThemeAnimationDerivedSurface[];
}

export interface DualThemePackMember {
  readonly id: string;
  readonly capability_id: string;
  readonly family: DualThemeCapabilityFamily;
  readonly usage_contexts: readonly string[];
  readonly required_states: readonly string[];
  readonly required_variants: readonly string[];
  readonly physical_contract_reference: string;
  readonly source_owner: DualThemeSourceOwner;
  readonly artifact: DualThemeArtifactIdentity;
  readonly media_type: string;
  readonly role: string;
  readonly byte_length: number;
  readonly width: number;
  readonly height: number;
  readonly transparent?: boolean;
  readonly provenance: DualThemeProvenance;
  readonly review: DualThemeReviewDisposition;
  readonly animation?: DualThemeAnimationBinding;
}

export interface DualThemeAssembledTheme {
  readonly theme_id: string;
  readonly members: readonly DualThemePackMember[];
}

export interface DualThemePackManifest {
  readonly contract_id: typeof DUAL_THEME_PACK_MANIFEST_ID;
  readonly program_id: string;
  readonly requirements: {
    readonly contract_id: typeof DUAL_THEME_PACK_REQUIREMENTS_ID;
    readonly requirements_sha256: string;
  };
  readonly themes: readonly [DualThemeAssembledTheme, DualThemeAssembledTheme];
  readonly manifest_sha256: string;
}

export class DualThemePackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualThemePackValidationError";
  }
}

const SHA256_RE = /^[a-f0-9]{64}$/;
const REVISION_RE = /^revision\.[a-f0-9]{64}$/;
const SEMANTIC_ID_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const CONTRACT_ID_RE = /^[a-z][a-z0-9._-]*(?:\/v[1-9][0-9]*)$/;
const MEDIA_TYPE_RE = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/;
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

function fail(message: string): never {
  throw new DualThemePackValidationError(message);
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
  allowed: readonly string[],
  context: string,
): void {
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0) {
    fail(`${context} missing required key(s): ${missing.join(", ")}`);
  }
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    fail(`${context} contains unexpected key(s): ${unexpected.join(", ")}`);
  }
}

function exact(value: unknown, expected: string, context: string): string {
  if (value !== expected) fail(`${context} must be ${expected}`);
  return expected;
}

function exactTrue(value: unknown, context: string): true {
  if (value !== true) fail(`${context} must be true`);
  return true;
}

function matching(value: unknown, pattern: RegExp, context: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    return fail(`${context} is invalid`);
  }
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

function positiveInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return fail(`${context} must be a positive safe integer`);
  }
  return value;
}

function nonemptyString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    return fail(`${context} must be a non-empty string of at most 200 characters`);
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
    value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    return fail(`${context} must be a portable relative reference`);
  }
  return value;
}

function httpsUrl(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length > 2_048) {
    return fail(`${context} must be an HTTPS URL`);
  }
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname.length === 0 ||
      url.username !== "" ||
      url.password !== ""
    ) {
      return fail(`${context} must be an HTTPS URL without credentials`);
    }
  } catch {
    return fail(`${context} must be an HTTPS URL`);
  }
  return value;
}

function orderedUniqueStrings(
  value: unknown,
  context: string,
  options: { allowEmpty?: boolean; pattern?: RegExp } = {},
): readonly string[] {
  if (!Array.isArray(value) || (!options.allowEmpty && value.length === 0)) {
    return fail(`${context} must be ${options.allowEmpty ? "an" : "a non-empty"} array`);
  }
  const pattern = options.pattern ?? SEMANTIC_ID_RE;
  const parsed = value.map((entry, index) =>
    matching(entry, pattern, `${context}[${index}]`),
  );
  const seen = new Set<string>();
  for (const entry of parsed) {
    if (seen.has(entry)) fail(`${context} contains duplicate entry ${entry}`);
    seen.add(entry);
  }
  const sorted = [...parsed].sort(compareCanonicalStrings);
  if (parsed.some((entry, index) => entry !== sorted[index])) {
    fail(`${context} must use canonical lexicographic ordering`);
  }
  return parsed;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function compareCanonicalStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalValue(value: unknown, context: string): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${context} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => canonicalValue(entry, `${context}[${index}]`));
  }
  if (typeof value !== "object") return fail(`${context} contains a non-JSON value`);
  const input = value as UnknownRecord;
  return Object.fromEntries(
    Object.keys(input)
      .sort()
      .map((key) => {
        if (input[key] === undefined) fail(`${context}.${key} is undefined`);
        return [key, canonicalValue(input[key], `${context}.${key}`)];
      }),
  );
}

function canonicalizeWithout(value: unknown, excludedKey: string, context: string): string {
  const input = record(value, context);
  const unsigned = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== excludedKey),
  );
  return JSON.stringify(canonicalValue(unsigned, context));
}

export function canonicalizeDualThemePackRequirements(value: unknown): string {
  return canonicalizeWithout(
    value,
    "requirements_sha256",
    "dual-theme pack requirements",
  );
}

export async function digestDualThemePackRequirements(value: unknown): Promise<string> {
  return sha256(canonicalizeDualThemePackRequirements(value));
}

export function canonicalizeDualThemePackManifest(value: unknown): string {
  return canonicalizeWithout(value, "manifest_sha256", "dual-theme pack manifest");
}

export async function digestDualThemePackManifest(value: unknown): Promise<string> {
  return sha256(canonicalizeDualThemePackManifest(value));
}

function parseCapability(value: unknown, index: number): DualThemeCapabilityRequirement {
  const context = `requirements.capabilities[${index}]`;
  const raw = record(value, context);
  const required = [
    "id",
    "family",
    "usage_contexts",
    "required_states",
    "required_variants",
    "physical_contract_reference",
    "source_owner",
    "review_requirement",
    "delivery_kind",
  ];
  exactKeys(raw, required, [...required, "supersedes_capability_id"], context);
  const id = matching(raw.id, SEMANTIC_ID_RE, `${context}.id`);
  const family = member(raw.family, DUAL_THEME_CAPABILITY_FAMILIES, `${context}.family`);
  const deliveryKind = member(
    raw.delivery_kind,
    ["static_artifact", "temporal_animation"] as const,
    `${context}.delivery_kind`,
  );
  if (deliveryKind === "temporal_animation" && family !== "pose_clip") {
    fail(`${context} temporal_animation is only valid for pose_clip capabilities`);
  }
  const usageContexts = orderedUniqueStrings(raw.usage_contexts, `${context}.usage_contexts`);
  const requiredStates = orderedUniqueStrings(raw.required_states, `${context}.required_states`, {
    allowEmpty: true,
  });
  const requiredVariants = orderedUniqueStrings(
    raw.required_variants,
    `${context}.required_variants`,
    { allowEmpty: true },
  );
  if (deliveryKind === "temporal_animation" && requiredStates.length === 0) {
    fail(`${context} temporal_animation requires at least one declared state`);
  }
  const physicalContractReference = matching(
    raw.physical_contract_reference,
    CONTRACT_ID_RE,
    `${context}.physical_contract_reference`,
  );
  if (
    deliveryKind === "temporal_animation" &&
    !(physicalContractReference in DUAL_THEME_TEMPORAL_PHYSICAL_CONTRACTS)
  ) {
    fail(`${context}.physical_contract_reference is not a supported temporal contract`);
  }
  const supersedes =
    raw.supersedes_capability_id === undefined
      ? undefined
      : matching(
          raw.supersedes_capability_id,
          SEMANTIC_ID_RE,
          `${context}.supersedes_capability_id`,
        );
  if (supersedes === id) fail(`${context} cannot supersede itself`);
  return {
    id,
    family,
    usage_contexts: usageContexts,
    required_states: requiredStates,
    required_variants: requiredVariants,
    physical_contract_reference: physicalContractReference,
    source_owner: member(raw.source_owner, ["forge", "pixel"] as const, `${context}.source_owner`),
    review_requirement: member(
      raw.review_requirement,
      ["delivery_resolution", "reference_convergence"] as const,
      `${context}.review_requirement`,
    ),
    delivery_kind: deliveryKind,
    ...(supersedes === undefined ? {} : { supersedes_capability_id: supersedes }),
  };
}

function parseRequirementsShape(value: unknown): DualThemePackRequirements {
  const context = "dual-theme pack requirements";
  const raw = record(value, context);
  const fields = [
    "contract_id",
    "program_id",
    "theme_ids",
    "capabilities",
    "requirements_sha256",
  ];
  exactKeys(raw, fields, fields, context);
  exact(raw.contract_id, DUAL_THEME_PACK_REQUIREMENTS_ID, `${context}.contract_id`);
  if (!Array.isArray(raw.theme_ids) || raw.theme_ids.length !== 2) {
    fail(`${context}.theme_ids must contain exactly two mirrored themes`);
  }
  const themeIds = orderedUniqueStrings(raw.theme_ids, `${context}.theme_ids`);
  if (!Array.isArray(raw.capabilities) || raw.capabilities.length === 0) {
    fail(`${context}.capabilities must be a non-empty array`);
  }
  const capabilities = raw.capabilities.map(parseCapability);
  const capabilityIds = new Set<string>();
  for (const [index, capability] of capabilities.entries()) {
    if (capabilityIds.has(capability.id)) {
      fail(`${context}.capabilities contains duplicate id ${capability.id}`);
    }
    capabilityIds.add(capability.id);
    if (index > 0 && compareCanonicalStrings(capabilities[index - 1]!.id, capability.id) >= 0) {
      fail(`${context}.capabilities must use canonical capability-id ordering`);
    }
  }
  for (const family of DUAL_THEME_CAPABILITY_FAMILIES) {
    if (!capabilities.some((capability) => capability.family === family)) {
      fail(`${context}.capabilities missing required family ${family}`);
    }
  }
  return {
    contract_id: DUAL_THEME_PACK_REQUIREMENTS_ID,
    program_id: matching(raw.program_id, SEMANTIC_ID_RE, `${context}.program_id`),
    theme_ids: themeIds as unknown as readonly [string, string],
    capabilities,
    requirements_sha256: matching(
      raw.requirements_sha256,
      SHA256_RE,
      `${context}.requirements_sha256`,
    ),
  };
}

export async function validateDualThemePackRequirements(
  value: unknown,
): Promise<DualThemePackRequirements> {
  const parsed = parseRequirementsShape(value);
  if ((await digestDualThemePackRequirements(parsed)) !== parsed.requirements_sha256) {
    fail("dual-theme pack requirements.requirements_sha256 mismatch");
  }
  return parsed;
}

function parseArtifactIdentity(value: unknown, context: string): DualThemeArtifactIdentity {
  const raw = record(value, context);
  const fields = ["artifact_id", "revision_id", "sha256", "reference"];
  exactKeys(raw, fields, fields, context);
  return {
    artifact_id: matching(raw.artifact_id, SEMANTIC_ID_RE, `${context}.artifact_id`),
    revision_id: matching(raw.revision_id, REVISION_RE, `${context}.revision_id`),
    sha256: matching(raw.sha256, SHA256_RE, `${context}.sha256`),
    reference: portableReference(raw.reference, `${context}.reference`),
  };
}

function parseProvenance(
  value: unknown,
  sourceOwner: DualThemeSourceOwner,
  context: string,
): DualThemeProvenance {
  const raw = record(value, context);
  const required = ["source_kind", "ownership", "license_label", "evidence_reference"];
  exactKeys(raw, required, [...required, "source_url"], context);
  const sourceKind = member(
    raw.source_kind,
    ["project_generated", "third_party"] as const,
    `${context}.source_kind`,
  );
  const ownership = member(
    raw.ownership,
    ["project_owned", "licensed"] as const,
    `${context}.ownership`,
  );
  if (sourceKind === "project_generated" && ownership !== "project_owned") {
    fail(`${context} project_generated provenance must be project_owned`);
  }
  if (sourceKind === "third_party" && ownership !== "licensed") {
    fail(`${context} third_party provenance must be licensed`);
  }
  if (sourceOwner === "forge" && (sourceKind !== "project_generated" || ownership !== "project_owned")) {
    fail(`${context} Forge source ownership must be project_generated and project_owned`);
  }
  if (sourceKind === "third_party" && raw.source_url === undefined) {
    fail(`${context} third_party provenance requires source_url`);
  }
  if (sourceKind === "project_generated" && raw.source_url !== undefined) {
    fail(`${context} project_generated provenance must not declare source_url`);
  }
  return {
    source_kind: sourceKind,
    ownership,
    license_label: nonemptyString(raw.license_label, `${context}.license_label`),
    evidence_reference: portableReference(
      raw.evidence_reference,
      `${context}.evidence_reference`,
    ),
    ...(raw.source_url === undefined
      ? {}
      : { source_url: httpsUrl(raw.source_url, `${context}.source_url`) }),
  };
}

function parseReview(value: unknown, context: string): DualThemeReviewDisposition {
  const raw = record(value, context);
  const fields = ["requirement", "disposition", "evidence_reference"];
  exactKeys(raw, fields, fields, context);
  return {
    requirement: member(
      raw.requirement,
      ["delivery_resolution", "reference_convergence"] as const,
      `${context}.requirement`,
    ),
    disposition: exact(raw.disposition, "accepted", `${context}.disposition`) as "accepted",
    evidence_reference: portableReference(
      raw.evidence_reference,
      `${context}.evidence_reference`,
    ),
  };
}

function parseAnimation(
  value: unknown,
  parentArtifact: DualThemeArtifactIdentity,
  requiredStates: readonly string[],
  physicalContractReference: string,
  context: string,
): DualThemeAnimationBinding {
  const raw = record(value, context);
  const fields = ["contract_id", "source_frames", "source_glb", "metadata", "derived_surfaces"];
  exactKeys(raw, fields, fields, context);
  exact(raw.contract_id, DUAL_THEME_ANIMATION_MEMBER_ID, `${context}.contract_id`);
  if (!Array.isArray(raw.source_frames) || raw.source_frames.length < 2) {
    fail(`${context}.source_frames must contain at least two ordered source frames`);
  }
  const seenFrameIds = new Set<string>();
  const seenArtifactIds = new Set<string>();
  const seenReferences = new Set<string>();
  const sourceFrames = raw.source_frames.map((value, index) => {
    const frameContext = `${context}.source_frames[${index}]`;
    const frame = record(value, frameContext);
    const fields = [
      "frame_id",
      "state",
      "artifact_id",
      "revision_id",
      "sha256",
      "reference",
      "media_type",
      "width",
      "height",
      "transparent",
      "role",
    ];
    exactKeys(frame, fields, fields, frameContext);
    const identity = parseArtifactIdentity(
      {
        artifact_id: frame.artifact_id,
        revision_id: frame.revision_id,
        sha256: frame.sha256,
        reference: frame.reference,
      },
      frameContext,
    );
    const frameId = matching(frame.frame_id, SEMANTIC_ID_RE, `${frameContext}.frame_id`);
    const state = matching(frame.state, SEMANTIC_ID_RE, `${frameContext}.state`);
    if (!requiredStates.includes(state)) {
      fail(`${frameContext}.state is not declared by the capability contract`);
    }
    if (identity.revision_id !== parentArtifact.revision_id) {
      fail(`${frameContext}.revision_id must match the member artifact revision`);
    }
    if (
      identity.artifact_id === parentArtifact.artifact_id ||
      identity.reference === parentArtifact.reference
    ) {
      fail(`${frameContext} must be an independent source-frame artifact`);
    }
    if (seenFrameIds.has(frameId)) fail(`${context} contains duplicate frame_id ${frameId}`);
    if (seenArtifactIds.has(identity.artifact_id)) {
      fail(`${context} contains duplicate source-frame artifact_id ${identity.artifact_id}`);
    }
    if (seenReferences.has(identity.reference)) {
      fail(`${context} contains duplicate source-frame reference ${identity.reference}`);
    }
    seenFrameIds.add(frameId);
    seenArtifactIds.add(identity.artifact_id);
    seenReferences.add(identity.reference);
    return {
      frame_id: frameId,
      state,
      ...identity,
      media_type: exact(frame.media_type, "image/png", `${frameContext}.media_type`) as "image/png",
      width: positiveInteger(frame.width, `${frameContext}.width`),
      height: positiveInteger(frame.height, `${frameContext}.height`),
      transparent: exactTrue(frame.transparent, `${frameContext}.transparent`),
      role: exact(frame.role, "animation_frame", `${frameContext}.role`) as "animation_frame",
    };
  });
  for (const state of requiredStates) {
    if (!sourceFrames.some((frame) => frame.state === state)) {
      fail(`${context}.source_frames missing required state ${state}`);
    }
  }
  const metadataRaw = record(raw.metadata, `${context}.metadata`);
  const metadataFields = [
    "artifact_id",
    "revision_id",
    "sha256",
    "reference",
    "media_type",
    "role",
  ];
  exactKeys(metadataRaw, metadataFields, metadataFields, `${context}.metadata`);
  const metadataIdentity = parseArtifactIdentity(
    {
      artifact_id: metadataRaw.artifact_id,
      revision_id: metadataRaw.revision_id,
      sha256: metadataRaw.sha256,
      reference: metadataRaw.reference,
    },
    `${context}.metadata`,
  );
  const metadata = {
    ...metadataIdentity,
    media_type: exact(metadataRaw.media_type, "application/json", `${context}.metadata.media_type`) as "application/json",
    role: exact(metadataRaw.role, "clip_metadata", `${context}.metadata.role`) as "clip_metadata",
  };
  if (metadata.revision_id !== parentArtifact.revision_id) {
    fail(`${context}.metadata.revision_id must match the member artifact revision`);
  }
  if (
    metadata.artifact_id === parentArtifact.artifact_id ||
    seenArtifactIds.has(metadata.artifact_id) ||
    metadata.reference === parentArtifact.reference ||
    seenReferences.has(metadata.reference)
  ) {
    fail(`${context}.metadata must be an independent manifest artifact`);
  }

  const sourceGlbRaw = record(raw.source_glb, `${context}.source_glb`);
  const sourceGlbFields = [
    "artifact_id",
    "revision_id",
    "sha256",
    "reference",
    "media_type",
    "role",
  ];
  exactKeys(sourceGlbRaw, sourceGlbFields, sourceGlbFields, `${context}.source_glb`);
  const sourceGlbIdentity = parseArtifactIdentity(
    {
      artifact_id: sourceGlbRaw.artifact_id,
      revision_id: sourceGlbRaw.revision_id,
      sha256: sourceGlbRaw.sha256,
      reference: sourceGlbRaw.reference,
    },
    `${context}.source_glb`,
  );
  const sourceGlb = {
    ...sourceGlbIdentity,
    media_type: exact(
      sourceGlbRaw.media_type,
      "model/gltf-binary",
      `${context}.source_glb.media_type`,
    ) as "model/gltf-binary",
    role: exact(sourceGlbRaw.role, "glb", `${context}.source_glb.role`) as "glb",
  };
  if (sourceGlb.revision_id !== parentArtifact.revision_id) {
    fail(`${context}.source_glb.revision_id must match the member artifact revision`);
  }
  if (
    sourceGlb.artifact_id === parentArtifact.artifact_id ||
    sourceGlb.artifact_id === metadata.artifact_id ||
    seenArtifactIds.has(sourceGlb.artifact_id) ||
    sourceGlb.reference === parentArtifact.reference ||
    sourceGlb.reference === metadata.reference ||
    seenReferences.has(sourceGlb.reference)
  ) {
    fail(`${context}.source_glb must be an independent source artifact`);
  }

  if (!Array.isArray(raw.derived_surfaces) || raw.derived_surfaces.length === 0) {
    fail(`${context}.derived_surfaces must contain at least one Forge-derived PNG`);
  }
  const allowedRoles = DUAL_THEME_TEMPORAL_PHYSICAL_CONTRACTS[
    physicalContractReference as keyof typeof DUAL_THEME_TEMPORAL_PHYSICAL_CONTRACTS
  ];
  if (allowedRoles === undefined) {
    fail(`${context} uses an unsupported temporal physical contract`);
  }
  const seenDerivedIds = new Set<string>();
  const seenDerivedReferences = new Set<string>();
  const derivedSurfaces = raw.derived_surfaces.map((value, index) => {
    const surfaceContext = `${context}.derived_surfaces[${index}]`;
    const surface = record(value, surfaceContext);
    const surfaceFields = [
      "artifact_id",
      "revision_id",
      "sha256",
      "reference",
      "media_type",
      "role",
      "width",
      "height",
      "transparent",
    ];
    exactKeys(surface, surfaceFields, surfaceFields, surfaceContext);
    const identity = parseArtifactIdentity(
      {
        artifact_id: surface.artifact_id,
        revision_id: surface.revision_id,
        sha256: surface.sha256,
        reference: surface.reference,
      },
      surfaceContext,
    );
    const role = member(
      surface.role,
      ["pose_sheet", "sprite_atlas"] as const,
      `${surfaceContext}.role`,
    );
    if (!(allowedRoles as readonly string[]).includes(role)) {
      fail(`${surfaceContext}.role is forbidden by ${physicalContractReference}`);
    }
    if (identity.revision_id !== parentArtifact.revision_id) {
      fail(`${surfaceContext}.revision_id must match the member artifact revision`);
    }
    if (
      seenDerivedIds.has(identity.artifact_id) ||
      seenDerivedReferences.has(identity.reference) ||
      identity.artifact_id === metadata.artifact_id ||
      identity.artifact_id === sourceGlb.artifact_id ||
      seenArtifactIds.has(identity.artifact_id) ||
      identity.reference === metadata.reference ||
      identity.reference === sourceGlb.reference ||
      seenReferences.has(identity.reference)
    ) {
      fail(`${surfaceContext} must have an independent derived artifact identity`);
    }
    seenDerivedIds.add(identity.artifact_id);
    seenDerivedReferences.add(identity.reference);
    return {
      ...identity,
      media_type: exact(surface.media_type, "image/png", `${surfaceContext}.media_type`) as "image/png",
      role,
      width: positiveInteger(surface.width, `${surfaceContext}.width`),
      height: positiveInteger(surface.height, `${surfaceContext}.height`),
      transparent: exactTrue(surface.transparent, `${surfaceContext}.transparent`),
    };
  });
  const derivedOrder = derivedSurfaces.map(({ role, artifact_id }) => `${role}:${artifact_id}`);
  const canonicalDerivedOrder = [...derivedOrder].sort(compareCanonicalStrings);
  if (!sameStrings(derivedOrder, canonicalDerivedOrder)) {
    fail(`${context}.derived_surfaces must use canonical role/artifact ordering`);
  }
  if (
    physicalContractReference === "sprite.animation.pose-sheet-and-atlas/v1" &&
    (!derivedSurfaces.some(({ role }) => role === "pose_sheet") ||
      !derivedSurfaces.some(({ role }) => role === "sprite_atlas"))
  ) {
    fail(`${context}.derived_surfaces requires both pose_sheet and sprite_atlas`);
  }
  return {
    contract_id: DUAL_THEME_ANIMATION_MEMBER_ID,
    source_frames: sourceFrames,
    source_glb: sourceGlb,
    metadata,
    derived_surfaces: derivedSurfaces,
  };
}

function parseMember(
  value: unknown,
  index: number,
  capability: DualThemeCapabilityRequirement,
): DualThemePackMember {
  const context = `theme.members[${index}]`;
  const raw = record(value, context);
  const required = [
    "id",
    "capability_id",
    "family",
    "usage_contexts",
    "required_states",
    "required_variants",
    "physical_contract_reference",
    "source_owner",
    "artifact",
    "media_type",
    "role",
    "byte_length",
    "width",
    "height",
    "provenance",
    "review",
  ];
  exactKeys(raw, required, [...required, "transparent", "animation"], context);
  const usageContexts = orderedUniqueStrings(raw.usage_contexts, `${context}.usage_contexts`);
  const requiredStates = orderedUniqueStrings(raw.required_states, `${context}.required_states`, {
    allowEmpty: true,
  });
  const requiredVariants = orderedUniqueStrings(
    raw.required_variants,
    `${context}.required_variants`,
    { allowEmpty: true },
  );
  const family = member(raw.family, DUAL_THEME_CAPABILITY_FAMILIES, `${context}.family`);
  const sourceOwner = member(raw.source_owner, ["forge", "pixel"] as const, `${context}.source_owner`);
  const physicalContractReference = matching(
    raw.physical_contract_reference,
    CONTRACT_ID_RE,
    `${context}.physical_contract_reference`,
  );
  if (raw.capability_id !== capability.id) fail(`${context}.capability_id mismatch`);
  if (family !== capability.family) fail(`${context}.family mismatch for capability ${capability.id}`);
  if (!sameStrings(usageContexts, capability.usage_contexts)) {
    fail(`${context}.usage_contexts mismatch for capability ${capability.id}`);
  }
  if (!sameStrings(requiredStates, capability.required_states)) {
    fail(`${context}.required_states mismatch for capability ${capability.id}`);
  }
  if (!sameStrings(requiredVariants, capability.required_variants)) {
    fail(`${context}.required_variants mismatch for capability ${capability.id}`);
  }
  if (physicalContractReference !== capability.physical_contract_reference) {
    fail(`${context}.physical_contract_reference mismatch for capability ${capability.id}`);
  }
  if (sourceOwner !== capability.source_owner) {
    fail(`${context}.source_owner mismatch for capability ${capability.id}`);
  }
  const artifact = parseArtifactIdentity(raw.artifact, `${context}.artifact`);
  const review = parseReview(raw.review, `${context}.review`);
  if (review.requirement !== capability.review_requirement) {
    fail(`${context}.review requirement mismatch for capability ${capability.id}`);
  }
  const animation =
    raw.animation === undefined
      ? undefined
      : parseAnimation(
          raw.animation,
          artifact,
          requiredStates,
          physicalContractReference,
          `${context}.animation`,
        );
  if (capability.delivery_kind === "temporal_animation" && animation === undefined) {
    fail(`${context}.animation is required for temporal capability ${capability.id}`);
  }
  if (capability.delivery_kind === "static_artifact" && animation !== undefined) {
    fail(`${context}.animation is forbidden for static capability ${capability.id}`);
  }
  if (capability.delivery_kind === "temporal_animation" && animation !== undefined) {
    const primary = animation.derived_surfaces[0]!;
    if (
      raw.media_type !== primary.media_type ||
      raw.role !== primary.role ||
      raw.width !== primary.width ||
      raw.height !== primary.height ||
      raw.transparent !== true ||
      artifact.artifact_id !== primary.artifact_id ||
      artifact.revision_id !== primary.revision_id ||
      artifact.sha256 !== primary.sha256 ||
      artifact.reference !== primary.reference
    ) {
      fail(
        `${context} temporal primary artifact must exactly bind the first transparent derived surface`,
      );
    }
  }
  if (raw.transparent !== undefined && typeof raw.transparent !== "boolean") {
    fail(`${context}.transparent must be a boolean`);
  }
  return {
    id: matching(raw.id, SEMANTIC_ID_RE, `${context}.id`),
    capability_id: capability.id,
    family,
    usage_contexts: usageContexts,
    required_states: requiredStates,
    required_variants: requiredVariants,
    physical_contract_reference: physicalContractReference,
    source_owner: sourceOwner,
    artifact,
    media_type: matching(raw.media_type, MEDIA_TYPE_RE, `${context}.media_type`),
    role: matching(raw.role, SEMANTIC_ID_RE, `${context}.role`),
    byte_length: positiveInteger(raw.byte_length, `${context}.byte_length`),
    width: positiveInteger(raw.width, `${context}.width`),
    height: positiveInteger(raw.height, `${context}.height`),
    ...(raw.transparent === undefined ? {} : { transparent: raw.transparent }),
    provenance: parseProvenance(raw.provenance, sourceOwner, `${context}.provenance`),
    review,
    ...(animation === undefined ? {} : { animation }),
  };
}

function parseManifestShape(
  value: unknown,
  requirements: DualThemePackRequirements,
): DualThemePackManifest {
  const context = "dual-theme pack manifest";
  const raw = record(value, context);
  const fields = [
    "contract_id",
    "program_id",
    "requirements",
    "themes",
    "manifest_sha256",
  ];
  exactKeys(raw, fields, fields, context);
  exact(raw.contract_id, DUAL_THEME_PACK_MANIFEST_ID, `${context}.contract_id`);
  exact(raw.program_id, requirements.program_id, `${context}.program_id`);
  const requirementBinding = record(raw.requirements, `${context}.requirements`);
  exactKeys(
    requirementBinding,
    ["contract_id", "requirements_sha256"],
    ["contract_id", "requirements_sha256"],
    `${context}.requirements`,
  );
  exact(
    requirementBinding.contract_id,
    DUAL_THEME_PACK_REQUIREMENTS_ID,
    `${context}.requirements.contract_id`,
  );
  exact(
    requirementBinding.requirements_sha256,
    requirements.requirements_sha256,
    `${context}.requirements.requirements_sha256`,
  );
  if (!Array.isArray(raw.themes) || raw.themes.length !== 2) {
    fail(`${context}.themes must contain exactly two mirrored themes`);
  }
  const globalMemberIds = new Set<string>();
  const globalArtifactKeys = new Set<string>();
  const themes = raw.themes.map((value, themeIndex) => {
    const themeContext = `${context}.themes[${themeIndex}]`;
    const theme = record(value, themeContext);
    exactKeys(theme, ["theme_id", "members"], ["theme_id", "members"], themeContext);
    const expectedThemeId = requirements.theme_ids[themeIndex]!;
    exact(theme.theme_id, expectedThemeId, `${themeContext}.theme_id`);
    if (!Array.isArray(theme.members)) fail(`${themeContext}.members must be an array`);
    if (theme.members.length !== requirements.capabilities.length) {
      fail(`${themeContext}.members missing mirrored capability coverage`);
    }
    const members = theme.members.map((memberValue, memberIndex) => {
      const rawMember = record(memberValue, `${themeContext}.members[${memberIndex}]`);
      const expectedCapability = requirements.capabilities[memberIndex]!;
      if (rawMember.capability_id !== expectedCapability.id) {
        fail(`${themeContext}.members must use canonical capability-id ordering`);
      }
      const parsed = parseMember(memberValue, memberIndex, expectedCapability);
      if (globalMemberIds.has(parsed.id)) fail(`${context} contains duplicate member id ${parsed.id}`);
      globalMemberIds.add(parsed.id);
      const artifactKey = `${parsed.artifact.revision_id}:${parsed.artifact.artifact_id}`;
      if (globalArtifactKeys.has(artifactKey)) {
        fail(`${context} contains duplicate artifact identity ${artifactKey}`);
      }
      globalArtifactKeys.add(artifactKey);
      return parsed;
    });
    return { theme_id: expectedThemeId, members };
  });
  return {
    contract_id: DUAL_THEME_PACK_MANIFEST_ID,
    program_id: requirements.program_id,
    requirements: {
      contract_id: DUAL_THEME_PACK_REQUIREMENTS_ID,
      requirements_sha256: requirements.requirements_sha256,
    },
    themes: themes as unknown as readonly [DualThemeAssembledTheme, DualThemeAssembledTheme],
    manifest_sha256: matching(raw.manifest_sha256, SHA256_RE, `${context}.manifest_sha256`),
  };
}

export async function validateDualThemePackManifest(
  value: unknown,
  requirementsValue: unknown,
): Promise<DualThemePackManifest> {
  const requirements = await validateDualThemePackRequirements(requirementsValue);
  const parsed = parseManifestShape(value, requirements);
  if ((await digestDualThemePackManifest(parsed)) !== parsed.manifest_sha256) {
    fail("dual-theme pack manifest.manifest_sha256 mismatch");
  }
  return parsed;
}

export const DUAL_THEME_PACK_REQUIREMENTS_V2_ID =
  "dual-theme-pack-requirements/v2" as const;

const REQUIRED_EXECUTION_KIND_BY_FAMILY = {
  presentation: "crop_focal_derivation",
  tile_environment: "tiling_adjacency",
  ui: "nine_slice_text_safe_area",
} as const;

export interface DualThemeUsageDemandV2 {
  readonly usage_context: string;
  readonly basis: "observed_unaccepted" | "authored_requirement";
  readonly evidence_reference: string;
}

export interface DualThemeTemporalRequirementV2 {
  readonly media_class: "visual" | "audio";
  readonly signature_contract_reference: string;
  readonly signature_reference: string;
  readonly signature_sha256: string;
  readonly required_states: readonly string[];
}

export interface DualThemeExecutionContractV2 {
  readonly kind: string;
  readonly contract_reference: string;
  readonly evidence_reference: string;
}

export interface DualThemeCapabilityRequirementV2 {
  readonly id: string;
  readonly family: string;
  readonly usage_demands: readonly DualThemeUsageDemandV2[];
  readonly required_states: readonly string[];
  readonly required_variants: readonly string[];
  readonly physical_contract_reference: string;
  readonly source_owner: DualThemeSourceOwner;
  readonly review_requirement: DualThemeReviewRequirement;
  readonly delivery_kind: "static_artifact" | "temporal_artifact";
  readonly media_class: "visual" | "audio";
  readonly execution_contracts: readonly DualThemeExecutionContractV2[];
  readonly demand_reference: string;
  readonly temporal_requirement?: DualThemeTemporalRequirementV2;
  readonly supersedes_capability_id?: string;
}

export interface DualThemePackRequirementsV2 {
  readonly contract_id: typeof DUAL_THEME_PACK_REQUIREMENTS_V2_ID;
  readonly program_id: string;
  readonly theme_ids: readonly [string, string];
  readonly capabilities: readonly DualThemeCapabilityRequirementV2[];
  readonly requirements_sha256: string;
}

export function canonicalizeDualThemePackRequirementsV2(value: unknown): string {
  return canonicalizeWithout(
    value,
    "requirements_sha256",
    "dual-theme pack requirements v2",
  );
}

export async function digestDualThemePackRequirementsV2(
  value: unknown,
): Promise<string> {
  return sha256(canonicalizeDualThemePackRequirementsV2(value));
}

function parseUsageDemandV2(
  value: unknown,
  capabilityIndex: number,
  usageIndex: number,
): DualThemeUsageDemandV2 {
  const context =
    `requirements v2.capabilities[${capabilityIndex}].usage_demands[${usageIndex}]`;
  const raw = record(value, context);
  const fields = ["usage_context", "basis", "evidence_reference"];
  exactKeys(raw, fields, fields, context);
  const basis = member(
    raw.basis,
    ["observed_unaccepted", "authored_requirement"] as const,
    `${context}.basis`,
  );
  const evidenceReference = portableReference(
    raw.evidence_reference,
    `${context}.evidence_reference`,
  );
  const expectedPrefix =
    basis === "observed_unaccepted" ? "observations/" : "requirements/";
  if (!evidenceReference.startsWith(expectedPrefix)) {
    fail(`${context}.evidence_reference must start with ${expectedPrefix} for ${basis}`);
  }
  return {
    usage_context: matching(raw.usage_context, SEMANTIC_ID_RE, `${context}.usage_context`),
    basis,
    evidence_reference: evidenceReference,
  };
}

function parseExecutionContractV2(
  value: unknown,
  capabilityIndex: number,
  executionIndex: number,
): DualThemeExecutionContractV2 {
  const context =
    `requirements v2.capabilities[${capabilityIndex}].execution_contracts[${executionIndex}]`;
  const raw = record(value, context);
  const fields = ["kind", "contract_reference", "evidence_reference"];
  exactKeys(raw, fields, fields, context);
  return {
    kind: matching(raw.kind, SEMANTIC_ID_RE, `${context}.kind`),
    contract_reference: matching(
      raw.contract_reference,
      CONTRACT_ID_RE,
      `${context}.contract_reference`,
    ),
    evidence_reference: portableReference(
      raw.evidence_reference,
      `${context}.evidence_reference`,
    ),
  };
}

function parseTemporalRequirementV2(
  value: unknown,
  capabilityIndex: number,
): DualThemeTemporalRequirementV2 {
  const context = `requirements v2.capabilities[${capabilityIndex}].temporal_requirement`;
  const raw = record(value, context);
  const fields = [
    "media_class",
    "signature_contract_reference",
    "signature_reference",
    "signature_sha256",
    "required_states",
  ];
  exactKeys(raw, fields, fields, context);
  return {
    media_class: member(raw.media_class, ["visual", "audio"] as const, `${context}.media_class`),
    signature_contract_reference: matching(
      raw.signature_contract_reference,
      CONTRACT_ID_RE,
      `${context}.signature_contract_reference`,
    ),
    signature_reference: portableReference(
      raw.signature_reference,
      `${context}.signature_reference`,
    ),
    signature_sha256: matching(
      raw.signature_sha256,
      SHA256_RE,
      `${context}.signature_sha256`,
    ),
    required_states: orderedUniqueStrings(
      raw.required_states,
      `${context}.required_states`,
      { allowEmpty: true },
    ),
  };
}

function parseCapabilityV2(
  value: unknown,
  index: number,
): DualThemeCapabilityRequirementV2 {
  const context = `requirements v2.capabilities[${index}]`;
  const raw = record(value, context);
  const required = [
    "id",
    "family",
    "usage_demands",
    "required_states",
    "required_variants",
    "physical_contract_reference",
    "source_owner",
    "review_requirement",
    "delivery_kind",
    "media_class",
    "execution_contracts",
    "demand_reference",
  ];
  exactKeys(
    raw,
    required,
    [...required, "temporal_requirement", "supersedes_capability_id"],
    context,
  );
  if (!Array.isArray(raw.usage_demands) || raw.usage_demands.length === 0) {
    fail(`${context}.usage_demands must be a non-empty array`);
  }
  const usageDemands = raw.usage_demands.map((entry, usageIndex) =>
    parseUsageDemandV2(entry, index, usageIndex),
  );
  const usageKeys = usageDemands.map(
    ({ usage_context, basis, evidence_reference }) =>
      `${usage_context}:${basis}:${evidence_reference}`,
  );
  const sortedUsageKeys = [...usageKeys].sort(compareCanonicalStrings);
  if (!sameStrings(usageKeys, sortedUsageKeys)) {
    fail(`${context}.usage_demands must use canonical usage/basis/evidence ordering`);
  }
  if (new Set(usageKeys).size !== usageKeys.length) {
    fail(`${context}.usage_demands contains a duplicate provenance-linked usage`);
  }

  if (!Array.isArray(raw.execution_contracts)) {
    fail(`${context}.execution_contracts must be an array`);
  }
  const executionContracts = raw.execution_contracts.map((entry, executionIndex) =>
    parseExecutionContractV2(entry, index, executionIndex),
  );
  const executionKeys = executionContracts.map(
    ({ kind, contract_reference }) => `${kind}:${contract_reference}`,
  );
  const sortedExecutionKeys = [...executionKeys].sort(compareCanonicalStrings);
  if (!sameStrings(executionKeys, sortedExecutionKeys)) {
    fail(`${context}.execution_contracts must use canonical kind/contract ordering`);
  }
  if (new Set(executionKeys).size !== executionKeys.length) {
    fail(`${context}.execution_contracts contains a duplicate contract`);
  }

  const id = matching(raw.id, SEMANTIC_ID_RE, `${context}.id`);
  const family = matching(raw.family, SEMANTIC_ID_RE, `${context}.family`);
  const requiredExecutionKind =
    REQUIRED_EXECUTION_KIND_BY_FAMILY[
      family as keyof typeof REQUIRED_EXECUTION_KIND_BY_FAMILY
    ];
  if (
    requiredExecutionKind !== undefined &&
    !executionContracts.some(({ kind }) => kind === requiredExecutionKind)
  ) {
    fail(`${context}.execution_contracts requires ${requiredExecutionKind} for ${family}`);
  }
  for (const { kind } of executionContracts) {
    const owningFamily = Object.entries(REQUIRED_EXECUTION_KIND_BY_FAMILY).find(
      ([, reservedKind]) => kind === reservedKind,
    )?.[0];
    if (owningFamily !== undefined && owningFamily !== family) {
      fail(`${context}.execution_contracts kind ${kind} is reserved for ${owningFamily}`);
    }
  }
  const requiredStates = orderedUniqueStrings(
    raw.required_states,
    `${context}.required_states`,
    { allowEmpty: true },
  );
  const sourceOwner = member(
    raw.source_owner,
    ["forge", "pixel"] as const,
    `${context}.source_owner`,
  );
  const deliveryKind = member(
    raw.delivery_kind,
    ["static_artifact", "temporal_artifact"] as const,
    `${context}.delivery_kind`,
  );
  const mediaClass = member(
    raw.media_class,
    ["visual", "audio"] as const,
    `${context}.media_class`,
  );
  const temporal =
    raw.temporal_requirement === undefined
      ? undefined
      : parseTemporalRequirementV2(raw.temporal_requirement, index);
  if (deliveryKind === "temporal_artifact" && temporal === undefined) {
    fail(`${context}.temporal_requirement is required for temporal artifacts`);
  }
  if (deliveryKind === "static_artifact" && temporal !== undefined) {
    fail(`${context}.temporal_requirement is forbidden for static artifacts`);
  }
  if (temporal !== undefined && temporal.media_class !== mediaClass) {
    fail(`${context}.temporal_requirement.media_class must match capability media_class`);
  }
  if (temporal !== undefined && !sameStrings(temporal.required_states, requiredStates)) {
    fail(`${context}.temporal_requirement.required_states must match capability required_states`);
  }
  if (
    temporal !== undefined &&
    sourceOwner === "forge" &&
    temporal.signature_contract_reference !== "forge.temporal-signature/v1"
  ) {
    fail(`${context} Forge temporal artifacts require forge.temporal-signature/v1`);
  }
  if (mediaClass === "audio" && deliveryKind !== "temporal_artifact") {
    fail(`${context} audio capabilities must be temporal artifacts`);
  }

  const supersedes =
    raw.supersedes_capability_id === undefined
      ? undefined
      : matching(
          raw.supersedes_capability_id,
          SEMANTIC_ID_RE,
          `${context}.supersedes_capability_id`,
        );
  if (supersedes === id) fail(`${context} cannot supersede itself`);

  return {
    id,
    family,
    usage_demands: usageDemands,
    required_states: requiredStates,
    required_variants: orderedUniqueStrings(
      raw.required_variants,
      `${context}.required_variants`,
      { allowEmpty: true },
    ),
    physical_contract_reference: matching(
      raw.physical_contract_reference,
      CONTRACT_ID_RE,
      `${context}.physical_contract_reference`,
    ),
    source_owner: sourceOwner,
    review_requirement: member(
      raw.review_requirement,
      ["delivery_resolution", "reference_convergence"] as const,
      `${context}.review_requirement`,
    ),
    delivery_kind: deliveryKind,
    media_class: mediaClass,
    execution_contracts: executionContracts,
    demand_reference: portableReference(raw.demand_reference, `${context}.demand_reference`),
    ...(temporal === undefined ? {} : { temporal_requirement: temporal }),
    ...(supersedes === undefined ? {} : { supersedes_capability_id: supersedes }),
  };
}

function parseRequirementsV2Shape(value: unknown): DualThemePackRequirementsV2 {
  const context = "dual-theme pack requirements v2";
  const raw = record(value, context);
  const fields = [
    "contract_id",
    "program_id",
    "theme_ids",
    "capabilities",
    "requirements_sha256",
  ];
  exactKeys(raw, fields, fields, context);
  exact(raw.contract_id, DUAL_THEME_PACK_REQUIREMENTS_V2_ID, `${context}.contract_id`);
  if (!Array.isArray(raw.theme_ids) || raw.theme_ids.length !== 2) {
    fail(`${context}.theme_ids must contain exactly two mirrored themes`);
  }
  const themeIds = orderedUniqueStrings(raw.theme_ids, `${context}.theme_ids`);
  if (!Array.isArray(raw.capabilities) || raw.capabilities.length === 0) {
    fail(`${context}.capabilities must be a non-empty array`);
  }
  const capabilities = raw.capabilities.map(parseCapabilityV2);
  const capabilityIds = new Set<string>();
  for (const [index, capability] of capabilities.entries()) {
    if (capabilityIds.has(capability.id)) {
      fail(`${context}.capabilities contains duplicate id ${capability.id}`);
    }
    capabilityIds.add(capability.id);
    if (index > 0 && compareCanonicalStrings(capabilities[index - 1]!.id, capability.id) >= 0) {
      fail(`${context}.capabilities must use canonical capability-id ordering`);
    }
  }
  for (const family of DUAL_THEME_CAPABILITY_FAMILIES) {
    if (!capabilities.some((capability) => capability.family === family)) {
      fail(`${context}.capabilities missing required core family ${family}`);
    }
  }
  return {
    contract_id: DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
    program_id: matching(raw.program_id, SEMANTIC_ID_RE, `${context}.program_id`),
    theme_ids: themeIds as unknown as readonly [string, string],
    capabilities,
    requirements_sha256: matching(
      raw.requirements_sha256,
      SHA256_RE,
      `${context}.requirements_sha256`,
    ),
  };
}

export async function validateDualThemePackRequirementsV2(
  value: unknown,
): Promise<DualThemePackRequirementsV2> {
  const parsed = parseRequirementsV2Shape(value);
  if ((await digestDualThemePackRequirementsV2(parsed)) !== parsed.requirements_sha256) {
    fail("dual-theme pack requirements v2.requirements_sha256 mismatch");
  }
  return parsed;
}

export const DUAL_THEME_PACK_MANIFEST_V2_ID =
  "dual-theme-assembled-pack/v2" as const;
export const DUAL_THEME_TEMPORAL_BINDING_V2_ID =
  "dual-theme-temporal-binding/v2" as const;
export const DUAL_THEME_ASSET_DEMAND_CATALOG_V2_ID =
  "dual-theme-asset-demand-catalog/v2" as const;
export const DUAL_THEME_ASSET_DEMAND_COMPILATION_V2_ID =
  "dual-theme-asset-demand-compilation/v2" as const;

export interface DualThemeCatalogThemeV2 {
  readonly id: string;
  readonly display_name: string;
  readonly audience: string;
}

export interface DualThemeCatalogSourceV2 {
  readonly contract_id: typeof DUAL_THEME_ASSET_DEMAND_CATALOG_V2_ID;
  readonly catalog_id: string;
  readonly catalog_sha256: string;
  readonly theme_scope: "mirrored";
  readonly themes: readonly [DualThemeCatalogThemeV2, DualThemeCatalogThemeV2];
}

export interface DualThemePackArtifactV2 extends DualThemeArtifactIdentity {
  readonly media_type: string;
  readonly role: string;
  readonly byte_length: number;
  readonly states: readonly string[];
  readonly variants: readonly string[];
}

export interface DualThemeTemporalSignatureArtifactV2
  extends DualThemeArtifactIdentity {
  readonly media_type: "application/json";
  readonly role: "temporal_signature";
  readonly byte_length: number;
}

export interface DualThemeTemporalBindingV2 {
  readonly contract_id: typeof DUAL_THEME_TEMPORAL_BINDING_V2_ID;
  readonly media_class: "visual" | "audio";
  readonly signature_contract_reference: string;
  readonly requirement_signature_reference: string;
  readonly signature_artifact: DualThemeTemporalSignatureArtifactV2;
  readonly covered_states: readonly string[];
}

export interface DualThemePackMemberV2 {
  readonly id: string;
  readonly capability_id: string;
  readonly family: string;
  readonly physical_contract_reference: string;
  readonly media_class: "visual" | "audio";
  readonly required_states: readonly string[];
  readonly required_variants: readonly string[];
  readonly execution_contracts: readonly DualThemeExecutionContractV2[];
  readonly source_artifacts: readonly DualThemePackArtifactV2[];
  readonly derived_artifacts: readonly DualThemePackArtifactV2[];
  readonly provenance: DualThemeProvenance;
  readonly review: DualThemeReviewDisposition;
  readonly temporal?: DualThemeTemporalBindingV2;
}

export interface DualThemeAssembledThemeV2 {
  readonly theme_id: string;
  readonly members: readonly DualThemePackMemberV2[];
}

export interface DualThemePackManifestV2 {
  readonly contract_id: typeof DUAL_THEME_PACK_MANIFEST_V2_ID;
  readonly program_id: string;
  readonly source_catalog: {
    readonly contract_id: typeof DUAL_THEME_ASSET_DEMAND_CATALOG_V2_ID;
    readonly catalog_id: string;
    readonly catalog_sha256: string;
  };
  readonly source_compilation: {
    readonly contract_id: typeof DUAL_THEME_ASSET_DEMAND_COMPILATION_V2_ID;
    readonly compilation_sha256: string;
  };
  readonly requirements: {
    readonly contract_id: typeof DUAL_THEME_PACK_REQUIREMENTS_V2_ID;
    readonly requirements_sha256: string;
  };
  readonly themes: readonly [
    DualThemeAssembledThemeV2,
    DualThemeAssembledThemeV2,
  ];
  readonly manifest_sha256: string;
}

export function canonicalizeDualThemePackManifestV2(value: unknown): string {
  return canonicalizeWithout(value, "manifest_sha256", "dual-theme pack manifest v2");
}

export async function digestDualThemePackManifestV2(
  value: unknown,
): Promise<string> {
  return sha256(canonicalizeDualThemePackManifestV2(value));
}

function parseCatalogSourceV2(
  value: unknown,
  requirements: DualThemePackRequirementsV2,
): DualThemeCatalogSourceV2 {
  const context = "dual-theme catalog source v2";
  const raw = record(value, context);
  const fields = [
    "contract_id",
    "catalog_id",
    "catalog_sha256",
    "theme_scope",
    "themes",
  ];
  exactKeys(raw, fields, fields, context);
  exact(raw.contract_id, DUAL_THEME_ASSET_DEMAND_CATALOG_V2_ID, `${context}.contract_id`);
  exact(raw.theme_scope, "mirrored", `${context}.theme_scope`);
  if (!Array.isArray(raw.themes) || raw.themes.length !== 2) {
    fail(`${context}.themes must contain exactly two mirrored themes`);
  }
  const themes = raw.themes.map((value, index) => {
    const themeContext = `${context}.themes[${index}]`;
    const theme = record(value, themeContext);
    const themeFields = ["id", "display_name", "audience"];
    exactKeys(theme, themeFields, themeFields, themeContext);
    const id = matching(theme.id, SEMANTIC_ID_RE, `${themeContext}.id`);
    exact(id, requirements.theme_ids[index]!, `${themeContext}.id`);
    return {
      id,
      display_name: nonemptyString(theme.display_name, `${themeContext}.display_name`),
      audience: matching(theme.audience, SEMANTIC_ID_RE, `${themeContext}.audience`),
    };
  });
  return {
    contract_id: DUAL_THEME_ASSET_DEMAND_CATALOG_V2_ID,
    catalog_id: matching(raw.catalog_id, SEMANTIC_ID_RE, `${context}.catalog_id`),
    catalog_sha256: matching(raw.catalog_sha256, SHA256_RE, `${context}.catalog_sha256`),
    theme_scope: "mirrored",
    themes: themes as unknown as readonly [DualThemeCatalogThemeV2, DualThemeCatalogThemeV2],
  };
}

function parsePackArtifactV2(
  value: unknown,
  capability: DualThemeCapabilityRequirementV2,
  context: string,
): DualThemePackArtifactV2 {
  const raw = record(value, context);
  const fields = [
    "artifact_id",
    "revision_id",
    "sha256",
    "reference",
    "media_type",
    "role",
    "byte_length",
    "states",
    "variants",
  ];
  exactKeys(raw, fields, fields, context);
  const identity = parseArtifactIdentity(
    {
      artifact_id: raw.artifact_id,
      revision_id: raw.revision_id,
      sha256: raw.sha256,
      reference: raw.reference,
    },
    context,
  );
  const mediaType = matching(raw.media_type, MEDIA_TYPE_RE, `${context}.media_type`);
  if (capability.media_class === "audio" && !mediaType.startsWith("audio/")) {
    fail(`${context}.media_type must be audio/* for an audio capability`);
  }
  if (capability.media_class === "visual" && mediaType.startsWith("audio/")) {
    fail(`${context}.media_type must be visual for a visual capability`);
  }
  const states = orderedUniqueStrings(raw.states, `${context}.states`, {
    allowEmpty: true,
  });
  const variants = orderedUniqueStrings(raw.variants, `${context}.variants`, {
    allowEmpty: true,
  });
  if (states.some((state) => !capability.required_states.includes(state))) {
    fail(`${context}.states contains a state not declared by the capability`);
  }
  if (variants.some((variant) => !capability.required_variants.includes(variant))) {
    fail(`${context}.variants contains a variant not declared by the capability`);
  }
  return {
    ...identity,
    media_type: mediaType,
    role: matching(raw.role, SEMANTIC_ID_RE, `${context}.role`),
    byte_length: positiveInteger(raw.byte_length, `${context}.byte_length`),
    states,
    variants,
  };
}

function requireArtifactCoverageV2(
  artifacts: readonly DualThemePackArtifactV2[],
  capability: DualThemeCapabilityRequirementV2,
  context: string,
): void {
  for (const state of capability.required_states) {
    if (!artifacts.some(({ states }) => states.includes(state))) {
      fail(`${context} missing required state ${state}`);
    }
  }
  for (const variant of capability.required_variants) {
    if (!artifacts.some(({ variants }) => variants.includes(variant))) {
      fail(`${context} missing required variant ${variant}`);
    }
  }
}

function parseExecutionContractsForMemberV2(
  value: unknown,
  capability: DualThemeCapabilityRequirementV2,
  context: string,
): readonly DualThemeExecutionContractV2[] {
  if (!Array.isArray(value) || value.length !== capability.execution_contracts.length) {
    fail(`${context} must bind every required execution contract exactly once`);
  }
  return value.map((entry, index) => {
    const entryContext = `${context}[${index}]`;
    const raw = record(entry, entryContext);
    const fields = ["kind", "contract_reference", "evidence_reference"];
    exactKeys(raw, fields, fields, entryContext);
    const expected = capability.execution_contracts[index];
    if (expected === undefined) fail(`${entryContext} is unexpected`);
    return {
      kind: exact(raw.kind, expected.kind, `${entryContext}.kind`),
      contract_reference: exact(
        raw.contract_reference,
        expected.contract_reference,
        `${entryContext}.contract_reference`,
      ),
      evidence_reference: exact(
        raw.evidence_reference,
        expected.evidence_reference,
        `${entryContext}.evidence_reference`,
      ),
    };
  });
}

function parseTemporalBindingV2(
  value: unknown,
  capability: DualThemeCapabilityRequirementV2,
  context: string,
): DualThemeTemporalBindingV2 {
  const requirement = capability.temporal_requirement;
  if (requirement === undefined) {
    return fail(`${context} is forbidden for a static capability`);
  }
  const raw = record(value, context);
  const fields = [
    "contract_id",
    "media_class",
    "signature_contract_reference",
    "requirement_signature_reference",
    "signature_artifact",
    "covered_states",
  ];
  exactKeys(raw, fields, fields, context);
  exact(raw.contract_id, DUAL_THEME_TEMPORAL_BINDING_V2_ID, `${context}.contract_id`);
  const signatureRaw = record(raw.signature_artifact, `${context}.signature_artifact`);
  const signatureFields = [
    "artifact_id",
    "revision_id",
    "sha256",
    "reference",
    "media_type",
    "role",
    "byte_length",
  ];
  exactKeys(
    signatureRaw,
    signatureFields,
    signatureFields,
    `${context}.signature_artifact`,
  );
  const signatureIdentity = parseArtifactIdentity(
    {
      artifact_id: signatureRaw.artifact_id,
      revision_id: signatureRaw.revision_id,
      sha256: signatureRaw.sha256,
      reference: signatureRaw.reference,
    },
    `${context}.signature_artifact`,
  );
  exact(
    signatureIdentity.sha256,
    requirement.signature_sha256,
    `${context}.signature_artifact.sha256`,
  );
  exact(
    raw.requirement_signature_reference,
    requirement.signature_reference,
    `${context}.requirement_signature_reference`,
  );
  const coveredStates = orderedUniqueStrings(
    raw.covered_states,
    `${context}.covered_states`,
    { allowEmpty: true },
  );
  if (!sameStrings(coveredStates, requirement.required_states)) {
    fail(`${context}.covered_states must exactly cover the temporal signature states`);
  }
  return {
    contract_id: DUAL_THEME_TEMPORAL_BINDING_V2_ID,
    media_class: exact(
      raw.media_class,
      requirement.media_class,
      `${context}.media_class`,
    ) as "visual" | "audio",
    signature_contract_reference: exact(
      raw.signature_contract_reference,
      requirement.signature_contract_reference,
      `${context}.signature_contract_reference`,
    ),
    requirement_signature_reference: requirement.signature_reference,
    signature_artifact: {
      ...signatureIdentity,
      media_type: exact(
        signatureRaw.media_type,
        "application/json",
        `${context}.signature_artifact.media_type`,
      ) as "application/json",
      role: exact(
        signatureRaw.role,
        "temporal_signature",
        `${context}.signature_artifact.role`,
      ) as "temporal_signature",
      byte_length: positiveInteger(
        signatureRaw.byte_length,
        `${context}.signature_artifact.byte_length`,
      ),
    },
    covered_states: coveredStates,
  };
}

function parsePackMemberV2(
  value: unknown,
  index: number,
  capability: DualThemeCapabilityRequirementV2,
): DualThemePackMemberV2 {
  const context = `theme v2.members[${index}]`;
  const raw = record(value, context);
  const required = [
    "id",
    "capability_id",
    "family",
    "physical_contract_reference",
    "media_class",
    "required_states",
    "required_variants",
    "execution_contracts",
    "source_artifacts",
    "derived_artifacts",
    "provenance",
    "review",
  ];
  exactKeys(raw, required, [...required, "temporal"], context);
  exact(raw.capability_id, capability.id, `${context}.capability_id`);
  exact(raw.family, capability.family, `${context}.family`);
  exact(
    raw.physical_contract_reference,
    capability.physical_contract_reference,
    `${context}.physical_contract_reference`,
  );
  exact(raw.media_class, capability.media_class, `${context}.media_class`);
  const requiredStates = orderedUniqueStrings(
    raw.required_states,
    `${context}.required_states`,
    { allowEmpty: true },
  );
  const requiredVariants = orderedUniqueStrings(
    raw.required_variants,
    `${context}.required_variants`,
    { allowEmpty: true },
  );
  if (!sameStrings(requiredStates, capability.required_states)) {
    fail(`${context}.required_states mismatch for capability ${capability.id}`);
  }
  if (!sameStrings(requiredVariants, capability.required_variants)) {
    fail(`${context}.required_variants mismatch for capability ${capability.id}`);
  }
  if (!Array.isArray(raw.source_artifacts) || raw.source_artifacts.length === 0) {
    fail(`${context}.source_artifacts must be a non-empty array`);
  }
  if (!Array.isArray(raw.derived_artifacts) || raw.derived_artifacts.length === 0) {
    fail(`${context}.derived_artifacts must be a non-empty array`);
  }
  const sourceArtifacts = raw.source_artifacts.map((entry, artifactIndex) =>
    parsePackArtifactV2(
      entry,
      capability,
      `${context}.source_artifacts[${artifactIndex}]`,
    ),
  );
  const derivedArtifacts = raw.derived_artifacts.map((entry, artifactIndex) =>
    parsePackArtifactV2(
      entry,
      capability,
      `${context}.derived_artifacts[${artifactIndex}]`,
    ),
  );
  for (const [label, artifacts] of [
    ["source_artifacts", sourceArtifacts],
    ["derived_artifacts", derivedArtifacts],
  ] as const) {
    const keys = artifacts.map(({ artifact_id }) => artifact_id);
    const sorted = [...keys].sort(compareCanonicalStrings);
    if (!sameStrings(keys, sorted)) {
      fail(`${context}.${label} must use canonical artifact-id ordering`);
    }
    if (new Set(keys).size !== keys.length) {
      fail(`${context}.${label} contains duplicate artifact_id`);
    }
    requireArtifactCoverageV2(artifacts, capability, `${context}.${label}`);
  }
  const artifactIdentityKeys = [...sourceArtifacts, ...derivedArtifacts].map(
    ({ revision_id, artifact_id }) => `${revision_id}:${artifact_id}`,
  );
  const artifactReferences = [...sourceArtifacts, ...derivedArtifacts].map(
    ({ reference }) => reference,
  );
  if (new Set(artifactIdentityKeys).size !== artifactIdentityKeys.length) {
    fail(`${context} source and derived artifacts must have independent identities`);
  }
  if (new Set(artifactReferences).size !== artifactReferences.length) {
    fail(`${context} source and derived artifacts must have independent references`);
  }
  const temporal =
    raw.temporal === undefined
      ? undefined
      : parseTemporalBindingV2(raw.temporal, capability, `${context}.temporal`);
  if (capability.delivery_kind === "temporal_artifact" && temporal === undefined) {
    fail(`${context}.temporal is required for temporal capability ${capability.id}`);
  }
  if (capability.delivery_kind === "static_artifact" && temporal !== undefined) {
    fail(`${context}.temporal is forbidden for static capability ${capability.id}`);
  }
  if (
    temporal !== undefined &&
    (artifactIdentityKeys.includes(
      `${temporal.signature_artifact.revision_id}:${temporal.signature_artifact.artifact_id}`,
    ) ||
      artifactReferences.includes(temporal.signature_artifact.reference))
  ) {
    fail(`${context}.temporal signature artifact must have an independent identity`);
  }
  const review = parseReview(raw.review, `${context}.review`);
  if (review.requirement !== capability.review_requirement) {
    fail(`${context}.review requirement mismatch for capability ${capability.id}`);
  }
  return {
    id: matching(raw.id, SEMANTIC_ID_RE, `${context}.id`),
    capability_id: capability.id,
    family: capability.family,
    physical_contract_reference: capability.physical_contract_reference,
    media_class: capability.media_class,
    required_states: requiredStates,
    required_variants: requiredVariants,
    execution_contracts: parseExecutionContractsForMemberV2(
      raw.execution_contracts,
      capability,
      `${context}.execution_contracts`,
    ),
    source_artifacts: sourceArtifacts,
    derived_artifacts: derivedArtifacts,
    provenance: parseProvenance(
      raw.provenance,
      capability.source_owner,
      `${context}.provenance`,
    ),
    review,
    ...(temporal === undefined ? {} : { temporal }),
  };
}

function parseManifestV2Shape(
  value: unknown,
  requirements: DualThemePackRequirementsV2,
  catalogSource: DualThemeCatalogSourceV2,
  compilationSha256: string,
): DualThemePackManifestV2 {
  const context = "dual-theme pack manifest v2";
  const raw = record(value, context);
  const fields = [
    "contract_id",
    "program_id",
    "source_catalog",
    "source_compilation",
    "requirements",
    "themes",
    "manifest_sha256",
  ];
  exactKeys(raw, fields, fields, context);
  exact(raw.contract_id, DUAL_THEME_PACK_MANIFEST_V2_ID, `${context}.contract_id`);
  exact(raw.program_id, requirements.program_id, `${context}.program_id`);
  const sourceBinding = record(raw.source_catalog, `${context}.source_catalog`);
  const sourceFields = ["contract_id", "catalog_id", "catalog_sha256"];
  exactKeys(sourceBinding, sourceFields, sourceFields, `${context}.source_catalog`);
  exact(
    sourceBinding.contract_id,
    catalogSource.contract_id,
    `${context}.source_catalog.contract_id`,
  );
  exact(
    sourceBinding.catalog_id,
    catalogSource.catalog_id,
    `${context}.source_catalog.catalog_id`,
  );
  exact(
    sourceBinding.catalog_sha256,
    catalogSource.catalog_sha256,
    `${context}.source_catalog.catalog_sha256`,
  );
  const compilationBinding = record(
    raw.source_compilation,
    `${context}.source_compilation`,
  );
  const compilationFields = ["contract_id", "compilation_sha256"];
  exactKeys(
    compilationBinding,
    compilationFields,
    compilationFields,
    `${context}.source_compilation`,
  );
  exact(
    compilationBinding.contract_id,
    DUAL_THEME_ASSET_DEMAND_COMPILATION_V2_ID,
    `${context}.source_compilation.contract_id`,
  );
  exact(
    compilationBinding.compilation_sha256,
    compilationSha256,
    `${context}.source_compilation.compilation_sha256`,
  );
  const requirementsBinding = record(raw.requirements, `${context}.requirements`);
  const requirementsFields = ["contract_id", "requirements_sha256"];
  exactKeys(
    requirementsBinding,
    requirementsFields,
    requirementsFields,
    `${context}.requirements`,
  );
  exact(
    requirementsBinding.contract_id,
    DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
    `${context}.requirements.contract_id`,
  );
  exact(
    requirementsBinding.requirements_sha256,
    requirements.requirements_sha256,
    `${context}.requirements.requirements_sha256`,
  );
  if (!Array.isArray(raw.themes) || raw.themes.length !== 2) {
    fail(`${context}.themes must contain exactly two mirrored themes`);
  }
  const globalMemberIds = new Set<string>();
  const globalArtifactKeys = new Set<string>();
  const globalReferences = new Set<string>();
  const themes = raw.themes.map((entry, themeIndex) => {
    const themeContext = `${context}.themes[${themeIndex}]`;
    const theme = record(entry, themeContext);
    exactKeys(theme, ["theme_id", "members"], ["theme_id", "members"], themeContext);
    const expectedThemeId = catalogSource.themes[themeIndex]!.id;
    exact(theme.theme_id, expectedThemeId, `${themeContext}.theme_id`);
    if (
      !Array.isArray(theme.members) ||
      theme.members.length !== requirements.capabilities.length
    ) {
      fail(`${themeContext}.members missing mirrored capability coverage`);
    }
    const members = theme.members.map((memberValue, memberIndex) => {
      const capability = requirements.capabilities[memberIndex]!;
      const memberRaw = record(memberValue, `${themeContext}.members[${memberIndex}]`);
      exact(
        memberRaw.capability_id,
        capability.id,
        `${themeContext}.members[${memberIndex}].capability_id`,
      );
      const member = parsePackMemberV2(memberValue, memberIndex, capability);
      if (globalMemberIds.has(member.id)) {
        fail(`${context} contains duplicate member id ${member.id}`);
      }
      globalMemberIds.add(member.id);
      const artifacts = [
        ...member.source_artifacts,
        ...member.derived_artifacts,
        ...(member.temporal === undefined
          ? []
          : [member.temporal.signature_artifact]),
      ];
      for (const artifact of artifacts) {
        const key = `${artifact.revision_id}:${artifact.artifact_id}`;
        if (globalArtifactKeys.has(key)) {
          fail(`${context} contains duplicate artifact identity ${key}`);
        }
        if (globalReferences.has(artifact.reference)) {
          fail(`${context} contains duplicate artifact reference ${artifact.reference}`);
        }
        globalArtifactKeys.add(key);
        globalReferences.add(artifact.reference);
      }
      return member;
    });
    return { theme_id: expectedThemeId, members };
  });
  return {
    contract_id: DUAL_THEME_PACK_MANIFEST_V2_ID,
    program_id: requirements.program_id,
    source_catalog: {
      contract_id: catalogSource.contract_id,
      catalog_id: catalogSource.catalog_id,
      catalog_sha256: catalogSource.catalog_sha256,
    },
    source_compilation: {
      contract_id: DUAL_THEME_ASSET_DEMAND_COMPILATION_V2_ID,
      compilation_sha256: compilationSha256,
    },
    requirements: {
      contract_id: DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
      requirements_sha256: requirements.requirements_sha256,
    },
    themes: themes as unknown as readonly [
      DualThemeAssembledThemeV2,
      DualThemeAssembledThemeV2,
    ],
    manifest_sha256: matching(raw.manifest_sha256, SHA256_RE, `${context}.manifest_sha256`),
  };
}

export async function validateDualThemePackManifestV2(
  value: unknown,
  catalogValue: unknown,
  compilationValue: unknown,
): Promise<DualThemePackManifestV2> {
  const catalogApi = await import("./dual-theme-asset-demand-catalog");
  const catalog = await catalogApi.validateDualThemeAssetDemandCatalog(catalogValue);
  const expectedCompilation =
    await catalogApi.compileDualThemeAssetDemandCatalog(catalog);
  if (
    JSON.stringify(canonicalValue(compilationValue, "asset-demand compilation v2")) !==
    JSON.stringify(canonicalValue(expectedCompilation, "expected asset-demand compilation v2"))
  ) {
    fail("asset-demand compilation v2 does not exactly match the signed catalog output");
  }
  const requirements = await validateDualThemePackRequirementsV2(
    expectedCompilation.requirements,
  );
  const catalogSource = parseCatalogSourceV2(
    expectedCompilation.source_catalog,
    requirements,
  );
  const parsed = parseManifestV2Shape(
    value,
    requirements,
    catalogSource,
    expectedCompilation.compilation_sha256,
  );
  if ((await digestDualThemePackManifestV2(parsed)) !== parsed.manifest_sha256) {
    fail("dual-theme pack manifest v2.manifest_sha256 mismatch");
  }
  return parsed;
}
