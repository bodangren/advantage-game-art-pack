import {
  validateDualThemeAssetDemandCatalog,
  type DualThemeAssetDemand,
  type DualThemeAssetDemandCatalog,
  type DualThemeCatalogTheme,
} from "./dual-theme-asset-demand-catalog";
import {
  type DualThemeExecutionContractV2,
  type DualThemeReviewRequirement,
  type DualThemeSourceOwner,
  type DualThemeTemporalRequirementV2,
  type DualThemeUsageDemandV2,
} from "./dual-theme-pack-contract";
import { sha256 } from "./svg-assets";

export const THEME_PACK_PRODUCTION_INVENTORY_ID =
  "theme-pack-production-inventory/v1" as const;
export const THEME_PACK_PRODUCTION_PLAN_ID =
  "theme-pack-production-plan/v1" as const;

export const THEME_PACK_PRODUCTION_FAMILIES = [
  "audio",
  "equipment",
  "presentation",
  "projectile",
  "prop",
  "tile_environment",
  "ui",
  "vfx",
] as const;

export type ThemePackProductionFamily =
  (typeof THEME_PACK_PRODUCTION_FAMILIES)[number];
export type ThemePackProductionArtifactStatus =
  | "missing_artifacts"
  | "evidence_blocked"
  | "admitted_evidence_complete";
export type ThemePackProductionMissingEvidence =
  | "artifact_absent"
  | "admission_missing"
  | "requirement_binding_mismatch"
  | "state_coverage_missing"
  | "variant_coverage_missing"
  | "execution_contract_evidence_missing"
  | "temporal_signature_missing";

export interface ThemePackProductionArtifact {
  readonly id: string;
  readonly theme_id: string;
  readonly capability_id: string;
  readonly artifact_id: string;
  readonly revision_id: string;
  readonly sha256: string;
  readonly reference: string;
  readonly media_type: string;
  readonly role: string;
  readonly physical_contract_reference: string;
  readonly media_class: "visual" | "audio";
  readonly source_owner: DualThemeSourceOwner;
  readonly review_requirement: DualThemeReviewRequirement;
  readonly admission_status: "candidate" | "admitted";
  readonly covered_states: readonly string[];
  readonly covered_variants: readonly string[];
  readonly execution_contract_evidence: readonly DualThemeExecutionContractV2[];
  readonly provenance_reference: string;
  readonly evidence_reference: string;
  readonly temporal_signature_sha256?: string;
}

export interface ThemePackProductionInventory {
  readonly contract_id: typeof THEME_PACK_PRODUCTION_INVENTORY_ID;
  readonly catalog_sha256: string;
  readonly artifacts: readonly ThemePackProductionArtifact[];
  readonly inventory_sha256: string;
}

export interface ThemePackProductionWorkOrder {
  readonly id: string;
  readonly theme_id: string;
  readonly theme_display_name: string;
  readonly audience: string;
  readonly capability_id: string;
  readonly family: ThemePackProductionFamily;
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
  readonly matched_artifact_ids: readonly string[];
  readonly missing_evidence: readonly ThemePackProductionMissingEvidence[];
  readonly artifact_status: ThemePackProductionArtifactStatus;
}

export interface ThemePackProductionFamilySummary {
  readonly family: ThemePackProductionFamily;
  readonly demand_count: number;
  readonly work_order_count: number;
  readonly admitted_evidence_complete_count: number;
  readonly status:
    | "catalog_gap"
    | "missing_artifacts"
    | "evidence_blocked"
    | "admitted_evidence_complete";
}

export interface ThemePackProductionPlan {
  readonly contract_id: typeof THEME_PACK_PRODUCTION_PLAN_ID;
  readonly program_id: string;
  readonly catalog: {
    readonly catalog_id: string;
    readonly catalog_sha256: string;
  };
  readonly inventory: {
    readonly inventory_sha256: string;
  };
  readonly themes: readonly [DualThemeCatalogTheme, DualThemeCatalogTheme];
  readonly shipping: false;
  readonly status: "incomplete" | "evidence_complete_pending_pack_acceptance";
  readonly catalog_gaps: readonly ThemePackProductionFamily[];
  readonly family_summaries: readonly ThemePackProductionFamilySummary[];
  readonly work_orders: readonly ThemePackProductionWorkOrder[];
  readonly plan_sha256: string;
}

export class ThemePackProductionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThemePackProductionValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;

