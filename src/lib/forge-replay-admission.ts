import {
  FORGE_INTERCHANGE_CONTRACT_ID,
  reconstructRetrievedForgeRecord,
  validateForgeInterchangeManifest,
  validateRetrievedForgeChunkBinding,
  type ForgeAssetInterchangeManifest,
  type ForgeInterchangeArtifact,
  type ForgeInterchangeEvidence,
} from "./forge-interchange";
import {
  normalizeForgeMcpToolsList,
  type NormalizedForgeMcpDiscoveryContract,
} from "./forge-mcp-discovery";
import { sha256 } from "./svg-assets";
import {
  CODE_OWNED_FORGE_STATIC_INTERCHANGE_ACCEPTANCE,
  validateForgeStaticInterchangeAcceptance,
} from "./forge-static-interchange-acceptance";

export const FORGE_REPLAY_STAGING_CONTRACT_ID =
  "pixel-forge-replay-staging/v1" as const;

const BLOCKERS = ["delivery_resolution_review_evidence_missing"] as const;

type UnknownRecord = Record<string, unknown>;

export interface ForgeReplayDossier {
  readonly tools_list: unknown;
  readonly manifest: unknown;
  readonly chunks: unknown;
}

export interface ForgeReplayStagedRecord {
  readonly record_kind: "artifact" | "evidence";
  readonly id: string;
  readonly classification?: "source";
  readonly role?: ForgeInterchangeArtifact["role"];
  readonly evidence_kind?: string;
  readonly media_type: ForgeInterchangeArtifact["media_type"];
  readonly byte_length: number;
  readonly sha256: string;
  readonly source_reference: string;
  readonly local_reference: string;
  readonly width?: number;
  readonly height?: number;
  readonly transparent?: boolean;
  readonly direction?: ForgeInterchangeArtifact["direction"];
}

export interface ForgeReplayStagedFile {
  readonly reference: string;
  readonly sha256: string;
  readonly media_type: ForgeInterchangeArtifact["media_type"];
  readonly bytes: Uint8Array;
}

export interface ForgeReplayStagingRegistry {
  readonly contract_id: typeof FORGE_REPLAY_STAGING_CONTRACT_ID;
  readonly status: "validated_pending_review";
  readonly source: {
    readonly contract_id: typeof FORGE_INTERCHANGE_CONTRACT_ID;
    readonly asset_id: string;
    readonly revision_id: string;
    readonly manifest_sha256: string;
    readonly style_profile: ForgeAssetInterchangeManifest["style_profile"];
    readonly render_profile: ForgeAssetInterchangeManifest["render_profile"];
    readonly provenance: ForgeAssetInterchangeManifest["provenance"];
  };
  readonly discovery: NormalizedForgeMcpDiscoveryContract;
  readonly acceptance: {
    readonly contract_id: "pixel-forge-static-interchange-acceptance/v1";
    readonly binding_sha256: string;
    readonly prerequisite_track: "engine_interop_evidence_20260719";
    readonly scope: "static_png_glb_interchange";
  };
  readonly records: readonly ForgeReplayStagedRecord[];
  readonly verification: {
    readonly record_count: number;
    readonly chunk_count: number;
    readonly total_bytes: number;
    readonly chunk_digests_verified: true;
    readonly reconstructed_digests_verified: true;
    readonly exact_allowlist_verified: true;
  };
  readonly blockers: typeof BLOCKERS;
  readonly registry_sha256: string;
}

export interface StagedForgeReplayDossier {
  readonly registry: ForgeReplayStagingRegistry;
  readonly files: readonly ForgeReplayStagedFile[];
  readonly registry_json: string;
}

export class ForgeReplayAdmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForgeReplayAdmissionError";
  }
}

function fail(message: string): never {
  throw new ForgeReplayAdmissionError(message);
}

