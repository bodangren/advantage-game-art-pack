import {
  DUAL_THEME_CAPABILITY_FAMILIES,
  DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
  digestDualThemePackRequirementsV2,
  validateDualThemePackRequirementsV2,
  type DualThemeCapabilityRequirementV2,
  type DualThemeExecutionContractV2,
  type DualThemePackRequirementsV2,
  type DualThemeReviewRequirement,
  type DualThemeSourceOwner,
  type DualThemeTemporalRequirementV2,
  type DualThemeUsageDemandV2,
} from "./dual-theme-pack-contract";
import { sha256 } from "./svg-assets";

export const DUAL_THEME_ASSET_DEMAND_CATALOG_ID =
  "dual-theme-asset-demand-catalog/v2" as const;
export const DUAL_THEME_ASSET_DEMAND_COMPILATION_ID =
  "dual-theme-asset-demand-compilation/v2" as const;

export interface DualThemeCatalogTheme {
  readonly id: string;
  readonly display_name: string;
  readonly audience: string;
}

export interface DualThemeAssetDemand {
  readonly id: string;
  readonly family: string;
  readonly theme_scope: "mirrored";
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

export interface DualThemeAssetDemandCatalog {
  readonly contract_id: typeof DUAL_THEME_ASSET_DEMAND_CATALOG_ID;
  readonly catalog_id: string;
  readonly program_id: string;
  readonly themes: readonly [DualThemeCatalogTheme, DualThemeCatalogTheme];
  readonly demands: readonly DualThemeAssetDemand[];
  readonly catalog_sha256: string;
}

export interface DualThemeAssetDemandCompilation {
  readonly contract_id: typeof DUAL_THEME_ASSET_DEMAND_COMPILATION_ID;
  readonly source_catalog: {
    readonly contract_id: typeof DUAL_THEME_ASSET_DEMAND_CATALOG_ID;
    readonly catalog_id: string;
    readonly catalog_sha256: string;
    readonly theme_scope: "mirrored";
    readonly themes: readonly [DualThemeCatalogTheme, DualThemeCatalogTheme];
  };
  readonly requirements: DualThemePackRequirementsV2;
  readonly compilation_sha256: string;
}

export class DualThemeAssetDemandCatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DualThemeAssetDemandCatalogValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;

const SHA256_RE = /^[a-f0-9]{64}$/;
const SEMANTIC_ID_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const CONTRACT_ID_RE = /^[a-z][a-z0-9._-]*(?:\/v[1-9][0-9]*)$/;
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const REQUIRED_EXECUTION_KIND_BY_FAMILY = {
  presentation: "crop_focal_derivation",
  tile_environment: "tiling_adjacency",
  ui: "nine_slice_text_safe_area",
} as const;

function fail(message: string): never {
  throw new DualThemeAssetDemandCatalogValidationError(message);
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

function matching(value: unknown, pattern: RegExp, context: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    return fail(`${context} is invalid`);
  }
  return value;
}

function nonemptyString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    return fail(`${context} must be a non-empty string of at most 200 characters`);
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

function orderedUniqueStrings(
  value: unknown,
  context: string,
  options: { readonly allowEmpty?: boolean } = {},
): readonly string[] {
  if (!Array.isArray(value) || (!options.allowEmpty && value.length === 0)) {
    return fail(`${context} must be ${options.allowEmpty ? "an" : "a non-empty"} array`);
  }
  const parsed = value.map((entry, index) =>
    matching(entry, SEMANTIC_ID_RE, `${context}[${index}]`),
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

function canonicalValue(value: unknown, context: string): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
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

function compareCanonicalStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function canonicalizeWithout(value: unknown, excludedKey: string, context: string): string {
  const input = record(value, context);
  const unsigned = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== excludedKey),
  );
  return JSON.stringify(canonicalValue(unsigned, context));
}

export function canonicalizeDualThemeAssetDemandCatalog(value: unknown): string {
  return canonicalizeWithout(value, "catalog_sha256", "dual-theme asset-demand catalog");
}

export async function digestDualThemeAssetDemandCatalog(value: unknown): Promise<string> {
  return sha256(canonicalizeDualThemeAssetDemandCatalog(value));
}

export function canonicalizeDualThemeAssetDemandCompilation(value: unknown): string {
  return canonicalizeWithout(
    value,
    "compilation_sha256",
    "dual-theme asset-demand compilation",
  );
}

export async function digestDualThemeAssetDemandCompilation(value: unknown): Promise<string> {
  return sha256(canonicalizeDualThemeAssetDemandCompilation(value));
}

function parseTheme(value: unknown, index: number): DualThemeCatalogTheme {
  const context = `asset-demand catalog.themes[${index}]`;
  const raw = record(value, context);
  const fields = ["id", "display_name", "audience"];
  exactKeys(raw, fields, fields, context);
  return {
    id: matching(raw.id, SEMANTIC_ID_RE, `${context}.id`),
    display_name: nonemptyString(raw.display_name, `${context}.display_name`),
    audience: matching(raw.audience, SEMANTIC_ID_RE, `${context}.audience`),
  };
}

function parseUsageDemand(
  value: unknown,
  demandIndex: number,
  usageIndex: number,
): DualThemeUsageDemandV2 {
  const context =
    `asset-demand catalog.demands[${demandIndex}].usage_demands[${usageIndex}]`;
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

function parseExecutionContract(
  value: unknown,
  demandIndex: number,
  executionIndex: number,
): DualThemeExecutionContractV2 {
  const context =
    `asset-demand catalog.demands[${demandIndex}].execution_contracts[${executionIndex}]`;
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

function parseTemporalRequirement(
  value: unknown,
  demandIndex: number,
): DualThemeTemporalRequirementV2 {
  const context = `asset-demand catalog.demands[${demandIndex}].temporal_requirement`;
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

function orderedBy(
  keys: readonly string[],
  context: string,
): void {
  const sorted = [...keys].sort(compareCanonicalStrings);
  if (keys.some((key, index) => key !== sorted[index])) {
    fail(`${context} must use canonical ordering`);
  }
  if (new Set(keys).size !== keys.length) fail(`${context} contains a duplicate entry`);
}

function parseDemand(value: unknown, index: number): DualThemeAssetDemand {
  const context = `asset-demand catalog.demands[${index}]`;
  const raw = record(value, context);
  const required = [
    "id",
    "family",
    "theme_scope",
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

  const id = matching(raw.id, SEMANTIC_ID_RE, `${context}.id`);
  const family = matching(raw.family, SEMANTIC_ID_RE, `${context}.family`);
  if (!Array.isArray(raw.usage_demands) || raw.usage_demands.length === 0) {
    fail(`${context}.usage_demands must be a non-empty array`);
  }
  const usageDemands = raw.usage_demands.map((entry, usageIndex) =>
    parseUsageDemand(entry, index, usageIndex),
  );
  orderedBy(
    usageDemands.map(
      ({ usage_context, basis, evidence_reference }) =>
        `${usage_context}:${basis}:${evidence_reference}`,
    ),
    `${context}.usage_demands`,
  );
  if (!Array.isArray(raw.execution_contracts)) {
    fail(`${context}.execution_contracts must be an array`);
  }
  const executionContracts = raw.execution_contracts.map((entry, executionIndex) =>
    parseExecutionContract(entry, index, executionIndex),
  );
  orderedBy(
    executionContracts.map(
      ({ kind, contract_reference }) => `${kind}:${contract_reference}`,
    ),
    `${context}.execution_contracts`,
  );
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
      : parseTemporalRequirement(raw.temporal_requirement, index);
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
    fail(`${context} audio demands must be temporal artifacts`);
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
    theme_scope: exact(raw.theme_scope, "mirrored", `${context}.theme_scope`) as "mirrored",
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

function parseCatalogShape(value: unknown): DualThemeAssetDemandCatalog {
  const context = "dual-theme asset-demand catalog";
  const raw = record(value, context);
  const fields = [
    "contract_id",
    "catalog_id",
    "program_id",
    "themes",
    "demands",
    "catalog_sha256",
  ];
  exactKeys(raw, fields, fields, context);
  exact(raw.contract_id, DUAL_THEME_ASSET_DEMAND_CATALOG_ID, `${context}.contract_id`);

  if (!Array.isArray(raw.themes) || raw.themes.length !== 2) {
    fail(`${context}.themes must contain exactly two mirrored themes`);
  }
  const themes = raw.themes.map(parseTheme);
  const themeIds = new Set<string>();
  for (const theme of themes) {
    if (themeIds.has(theme.id)) fail(`${context}.themes contains duplicate theme id ${theme.id}`);
    themeIds.add(theme.id);
  }
  if (compareCanonicalStrings(themes[0]!.id, themes[1]!.id) >= 0) {
    fail(`${context}.themes must use canonical theme-id ordering`);
  }

  if (!Array.isArray(raw.demands) || raw.demands.length === 0) {
    fail(`${context}.demands must be a non-empty array`);
  }
  const demands = raw.demands.map(parseDemand);
  const demandIds = new Set<string>();
  for (const [index, demand] of demands.entries()) {
    if (demandIds.has(demand.id)) {
      fail(`${context}.demands contains duplicate demand id ${demand.id}`);
    }
    demandIds.add(demand.id);
    if (index > 0 && compareCanonicalStrings(demands[index - 1]!.id, demand.id) >= 0) {
      fail(`${context}.demands must use canonical demand-id ordering`);
    }
  }
  for (const family of DUAL_THEME_CAPABILITY_FAMILIES) {
    if (!demands.some((demand) => demand.family === family)) {
      fail(`${context}.demands missing required core family ${family}`);
    }
  }
  return {
    contract_id: DUAL_THEME_ASSET_DEMAND_CATALOG_ID,
    catalog_id: matching(raw.catalog_id, SEMANTIC_ID_RE, `${context}.catalog_id`),
    program_id: matching(raw.program_id, SEMANTIC_ID_RE, `${context}.program_id`),
    themes: themes as unknown as readonly [DualThemeCatalogTheme, DualThemeCatalogTheme],
    demands,
    catalog_sha256: matching(raw.catalog_sha256, SHA256_RE, `${context}.catalog_sha256`),
  };
}

export async function validateDualThemeAssetDemandCatalog(
  value: unknown,
): Promise<DualThemeAssetDemandCatalog> {
  const parsed = parseCatalogShape(value);
  if ((await digestDualThemeAssetDemandCatalog(parsed)) !== parsed.catalog_sha256) {
    fail("dual-theme asset-demand catalog.catalog_sha256 mismatch");
  }
  return parsed;
}

function compileCapability(demand: DualThemeAssetDemand): DualThemeCapabilityRequirementV2 {
  return {
    id: demand.id,
    family: demand.family,
    usage_demands: demand.usage_demands,
    required_states: demand.required_states,
    required_variants: demand.required_variants,
    physical_contract_reference: demand.physical_contract_reference,
    source_owner: demand.source_owner,
    review_requirement: demand.review_requirement,
    delivery_kind: demand.delivery_kind,
    media_class: demand.media_class,
    execution_contracts: demand.execution_contracts,
    demand_reference: demand.demand_reference,
    ...(demand.temporal_requirement === undefined
      ? {}
      : { temporal_requirement: demand.temporal_requirement }),
    ...(demand.supersedes_capability_id === undefined
      ? {}
      : { supersedes_capability_id: demand.supersedes_capability_id }),
  };
}

export async function compileDualThemeAssetDemandCatalog(
  value: unknown,
): Promise<DualThemeAssetDemandCompilation> {
  const catalog = await validateDualThemeAssetDemandCatalog(value);
  const unsignedRequirements = {
    contract_id: DUAL_THEME_PACK_REQUIREMENTS_V2_ID,
    program_id: catalog.program_id,
    theme_ids: catalog.themes.map(({ id }) => id) as unknown as readonly [string, string],
    capabilities: catalog.demands.map(compileCapability),
  };
  const requirements = await validateDualThemePackRequirementsV2({
    ...unsignedRequirements,
    requirements_sha256: await digestDualThemePackRequirementsV2(unsignedRequirements),
  });
  const unsignedCompilation = {
    contract_id: DUAL_THEME_ASSET_DEMAND_COMPILATION_ID,
    source_catalog: {
      contract_id: catalog.contract_id,
      catalog_id: catalog.catalog_id,
      catalog_sha256: catalog.catalog_sha256,
      theme_scope: "mirrored" as const,
      themes: catalog.themes,
    },
    requirements,
  };
  return {
    ...unsignedCompilation,
    compilation_sha256: await digestDualThemeAssetDemandCompilation(unsignedCompilation),
  };
}