const SHA256_RE = /^[a-f0-9]{64}$/;
const REVISION_RE = /^revision\.[a-f0-9]{64}$/;
const SEMANTIC_ID_RE = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const CONTRACT_ID_RE = /^[a-z][a-z0-9._-]*(?:\/v[1-9][0-9]*)$/;
const MEDIA_TYPE_RE = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/;
const URL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const EXPECTED_THEMES = [
  { id: "chibi_quest", display_name: "Chibi Quest", audience: "younger" },
  { id: "riven_lands", display_name: "Riven Lands", audience: "older" },
] as const;

function fail(message: string): never {
  throw new ThemePackProductionValidationError(message);
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
  if (missing.length > 0) fail(`${context} missing required key(s): ${missing.join(", ")}`);
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length > 0) {
    fail(`${context} contains unexpected key(s): ${unexpected.join(", ")}`);
  }
}

function matching(value: unknown, pattern: RegExp, context: string): string {
  if (typeof value !== "string" || !pattern.test(value)) fail(`${context} is invalid`);
  return value;
}

function exact(value: unknown, expected: string, context: string): string {
  if (value !== expected) fail(`${context} must be ${expected}`);
  return expected;
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

function compareCanonicalStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
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
  if (new Set(parsed).size !== parsed.length) fail(`${context} contains a duplicate entry`);
  const sorted = [...parsed].sort(compareCanonicalStrings);
  if (parsed.some((entry, index) => entry !== sorted[index])) {
    fail(`${context} must use canonical lexicographic ordering`);
  }
  return parsed;
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
  if (typeof value !== "object") return fail(`${context} contains a non-JSON value`);
  const input = value as UnknownRecord;
  return Object.fromEntries(
    Object.keys(input)
      .sort(compareCanonicalStrings)
      .map((key) => {
        if (input[key] === undefined) fail(`${context}.${key} is undefined`);
        return [key, canonicalValue(input[key], `${context}.${key}`)];
      }),
  );
}

function canonicalizeWithout(value: unknown, excludedKey: string, context: string): string {
  const input = record(value, context);
  return JSON.stringify(
    canonicalValue(
      Object.fromEntries(Object.entries(input).filter(([key]) => key !== excludedKey)),
      context,
    ),
  );
}

export function canonicalizeThemePackProductionInventory(value: unknown): string {
  return canonicalizeWithout(value, "inventory_sha256", "theme-pack production inventory");
}

export async function digestThemePackProductionInventory(value: unknown): Promise<string> {
  return sha256(canonicalizeThemePackProductionInventory(value));
}

export function canonicalizeThemePackProductionPlan(value: unknown): string {
  return canonicalizeWithout(value, "plan_sha256", "theme-pack production plan");
}

export async function digestThemePackProductionPlan(value: unknown): Promise<string> {
  return sha256(canonicalizeThemePackProductionPlan(value));
}

