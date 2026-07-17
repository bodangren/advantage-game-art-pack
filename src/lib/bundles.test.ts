import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import seededExample from "../../examples/bundles/library-quest.json";
// Phase 1 Red: the bundle module does not exist yet; these tests define
// its contract and must fail until the production module lands.
import {
  BundleValidationError,
  SPEC_REGISTRY,
  compileBundle,
  exportBundle,
  validateBundleManifest,
} from "./bundles";
import { sha256 } from "./svg-assets";

const MINIMAL_MANIFEST = {
  version: 1 as const,
  game: "test-game",
  slots: [
    { slot: "characters", refs: [{ kind: "sheet", id: "knight" }] },
    { slot: "props", refs: [{ kind: "composition", id: "lpc-style-character" }] },
  ],
};

describe("bundles: contract-first validation", () => {
  it("bundles: rejects an unknown slot", () => {
    const attempt = () =>
      validateBundleManifest({
        version: 1,
        game: "test-game",
        slots: [{ slot: "monsters", refs: [{ kind: "sheet", id: "knight" }] }],
      });
    expect(attempt).toThrow(BundleValidationError);
    expect(attempt).toThrow(/unknown slot/);
  });

  it("bundles: rejects duplicate ref ids across slots", () => {
    const attempt = () =>
      validateBundleManifest({
        version: 1,
        game: "test-game",
        slots: [
          { slot: "characters", refs: [{ kind: "sheet", id: "knight" }] },
          { slot: "props", refs: [{ kind: "sheet", id: "knight" }] },
        ],
      });
    expect(attempt).toThrow(BundleValidationError);
    expect(attempt).toThrow(/duplicate ref id/);
  });

  it("bundles: rejects an unresolvable reference", () => {
    const attempt = () =>
      validateBundleManifest({
        version: 1,
        game: "test-game",
        slots: [
          { slot: "characters", refs: [{ kind: "sheet", id: "ghost-sheet" }] },
        ],
      });
    expect(attempt).toThrow(BundleValidationError);
    expect(attempt).toThrow(/unknown spec reference/);
  });

  it("bundles: rejects a kind mismatch against the registry", () => {
    const attempt = () =>
      validateBundleManifest({
        version: 1,
        game: "test-game",
        slots: [
          { slot: "characters", refs: [{ kind: "composition", id: "knight" }] },
        ],
      });
    expect(attempt).toThrow(BundleValidationError);
    expect(attempt).toThrow(/kind mismatch/);
  });

  it("bundles: accepts a valid manifest", () => {
    const validated = validateBundleManifest(MINIMAL_MANIFEST);
    expect(validated.game).toBe("test-game");
    expect(validated.slots.map((slot) => slot.slot)).toEqual([
      "characters",
      "props",
    ]);
  });

  it("bundles: accepts the seeded example manifest", () => {
    const validated = validateBundleManifest(seededExample);
    expect(validated.game).toBe("library-quest");
    expect(validated.slots.length).toBeGreaterThanOrEqual(3);
  });
});

describe("bundles: compile-every-reference", () => {
  it("bundles: compiles every referenced spec into digested assets", async () => {
    const compiled = await compileBundle(seededExample);
    expect(compiled.game).toBe("library-quest");
    // knight sheet → 8 direction sheets, npc-prisoner + 3 enemy
    // compositions + lpc-style-character + prop-set-library → 6 svgs,
    // walk-cycle timeline → 1 sheet, fx-set composition → 1 svg.
    expect(compiled.assets).toHaveLength(16);
    for (const asset of compiled.assets) {
      expect(asset.digest).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.digest).toBe(await sha256(asset.svg));
      expect(asset.file).toBe(`${asset.slot}/${asset.id}.svg`);
    }
    expect(compiled.bundle_digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("bundles: compile failures report slot and reference context", async () => {
    const brokenRegistry = {
      ...SPEC_REGISTRY,
      "broken-timeline": {
        kind: "timeline" as const,
        load: () => ({ version: 1, id: "broken-timeline", frames: [] }),
      },
    };
    await expect(
      compileBundle(
        {
          version: 1,
          game: "test-game",
          slots: [
            { slot: "fx", refs: [{ kind: "timeline", id: "broken-timeline" }] },
          ],
        },
        { registry: brokenRegistry },
      ),
    ).rejects.toThrow(/slot fx ref broken-timeline/);
  });
});

describe("bundles: export determinism", () => {
  it("bundles: identical input yields identical export tree and digests", async () => {
    const firstDir = await mkdtemp(join(tmpdir(), "bundle-a-"));
    const secondDir = await mkdtemp(join(tmpdir(), "bundle-b-"));
    try {
      const first = await exportBundle(
        await compileBundle(seededExample),
        firstDir,
      );
      const second = await exportBundle(
        await compileBundle(seededExample),
        secondDir,
      );
      expect(first.files).toEqual(second.files);
      expect(first.files).toContain("bundle.json");
      expect(first.files).toContain("audit.txt");
      expect(first.files).toContain("characters/knight-walk-south.svg");
      expect(first.bundle_json.bundle_digest).toBe(
        second.bundle_json.bundle_digest,
      );
      expect(first.audit).toBe(second.audit);
      // Files are written under <outDir>/<game>/ per the export contract.
      for (const file of first.files) {
        const a = await readFile(join(firstDir, "library-quest", file), "utf8");
        const b = await readFile(join(secondDir, "library-quest", file), "utf8");
        expect(a).toBe(b);
      }
    } finally {
      await rm(firstDir, { recursive: true, force: true });
      await rm(secondDir, { recursive: true, force: true });
    }
  });

  it("bundles: bundle.json records per-asset digests that match the written files", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "bundle-json-"));
    try {
      const result = await exportBundle(await compileBundle(seededExample), outDir);
      expect(result.bundle_json.version).toBe(1);
      expect(result.bundle_json.game).toBe("library-quest");
      expect(result.bundle_json.assets).toHaveLength(16);
      const written = JSON.parse(
        await readFile(join(outDir, "library-quest", "bundle.json"), "utf8"),
      );
      expect(written).toEqual(result.bundle_json);
      for (const asset of result.bundle_json.assets) {
        const svg = await readFile(join(outDir, "library-quest", asset.file), "utf8");
        expect(asset.digest).toBe(await sha256(svg));
      }
      const audit = await readFile(join(outDir, "library-quest", "audit.txt"), "utf8");
      expect(audit).toContain("library-quest");
      expect(audit).toContain("knight-walk-south");
      expect(audit).toContain(result.bundle_json.bundle_digest);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
});

describe("bundles: phase-1 vacuity sentinel", () => {
  it("bundles: registry is populated so vacuous passes are detectable", () => {
    expect(Object.keys(SPEC_REGISTRY).length).toBeGreaterThanOrEqual(3);
    expect(SPEC_REGISTRY).toHaveProperty("knight");
    expect(SPEC_REGISTRY).toHaveProperty("walk-cycle");
  });
});
