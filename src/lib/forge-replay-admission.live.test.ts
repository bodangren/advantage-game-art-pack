import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  admitForgeReplayDossier,
  stageForgeReplayDossier,
} from "./forge-replay-admission";

async function loadDossier(root: string) {
  const [toolsList, manifest, chunks] = await Promise.all(
    ["tools-list.json", "interchange-manifest.json", "chunks.json"].map(
      async (file) => JSON.parse(await readFile(join(root, file), "utf8")),
    ),
  );
  return { tools_list: toolsList, manifest, chunks };
}

const liveRoot = process.env.FORGE_REPLAY_DOSSIER_A;
const secondRoot = process.env.FORGE_REPLAY_DOSSIER_B;

describe("Forge replay staging: retained adventurer.rustic public MCP pilot", () => {
  const liveIt = liveRoot === undefined ? it.skip : it;

  liveIt(
    "stages the exact retained pilot tools/list, manifest, and chunks",
    async () => {
      const staged = await stageForgeReplayDossier(
        await loadDossier(liveRoot!),
      );
      expect(staged.registry).toMatchObject({
        status: "validated_pending_review",
        source: {
          asset_id: "adventurer.rustic",
          revision_id:
            "revision.ee5d0a35c6d53befb6422c9df637b7a2679adf57cb8913aeec793afb0b01df67",
          manifest_sha256:
            "0d8c1380938e1bd5cbfb4c940b797727a01ba167884b222afcfe92485b49551d",
        },
        verification: {
          record_count: 10,
          chunk_count: 11,
          total_bytes: 86_548,
        },
      });
      expect(staged.files).toHaveLength(10);
      expect(staged.registry_json).not.toMatch(/\/home\/|\/tmp\/|runtime_root/);
      await expect(
        admitForgeReplayDossier(await loadDossier(liveRoot!)),
      ).rejects.toThrow(
        /validated_pending_review|delivery-resolution review.*missing/,
      );
    },
    30_000,
  );

  const deterministicIt =
    liveRoot === undefined || secondRoot === undefined ? it.skip : it;
  deterministicIt(
    "produces the same portable tree from replay A and B",
    async () => {
      const [first, second] = await Promise.all([
        stageForgeReplayDossier(await loadDossier(liveRoot!)),
        stageForgeReplayDossier(await loadDossier(secondRoot!)),
      ]);
      expect(second.registry_json).toBe(first.registry_json);
      expect(second.files).toEqual(first.files);
    },
    30_000,
  );
});