function parseArtifact(value: unknown, index: number): ThemePackProductionArtifact {
  const context = `theme-pack production inventory.artifacts[${index}]`;
  const raw = record(value, context);
  const required = [
    "id",
    "theme_id",
    "capability_id",
    "artifact_id",
    "revision_id",
    "sha256",
    "reference",
    "media_type",
    "role",
    "physical_contract_reference",
    "media_class",
    "source_owner",
    "review_requirement",
    "admission_status",
    "covered_states",
    "covered_variants",
    "execution_contract_evidence",
    "provenance_reference",
    "evidence_reference",
  ];
  exactKeys(raw, required, [...required, "temporal_signature_sha256"], context);
  const admissionStatus = raw.admission_status;
  if (admissionStatus !== "candidate" && admissionStatus !== "admitted") {
    fail(`${context}.admission_status must be candidate or admitted`);
  }
  if (raw.media_class !== "visual" && raw.media_class !== "audio") {
    fail(`${context}.media_class must be visual or audio`);
  }
  if (raw.source_owner !== "forge" && raw.source_owner !== "pixel") {
    fail(`${context}.source_owner must be forge or pixel`);
  }
  if (
    raw.review_requirement !== "delivery_resolution" &&
    raw.review_requirement !== "reference_convergence"
  ) {
    fail(`${context}.review_requirement is invalid`);
  }
  if (!Array.isArray(raw.execution_contract_evidence)) {
    fail(`${context}.execution_contract_evidence must be an array`);
  }
  const executionContractEvidence = raw.execution_contract_evidence.map((value, evidenceIndex) => {
    const evidenceContext = `${context}.execution_contract_evidence[${evidenceIndex}]`;
    const evidence = record(value, evidenceContext);
    const fields = ["kind", "contract_reference", "evidence_reference"];
    exactKeys(evidence, fields, fields, evidenceContext);
    return {
      kind: matching(evidence.kind, SEMANTIC_ID_RE, `${evidenceContext}.kind`),
      contract_reference: matching(
        evidence.contract_reference,
        CONTRACT_ID_RE,
        `${evidenceContext}.contract_reference`,
      ),
      evidence_reference: portableReference(
        evidence.evidence_reference,
        `${evidenceContext}.evidence_reference`,
      ),
    };
  });
  const executionKeys = executionContractEvidence.map(
    ({ kind, contract_reference }) => `${kind}:${contract_reference}`,
  );
  if (new Set(executionKeys).size !== executionKeys.length) {
    fail(`${context}.execution_contract_evidence contains a duplicate contract`);
  }
  const sortedExecutionKeys = [...executionKeys].sort(compareCanonicalStrings);
  if (executionKeys.some((key, index) => key !== sortedExecutionKeys[index])) {
    fail(`${context}.execution_contract_evidence must use canonical kind/contract ordering`);
  }
  const mediaType = matching(raw.media_type, MEDIA_TYPE_RE, `${context}.media_type`);
  if (
    (raw.media_class === "audio" && !mediaType.startsWith("audio/")) ||
    (raw.media_class === "visual" && !mediaType.startsWith("image/"))
  ) {
    fail(`${context}.media_type must match media_class`);
  }
  return {
    id: matching(raw.id, SEMANTIC_ID_RE, `${context}.id`),
    theme_id: matching(raw.theme_id, SEMANTIC_ID_RE, `${context}.theme_id`),
    capability_id: matching(raw.capability_id, SEMANTIC_ID_RE, `${context}.capability_id`),
    artifact_id: matching(raw.artifact_id, SEMANTIC_ID_RE, `${context}.artifact_id`),
    revision_id: matching(raw.revision_id, REVISION_RE, `${context}.revision_id`),
    sha256: matching(raw.sha256, SHA256_RE, `${context}.sha256`),
    reference: portableReference(raw.reference, `${context}.reference`),
    media_type: mediaType,
    role: matching(raw.role, SEMANTIC_ID_RE, `${context}.role`),
    physical_contract_reference: matching(
      raw.physical_contract_reference,
      CONTRACT_ID_RE,
      `${context}.physical_contract_reference`,
    ),
    media_class: raw.media_class,
    source_owner: raw.source_owner,
    review_requirement: raw.review_requirement,
    admission_status: admissionStatus,
    covered_states: orderedUniqueStrings(raw.covered_states, `${context}.covered_states`, {
      allowEmpty: true,
    }),
    covered_variants: orderedUniqueStrings(raw.covered_variants, `${context}.covered_variants`, {
      allowEmpty: true,
    }),
    execution_contract_evidence: executionContractEvidence,
    provenance_reference: portableReference(
      raw.provenance_reference,
      `${context}.provenance_reference`,
    ),
    evidence_reference: portableReference(raw.evidence_reference, `${context}.evidence_reference`),
    ...(raw.temporal_signature_sha256 === undefined
      ? {}
      : {
          temporal_signature_sha256: matching(
            raw.temporal_signature_sha256,
            SHA256_RE,
            `${context}.temporal_signature_sha256`,
          ),
        }),
  };
}

function parseInventoryShape(value: unknown): ThemePackProductionInventory {
  const context = "theme-pack production inventory";
  const raw = record(value, context);
  const fields = ["contract_id", "catalog_sha256", "artifacts", "inventory_sha256"];
  exactKeys(raw, fields, fields, context);
  exact(raw.contract_id, THEME_PACK_PRODUCTION_INVENTORY_ID, `${context}.contract_id`);
  if (!Array.isArray(raw.artifacts)) fail(`${context}.artifacts must be an array`);
  const artifacts = raw.artifacts.map(parseArtifact);
  const ids = new Set<string>();
  const identities = new Set<string>();
  for (const [index, artifact] of artifacts.entries()) {
    if (ids.has(artifact.id)) fail(`${context} contains duplicate artifact id ${artifact.id}`);
    ids.add(artifact.id);
    const identity = `${artifact.revision_id}:${artifact.artifact_id}`;
    if (identities.has(identity)) fail(`${context} contains duplicate artifact identity ${identity}`);
    identities.add(identity);
    if (index > 0 && compareCanonicalStrings(artifacts[index - 1]!.id, artifact.id) >= 0) {
      fail(`${context}.artifacts must use canonical artifact-id ordering`);
    }
  }
  return {
    contract_id: THEME_PACK_PRODUCTION_INVENTORY_ID,
    catalog_sha256: matching(raw.catalog_sha256, SHA256_RE, `${context}.catalog_sha256`),
    artifacts,
    inventory_sha256: matching(raw.inventory_sha256, SHA256_RE, `${context}.inventory_sha256`),
  };
}