function record(value: unknown, context: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${context} must be an object`);
  }
  return value as UnknownRecord;
}

function parseEnvelope(value: unknown): ForgeReplayDossier {
  const envelope = record(value, "Forge replay dossier");
  const required = ["tools_list", "manifest", "chunks"] as const;
  const missing = required.filter((key) => !(key in envelope));
  if (missing.length > 0) {
    fail(`Forge replay dossier missing required key(s): ${missing.join(", ")}`);
  }
  const unexpected = Object.keys(envelope).filter(
    (key) => !required.includes(key as (typeof required)[number]),
  );
  if (unexpected.length > 0) {
    fail(`Forge replay dossier contains unexpected key(s): ${unexpected.join(", ")}`);
  }
  return {
    tools_list: envelope.tools_list,
    manifest: envelope.manifest,
    chunks: envelope.chunks,
  };
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

export function canonicalizeForgeReplayStagingRegistry(value: unknown): string {
  const raw = record(value, "Forge replay staging registry");
  const { registry_sha256: _registrySha256, ...unsigned } = raw;
  return JSON.stringify(canonicalValue(unsigned));
}

export async function digestForgeReplayStagingRegistry(
  value: unknown,
): Promise<string> {
  return sha256(canonicalizeForgeReplayStagingRegistry(value));
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function recordKey(recordKind: "artifact" | "evidence", id: string): string {
  return `${recordKind}:${id}`;
}

function extension(mediaType: ForgeInterchangeArtifact["media_type"]): string {
  if (mediaType === "image/png") return "png";
  if (mediaType === "model/gltf-binary") return "glb";
  return "json";
}

function exactStringArray(
  value: unknown,
  expected: readonly string[],
  context: string,
): void {
  if (
    !Array.isArray(value) ||
    value.length !== expected.length ||
    value.some((entry, index) => entry !== expected[index])
  ) {
    fail(`${context} must be exactly ${expected.join(", ")}`);
  }
}

function validateWorkflowEvidence(
  bytes: Uint8Array,
  evidence: ForgeInterchangeEvidence,
  manifest: ForgeAssetInterchangeManifest,
): void {
  if (
    evidence.id !== "workflow.public-mcp" ||
    evidence.kind !== "workflow" ||
    evidence.reference !== manifest.provenance.workflow_reference
  ) {
    fail(
      `unsupported evidence ${evidence.id}: no signed media type or known workflow binding`,
    );
  }
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return fail("workflow evidence must be valid UTF-8 JSON");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return fail("workflow evidence must be valid JSON");
  }
  const workflow = record(parsed, "workflow evidence");
  const expectedKeys = [
    "contract_id",
    "asset_id",
    "revision_id",
    "source_operations",
    "retrieval_operations",
  ];
  const actualKeys = Object.keys(workflow);
  const unexpected = actualKeys.filter((key) => !expectedKeys.includes(key));
  const missing = expectedKeys.filter((key) => !(key in workflow));
  if (missing.length > 0 || unexpected.length > 0) {
    fail(
      `workflow evidence keys are invalid; missing ${missing.join(", ") || "none"}; unexpected ${unexpected.join(", ") || "none"}`,
    );
  }
  if (workflow.contract_id !== "forge-public-mcp-workflow-evidence/v1") {
    fail("workflow evidence.contract_id is invalid");
  }
  if (workflow.asset_id !== manifest.source.asset_id) {
    fail("workflow evidence.asset_id does not match manifest source");
  }
  if (workflow.revision_id !== manifest.source.revision_id) {
    fail("workflow evidence.revision_id does not match manifest source");
  }
  exactStringArray(
    workflow.source_operations,
    ["render_preview", "export_asset"],
    "workflow evidence.source_operations",
  );
  exactStringArray(
    workflow.retrieval_operations,
    ["get_interchange_manifest", "get_interchange_artifact_chunk"],
    "workflow evidence.retrieval_operations",
  );
}

async function stage(value: unknown): Promise<StagedForgeReplayDossier> {
  const envelope = parseEnvelope(value);
  const discovery = normalizeForgeMcpToolsList(envelope.tools_list);
  const acceptance = await validateForgeStaticInterchangeAcceptance(
    CODE_OWNED_FORGE_STATIC_INTERCHANGE_ACCEPTANCE,
  );
  const manifest = await validateForgeInterchangeManifest(envelope.manifest);
  if (!Array.isArray(envelope.chunks)) {
    fail("Forge replay dossier.chunks must be an array");
  }

  const expected: Array<{
    record_kind: "artifact" | "evidence";
    record: ForgeInterchangeArtifact | ForgeInterchangeEvidence;
  }> = [
    ...manifest.artifacts
      .filter(({ classification }) => classification === "source")
      .map((artifact) => ({ record_kind: "artifact" as const, record: artifact })),
    ...manifest.evidence.map((evidence) => {
      if (evidence.byte_length === undefined) {
        fail(`expected evidence record ${evidence.id} has no signed byte_length`);
      }
      return { record_kind: "evidence" as const, record: evidence };
    }),
  ];
  const allowlist = new Set(
    expected.map(({ record_kind, record }) => recordKey(record_kind, record.id)),
  );
  const grouped = new Map<string, unknown[]>();

  for (const chunkValue of envelope.chunks) {
    await validateRetrievedForgeChunkBinding(manifest, chunkValue);
    const chunk = record(chunkValue, "retrieved Forge chunk");
    const recordKind = chunk.record_kind as "artifact" | "evidence";
    const id = chunk.artifact_id as string;
    const key = recordKey(recordKind, id);
    if (!allowlist.has(key)) {
      fail(`unexpected non-allowlisted Forge replay record ${id}`);
    }
    const group = grouped.get(key) ?? [];
    group.push(chunkValue);
    grouped.set(key, group);
  }

  for (const { record_kind, record: expectedRecord } of expected) {
    const key = recordKey(record_kind, expectedRecord.id);
    if (!grouped.has(key)) {
      fail(`missing expected Forge replay record ${expectedRecord.id}`);
    }
  }

  const records: ForgeReplayStagedRecord[] = [];
  const files: ForgeReplayStagedFile[] = [];
  for (const item of expected) {
    const key = recordKey(item.record_kind, item.record.id);
    const bytes = await reconstructRetrievedForgeRecord(
      manifest,
      grouped.get(key),
    );
    if (item.record_kind === "evidence") {
      validateWorkflowEvidence(
        bytes,
        item.record as ForgeInterchangeEvidence,
        manifest,
      );
    }
    const mediaType =
      item.record_kind === "artifact"
        ? (item.record as ForgeInterchangeArtifact).media_type
        : "application/json";
    const localReference = `objects/sha256/${item.record.sha256}.${extension(mediaType)}`;
    if (item.record_kind === "artifact") {
      const artifact = item.record as ForgeInterchangeArtifact;
      records.push({
        record_kind: "artifact",
        id: artifact.id,
        classification: "source",
        role: artifact.role,
        media_type: artifact.media_type,
        byte_length: artifact.byte_length,
        sha256: artifact.sha256,
        source_reference: artifact.reference,
        local_reference: localReference,
        ...(artifact.width === undefined ? {} : { width: artifact.width }),
        ...(artifact.height === undefined ? {} : { height: artifact.height }),
        ...(artifact.transparent === undefined
          ? {}
          : { transparent: artifact.transparent }),
        ...(artifact.direction === undefined
          ? {}
          : { direction: artifact.direction }),
      });
    } else {
      const evidence = item.record as ForgeInterchangeEvidence & {
        byte_length: number;
      };
      records.push({
        record_kind: "evidence",
        id: evidence.id,
        evidence_kind: evidence.kind,
        media_type: "application/json",
        byte_length: evidence.byte_length,
        sha256: evidence.sha256,
        source_reference: evidence.reference,
        local_reference: localReference,
      });
    }
    files.push({
      reference: localReference,
      sha256: item.record.sha256,
      media_type: mediaType,
      bytes,
    });
  }

  const unsignedRegistry = {
    contract_id: FORGE_REPLAY_STAGING_CONTRACT_ID,
    status: "validated_pending_review" as const,
    source: {
      contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
      asset_id: manifest.source.asset_id,
      revision_id: manifest.source.revision_id,
      manifest_sha256: manifest.manifest_sha256,
      style_profile: manifest.style_profile,
      render_profile: manifest.render_profile,
      provenance: manifest.provenance,
    },
    discovery,
    acceptance: {
      contract_id: acceptance.contract_id,
      binding_sha256: acceptance.binding_sha256,
      prerequisite_track: acceptance.prerequisite_track,
      scope: acceptance.decision.scope,
    },
    records,
    verification: {
      record_count: records.length,
      chunk_count: envelope.chunks.length,
      total_bytes: records.reduce((sum, item) => sum + item.byte_length, 0),
      chunk_digests_verified: true as const,
      reconstructed_digests_verified: true as const,
      exact_allowlist_verified: true as const,
    },
    blockers: BLOCKERS,
  };
  const registry: ForgeReplayStagingRegistry = {
    ...unsignedRegistry,
    registry_sha256: await digestForgeReplayStagingRegistry(unsignedRegistry),
  };
  const registryJson = `${JSON.stringify(canonicalValue(registry), null, 2)}\n`;
  return { registry, files, registry_json: registryJson };
}

export async function stageForgeReplayDossier(
  value: unknown,
): Promise<StagedForgeReplayDossier> {
  try {
    return await stage(value);
  } catch (error) {
    if (error instanceof ForgeReplayAdmissionError) throw error;
    throw new ForgeReplayAdmissionError(message(error));
  }
}

export async function admitForgeReplayDossier(value: unknown): Promise<never> {
  await stageForgeReplayDossier(value);
  return fail(
    "Forge replay is validated_pending_review: delivery-resolution review evidence is missing.",
  );
}
