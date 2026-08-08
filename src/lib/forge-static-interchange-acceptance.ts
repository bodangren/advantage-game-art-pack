import { FORGE_INTERCHANGE_CONTRACT_ID } from "./forge-interchange";
import { sha256 } from "./svg-assets";

export const FORGE_STATIC_INTERCHANGE_ACCEPTANCE_CONTRACT_ID =
  "pixel-forge-static-interchange-acceptance/v1" as const;

const DELIVERY_CLAIM_SHA256 =
  "dacab165e0ad370136a3ac67abca4f086c21dabb8b45dcd225372b615b416ab4";
const OWNER_VERIFICATION_SHA256 =
  "868123a2dd2981de879f28b5b5a27941ff70271f938a2766cb7ef7887efce942";
const EXCLUSIONS = [
  "final_art",
  "animation",
  "atlas",
  "complete_pack",
  "game_engine",
] as const;
const SHA256_RE = /^[a-f0-9]{64}$/;
type UnknownRecord = Record<string, unknown>;

export interface ForgeStaticInterchangeAcceptance {
  readonly contract_id: typeof FORGE_STATIC_INTERCHANGE_ACCEPTANCE_CONTRACT_ID;
  readonly prerequisite_track: "engine_interop_evidence_20260719";
  readonly decision: {
    readonly status: "accepted";
    readonly authority: "delegated_final";
    readonly scope: "static_png_glb_interchange";
  };
  readonly forge_contract_id: typeof FORGE_INTERCHANGE_CONTRACT_ID;
  readonly delivery_claim_sha256: string;
  readonly owner_verification_sha256: string;
  readonly exclusions: typeof EXCLUSIONS;
  readonly binding_sha256: string;
}

export const CODE_OWNED_FORGE_STATIC_INTERCHANGE_ACCEPTANCE = {
  contract_id: FORGE_STATIC_INTERCHANGE_ACCEPTANCE_CONTRACT_ID,
  prerequisite_track: "engine_interop_evidence_20260719",
  decision: {
    status: "accepted",
    authority: "delegated_final",
    scope: "static_png_glb_interchange",
  },
  forge_contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
  delivery_claim_sha256: DELIVERY_CLAIM_SHA256,
  owner_verification_sha256: OWNER_VERIFICATION_SHA256,
  exclusions: EXCLUSIONS,
  binding_sha256:
    "f11213bc7b3b55bfc4153ba6b4d0607b6876f25466a975f6e412e1c24245905f",
} as const satisfies ForgeStaticInterchangeAcceptance;

export class ForgeStaticInterchangeAcceptanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForgeStaticInterchangeAcceptanceError";
  }
}

function fail(message: string): never {
  throw new ForgeStaticInterchangeAcceptanceError(message);
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
  if (missing.length > 0) {
    fail(`${context} missing required key(s): ${missing.join(", ")}`);
  }
  const unexpected = Object.keys(value).filter(
    (key) => !required.includes(key),
  );
  if (unexpected.length > 0) {
    fail(`${context} contains unexpected key(s): ${unexpected.join(", ")}`);
  }
}

function exact(value: unknown, expected: string, context: string): string {
  if (value !== expected) fail(`${context} must be ${expected}`);
  return expected;
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as UnknownRecord)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalValue(entry)]),
  );
}

export function canonicalizeForgeStaticInterchangeAcceptance(
  value: unknown,
): string {
  const raw = record(value, "Forge static interchange acceptance");
  const { binding_sha256: _bindingSha256, ...unsigned } = raw;
  return JSON.stringify(canonicalValue(unsigned));
}

export async function digestForgeStaticInterchangeAcceptance(
  value: unknown,
): Promise<string> {
  return sha256(canonicalizeForgeStaticInterchangeAcceptance(value));
}

export async function validateForgeStaticInterchangeAcceptance(
  value: unknown,
): Promise<ForgeStaticInterchangeAcceptance> {
  const context = "Forge static interchange acceptance";
  const raw = record(value, context);
  const fields = [
    "contract_id",
    "prerequisite_track",
    "decision",
    "forge_contract_id",
    "delivery_claim_sha256",
    "owner_verification_sha256",
    "exclusions",
    "binding_sha256",
  ];
  exactKeys(raw, fields, context);
  exact(raw.contract_id, FORGE_STATIC_INTERCHANGE_ACCEPTANCE_CONTRACT_ID, `${context}.contract_id`);
  exact(raw.prerequisite_track, "engine_interop_evidence_20260719", `${context}.prerequisite_track`);
  exact(raw.forge_contract_id, FORGE_INTERCHANGE_CONTRACT_ID, `${context}.forge_contract_id`);
  exact(raw.delivery_claim_sha256, DELIVERY_CLAIM_SHA256, `${context}.delivery claim digest`);
  exact(raw.owner_verification_sha256, OWNER_VERIFICATION_SHA256, `${context}.owner verification digest`);

  const decision = record(raw.decision, `${context}.decision`);
  exactKeys(decision, ["status", "authority", "scope"], `${context}.decision`);
  exact(decision.status, "accepted", `${context}.decision.status`);
  exact(decision.authority, "delegated_final", `${context}.decision.authority`);
  exact(decision.scope, "static_png_glb_interchange", `${context}.decision.scope`);

  if (
    !Array.isArray(raw.exclusions) ||
    raw.exclusions.length !== EXCLUSIONS.length ||
    raw.exclusions.some((entry, index) => entry !== EXCLUSIONS[index])
  ) {
    fail(`${context}.exclusions must preserve the exact bounded exclusion order`);
  }
  if (typeof raw.binding_sha256 !== "string" || !SHA256_RE.test(raw.binding_sha256)) {
    fail(`${context}.binding_sha256 is invalid`);
  }
  const calculated = await digestForgeStaticInterchangeAcceptance(raw);
  if (calculated !== raw.binding_sha256) {
    fail(
      `${context}.binding_sha256 mismatch: expected ${calculated}, received ${raw.binding_sha256}`,
    );
  }
  return raw as unknown as ForgeStaticInterchangeAcceptance;
}
