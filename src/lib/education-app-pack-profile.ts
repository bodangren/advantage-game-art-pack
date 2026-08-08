import { FORGE_INTERCHANGE_CONTRACT_ID } from "./forge-interchange";
import {
  FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID,
  FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID,
  PIXEL_FORGE_FIVE_CLIP_STAGING_PLAN_ID,
} from "./fantasy-asset-forge-five-clip-ingestion";
import { sha256 } from "./svg-assets";

export const EDUCATION_APP_PACK_PROFILE_ID =
  "education-app-pack-profile/v1" as const;

const SHA256_RE = /^[a-f0-9]{64}$/;
const REVISION_RE = /^revision\.[a-f0-9]{64}$/;
const SEMANTIC_ID_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const CONTRACT_ID_RE = /^[a-z][a-z0-9._-]*(?:\/v[1-9][0-9]*)$/;
const MEDIA_TYPE_RE = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/;
const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

type UnknownRecord = Record<string, unknown>;
type ForgeDirection = (typeof DIRECTIONS)[number];

export interface PixelNativePackSource {
  readonly kind: "pixel_native";
  readonly source_id: string;
  readonly source_sha256: string;
}

interface ForgePackSourceBase {
  readonly kind: "forge";
  readonly contract_id: typeof FORGE_INTERCHANGE_CONTRACT_ID;
  readonly asset_id: string;
  readonly revision_id: string;
  readonly manifest_sha256: string;
  readonly artifact_id: string;
  readonly artifact_sha256: string;
}

export type ForgePackSource =
  | (ForgePackSourceBase & {
      readonly artifact_role: "directional_frame";
      readonly direction: ForgeDirection;
    })
  | (ForgePackSourceBase & {
      readonly artifact_role: "glb";
      readonly direction?: never;
    });

export interface EducationAppPackMember {
  readonly id: string;
  readonly semantic_role: string;
  readonly media_type: string;
  readonly byte_length: number;
  readonly sha256: string;
  readonly width?: number;
  readonly height?: number;
  readonly transparent?: boolean;
  readonly source: PixelNativePackSource | ForgePackSource;
}

export interface EducationAppPackProfile {
  readonly contract_id: typeof EDUCATION_APP_PACK_PROFILE_ID;
  readonly pack_id: string;
  readonly members: readonly EducationAppPackMember[];
  readonly role_cardinalities: readonly {
    readonly semantic_role: string;
    readonly minimum: number;
    readonly maximum: number;
  }[];
  readonly completeness: {
    readonly required_member_ids: readonly string[];
    readonly required_derived_profile_ids: readonly string[];
  };
  readonly derived_export_profiles: readonly {
    readonly id: string;
    readonly output_contract_id: string;
    readonly member_ids: readonly string[];
    readonly budgets: {
      readonly max_artifact_count: number;
      readonly max_total_bytes: number;
    };
  }[];
  readonly budgets: {
    readonly max_artifact_count: number;
    readonly max_total_bytes: number;
    readonly max_single_artifact_bytes: number;
  };
  readonly profile_sha256: string;
}

export class EducationAppPackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EducationAppPackValidationError";
  }
}

function fail(message: string): never {
  throw new EducationAppPackValidationError(message);
}

function record(value: unknown, context: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(context + " must be an object");
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
    fail(context + " missing required key(s): " + missing.join(", "));
  }
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    fail(context + " contains unexpected key(s): " + unexpected.join(", "));
  }
}

function stringMatching(value: unknown, pattern: RegExp, context: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    return fail(context + " is invalid");
  }
  return value;
}

function exactString(value: unknown, expected: string, context: string): string {
  if (value !== expected) {
    return fail(context + " must be " + expected);
  }
  return expected;
}

function positiveInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return fail(context + " must be a positive safe integer");
  }
  return value;
}

function nonnegativeInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return fail(context + " must be a nonnegative safe integer");
  }
  return value;
}

function array(value: unknown, context: string, allowEmpty = false): readonly unknown[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    return fail(context + (allowEmpty ? " must be an array" : " must be a non-empty array"));
  }
  return value;
}

function uniqueStrings(
  value: unknown,
  context: string,
  pattern = SEMANTIC_ID_RE,
): readonly string[] {
  const values = array(value, context).map((entry, index) =>
    stringMatching(entry, pattern, context + "[" + index + "]"),
  );
  const seen = new Set<string>();
  for (const entry of values) {
    if (seen.has(entry)) {
      fail(context + " contains duplicate entry " + entry);
    }
    seen.add(entry);
  }
  return values;
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
    if (!Number.isFinite(value)) fail(context + " contains a non-finite number");
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      canonicalValue(entry, context + "[" + index + "]"),
    );
  }
  if (typeof value !== "object" || value === null) {
    return fail(context + " contains a non-JSON value");
  }
  const input = value as UnknownRecord;
  const output: UnknownRecord = {};
  for (const key of Object.keys(input).sort()) {
    if (input[key] === undefined) {
      fail(context + "." + key + " is undefined");
    }
    output[key] = canonicalValue(input[key], context + "." + key);
  }
  return output;
}

export function canonicalizeEducationAppPackProfile(value: unknown): string {
  const root = record(value, "education app pack profile");
  const unsigned: UnknownRecord = {};
  for (const [key, entry] of Object.entries(root)) {
    if (key !== "profile_sha256") unsigned[key] = entry;
  }
  return JSON.stringify(canonicalValue(unsigned, "education app pack profile"));
}

export async function digestEducationAppPackProfile(value: unknown): Promise<string> {
  return sha256(canonicalizeEducationAppPackProfile(value));
}

