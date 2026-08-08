import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { stageForgeReplayDossier } from "./forge-replay-admission";

const REGISTRY_MODULE_PATH = "./forge-import-registry";
async function loadRegistryApi(): Promise<Record<string, any>> {
  try {
    return await import(/* @vite-ignore */ REGISTRY_MODULE_PATH);
  } catch {
    return {};
  }
}
const ACCEPTANCE_SHA =
  "f11213bc7b3b55bfc4153ba6b4d0607b6876f25466a975f6e412e1c24245905f";

async function loadDossier(root: string) {
  const [toolsList, manifest, chunks] = await Promise.all(
    ["tools-list.json", "interchange-manifest.json", "chunks.json"].map(
      async (file) => JSON.parse(await readFile(join(root, file), "utf8")),
    ),
  );
  return { tools_list: toolsList, manifest, chunks };
}

async function retainedTransportOnlyReview(
  staged: Awaited<ReturnType<typeof stageForgeReplayDossier>>,
) {
  const api = await loadRegistryApi();
  expect(api.digestForgeDeliveryResolutionReview).toBeTypeOf("function");
  const unsigned = {
    contract_id: "pixel-delivery-resolution-review/v1",
    source: {
      contract_id: staged.registry.source.contract_id,
      asset_id: staged.registry.source.asset_id,
      revision_id: staged.registry.source.revision_id,
      manifest_sha256: staged.registry.source.manifest_sha256,
      staging_registry_sha256: staged.registry.registry_sha256,
    },
    review_scope: "static_directional_frames",
    status: "transport_only",
    reviewer: { kind: "human", id: "owner" },
    reviewed_at: "2026-07-22T00:00:00Z",
    artifacts: staged.registry.records
      .filter((record) => record.role === "directional_frame")
      .map((record) => ({
        id: record.id,
        direction: record.direction,
        sha256: record.sha256,
        natural_width: 128,
        natural_height: 128,
        display_width: 128,
        display_height: 128,
        overflow: false,
        verdict: "transport_verified",
      })),
    quality_debt: ["thin-dark-e-w"],
  };
  return {
    ...unsigned,
    review_sha256: await api.digestForgeDeliveryResolutionReview(unsigned),
  };
}

const liveRoot = process.env.FORGE_REPLAY_DOSSIER_A;
const secondRoot = process.env.FORGE_REPLAY_DOSSIER_B;

describe("Forge import registry: retained adventurer.rustic pilot", () => {
  const liveIt = liveRoot === undefined ? it.skip : it;

  liveIt(
    "clears static technical acceptance but remains pending final-art review",
    async () => {
      const api = await loadRegistryApi();
      expect(api.prepareForgeImportAdmission).toBeTypeOf("function");
      expect(api.admitForgeImportRegistry).toBeTypeOf("function");
      const staged = await stageForgeReplayDossier(await loadDossier(liveRoot!));
      expect(staged.registry).toMatchObject({
        status: "validated_pending_review",
        acceptance: {
          contract_id: "pixel-forge-static-interchange-acceptance/v1",
          binding_sha256:
            ACCEPTANCE_SHA,
          prerequisite_track: "engine_interop_evidence_20260719",
          scope: "static_png_glb_interchange",
        },
        blockers: ["delivery_resolution_review_evidence_missing"],
      });
      const review = await retainedTransportOnlyReview(staged);
      expect(await api.prepareForgeImportAdmission(staged, review)).toMatchObject({
        status: "validated_pending_review",
        blockers: ["delivery_resolution_review_not_accepted"],
      });
      await expect(api.admitForgeImportRegistry(staged, review)).rejects.toThrow(
        /delivery-resolution review.*not accepted/i,
      );
    },
    30_000,
  );

  const deterministicIt =
    liveRoot === undefined || secondRoot === undefined ? it.skip : it;
  deterministicIt(
    "produces the same pending-review projection from replay A and B",
    async () => {
      const api = await loadRegistryApi();
      expect(api.prepareForgeImportAdmission).toBeTypeOf("function");
      const [first, second] = await Promise.all([
        stageForgeReplayDossier(await loadDossier(liveRoot!)),
        stageForgeReplayDossier(await loadDossier(secondRoot!)),
      ]);
      const [firstPending, secondPending] = await Promise.all([
        api.prepareForgeImportAdmission(
          first,
          await retainedTransportOnlyReview(first),
        ),
        api.prepareForgeImportAdmission(
          second,
          await retainedTransportOnlyReview(second),
        ),
      ]);
      expect(second.registry_json).toBe(first.registry_json);
      expect(secondPending).toEqual(firstPending);
    },
    30_000,
  );
});
