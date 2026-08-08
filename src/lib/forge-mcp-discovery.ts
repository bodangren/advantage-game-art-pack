import {
  FORGE_INTERCHANGE_CONTRACT_ID,
  ForgeInterchangeValidationError,
  validateForgeMcpDiscoveryContract,
} from "./forge-interchange";

const SEMANTIC_ID_PATTERN = "^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$";
const REVISION_ID_PATTERN = "^revision\\.[a-f0-9]{64}$";
const MAX_CHUNK_BYTES = 32_768;
const TOOL_NAME_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
type UnknownRecord = Record<string, unknown>;

type ManifestDiscoveryTool = {
  readonly name: "get_interchange_manifest";
  readonly visibility: "public";
  readonly capability: "manifest_retrieval";
  readonly contract_ids: readonly [typeof FORGE_INTERCHANGE_CONTRACT_ID];
  readonly revision_pinned: true;
};
type ArtifactDiscoveryTool = {
  readonly name: "get_interchange_artifact_chunk";
  readonly visibility: "public";
  readonly capability: "artifact_retrieval";
  readonly contract_ids: readonly [typeof FORGE_INTERCHANGE_CONTRACT_ID];
  readonly revision_pinned: true;
  readonly transfer: "chunked_or_mcp_resource";
  readonly record_kinds: readonly ["artifact", "evidence"];
};
export interface NormalizedForgeMcpDiscoveryContract {
  readonly tools: readonly [ManifestDiscoveryTool, ArtifactDiscoveryTool];
}

export class ForgeMcpDiscoveryNormalizationError extends ForgeInterchangeValidationError {
  constructor(message: string) {
    super(message);
    this.name = "ForgeMcpDiscoveryNormalizationError";
  }
}
function fail(message: string): never {
  throw new ForgeMcpDiscoveryNormalizationError(message);
}
function record(value: unknown, context: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return fail(`${context} must be an object`);
  return value as UnknownRecord;
}
function keys(
  value: UnknownRecord,
  required: readonly string[],
  allowed: readonly string[],
  context: string,
): void {
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0)
    fail(`${context} missing required key(s): ${missing.join(", ")}`);
  const unexpected = Object.keys(value).filter(
    (key) => !allowed.includes(key),
  );
  if (unexpected.length > 0)
    fail(`${context} contains unexpected key(s): ${unexpected.join(", ")}`);
}
function exactString(value: unknown, expected: string, context: string): void {
  if (value !== expected) fail(`${context} must be ${expected}`);
}
function exactStringSet(
  value: unknown,
  expected: readonly string[],
  context: string,
): void {
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string") ||
    new Set(value).size !== value.length ||
    value.length !== expected.length ||
    expected.some((entry) => !value.includes(entry))
  ) {
    const received = Array.isArray(value) ? value.join(", ") : String(value);
    fail(
      `${context} must contain exactly ${expected.join(", ")}; received ${received}`,
    );
  }
}
function validateStringProperty(
  value: unknown,
  expectedPattern: string,
  context: string,
): void {
  const property = record(value, context);
  keys(
    property,
    ["type", "pattern"],
    ["type", "pattern", "title", "description"],
    context,
  );
  exactString(property.type, "string", `${context}.type`);
  exactString(property.pattern, expectedPattern, `${context}.pattern`);
}
function validateIntegerProperty(
  value: unknown,
  expectedMinimum: number,
  expectedMaximum: number,
  context: string,
): void {
  const property = record(value, context);
  keys(
    property,
    ["type", "minimum", "maximum"],
    ["type", "minimum", "maximum", "title", "description"],
    context,
  );
  exactString(property.type, "integer", `${context}.type`);
  if (property.minimum !== expectedMinimum)
    fail(`${context}.minimum must be ${expectedMinimum}`);
  if (property.maximum !== expectedMaximum)
    fail(`${context}.maximum must be ${expectedMaximum}`);
}
function validateInputSchema(
  value: unknown,
  kind: "manifest" | "chunk",
  context: string,
): void {
  const schema = record(value, context);
  keys(
    schema,
    ["type", "properties", "required", "additionalProperties"],
    [
      "type",
      "properties",
      "required",
      "additionalProperties",
      "$schema",
      "title",
      "description",
    ],
    context,
  );
  exactString(schema.type, "object", `${context}.type`);
  if (schema.additionalProperties !== false)
    fail(`${context}.additionalProperties must be false`);
  if (schema.$schema !== undefined && typeof schema.$schema !== "string")
    fail(`${context}.$schema must be a string when present`);
  const properties = record(schema.properties, `${context}.properties`);
  if (kind === "manifest") {
    keys(
      properties,
      ["asset_id", "revision_id"],
      ["asset_id", "revision_id"],
      `${context}.properties`,
    );
    exactStringSet(
      schema.required,
      ["asset_id", "revision_id"],
      `${context}.required`,
    );
    validateStringProperty(
      properties.asset_id,
      SEMANTIC_ID_PATTERN,
      `${context}.properties.asset_id`,
    );
    validateStringProperty(
      properties.revision_id,
      REVISION_ID_PATTERN,
      `${context}.properties.revision_id`,
    );
    return;
  }
  keys(
    properties,
    [
      "asset_id",
      "revision_id",
      "artifact_id",
      "record_kind",
      "offset",
      "length",
    ],
    [
      "asset_id",
      "revision_id",
      "artifact_id",
      "record_kind",
      "offset",
      "length",
    ],
    `${context}.properties`,
  );
  exactStringSet(
    schema.required,
    ["asset_id", "revision_id", "artifact_id", "offset", "length"],
    `${context}.required`,
  );
  validateStringProperty(
    properties.asset_id,
    SEMANTIC_ID_PATTERN,
    `${context}.properties.asset_id`,
  );
  validateStringProperty(
    properties.revision_id,
    REVISION_ID_PATTERN,
    `${context}.properties.revision_id`,
  );
  validateStringProperty(
    properties.artifact_id,
    SEMANTIC_ID_PATTERN,
    `${context}.properties.artifact_id`,
  );
  const recordKind = record(
    properties.record_kind,
    `${context}.properties.record_kind`,
  );
  keys(
    recordKind,
    ["type", "enum"],
    ["type", "enum", "default", "title", "description"],
    `${context}.properties.record_kind`,
  );
  exactString(
    recordKind.type,
    "string",
    `${context}.properties.record_kind.type`,
  );
  exactStringSet(
    recordKind.enum,
    ["artifact", "evidence"],
    `${context}.properties.record_kind.enum`,
  );
  if (recordKind.default !== undefined && recordKind.default !== "artifact")
    fail(`${context}.properties.record_kind.default must be artifact`);
  validateIntegerProperty(
    properties.offset,
    0,
    Number.MAX_SAFE_INTEGER,
    `${context}.properties.offset`,
  );
  validateIntegerProperty(
    properties.length,
    1,
    MAX_CHUNK_BYTES,
    `${context}.properties.length`,
  );
}
function validateSelectedTool(
  value: UnknownRecord,
  kind: "manifest" | "chunk",
  context: string,
): void {
  keys(
    value,
    ["name", "inputSchema"],
    [
      "name",
      "title",
      "description",
      "inputSchema",
      "outputSchema",
      "annotations",
      "icons",
      "_meta",
      "execution",
    ],
    context,
  );
  if (value.description !== undefined && typeof value.description !== "string")
    fail(`${context}.description must be a string when present`);
  validateInputSchema(value.inputSchema, kind, `${context}.inputSchema`);
}
function unwrapToolsListResult(value: unknown): UnknownRecord {
  const outer = record(value, "raw MCP tools/list response");
  const isJsonRpc =
    "jsonrpc" in outer ||
    "id" in outer ||
    "result" in outer ||
    "error" in outer;
  if (!isJsonRpc) return outer;
  keys(
    outer,
    ["jsonrpc", "id", "result"],
    ["jsonrpc", "id", "result"],
    "raw MCP tools/list JSON-RPC response",
  );
  exactString(
    outer.jsonrpc,
    "2.0",
    "raw MCP tools/list JSON-RPC response.jsonrpc",
  );
  if (
    (typeof outer.id !== "string" || outer.id.length === 0) &&
    (typeof outer.id !== "number" || !Number.isSafeInteger(outer.id))
  )
    fail(
      "raw MCP tools/list JSON-RPC response.id must be a string or safe integer",
    );
  return record(outer.result, "raw MCP tools/list JSON-RPC response.result");
}

