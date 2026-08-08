import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { prepareForgeImportAdmission } from "./forge-import-registry";
import {
  stageForgeReplayDossier,
  type StagedForgeReplayDossier,
} from "./forge-replay-admission";

const RETAINED_REFERENCE_ASSET_ID = "adventurer.rustic";
const GUARD_ASSET_ID = "guard.s4.rustic";
const BANDED_CONTAINER_ASSET_ID = "container.s4.banded";

const rootEnvironment = {
  guardA: "FORGE_NOVEL_GUARD_DOSSIER_A",
  guardB: "FORGE_NOVEL_GUARD_DOSSIER_B",
  containerA: "FORGE_NOVEL_BANDED_CONTAINER_DOSSIER_A",
  containerB: "FORGE_NOVEL_BANDED_CONTAINER_DOSSIER_B",
} as const;

const roots = Object.fromEntries(
  Object.entries(rootEnvironment).map(([key, name]) => [
    key,
    process.env[name],
  ]),
) as Record<keyof typeof rootEnvironment, string | undefined>;

const configuredRoots = Object.values(roots).filter(
  (root): root is string => root !== undefined,
);
const liveEnabled = configuredRoots.length === Object.keys(roots).length;
const partiallyConfigured = configuredRoots.length > 0 && !liveEnabled;

async function loadDossier(root: string) {
  const [toolsList, manifest, chunks] = await Promise.all(
    ["tools-list.json", "interchange-manifest.json", "chunks.json"].map(
      async (file) => JSON.parse(await readFile(join(root, file), "utf8")),
    ),
  );
  return { tools_list: toolsList, manifest, chunks };
}

function expectVerifiedPending(
  staged: StagedForgeReplayDossier,
  assetId: string,
): void {
  expect(staged.registry).toMatchObject({
    status: "validated_pending_review",
    source: { asset_id: assetId },
    verification: {
      chunk_digests_verified: true,
      reconstructed_digests_verified: true,
      exact_allowlist_verified: true,
    },
    blockers: ["delivery_resolution_review_evidence_missing"],
  });
  expect(staged.registry.source.asset_id).not.toBe(
    RETAINED_REFERENCE_ASSET_ID,
  );
  expect(staged.files).toHaveLength(staged.registry.verification.record_count);
  expect(staged.registry.verification.chunk_count).toBeGreaterThan(0);
  expect(staged.registry.verification.total_bytes).toBeGreaterThan(0);
  expect(staged.registry_json).not.toMatch(
    /\/home\/|\/tmp\/|runtime_root|inspector_url|process_cwd|workspace_root/,
  );
  for (const file of staged.files) {
    const record = staged.registry.records.find(
      ({ local_reference }) => local_reference === file.reference,
    );
    expect(record).toMatchObject({
      sha256: file.sha256,
      media_type: file.media_type,
      byte_length: file.bytes.byteLength,
    });
  }
}

describe("Forge novel public workflows: Pixel pending-review staging", () => {
  it.runIf(partiallyConfigured)(
    "fails clearly when only some novel dossier roots are configured",
    () => {
      const missing = Object.entries(rootEnvironment)
        .filter(([key]) => roots[key as keyof typeof roots] === undefined)
        .map(([, name]) => name);
      expect(
        missing,
        "configure all four novel workflow dossier roots together",
      ).toEqual([]);
    },
  );

  it.runIf(liveEnabled)(
    "stages deterministic guard and banded-container A/B dossiers without admitting final art or a theme pack",
    async () => {
      const [guardA, guardB, containerA, containerB] = await Promise.all([
        stageForgeReplayDossier(await loadDossier(roots.guardA!)),
        stageForgeReplayDossier(await loadDossier(roots.guardB!)),
        stageForgeReplayDossier(await loadDossier(roots.containerA!)),
        stageForgeReplayDossier(await loadDossier(roots.containerB!)),
      ]);

      expectVerifiedPending(guardA, GUARD_ASSET_ID);
      expectVerifiedPending(guardB, GUARD_ASSET_ID);
      expectVerifiedPending(containerA, BANDED_CONTAINER_ASSET_ID);
      expectVerifiedPending(containerB, BANDED_CONTAINER_ASSET_ID);
      expect(new Set([guardA.registry.source.asset_id, containerA.registry.source.asset_id])).toEqual(
        new Set([GUARD_ASSET_ID, BANDED_CONTAINER_ASSET_ID]),
      );
      expect(
        new Set([
          RETAINED_REFERENCE_ASSET_ID,
          guardA.registry.source.asset_id,
          containerA.registry.source.asset_id,
        ]).size,
      ).toBe(3);

      const [guardPendingA, guardPendingB, containerPendingA, containerPendingB] =
        await Promise.all([
          prepareForgeImportAdmission(guardA),
          prepareForgeImportAdmission(guardB),
          prepareForgeImportAdmission(containerA),
          prepareForgeImportAdmission(containerB),
        ]);
      for (const pending of [
        guardPendingA,
        guardPendingB,
        containerPendingA,
        containerPendingB,
      ]) {
        expect(pending).toMatchObject({
          status: "validated_pending_review",
          blockers: ["delivery_resolution_review_evidence_missing"],
        });
      }

      expect(guardB.registry_json).toBe(guardA.registry_json);
      expect(guardB.files).toEqual(guardA.files);
      expect(guardPendingB).toEqual(guardPendingA);
      expect(containerB.registry_json).toBe(containerA.registry_json);
      expect(containerB.files).toEqual(containerA.files);
      expect(containerPendingB).toEqual(containerPendingA);
      expect(guardA.registry_json).not.toBe(containerA.registry_json);
    },
    60_000,
  );
});