function parseSource(value: unknown, context: string): PixelNativePackSource | ForgePackSource {
  const source = record(value, context);
  if (source.kind === "pixel_native") {
    const fields = ["kind", "source_id", "source_sha256"];
    exactKeys(source, fields, fields, context);
    return {
      kind: "pixel_native",
      source_id: stringMatching(source.source_id, SEMANTIC_ID_RE, context + ".source_id"),
      source_sha256: stringMatching(source.source_sha256, SHA256_RE, context + ".source_sha256"),
    };
  }
  if (source.kind === "forge") {
    const required = [
      "kind",
      "contract_id",
      "asset_id",
      "revision_id",
      "manifest_sha256",
      "artifact_id",
      "artifact_sha256",
      "artifact_role",
    ];
    exactKeys(source, required, [...required, "direction"], context);
    const base = {
      kind: "forge" as const,
      contract_id: exactString(
        source.contract_id,
        FORGE_INTERCHANGE_CONTRACT_ID,
        context + ".contract_id",
      ) as typeof FORGE_INTERCHANGE_CONTRACT_ID,
      asset_id: stringMatching(source.asset_id, SEMANTIC_ID_RE, context + ".asset_id"),
      revision_id: stringMatching(
        source.revision_id,
        REVISION_RE,
        context + ".revision_id must be an exact pinned Forge revision",
      ),
      manifest_sha256: stringMatching(
        source.manifest_sha256,
        SHA256_RE,
        context + ".manifest_sha256",
      ),
      artifact_id: stringMatching(
        source.artifact_id,
        SEMANTIC_ID_RE,
        context + ".artifact_id",
      ),
      artifact_sha256: stringMatching(
        source.artifact_sha256,
        SHA256_RE,
        context + ".artifact_sha256",
      ),
    };
    if (source.artifact_role === "directional_frame") {
      if (
        typeof source.direction !== "string" ||
        !DIRECTIONS.includes(source.direction as ForgeDirection)
      ) {
        fail(context + ".direction must be one of " + DIRECTIONS.join(", "));
      }
      return {
        ...base,
        artifact_role: "directional_frame",
        direction: source.direction as ForgeDirection,
      };
    }
    if (source.artifact_role === "glb") {
      if (source.direction !== undefined) {
        fail(context + " GLB binding must not declare direction");
      }
      return { ...base, artifact_role: "glb" };
    }
    return fail(context + ".artifact_role must be directional_frame or glb");
  }
  return fail(context + ".kind must be pixel_native or forge");
}

function parseMember(value: unknown, index: number): EducationAppPackMember {
  const context = "members[" + index + "]";
  const member = record(value, context);
  const required = [
    "id",
    "semantic_role",
    "media_type",
    "byte_length",
    "sha256",
    "source",
  ];
  const allowed = [...required, "width", "height", "transparent"];
  exactKeys(member, required, allowed, context);

  const source = parseSource(member.source, context + ".source");
  const mediaType = stringMatching(member.media_type, MEDIA_TYPE_RE, context + ".media_type");
  const width =
    member.width === undefined ? undefined : positiveInteger(member.width, context + ".width");
  const height =
    member.height === undefined ? undefined : positiveInteger(member.height, context + ".height");
  if (member.transparent !== undefined && typeof member.transparent !== "boolean") {
    fail(context + ".transparent must be a boolean");
  }

  if (source.kind === "forge") {
    if (mediaType !== "image/png" && mediaType !== "model/gltf-binary") {
      fail(context + " Forge member media_type must be PNG or GLB");
    }
    if (mediaType === "image/png") {
      if (source.artifact_role !== "directional_frame") {
        fail(context + " Forge PNG must bind artifact_role directional_frame");
      }
      if (width === undefined || height === undefined) {
        fail(context + " Forge PNG must declare positive width and height");
      }
      if (width !== 128 || height !== 128) {
        fail(context + " Forge PNG must be exactly 128x128");
      }
      if (member.transparent !== true) {
        fail(context + " Forge PNG transparent must be true");
      }
    } else if (source.artifact_role !== "glb") {
      fail(context + " Forge GLB must bind artifact_role glb");
    } else if (
      width !== undefined ||
      height !== undefined ||
      member.transparent !== undefined
    ) {
      fail(context + " Forge GLB must not declare raster width, height, or transparency");
    }
  } else if ((width === undefined) !== (height === undefined)) {
    fail(context + " Pixel-native width and height must be declared together");
  }

  return {
    id: stringMatching(member.id, SEMANTIC_ID_RE, context + ".id"),
    semantic_role: stringMatching(
      member.semantic_role,
      SEMANTIC_ID_RE,
      context + ".semantic_role",
    ),
    media_type: mediaType,
    byte_length: positiveInteger(member.byte_length, context + ".byte_length"),
    sha256: stringMatching(member.sha256, SHA256_RE, context + ".sha256"),
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
    ...(member.transparent === undefined
      ? {}
      : { transparent: member.transparent }),
    source,
  };
}

function parseRoleCardinality(value: unknown, index: number) {
  const context = "role_cardinalities[" + index + "]";
  const cardinality = record(value, context);
  const fields = ["semantic_role", "minimum", "maximum"];
  exactKeys(cardinality, fields, fields, context);
  const minimum = nonnegativeInteger(cardinality.minimum, context + ".minimum");
  const maximum = nonnegativeInteger(cardinality.maximum, context + ".maximum");
  if (minimum > maximum) {
    fail(context + " minimum " + minimum + " exceeds maximum " + maximum);
  }
  return {
    semantic_role: stringMatching(
      cardinality.semantic_role,
      SEMANTIC_ID_RE,
      context + ".semantic_role",
    ),
    minimum,
    maximum,
  };
}

function parseCompleteness(value: unknown) {
  const context = "completeness";
  const completeness = record(value, context);
  const fields = ["required_member_ids", "required_derived_profile_ids"];
  exactKeys(completeness, fields, fields, context);
  return {
    required_member_ids: uniqueStrings(
      completeness.required_member_ids,
      context + ".required_member_ids",
    ),
    required_derived_profile_ids: uniqueStrings(
      completeness.required_derived_profile_ids,
      context + ".required_derived_profile_ids",
    ),
  };
}

function parseDerivedProfile(value: unknown, index: number) {
  const context = "derived_export_profiles[" + index + "]";
  const profile = record(value, context);
  const fields = ["id", "output_contract_id", "member_ids", "budgets"];
  exactKeys(profile, fields, fields, context);
  const budgets = record(profile.budgets, context + ".budgets");
  const budgetFields = ["max_artifact_count", "max_total_bytes"];
  exactKeys(budgets, budgetFields, budgetFields, context + ".budgets");
  return {
    id: stringMatching(profile.id, SEMANTIC_ID_RE, context + ".id"),
    output_contract_id: stringMatching(
      profile.output_contract_id,
      CONTRACT_ID_RE,
      context + ".output_contract_id",
    ),
    member_ids: array(profile.member_ids, context + ".member_ids").map(
      (entry, memberIndex) =>
        stringMatching(
          entry,
          SEMANTIC_ID_RE,
          context + ".member_ids[" + memberIndex + "]",
        ),
    ),
    budgets: {
      max_artifact_count: positiveInteger(
        budgets.max_artifact_count,
        context + ".budgets.max_artifact_count",
      ),
      max_total_bytes: positiveInteger(
        budgets.max_total_bytes,
        context + ".budgets.max_total_bytes",
      ),
    },
  };
}