export async function validateThemePackProductionInventory(
  value: unknown,
): Promise<ThemePackProductionInventory> {
  const parsed = parseInventoryShape(value);
  if ((await digestThemePackProductionInventory(parsed)) !== parsed.inventory_sha256) {
    fail("theme-pack production inventory.inventory_sha256 mismatch");
  }
  return parsed;
}

function assertFixedThemes(catalog: DualThemeAssetDemandCatalog): void {
  if (
    catalog.themes.some(
      (theme, index) =>
        theme.id !== EXPECTED_THEMES[index]!.id ||
        theme.display_name !== EXPECTED_THEMES[index]!.display_name ||
        theme.audience !== EXPECTED_THEMES[index]!.audience,
    )
  ) {
    fail("asset-demand catalog must use the fixed downstream theme identity contract");
  }
}

function isProductionFamily(family: string): family is ThemePackProductionFamily {
  return (THEME_PACK_PRODUCTION_FAMILIES as readonly string[]).includes(family);
}

function includesEvery(values: readonly string[], required: readonly string[]): boolean {
  const available = new Set(values);
  return required.every((entry) => available.has(entry));
}

function missingEvidence(
  demand: DualThemeAssetDemand,
  artifacts: readonly ThemePackProductionArtifact[],
): readonly ThemePackProductionMissingEvidence[] {
  const missing = new Set<ThemePackProductionMissingEvidence>();
  if (artifacts.length === 0) missing.add("artifact_absent");
  if (!artifacts.some(({ admission_status }) => admission_status === "admitted")) {
    missing.add("admission_missing");
  }
  const admitted = artifacts.filter(({ admission_status }) => admission_status === "admitted");
  const bound = admitted.filter(
    (artifact) =>
      artifact.physical_contract_reference === demand.physical_contract_reference &&
      artifact.media_class === demand.media_class &&
      artifact.source_owner === demand.source_owner &&
      artifact.review_requirement === demand.review_requirement,
  );
  if (admitted.length > 0 && bound.length === 0) missing.add("requirement_binding_mismatch");
  if (!includesEvery(bound.flatMap(({ covered_states }) => covered_states), demand.required_states)) {
    missing.add("state_coverage_missing");
  }
  if (!includesEvery(bound.flatMap(({ covered_variants }) => covered_variants), demand.required_variants)) {
    missing.add("variant_coverage_missing");
  }
  if (
    !demand.execution_contracts.every(({ kind, contract_reference }) =>
      bound.some(({ execution_contract_evidence }) =>
        execution_contract_evidence.some(
          (evidence) =>
            evidence.kind === kind && evidence.contract_reference === contract_reference,
        ),
      ),
    )
  ) {
    missing.add("execution_contract_evidence_missing");
  }
  if (
    demand.temporal_requirement !== undefined &&
    !bound.some(
      ({ temporal_signature_sha256 }) =>
        temporal_signature_sha256 === demand.temporal_requirement!.signature_sha256,
    )
  ) {
    missing.add("temporal_signature_missing");
  }
  return [...missing].sort(compareCanonicalStrings);
}

function createWorkOrder(
  theme: DualThemeCatalogTheme,
  demand: DualThemeAssetDemand,
  inventory: ThemePackProductionInventory,
): ThemePackProductionWorkOrder {
  if (!isProductionFamily(demand.family)) fail(`unsupported production family ${demand.family}`);
  const artifacts = inventory.artifacts.filter(
    ({ theme_id, capability_id }) => theme_id === theme.id && capability_id === demand.id,
  );
  const missing = missingEvidence(demand, artifacts);
  const artifactStatus: ThemePackProductionArtifactStatus =
    artifacts.length === 0
      ? "missing_artifacts"
      : missing.length > 0
        ? "evidence_blocked"
        : "admitted_evidence_complete";
  return {
    id: `${demand.id}.${theme.id}`,
    theme_id: theme.id,
    theme_display_name: theme.display_name,
    audience: theme.audience,
    capability_id: demand.id,
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
    matched_artifact_ids: artifacts.map(({ id }) => id),
    missing_evidence: missing,
    artifact_status: artifactStatus,
  };
}