export function normalizeForgeMcpToolsList(
  value: unknown,
): NormalizedForgeMcpDiscoveryContract {
  const result = unwrapToolsListResult(value);
  keys(
    result,
    ["tools"],
    ["tools", "nextCursor", "_meta"],
    "raw MCP tools/list result",
  );
  if ("nextCursor" in result)
    fail(
      "raw MCP tools/list result is paginated; collect every page before normalization",
    );
  if (result._meta !== undefined)
    record(result._meta, "raw MCP tools/list result._meta");
  if (
    !Array.isArray(result.tools) ||
    result.tools.length === 0 ||
    result.tools.length > 1_000
  )
    fail("raw MCP tools/list result.tools must contain 1..1000 tools");
  const seenNames = new Set<string>();
  const tools = result.tools.map((entry, index) => {
    const raw = record(entry, `raw MCP tools/list result.tools[${index}]`);
    const name = raw.name;
    if (typeof name !== "string" || !TOOL_NAME_PATTERN.test(name))
      fail(`raw MCP tools/list result.tools[${index}].name is invalid`);
    if (seenNames.has(name))
      fail(`raw MCP tools/list result contains duplicate tool ${name}`);
    seenNames.add(name);
    return { name, raw, index };
  });
  const manifest = tools.find(
    ({ name }) => name === "get_interchange_manifest",
  );
  if (manifest === undefined)
    fail("raw MCP tools/list result is missing get_interchange_manifest");
  const chunk = tools.find(
    ({ name }) => name === "get_interchange_artifact_chunk",
  );
  if (chunk === undefined)
    fail("raw MCP tools/list result is missing get_interchange_artifact_chunk");
  validateSelectedTool(
    manifest.raw,
    "manifest",
    `raw MCP tools/list result.tools[${manifest.index}]`,
  );
  validateSelectedTool(
    chunk.raw,
    "chunk",
    `raw MCP tools/list result.tools[${chunk.index}]`,
  );
  const normalized = {
    tools: [
      {
        name: "get_interchange_manifest",
        visibility: "public",
        capability: "manifest_retrieval",
        contract_ids: [FORGE_INTERCHANGE_CONTRACT_ID],
        revision_pinned: true,
      },
      {
        name: "get_interchange_artifact_chunk",
        visibility: "public",
        capability: "artifact_retrieval",
        contract_ids: [FORGE_INTERCHANGE_CONTRACT_ID],
        revision_pinned: true,
        transfer: "chunked_or_mcp_resource",
        record_kinds: ["artifact", "evidence"],
      },
    ],
  } as const satisfies NormalizedForgeMcpDiscoveryContract;
  validateForgeMcpDiscoveryContract(normalized);
  return normalized;
}