function parseBudgets(value: unknown) {
  const context = "budgets";
  const budgets = record(value, context);
  const fields = [
    "max_artifact_count",
    "max_total_bytes",
    "max_single_artifact_bytes",
  ];
  exactKeys(budgets, fields, fields, context);
  return {
    max_artifact_count: positiveInteger(
      budgets.max_artifact_count,
      context + ".max_artifact_count",
    ),
    max_total_bytes: positiveInteger(
      budgets.max_total_bytes,
      context + ".max_total_bytes",
    ),
    max_single_artifact_bytes: positiveInteger(
      budgets.max_single_artifact_bytes,
      context + ".max_single_artifact_bytes",
    ),
  };
}

export async function validateEducationAppPackProfile(
  value: unknown,
): Promise<EducationAppPackProfile> {
  const root = record(value, "education app pack profile");
  const required = [
    "contract_id",
    "pack_id",
    "members",
    "role_cardinalities",
    "completeness",
    "derived_export_profiles",
    "budgets",
    "profile_sha256",
  ];
  exactKeys(root, required, required, "education app pack profile");
  const contractId = exactString(
    root.contract_id,
    EDUCATION_APP_PACK_PROFILE_ID,
    "contract_id",
  ) as typeof EDUCATION_APP_PACK_PROFILE_ID;
  const packId = stringMatching(root.pack_id, SEMANTIC_ID_RE, "pack_id");
  const members = array(root.members, "members").map(parseMember);
  const roleCardinalities = array(
    root.role_cardinalities,
    "role_cardinalities",
  ).map(parseRoleCardinality);
  const completeness = parseCompleteness(root.completeness);
  const derivedProfiles = array(
    root.derived_export_profiles,
    "derived_export_profiles",
  ).map(parseDerivedProfile);
  const budgets = parseBudgets(root.budgets);
  const profileSha256 = stringMatching(
    root.profile_sha256,
    SHA256_RE,
    "profile_sha256",
  );

  const membersById = new Map<string, EducationAppPackMember>();
  const sourceIdentities = new Set<string>();
  for (const member of members) {
    if (membersById.has(member.id)) {
      fail("duplicate member id " + member.id);
    }
    membersById.set(member.id, member);

    const sourceIdentity =
      member.source.kind === "forge"
        ? [
            "forge",
            member.source.asset_id,
            member.source.revision_id,
            member.source.artifact_id,
          ].join("|")
        : ["pixel_native", member.source.source_id, member.source.source_sha256].join("|");
    if (sourceIdentities.has(sourceIdentity)) {
      if (member.source.kind === "forge") {
        fail("duplicate Forge artifact identity " + member.source.artifact_id);
      }
      fail("duplicate Pixel source identity " + member.source.source_id);
    }
    sourceIdentities.add(sourceIdentity);
  }

  for (const member of members) {
    if (
      member.source.kind === "forge" &&
      member.source.artifact_sha256 !== member.sha256
    ) {
      fail(
        "member " +
          member.id +
          " Forge artifact_sha256 does not match member sha256",
      );
    }
  }

  const forgeGroups = new Map<
    string,
    {
      manifest_sha256: string;
      directions: Set<ForgeDirection>;
      glb_count: number;
    }
  >();
  for (const member of members) {
    if (member.source.kind !== "forge") continue;
    const source = member.source;
    const groupId = source.asset_id + "@" + source.revision_id;
    let group = forgeGroups.get(groupId);
    if (!group) {
      group = {
        manifest_sha256: source.manifest_sha256,
        directions: new Set<ForgeDirection>(),
        glb_count: 0,
      };
      forgeGroups.set(groupId, group);
    } else if (group.manifest_sha256 !== source.manifest_sha256) {
      fail(
        "Forge manifest group " +
          groupId +
          " must use a single manifest_sha256",
      );
    }

    if (source.artifact_role === "directional_frame") {
      if (group.directions.has(source.direction)) {
        fail(
          "Forge manifest group " +
            groupId +
            " contains duplicate direction " +
            source.direction,
        );
      }
      group.directions.add(source.direction);
    } else {
      group.glb_count += 1;
    }
  }
  for (const [groupId, group] of forgeGroups) {
    for (const direction of DIRECTIONS) {
      if (!group.directions.has(direction)) {
        fail("Forge manifest group " + groupId + " is missing direction " + direction);
      }
    }
    if (group.directions.size !== DIRECTIONS.length) {
      fail("Forge manifest group " + groupId + " must contain exactly eight directions");
    }
    if (group.glb_count < 1) {
      fail("Forge manifest group " + groupId + " requires at least one GLB");
    }
  }

  const cardinalitiesByRole = new Map<
    string,
    (typeof roleCardinalities)[number]
  >();
  for (const cardinality of roleCardinalities) {
    if (cardinalitiesByRole.has(cardinality.semantic_role)) {
      fail("duplicate role cardinality for " + cardinality.semantic_role);
    }
    cardinalitiesByRole.set(cardinality.semantic_role, cardinality);
  }

  const roleCounts = new Map<string, number>();
  for (const member of members) {
    if (!cardinalitiesByRole.has(member.semantic_role)) {
      fail("undeclared semantic role " + member.semantic_role);
    }
    roleCounts.set(
      member.semantic_role,
      (roleCounts.get(member.semantic_role) ?? 0) + 1,
    );
  }
  for (const cardinality of roleCardinalities) {
    const actual = roleCounts.get(cardinality.semantic_role) ?? 0;
    if (actual < cardinality.minimum) {
      fail(
        "role " +
          cardinality.semantic_role +
          " requires minimum " +
          cardinality.minimum +
          "; actual " +
          actual,
      );
    }
    if (actual > cardinality.maximum) {
      fail(
        "role " +
          cardinality.semantic_role +
          " permits maximum " +
          cardinality.maximum +
          "; actual " +
          actual,
      );
    }
  }

  for (const memberId of completeness.required_member_ids) {
    if (!membersById.has(memberId)) {
      fail("required member is missing: " + memberId);
    }
  }

  const derivedById = new Map<string, (typeof derivedProfiles)[number]>();
  const memberOrder = new Map(members.map((member, index) => [member.id, index]));
  for (const profile of derivedProfiles) {
    if (derivedById.has(profile.id)) {
      fail("duplicate derived profile id " + profile.id);
    }
    derivedById.set(profile.id, profile);

    let priorIndex = -1;
    let totalBytes = 0;
    const profileMemberIds = new Set<string>();
    for (const memberId of profile.member_ids) {
      if (profileMemberIds.has(memberId)) {
        fail("derived profile " + profile.id + " contains duplicate member " + memberId);
      }
      profileMemberIds.add(memberId);
      const member = membersById.get(memberId);
      if (!member) {
        fail("derived profile " + profile.id + " references unknown member " + memberId);
      }
      const currentIndex = memberOrder.get(memberId)!;
      if (currentIndex <= priorIndex) {
        fail("derived profile " + profile.id + " violates pack membership order");
      }
      priorIndex = currentIndex;
      totalBytes += member.byte_length;
      if (!Number.isSafeInteger(totalBytes)) {
        fail("derived profile " + profile.id + " byte total is unsafe");
      }
    }
    if (profile.member_ids.length > profile.budgets.max_artifact_count) {
      fail(
        "derived profile " +
          profile.id +
          " artifact count budget exceeded: actual " +
          profile.member_ids.length +
          " > maximum " +
          profile.budgets.max_artifact_count,
      );
    }
    if (totalBytes > profile.budgets.max_total_bytes) {
      fail(
        "derived profile " +
          profile.id +
          " byte budget exceeded: actual " +
          totalBytes +
          " > maximum " +
          profile.budgets.max_total_bytes,
      );
    }
  }

  for (const profileId of completeness.required_derived_profile_ids) {
    const profile = derivedById.get(profileId);
    if (!profile) {
      fail("required derived profile is missing: " + profileId);
    }
    const included = new Set(profile.member_ids);
    for (const memberId of completeness.required_member_ids) {
      if (!included.has(memberId)) {
        fail(
          "derived profile " +
            profileId +
            " is missing required member " +
            memberId,
        );
      }
    }
  }

  if (members.length > budgets.max_artifact_count) {
    fail(
      "pack artifact count budget exceeded: actual " +
        members.length +
        " > maximum " +
        budgets.max_artifact_count,
    );
  }
  let totalBytes = 0;
  for (const member of members) {
    if (member.byte_length > budgets.max_single_artifact_bytes) {
      fail(
        "member " +
          member.id +
          " single-artifact byte budget exceeded: actual " +
          member.byte_length +
          " > maximum " +
          budgets.max_single_artifact_bytes,
      );
    }
    totalBytes += member.byte_length;
    if (!Number.isSafeInteger(totalBytes)) fail("pack total byte count is unsafe");
  }
  if (totalBytes > budgets.max_total_bytes) {
    fail(
      "pack total byte budget exceeded: actual " +
        totalBytes +
        " > maximum " +
        budgets.max_total_bytes,
    );
  }

  const actualDigest = await digestEducationAppPackProfile(root);
  if (actualDigest !== profileSha256) {
    fail(
      "profile_sha256 mismatch: declared " +
        profileSha256 +
        ", calculated " +
        actualDigest,
    );
  }

  return {
    contract_id: contractId,
    pack_id: packId,
    members,
    role_cardinalities: roleCardinalities,
    completeness,
    derived_export_profiles: derivedProfiles,
    budgets,
    profile_sha256: profileSha256,
  };
}

