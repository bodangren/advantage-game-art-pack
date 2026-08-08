import { describe, expect, it } from "vitest";

import {
  ForgeMcpDiscoveryNormalizationError,
  normalizeForgeMcpToolsList,
} from "./forge-mcp-discovery";
import {
  FORGE_INTERCHANGE_CONTRACT_ID,
  assertForgeIngestionReady,
  validateForgeMcpDiscoveryContract,
} from "./forge-interchange";

const SEMANTIC_ID_PATTERN = "^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$";
const REVISION_ID_PATTERN = "^revision\\.[a-f0-9]{64}$";

type InputSchemaFixture = {
  type: string;
  properties: Record<string, Record<string, unknown>>;
  required: string[];
  $schema: string;
  additionalProperties: boolean;
};

type RawToolFixture = {
  name: string;
  description: string;
  inputSchema: InputSchemaFixture;
  execution?: { taskSupport: string };
};

type RawToolsListFixture = {
  tools: RawToolFixture[];
  nextCursor?: string;
};

function rawToolsList(): RawToolsListFixture {
  return {
    tools: [
      {
        name: "inspect_capabilities",
        description: "Inspect public capabilities.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
          $schema: "http://json-schema.org/draft-07/schema#",
          additionalProperties: false,
        },
      },
      {
        name: "get_interchange_manifest",
        description:
          "Retrieve a canonical digest-pinned interchange manifest for one exact immutable revision.",
        inputSchema: {
          type: "object",
          properties: {
            asset_id: { type: "string", pattern: SEMANTIC_ID_PATTERN },
            revision_id: { type: "string", pattern: REVISION_ID_PATTERN },
          },
          required: ["asset_id", "revision_id"],
          $schema: "http://json-schema.org/draft-07/schema#",
          additionalProperties: false,
        },
        execution: { taskSupport: "forbidden" },
      },
      {
        name: "get_interchange_artifact_chunk",
        description:
          "Retrieve a bounded digest-bound byte chunk for one manifest-allowlisted source PNG, GLB, or evidence record.",
        inputSchema: {
          type: "object",
          properties: {
            asset_id: { type: "string", pattern: SEMANTIC_ID_PATTERN },
            revision_id: { type: "string", pattern: REVISION_ID_PATTERN },
            artifact_id: { type: "string", pattern: SEMANTIC_ID_PATTERN },
            record_kind: {
              default: "artifact",
              type: "string",
              enum: ["artifact", "evidence"],
            },
            offset: {
              type: "integer",
              minimum: 0,
              maximum: Number.MAX_SAFE_INTEGER,
            },
            length: { type: "integer", minimum: 1, maximum: 32_768 },
          },
          required: [
            "asset_id",
            "revision_id",
            "artifact_id",
            "offset",
            "length",
          ],
          $schema: "http://json-schema.org/draft-07/schema#",
          additionalProperties: false,
        },
        execution: { taskSupport: "forbidden" },
      },
    ],
  };
}

function selectedTool(
  response: RawToolsListFixture,
  name: "get_interchange_manifest" | "get_interchange_artifact_chunk",
): RawToolFixture {
  const tool = response.tools.find((candidate) => candidate.name === name);
  if (tool === undefined) throw new Error(`fixture missing ${name}`);
  return tool;
}

function expectedDiscoveryContract() {
  return {
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
  };
}

describe("Forge MCP raw tools/list normalization", () => {
  it("normalizes actual SDK listTools objects into Pixel's contract", () => {
    const raw = rawToolsList();
    const normalized = normalizeForgeMcpToolsList(raw);

    expect(normalized).toEqual(expectedDiscoveryContract());
    expect(normalized).not.toBe(raw);
    expect(JSON.stringify(normalized)).not.toContain("inputSchema");
    expect(validateForgeMcpDiscoveryContract(normalized)).toEqual({
      manifest_tool: "get_interchange_manifest",
      artifact_tool: "get_interchange_artifact_chunk",
      contract_id: FORGE_INTERCHANGE_CONTRACT_ID,
    });
  });

  it("unwraps an exact JSON-RPC tools/list response", () => {
    expect(
      normalizeForgeMcpToolsList({
        jsonrpc: "2.0",
        id: 7,
        result: rawToolsList(),
      }),
    ).toEqual(expectedDiscoveryContract());
  });

  it("produces deterministic output independent of raw tool order", () => {
    const reversed = rawToolsList();
    reversed.tools.reverse();

    expect(normalizeForgeMcpToolsList(reversed)).toEqual(
      normalizeForgeMcpToolsList(rawToolsList()),
    );
  });

  it("does not treat Pixel's normalized contract as raw MCP output", () => {
    expect(() =>
      normalizeForgeMcpToolsList(expectedDiscoveryContract()),
    ).toThrow(ForgeMcpDiscoveryNormalizationError);
  });

  it("does not unlock live ingestion", () => {
    const normalized = normalizeForgeMcpToolsList(rawToolsList());
    expect(() => assertForgeIngestionReady(normalized)).toThrow(
      /unavailable|not accepted/,
    );
  });
});

