import { describe, expect, it } from "vitest";

import { stageForgeAssetOverStdio } from "./forge-mcp-transport";

const enabled = process.env["PIXEL_FORGE_MCP_LIVE"] === "1";

describe("Forge MCP stdio transport: live public boundary", () => {
  it.runIf(enabled)(
    "retrieves and stages one exact revision from an env-configured fresh runtime",
    async () => {
      const command = process.env["PIXEL_FORGE_MCP_COMMAND"];
      const argsJson = process.env["PIXEL_FORGE_MCP_ARGS_JSON"];
      const cwd = process.env["PIXEL_FORGE_MCP_CWD"];
      const assetId = process.env["PIXEL_FORGE_MCP_ASSET_ID"];
      const revisionId = process.env["PIXEL_FORGE_MCP_REVISION_ID"];
      if (
        command === undefined ||
        argsJson === undefined ||
        cwd === undefined ||
        assetId === undefined ||
        revisionId === undefined
      ) {
        throw new Error(
          "Live MCP transport requires command, args JSON, cwd, asset ID, and revision ID environment values.",
        );
      }
      const parsedArgs: unknown = JSON.parse(argsJson);
      if (!Array.isArray(parsedArgs) || parsedArgs.some((arg) => typeof arg !== "string")) {
        throw new Error("PIXEL_FORGE_MCP_ARGS_JSON must be a JSON string array.");
      }
      const staged = await stageForgeAssetOverStdio(
        { command, args: parsedArgs, cwd, timeout_ms: 30_000 },
        { asset_id: assetId, revision_id: revisionId },
      );
      expect(staged.registry).toMatchObject({
        status: "validated_pending_review",
        source: { asset_id: assetId, revision_id: revisionId },
        verification: {
          chunk_digests_verified: true,
          reconstructed_digests_verified: true,
          exact_allowlist_verified: true,
        },
      });
      expect(staged.files.length).toBe(staged.registry.records.length);
      expect(staged.registry_json).not.toMatch(
        /runtime_root|inspector_url|\/home\/|\/tmp\//,
      );
    },
    60_000,
  );
});