export const EDUCATION_APP_PACK_PROFILE_V2_ID =
  "education-app-pack-profile/v2" as const;

const FIVE_CLIP_BASELINE = [
  { action: "idle", samples: 4 },
  { action: "walk_forward", samples: 6 },
  { action: "walk_right", samples: 6 },
  { action: "attack", samples: 6 },
  { action: "receive_damage", samples: 4 },
] as const;
const MORPHOLOGY_RE = /^morphology\.[a-f0-9]{64}$/;
const RIG_RE = /^rig\.[a-f0-9]{64}$/;
const EQUIPMENT_RE = /^equipment\.[a-f0-9]{64}$/;
const DELIVERY_RE = /^delivery\.[a-f0-9]{64}$/;
const CLIP_RE = /^clip\.[a-f0-9]{64}$/;
const FRAME_PLAN_RE = /^frame-plan\.[a-f0-9]{64}$/;
const TEMPORAL_MEMBER_ROLE_RE =
  /^(source_frame|derived_pose_sheet|derived_atlas|source_glb|animation_bundle)$/;
type FiveClipAction = (typeof FIVE_CLIP_BASELINE)[number]["action"];
type TemporalMemberRole =
  | "source_frame"
  | "derived_pose_sheet"
  | "derived_atlas"
  | "source_glb"
  | "animation_bundle";

interface ForgeTemporalPackSourceBase {
  readonly kind: "forge_temporal";
  readonly contract_id: typeof FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID;
  readonly authoring_contract_id: typeof FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID;
  readonly staging_plan_contract_id: typeof PIXEL_FORGE_FIVE_CLIP_STAGING_PLAN_ID;
  readonly batch_id: string;
  readonly asset_id: string;
  readonly revision_id: string;
  readonly morphology_revision_id: string;
  readonly rig_signature: string;
  readonly equipment_signature: string;
  readonly delivery_id: string;
  readonly manifest_sha256: string;
  readonly staging_plan_sha256: string;
  readonly artifact_id: string;
  readonly artifact_sha256: string;
}

export type ForgeTemporalPackSource =
  | (ForgeTemporalPackSourceBase & {
      readonly artifact_role: "source_frame";
      readonly action: FiveClipAction;
      readonly clip_id: string;
      readonly frame_plan_id: string;
      readonly direction: ForgeDirection;
      readonly sequence: number;
      readonly sample_time_ms: number;
    })
  | (ForgeTemporalPackSourceBase & {
      readonly artifact_role: "derived_pose_sheet";
      readonly action: FiveClipAction;
      readonly clip_id: string;
      readonly frame_plan_id: string;
    })
  | (ForgeTemporalPackSourceBase & {
      readonly artifact_role:
        | "derived_atlas"
        | "source_glb"
        | "animation_bundle";
    });

export interface EducationAppPackMemberV2
  extends Omit<EducationAppPackMember, "source"> {
  readonly source:
    | PixelNativePackSource
    | ForgePackSource
    | ForgeTemporalPackSource;
}

export interface EducationAppPackTemporalBatchV2 {
  readonly id: string;
  readonly clips: readonly {
    readonly action: FiveClipAction;
    readonly clip_id: string;
    readonly frame_plan_id: string;
    readonly direction: ForgeDirection;
    readonly frame_member_ids: readonly string[];
    readonly pose_sheet_member_id: string;
  }[];
  readonly atlas_member_id: string;
  readonly source_glb_member_id: string;
  readonly animation_bundle_member_id: string;
}