function createFamilySummary(
  family: ThemePackProductionFamily,
  demands: readonly DualThemeAssetDemand[],
  workOrders: readonly ThemePackProductionWorkOrder[],
): ThemePackProductionFamilySummary {
  const familyDemands = demands.filter((demand) => demand.family === family);
  const orders = workOrders.filter((order) => order.family === family);
  const completed = orders.filter(
    ({ artifact_status }) => artifact_status === "admitted_evidence_complete",
  ).length;
  const status: ThemePackProductionFamilySummary["status"] =
    familyDemands.length === 0
      ? "catalog_gap"
      : completed === orders.length
        ? "admitted_evidence_complete"
        : orders.every(({ artifact_status }) => artifact_status === "missing_artifacts")
          ? "missing_artifacts"
          : "evidence_blocked";
  return {
    family,
    demand_count: familyDemands.length,
    work_order_count: orders.length,
    admitted_evidence_complete_count: completed,
    status,
  };
}

export async function createThemePackProductionPlan(
  catalogValue: unknown,
  inventoryValue: unknown,
): Promise<ThemePackProductionPlan> {
  const catalog = await validateDualThemeAssetDemandCatalog(catalogValue);
  assertFixedThemes(catalog);
  const inventory = await validateThemePackProductionInventory(inventoryValue);
  if (inventory.catalog_sha256 !== catalog.catalog_sha256) {
    fail("theme-pack production inventory.catalog_sha256 mismatch");
  }

  const themes = new Set(catalog.themes.map(({ id }) => id));
  const capabilities = new Set(catalog.demands.map(({ id }) => id));
  for (const artifact of inventory.artifacts) {
    if (!themes.has(artifact.theme_id)) {
      fail(`inventory artifact ${artifact.id} references unknown theme ${artifact.theme_id}`);
    }
    if (!capabilities.has(artifact.capability_id)) {
      fail(`inventory artifact ${artifact.id} references unknown capability ${artifact.capability_id}`);
    }
  }

  const productionDemands = catalog.demands.filter(({ family }) => isProductionFamily(family));
  const workOrders = productionDemands
    .flatMap((demand) => catalog.themes.map((theme) => createWorkOrder(theme, demand, inventory)))
    .sort((left, right) => compareCanonicalStrings(left.id, right.id));
  const familySummaries = THEME_PACK_PRODUCTION_FAMILIES.map((family) =>
    createFamilySummary(family, productionDemands, workOrders),
  );
  const catalogGaps = familySummaries
    .filter(({ status }) => status === "catalog_gap")
    .map(({ family }) => family);
  const evidenceComplete =
    catalogGaps.length === 0 &&
    workOrders.length > 0 &&
    workOrders.every(({ artifact_status }) => artifact_status === "admitted_evidence_complete");
  const unsigned = {
    contract_id: THEME_PACK_PRODUCTION_PLAN_ID,
    program_id: catalog.program_id,
    catalog: {
      catalog_id: catalog.catalog_id,
      catalog_sha256: catalog.catalog_sha256,
    },
    inventory: { inventory_sha256: inventory.inventory_sha256 },
    themes: catalog.themes,
    shipping: false as const,
    status: evidenceComplete
      ? ("evidence_complete_pending_pack_acceptance" as const)
      : ("incomplete" as const),
    catalog_gaps: catalogGaps,
    family_summaries: familySummaries,
    work_orders: workOrders,
  };
  return {
    ...unsigned,
    plan_sha256: await digestThemePackProductionPlan(unsigned),
  };
}

export async function validateThemePackProductionPlan(
  value: unknown,
  catalogValue: unknown,
  inventoryValue: unknown,
): Promise<ThemePackProductionPlan> {
  record(value, "theme-pack production plan");
  const expected = await createThemePackProductionPlan(catalogValue, inventoryValue);
  if (
    JSON.stringify(canonicalValue(value, "theme-pack production plan")) !==
    JSON.stringify(canonicalValue(expected, "theme-pack production plan"))
  ) {
    fail("theme-pack production plan must exactly match deterministic production planning output");
  }
  return expected;
}