describe("Forge MCP raw tools/list rejection", () => {
  it.each([
    null,
    {},
    { tools: "not-an-array" },
    { jsonrpc: "2.0", id: 7, error: { code: -32_001, message: "failed" } },
  ])("rejects malformed or error outer responses", (value) => {
    expect(() => normalizeForgeMcpToolsList(value)).toThrow(
      ForgeMcpDiscoveryNormalizationError,
    );
  });

  it("rejects an incomplete paginated result", () => {
    const raw = rawToolsList();
    raw.nextCursor = "next-page";
    expect(() => normalizeForgeMcpToolsList(raw)).toThrow(/nextCursor|page/);
  });

  it("rejects missing or duplicate selected operations", () => {
    const missing = rawToolsList();
    missing.tools = missing.tools.filter(
      ({ name }) => name !== "get_interchange_manifest",
    );
    expect(() => normalizeForgeMcpToolsList(missing)).toThrow(
      /get_interchange_manifest/,
    );

    const duplicate = rawToolsList();
    duplicate.tools.push(
      structuredClone(
        selectedTool(duplicate, "get_interchange_artifact_chunk"),
      ),
    );
    expect(() => normalizeForgeMcpToolsList(duplicate)).toThrow(/duplicate/);
  });

  it("rejects normalized-only assertions injected into a raw tool", () => {
    const raw = rawToolsList();
    Object.assign(selectedTool(raw, "get_interchange_manifest"), {
      visibility: "public",
      capability: "manifest_retrieval",
    });
    expect(() => normalizeForgeMcpToolsList(raw)).toThrow(/unexpected/);
  });

  it.each([
    {
      name: "manifest revision pin is optional",
      mutate: (raw: RawToolsListFixture) => {
        selectedTool(raw, "get_interchange_manifest").inputSchema.required = [
          "asset_id",
        ];
      },
      error: /revision_id/,
    },
    {
      name: "revision identity pattern drifts",
      mutate: (raw: RawToolsListFixture) => {
        selectedTool(
          raw,
          "get_interchange_manifest",
        ).inputSchema.properties.revision_id!["pattern"] = ".*";
      },
      error: /revision_id.*pattern/,
    },
    {
      name: "chunk transport exceeds the bound",
      mutate: (raw: RawToolsListFixture) => {
        selectedTool(
          raw,
          "get_interchange_artifact_chunk",
        ).inputSchema.properties.length!["maximum"] = 65_536;
      },
      error: /length.*maximum|32768/,
    },
    {
      name: "evidence retrieval is not advertised",
      mutate: (raw: RawToolsListFixture) => {
        selectedTool(
          raw,
          "get_interchange_artifact_chunk",
        ).inputSchema.properties.record_kind!["enum"] = ["artifact"];
      },
      error: /record_kind|evidence/,
    },
    {
      name: "chunk call requires an unknown argument",
      mutate: (raw: RawToolsListFixture) => {
        selectedTool(
          raw,
          "get_interchange_artifact_chunk",
        ).inputSchema.required.push("private_token");
      },
      error: /required|private_token/,
    },
    {
      name: "schema permits unknown arguments",
      mutate: (raw: RawToolsListFixture) => {
        selectedTool(
          raw,
          "get_interchange_artifact_chunk",
        ).inputSchema.additionalProperties = true;
      },
      error: /additionalProperties/,
    },
  ])("rejects selected-tool schema drift: $name", ({ mutate, error }) => {
    const raw = rawToolsList();
    mutate(raw);
    expect(() => normalizeForgeMcpToolsList(raw)).toThrow(error);
  });
});