export interface EducationAppPackProfileV2 {
  readonly contract_id: typeof EDUCATION_APP_PACK_PROFILE_V2_ID;
  readonly pack_id: string;
  readonly members: readonly EducationAppPackMemberV2[];
  readonly temporal_batches: readonly EducationAppPackTemporalBatchV2[];
  readonly role_cardinalities: EducationAppPackProfile["role_cardinalities"];
  readonly completeness: EducationAppPackProfile["completeness"];
  readonly derived_export_profiles: EducationAppPackProfile["derived_export_profiles"];
  readonly staging_admission: {
    readonly status: "validated_unadmitted";
    readonly model_acceptance: "pending";
    readonly visual_acceptance: "pending";
    readonly playback_acceptance: "pending";
    readonly pack_admission: "not_evaluated";
    readonly shipping: false;
  };
  readonly budgets: EducationAppPackProfile["budgets"];
  readonly profile_sha256: string;
}

function temporalAction(value: unknown, context: string): FiveClipAction {
  return stringMatching(
    value,
    /^(idle|walk_forward|walk_right|attack|receive_damage)$/,
    context,
  ) as FiveClipAction;
}

function temporalDirection(value: unknown, context: string): ForgeDirection {
  return stringMatching(
    value,
    /^(N|NE|E|SE|S|SW|W|NW)$/,
    context,
  ) as ForgeDirection;
}

function parseTemporalSource(
  source: UnknownRecord,
  context: string,
): ForgeTemporalPackSource {
  const common = [
    "kind",
    "contract_id",
    "authoring_contract_id",
    "staging_plan_contract_id",
    "batch_id",
    "asset_id",
    "revision_id",
    "morphology_revision_id",
    "rig_signature",
    "equipment_signature",
    "delivery_id",
    "manifest_sha256",
    "staging_plan_sha256",
    "artifact_id",
    "artifact_sha256",
    "artifact_role",
  ];
  const role = stringMatching(
    source.artifact_role,
    TEMPORAL_MEMBER_ROLE_RE,
    context + ".artifact_role",
  ) as TemporalMemberRole;
  const roleFields =
    role === "source_frame"
      ? [
          "action",
          "clip_id",
          "frame_plan_id",
          "direction",
          "sequence",
          "sample_time_ms",
        ]
      : role === "derived_pose_sheet"
        ? ["action", "clip_id", "frame_plan_id"]
        : [];
  exactKeys(source, [...common, ...roleFields], [...common, ...roleFields], context);
  const base = {
    kind: "forge_temporal" as const,
    contract_id: exactString(
      source.contract_id,
      FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID,
      context + ".contract_id",
    ) as typeof FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID,
    authoring_contract_id: exactString(
      source.authoring_contract_id,
      FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID,
      context + ".authoring_contract_id",
    ) as typeof FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID,
    staging_plan_contract_id: exactString(
      source.staging_plan_contract_id,
      PIXEL_FORGE_FIVE_CLIP_STAGING_PLAN_ID,
      context + ".staging_plan_contract_id",
    ) as typeof PIXEL_FORGE_FIVE_CLIP_STAGING_PLAN_ID,
    batch_id: stringMatching(source.batch_id, SEMANTIC_ID_RE, context + ".batch_id"),
    asset_id: stringMatching(source.asset_id, SEMANTIC_ID_RE, context + ".asset_id"),
    revision_id: stringMatching(source.revision_id, REVISION_RE, context + ".revision_id"),
    morphology_revision_id: stringMatching(
      source.morphology_revision_id,
      MORPHOLOGY_RE,
      context + ".morphology_revision_id",
    ),
    rig_signature: stringMatching(source.rig_signature, RIG_RE, context + ".rig_signature"),
    equipment_signature: stringMatching(
      source.equipment_signature,
      EQUIPMENT_RE,
      context + ".equipment_signature",
    ),
    delivery_id: stringMatching(source.delivery_id, DELIVERY_RE, context + ".delivery_id"),
    manifest_sha256: stringMatching(
      source.manifest_sha256,
      SHA256_RE,
      context + ".manifest_sha256",
    ),
    staging_plan_sha256: stringMatching(
      source.staging_plan_sha256,
      SHA256_RE,
      context + ".staging_plan_sha256",
    ),
    artifact_id: stringMatching(source.artifact_id, SEMANTIC_ID_RE, context + ".artifact_id"),
    artifact_sha256: stringMatching(
      source.artifact_sha256,
      SHA256_RE,
      context + ".artifact_sha256",
    ),
  };
  if (role === "source_frame") {
    return {
      ...base,
      artifact_role: role,
      action: temporalAction(source.action, context + ".action"),
      clip_id: stringMatching(source.clip_id, CLIP_RE, context + ".clip_id"),
      frame_plan_id: stringMatching(
        source.frame_plan_id,
        FRAME_PLAN_RE,
        context + ".frame_plan_id",
      ),
      direction: temporalDirection(source.direction, context + ".direction"),
      sequence: nonnegativeInteger(source.sequence, context + ".sequence"),
      sample_time_ms: nonnegativeInteger(
        source.sample_time_ms,
        context + ".sample_time_ms",
      ),
    };
  }
  if (role === "derived_pose_sheet") {
    return {
      ...base,
      artifact_role: role,
      action: temporalAction(source.action, context + ".action"),
      clip_id: stringMatching(source.clip_id, CLIP_RE, context + ".clip_id"),
      frame_plan_id: stringMatching(
        source.frame_plan_id,
        FRAME_PLAN_RE,
        context + ".frame_plan_id",
      ),
    };
  }
  return { ...base, artifact_role: role };
}

function parseMemberV2(value: unknown, index: number): EducationAppPackMemberV2 {
  const context = "members[" + index + "]";
  const member = record(value, context);
  const required = [
    "id",
    "semantic_role",
    "media_type",
    "byte_length",
    "sha256",
    "source",
  ];
  const allowed = [...required, "width", "height", "transparent"];
  exactKeys(member, required, allowed, context);
  const rawSource = record(member.source, context + ".source");
  const source =
    rawSource.kind === "forge_temporal"
      ? parseTemporalSource(rawSource, context + ".source")
      : parseSource(rawSource, context + ".source");
  const mediaType = stringMatching(
    member.media_type,
    MEDIA_TYPE_RE,
    context + ".media_type",
  );
  const width =
    member.width === undefined
      ? undefined
      : positiveInteger(member.width, context + ".width");
  const height =
    member.height === undefined
      ? undefined
      : positiveInteger(member.height, context + ".height");
  if (member.transparent !== undefined && typeof member.transparent !== "boolean") {
    fail(context + ".transparent must be a boolean");
  }
  if (source.kind === "forge_temporal") {
    const raster =
      source.artifact_role === "source_frame" ||
      source.artifact_role === "derived_pose_sheet" ||
      source.artifact_role === "derived_atlas";
    const expectedMediaType = raster
      ? "image/png"
      : source.artifact_role === "source_glb"
        ? "model/gltf-binary"
        : "application/json";
    if (mediaType !== expectedMediaType) {
      fail(
        context +
          " temporal " +
          source.artifact_role +
          " media_type must be " +
          expectedMediaType,
      );
    }
    if (raster) {
      if (width === undefined || height === undefined) {
        fail(context + " temporal PNG must declare positive width and height");
      }
      if (
        source.artifact_role === "source_frame" &&
        (width !== 128 || height !== 128)
      ) {
        fail(context + " temporal source frame must be exactly 128x128");
      }
      if (member.transparent !== true) {
        fail(context + " temporal PNG transparent must be true");
      }
    } else if (
      width !== undefined ||
      height !== undefined ||
      member.transparent !== undefined
    ) {
      fail(context + " temporal non-raster member must not declare raster fields");
    }
  } else if (source.kind === "forge") {
    // This invokes the unchanged v1 member rules for static Forge inputs.
    parseMember(value, index);
  } else if ((width === undefined) !== (height === undefined)) {
    fail(context + " Pixel-native width and height must be declared together");
  }
  return {
    id: stringMatching(member.id, SEMANTIC_ID_RE, context + ".id"),
    semantic_role: stringMatching(
      member.semantic_role,
      SEMANTIC_ID_RE,
      context + ".semantic_role",
    ),
    media_type: mediaType,
    byte_length: positiveInteger(member.byte_length, context + ".byte_length"),
    sha256: stringMatching(member.sha256, SHA256_RE, context + ".sha256"),
    ...(width === undefined ? {} : { width }),
    ...(height === undefined ? {} : { height }),
    ...(member.transparent === undefined
      ? {}
      : { transparent: member.transparent }),
    source,
  };
}

function parseTemporalBatch(
  value: unknown,
  index: number,
): EducationAppPackTemporalBatchV2 {
  const context = "temporal_batches[" + index + "]";
  const batch = record(value, context);
  const fields = [
    "id",
    "clips",
    "atlas_member_id",
    "source_glb_member_id",
    "animation_bundle_member_id",
  ];
  exactKeys(batch, fields, fields, context);
  const clips = array(batch.clips, context + ".clips").map(
    (clipValue, clipIndex) => {
      const clipContext = context + ".clips[" + clipIndex + "]";
      const clip = record(clipValue, clipContext);
      const clipFields = [
        "action",
        "clip_id",
        "frame_plan_id",
        "direction",
        "frame_member_ids",
        "pose_sheet_member_id",
      ];
      exactKeys(clip, clipFields, clipFields, clipContext);
      const expected = FIVE_CLIP_BASELINE[clipIndex];
      if (expected === undefined) {
        fail(context + ".clips must contain exactly five baseline clips");
      }
      const action = exactString(
        clip.action,
        expected.action,
        clipContext + ".action",
      ) as FiveClipAction;
      const frameMemberIds = uniqueStrings(
        clip.frame_member_ids,
        clipContext + ".frame_member_ids",
      );
      if (frameMemberIds.length !== expected.samples) {
        fail(
          clipContext +
            ".frame_member_ids must contain exactly " +
            expected.samples +
            " samples",
        );
      }
      return {
        action,
        clip_id: stringMatching(clip.clip_id, CLIP_RE, clipContext + ".clip_id"),
        frame_plan_id: stringMatching(
          clip.frame_plan_id,
          FRAME_PLAN_RE,
          clipContext + ".frame_plan_id",
        ),
        direction: temporalDirection(clip.direction, clipContext + ".direction"),
        frame_member_ids: frameMemberIds,
        pose_sheet_member_id: stringMatching(
          clip.pose_sheet_member_id,
          SEMANTIC_ID_RE,
          clipContext + ".pose_sheet_member_id",
        ),
      };
    },
  );
  if (clips.length !== FIVE_CLIP_BASELINE.length) {
    fail(context + ".clips must contain exactly five baseline clips");
  }
  const clipIds = new Set<string>();
  const framePlanIds = new Set<string>();
  for (const clip of clips) {
    if (clipIds.has(clip.clip_id)) {
      fail(context + ".clips contains duplicate clip_id " + clip.clip_id);
    }
    if (framePlanIds.has(clip.frame_plan_id)) {
      fail(
        context +
          ".clips contains duplicate frame_plan_id " +
          clip.frame_plan_id,
      );
    }
    clipIds.add(clip.clip_id);
    framePlanIds.add(clip.frame_plan_id);
  }
  return {
    id: stringMatching(batch.id, SEMANTIC_ID_RE, context + ".id"),
    clips,
    atlas_member_id: stringMatching(
      batch.atlas_member_id,
      SEMANTIC_ID_RE,
      context + ".atlas_member_id",
    ),
    source_glb_member_id: stringMatching(
      batch.source_glb_member_id,
      SEMANTIC_ID_RE,
      context + ".source_glb_member_id",
    ),
    animation_bundle_member_id: stringMatching(
      batch.animation_bundle_member_id,
      SEMANTIC_ID_RE,
      context + ".animation_bundle_member_id",
    ),
  };
}

function validateStaticForgeGroupsV2(
  members: readonly EducationAppPackMemberV2[],
): void {
  const groups = new Map<
    string,
    { manifest: string; directions: Set<ForgeDirection>; glbs: number }
  >();
  for (const member of members) {
    if (member.source.kind !== "forge") continue;
    const source = member.source;
    const id = source.asset_id + "@" + source.revision_id;
    const group = groups.get(id) ?? {
      manifest: source.manifest_sha256,
      directions: new Set<ForgeDirection>(),
      glbs: 0,
    };
    if (group.manifest !== source.manifest_sha256) {
      fail("Forge manifest group " + id + " must use a single manifest_sha256");
    }
    if (source.artifact_role === "directional_frame") {
      if (group.directions.has(source.direction)) {
        fail(
          "Forge manifest group " +
            id +
            " contains duplicate direction " +
            source.direction,
        );
      }
      group.directions.add(source.direction);
    } else {
      group.glbs += 1;
    }
    groups.set(id, group);
  }
  for (const [id, group] of groups) {
    for (const direction of DIRECTIONS) {
      if (!group.directions.has(direction)) {
        fail("Forge manifest group " + id + " is missing direction " + direction);
      }
    }
    if (group.directions.size !== DIRECTIONS.length) {
      fail("Forge manifest group " + id + " must contain exactly eight directions");
    }
    if (group.glbs < 1) {
      fail("Forge manifest group " + id + " requires at least one GLB");
    }
  }
}

function validateTemporalBatchMembers(
  batch: EducationAppPackTemporalBatchV2,
  membersById: ReadonlyMap<string, EducationAppPackMemberV2>,
  temporalMembers: readonly EducationAppPackMemberV2[],
): void {
  const referenced = new Set<string>();
  let expectedSequence = 0;
  let commonIdentity: string | undefined;
  const requireMember = (
    id: string,
    role: TemporalMemberRole,
  ): EducationAppPackMemberV2 & { source: ForgeTemporalPackSource } => {
    if (referenced.has(id)) {
      fail("temporal batch " + batch.id + " references member more than once: " + id);
    }
    referenced.add(id);
    const member = membersById.get(id);
    if (!member || member.source.kind !== "forge_temporal") {
      fail("temporal batch " + batch.id + " missing Forge temporal member " + id);
    }
    if (member.source.batch_id !== batch.id) {
      fail("temporal member " + id + " batch_id mismatch");
    }
    if (member.source.artifact_role !== role) {
      fail("temporal member " + id + " must have role " + role);
    }
    const identity = [
      member.source.asset_id,
      member.source.revision_id,
      member.source.morphology_revision_id,
      member.source.rig_signature,
      member.source.equipment_signature,
      member.source.delivery_id,
      member.source.manifest_sha256,
      member.source.staging_plan_sha256,
    ].join("|");
    if (commonIdentity === undefined) commonIdentity = identity;
    else if (commonIdentity !== identity) {
      fail("temporal batch " + batch.id + " must use one immutable source identity");
    }
    return member as EducationAppPackMemberV2 & {
      source: ForgeTemporalPackSource;
    };
  };
  for (const clip of batch.clips) {
    let previousTime = -1;
    for (const frameId of clip.frame_member_ids) {
      const source = requireMember(frameId, "source_frame").source;
      if (source.artifact_role !== "source_frame") throw new Error("unreachable");
      if (
        source.action !== clip.action ||
        source.clip_id !== clip.clip_id ||
        source.frame_plan_id !== clip.frame_plan_id ||
        source.direction !== clip.direction
      ) {
        fail(
          "temporal frame " +
            frameId +
            " clip/action/frame-plan/direction binding mismatch",
        );
      }
      if (source.sequence !== expectedSequence) {
        fail(
          "temporal frame " +
            frameId +
            " sequence must be " +
            expectedSequence,
        );
      }
      if (source.sample_time_ms <= previousTime) {
        fail("temporal clip " + clip.action + " sample times must increase strictly");
      }
      previousTime = source.sample_time_ms;
      expectedSequence += 1;
    }
    const sheet = requireMember(
      clip.pose_sheet_member_id,
      "derived_pose_sheet",
    ).source;
    if (sheet.artifact_role !== "derived_pose_sheet") throw new Error("unreachable");
    if (
      sheet.action !== clip.action ||
      sheet.clip_id !== clip.clip_id ||
      sheet.frame_plan_id !== clip.frame_plan_id
    ) {
      fail(
        "temporal pose sheet " +
          clip.pose_sheet_member_id +
          " clip/action/frame-plan binding mismatch",
      );
    }
  }
  requireMember(batch.atlas_member_id, "derived_atlas");
  requireMember(batch.source_glb_member_id, "source_glb");
  requireMember(batch.animation_bundle_member_id, "animation_bundle");
  const owned = temporalMembers.filter(
    ({ source }) =>
      source.kind === "forge_temporal" && source.batch_id === batch.id,
  );
  if (
    referenced.size !== owned.length ||
    owned.some(({ id }) => !referenced.has(id))
  ) {
    fail(
      "temporal batch " +
        batch.id +
        " contains unbound or missing artifact members",
    );
  }
}

export async function validateEducationAppPackProfileV2(
  value: unknown,
): Promise<EducationAppPackProfileV2> {
  const root = record(value, "education app pack profile v2");
  const contractId = exactString(
    root.contract_id,
    EDUCATION_APP_PACK_PROFILE_V2_ID,
    "contract_id",
  ) as typeof EDUCATION_APP_PACK_PROFILE_V2_ID;
  const fields = [
    "contract_id",
    "pack_id",
    "members",
    "temporal_batches",
    "role_cardinalities",
    "completeness",
    "derived_export_profiles",
    "staging_admission",
    "budgets",
    "profile_sha256",
  ];
  exactKeys(root, fields, fields, "education app pack profile v2");
  const packId = stringMatching(root.pack_id, SEMANTIC_ID_RE, "pack_id");
  const members = array(root.members, "members").map(parseMemberV2);
  const temporalBatches = array(
    root.temporal_batches,
    "temporal_batches",
  ).map(parseTemporalBatch);
  const roleCardinalities = array(
    root.role_cardinalities,
    "role_cardinalities",
  ).map(parseRoleCardinality);
  const completeness = parseCompleteness(root.completeness);
  const derivedProfiles = array(
    root.derived_export_profiles,
    "derived_export_profiles",
  ).map(parseDerivedProfile);
  const budgets = parseBudgets(root.budgets);
  const admissionRaw = record(root.staging_admission, "staging_admission");
  const admissionFields = [
    "status",
    "model_acceptance",
    "visual_acceptance",
    "playback_acceptance",
    "pack_admission",
    "shipping",
  ];
  exactKeys(
    admissionRaw,
    admissionFields,
    admissionFields,
    "staging_admission",
  );
  const stagingAdmission = {
    status: exactString(
      admissionRaw.status,
      "validated_unadmitted",
      "staging_admission.status",
    ) as "validated_unadmitted",
    model_acceptance: exactString(
      admissionRaw.model_acceptance,
      "pending",
      "staging_admission.model_acceptance",
    ) as "pending",
    visual_acceptance: exactString(
      admissionRaw.visual_acceptance,
      "pending",
      "staging_admission.visual_acceptance",
    ) as "pending",
    playback_acceptance: exactString(
      admissionRaw.playback_acceptance,
      "pending",
      "staging_admission.playback_acceptance",
    ) as "pending",
    pack_admission: exactString(
      admissionRaw.pack_admission,
      "not_evaluated",
      "staging_admission.pack_admission",
    ) as "not_evaluated",
    shipping:
      admissionRaw.shipping === false
        ? (false as const)
        : fail("staging_admission.shipping must be false"),
  };
  const profileSha256 = stringMatching(
    root.profile_sha256,
    SHA256_RE,
    "profile_sha256",
  );

  const membersById = new Map<string, EducationAppPackMemberV2>();
  const sourceIdentities = new Set<string>();
  for (const member of members) {
    if (membersById.has(member.id)) fail("duplicate member id " + member.id);
    membersById.set(member.id, member);
    if (
      member.source.kind === "forge_temporal" &&
      member.source.artifact_sha256 !== member.sha256
    ) {
      fail(
        "member " +
          member.id +
          " temporal artifact_sha256 does not match member sha256",
      );
    }
    if (
      member.source.kind === "forge" &&
      member.source.artifact_sha256 !== member.sha256
    ) {
      fail(
        "member " +
          member.id +
          " Forge artifact_sha256 does not match member sha256",
      );
    }
    const identity =
      member.source.kind === "pixel_native"
        ? "pixel|" +
          member.source.source_id +
          "|" +
          member.source.source_sha256
        : member.source.kind === "forge"
          ? "forge|" +
            member.source.asset_id +
            "|" +
            member.source.revision_id +
            "|" +
            member.source.artifact_id
          : "forge_temporal|" +
            member.source.delivery_id +
            "|" +
            member.source.artifact_id;
    if (sourceIdentities.has(identity)) {
      fail("duplicate source artifact identity " + identity);
    }
    sourceIdentities.add(identity);
  }
  validateStaticForgeGroupsV2(members);

  const batchesById = new Map<string, EducationAppPackTemporalBatchV2>();
  for (const batch of temporalBatches) {
    if (batchesById.has(batch.id)) {
      fail("duplicate temporal batch id " + batch.id);
    }
    batchesById.set(batch.id, batch);
    validateTemporalBatchMembers(batch, membersById, members);
  }
  for (const member of members) {
    if (
      member.source.kind === "forge_temporal" &&
      !batchesById.has(member.source.batch_id)
    ) {
      fail(
        "temporal member " +
          member.id +
          " references unknown batch " +
          member.source.batch_id,
      );
    }
  }

  const cardinalities = new Map<
    string,
    (typeof roleCardinalities)[number]
  >();
  for (const entry of roleCardinalities) {
    if (cardinalities.has(entry.semantic_role)) {
      fail("duplicate role cardinality for " + entry.semantic_role);
    }
    cardinalities.set(entry.semantic_role, entry);
  }
  const roleCounts = new Map<string, number>();
  for (const member of members) {
    if (!cardinalities.has(member.semantic_role)) {
      fail("undeclared semantic role " + member.semantic_role);
    }
    roleCounts.set(
      member.semantic_role,
      (roleCounts.get(member.semantic_role) ?? 0) + 1,
    );
  }
  for (const entry of roleCardinalities) {
    const count = roleCounts.get(entry.semantic_role) ?? 0;
    if (count < entry.minimum) {
      fail(
        "role " +
          entry.semantic_role +
          " requires minimum " +
          entry.minimum +
          "; actual " +
          count,
      );
    }
    if (count > entry.maximum) {
      fail(
        "role " +
          entry.semantic_role +
          " permits maximum " +
          entry.maximum +
          "; actual " +
          count,
      );
    }
  }

  for (const id of completeness.required_member_ids) {
    if (!membersById.has(id)) fail("required member is missing: " + id);
  }
  const memberOrder = new Map(members.map(({ id }, index) => [id, index]));
  const derivedById = new Map<string, (typeof derivedProfiles)[number]>();
  for (const profile of derivedProfiles) {
    if (derivedById.has(profile.id)) {
      fail("duplicate derived profile id " + profile.id);
    }
    derivedById.set(profile.id, profile);
    const seen = new Set<string>();
    let prior = -1;
    let bytes = 0;
    for (const id of profile.member_ids) {
      if (seen.has(id)) {
        fail("derived profile " + profile.id + " contains duplicate member " + id);
      }
      seen.add(id);
      const member = membersById.get(id);
      if (!member) {
        fail("derived profile " + profile.id + " references unknown member " + id);
      }
      const position = memberOrder.get(id)!;
      if (position <= prior) {
        fail("derived profile " + profile.id + " violates pack membership order");
      }
      prior = position;
      bytes += member.byte_length;
      if (!Number.isSafeInteger(bytes)) {
        fail("derived profile " + profile.id + " byte total is unsafe");
      }
    }
    if (profile.member_ids.length > profile.budgets.max_artifact_count) {
      fail("derived profile " + profile.id + " artifact count budget exceeded");
    }
    if (bytes > profile.budgets.max_total_bytes) {
      fail("derived profile " + profile.id + " byte budget exceeded");
    }
  }
  for (const id of completeness.required_derived_profile_ids) {
    const profile = derivedById.get(id);
    if (!profile) fail("required derived profile is missing: " + id);
    const included = new Set(profile.member_ids);
    for (const memberId of completeness.required_member_ids) {
      if (!included.has(memberId)) {
        fail(
          "derived profile " +
            id +
            " is missing required member " +
            memberId,
        );
      }
    }
  }
  if (members.length > budgets.max_artifact_count) {
    fail("pack artifact count budget exceeded");
  }
  let totalBytes = 0;
  for (const member of members) {
    if (member.byte_length > budgets.max_single_artifact_bytes) {
      fail("member " + member.id + " single-artifact byte budget exceeded");
    }
    totalBytes += member.byte_length;
    if (!Number.isSafeInteger(totalBytes)) {
      fail("pack total byte count is unsafe");
    }
  }
  if (totalBytes > budgets.max_total_bytes) {
    fail("pack total byte budget exceeded");
  }
  const actualDigest = await digestEducationAppPackProfile(root);
  if (actualDigest !== profileSha256) {
    fail(
      "profile_sha256 mismatch: declared " +
        profileSha256 +
        ", calculated " +
        actualDigest,
    );
  }

  return {
    contract_id: contractId,
    pack_id: packId,
    members,
    temporal_batches: temporalBatches,
    role_cardinalities: roleCardinalities,
    completeness,
    derived_export_profiles: derivedProfiles,
    staging_admission: stagingAdmission,
    budgets,
    profile_sha256: profileSha256,
  };
}
