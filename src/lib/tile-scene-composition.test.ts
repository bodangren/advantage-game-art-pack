import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { beforeAll, describe, expect, it } from "vitest";

import {
  ENVIRONMENT_SEMANTIC_ROLES,
  PARALLAX_SET_CONTRACT,
  TILE_SCENE_CONTRACT,
  TILE_THEME_PROFILES,
  TileSceneValidationError,
  buildTileAssetRegistry,
  compileParallaxSet,
  compileTileScene,
  edgesAreCompatible,
  environmentSceneExemplarSpecs,
  stableJson,
  validateCandidateThemePair,
  validateTileCandidateManifest,
  validateTileSceneSpec,
  verifyTileCandidateManifest,
  verifyEnvironmentSceneExemplarSet,
  type PixelNativeProvenance,
  type TileCandidateManifest,
} from "./tile-scene-composition";

const here = dirname(fileURLToPath(import.meta.url));
const candidateRoot = resolve(here, "..", "assets", "tile-scenes");
const exemplarRoot = resolve(candidateRoot, "exemplars");

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const wasmPath = require.resolve("@resvg/resvg-wasm/index_bg.wasm");
  await initWasm(readFileSync(wasmPath));
});

const admission = {
  state: "candidate_unadmitted",
  shipping: false,
  visual_review: "pending",
} as const;

const provenance: PixelNativeProvenance = {
  origin: "pixel_native_svg",
  authoring: "replacement_native",
  source_repository: "pixel-art-generator",
  created_utc: "2026-07-23T00:00:00Z",
  reference_ids: [],
};

async function checkedInManifests(): Promise<readonly TileCandidateManifest[]> {
  return Promise.all(
    TILE_THEME_PROFILES.map(async (profile) => {
      const directory = resolve(candidateRoot, profile);
      const raw = JSON.parse(
        await readFile(resolve(directory, "manifest.json"), "utf8"),
      ) as unknown;
      return verifyTileCandidateManifest(raw, (sourceFile) =>
        readFile(resolve(directory, sourceFile.slice(2)), "utf8"),
      );
    }),
  );
}

async function checkedInRegistry() {
  const manifests = await checkedInManifests();
  const registry = await buildTileAssetRegistry(
    manifests,
    (manifest, sourceFile) =>
      readFile(
        resolve(candidateRoot, manifest.theme_profile, sourceFile.slice(2)),
        "utf8",
      ),
  );
  return { manifests, registry };
}

function rasterPixels(source: string): Uint8Array {
  const renderer = new Resvg(source, {
    fitTo: { mode: "original" },
    imageRendering: 1,
    shapeRendering: 1,
  });
  try {
    const image = renderer.render();
    try {
      expect([image.width, image.height]).toEqual([32, 32]);
      return new Uint8Array(image.pixels);
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}

function boundaryPixels(
  pixels: Uint8Array,
  edge: "north" | "east" | "south" | "west",
): readonly number[] {
  const result: number[] = [];
  for (let offset = 0; offset < 32; offset += 1) {
    const x = edge === "west" ? 0 : edge === "east" ? 31 : offset;
    const y = edge === "north" ? 0 : edge === "south" ? 31 : offset;
    const start = (y * 32 + x) * 4;
    result.push(...pixels.slice(start, start + 4));
  }
  return result;
}

function cuteRoadScene() {
  return {
    contract: TILE_SCENE_CONTRACT,
    scene_id: "castle-defense-road-preview",
    theme_profile: "cute_chibi_v1",
    palette_id: "cute-chibi-environment-v1",
    view_box: [0, 0, 64, 64],
    admission,
    provenance,
    layers: [
      {
        kind: "tile_map",
        id: "ground",
        z_index: 0,
        columns: 2,
        rows: 1,
        tile_width: 32,
        tile_height: 32,
        cells: [
          "cute-chibi-castle-defense-road-ew",
          "cute-chibi-castle-defense-road-ew",
        ],
      },
      {
        kind: "placements",
        id: "fixtures",
        z_index: 10,
        placements: [
          {
            id: "counter",
            asset_id: "cute-chibi-potion-rush-shop-counter",
            x: 16,
            y: 32,
          },
        ],
      },
    ],
  } as const;
}

describe("tile candidate microbatch contract", () => {
  it("verifies all 24 browser-renderable SVG roots, immutable digests, and exact theme pair coverage", async () => {
    const manifests = await checkedInManifests();

    expect(() => validateCandidateThemePair(manifests)).not.toThrow();
    expect(manifests).toHaveLength(2);
    expect(manifests.flatMap((manifest) => manifest.candidates)).toHaveLength(24);
    for (const manifest of manifests) {
      expect(manifest.admission).toEqual(admission);
      expect(manifest.provenance.origin).toBe("pixel_native_svg");
      expect(manifest.candidates.map((candidate) => candidate.semantic_role)).toEqual(
        ENVIRONMENT_SEMANTIC_ROLES,
      );
      expect(manifest.candidates.every((candidate) => candidate.theme_profile === manifest.theme_profile)).toBe(true);
      expect(manifest.candidates.every((candidate) => candidate.palette_id === manifest.palette_id)).toBe(true);
      for (const candidate of manifest.candidates) {
        const source = await readFile(
          resolve(
            candidateRoot,
            manifest.theme_profile,
            candidate.source_file.slice(2),
          ),
          "utf8",
        );
        expect(source).toMatch(
          /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 32 32" width="32" height="32">/,
        );
      }
    }
  });

  it("rejects candidate sources without browser image root dimensions and namespace", async () => {
    const directory = resolve(candidateRoot, "cute_chibi_v1");
    const raw = JSON.parse(
      await readFile(resolve(directory, "manifest.json"), "utf8"),
    ) as unknown;

    await expect(
      verifyTileCandidateManifest(raw, async (sourceFile) => {
        const source = await readFile(
          resolve(directory, sourceFile.slice(2)),
          "utf8",
        );
        return source.replace(
          ' xmlns="http://www.w3.org/2000/svg"',
          "",
        );
      }),
    ).rejects.toThrow(/root must declare the SVG namespace/i);
  });

  it("rejects unknown manifest fields rather than silently accepting drift", async () => {
    const path = resolve(candidateRoot, "cute_chibi_v1", "manifest.json");
    const raw = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    raw.unreviewed_override = true;

    expect(() => validateTileCandidateManifest(raw)).toThrow(
      /unexpected key.*unreviewed_override/i,
    );
  });

  it("rejects an incomplete theme pair", async () => {
    const [cute] = await checkedInManifests();
    expect(() => validateCandidateThemePair([cute!])).toThrow(/requires 2 manifests/i);
  });

  it("uses stable recursive key ordering for deterministic manifest bytes", () => {
    expect(stableJson({ z: 1, nested: { y: 2, a: 3 }, a: 4 })).toBe(
      '{\n  "a": 4,\n  "nested": {\n    "a": 3,\n    "y": 2\n  },\n  "z": 1\n}\n',
    );
  });

  it("proves every declared continuing adjacency has identical rendered boundary pixels", async () => {
    const manifests = await checkedInManifests();
    for (const manifest of manifests) {
      const directory = resolve(candidateRoot, manifest.theme_profile);
      const rendered = new Map(
        await Promise.all(
          manifest.candidates.map(async (candidate) => {
            const source = await readFile(
              resolve(directory, candidate.source_file.slice(2)),
              "utf8",
            );
            return [candidate.asset_id, rasterPixels(source)] as const;
          }),
        ),
      );
      let compatiblePairs = 0;
      for (const first of manifest.candidates) {
        for (const second of manifest.candidates) {
          if (edgesAreCompatible(first.edges.east, second.edges.west)) {
            compatiblePairs += 1;
            expect(
              boundaryPixels(rendered.get(first.asset_id)!, "east"),
              `${first.asset_id}.east must render identically to ${second.asset_id}.west`,
            ).toEqual(boundaryPixels(rendered.get(second.asset_id)!, "west"));
          }
          if (edgesAreCompatible(first.edges.south, second.edges.north)) {
            compatiblePairs += 1;
            expect(
              boundaryPixels(rendered.get(first.asset_id)!, "south"),
              `${first.asset_id}.south must render identically to ${second.asset_id}.north`,
            ).toEqual(boundaryPixels(rendered.get(second.asset_id)!, "north"));
          }
        }
      }
      expect(compatiblePairs).toBeGreaterThan(40);
    }
  });

  it("treats false edge declarations as closed boundaries, never compatible seams", async () => {
    const manifests = await checkedInManifests();
    for (const manifest of manifests) {
      const wall = manifest.candidates.find(
        (candidate) => candidate.semantic_role === "potion-rush.shop-wall",
      )!;
      const counter = manifest.candidates.find(
        (candidate) => candidate.semantic_role === "potion-rush.shop-counter",
      )!;
      expect(edgesAreCompatible(wall.edges.north, wall.edges.south)).toBe(false);
      expect(edgesAreCompatible(counter.edges.east, counter.edges.west)).toBe(false);
      expect(edgesAreCompatible(wall.edges.east, wall.edges.west)).toBe(true);
    }
  });
});

describe("tile scene composition", () => {
  it("validates ordered layers, strict fields, and row-major cell counts", () => {
    const valid = cuteRoadScene();
    expect(validateTileSceneSpec(valid).layers.map((layer) => layer.id)).toEqual([
      "ground",
      "fixtures",
    ]);

    const wrongCellCount = structuredClone(valid) as unknown as Record<string, unknown>;
    const layers = wrongCellCount.layers as Record<string, unknown>[];
    layers[0]!.cells = ["cute-chibi-castle-defense-road-ew"];
    expect(() => validateTileSceneSpec(wrongCellCount)).toThrow(/row-major order/i);

    const unknown = { ...valid, legacy_mode: true };
    expect(() => validateTileSceneSpec(unknown)).toThrow(/unexpected key.*legacy_mode/i);
  });

  it("compiles byte-identical SVG and manifests with row-major positions", async () => {
    const { registry } = await checkedInRegistry();
    const first = await compileTileScene(cuteRoadScene(), registry);
    const second = await compileTileScene(cuteRoadScene(), registry);

    expect(first).toEqual(second);
    expect(first.svg).toContain('id="ground-cell-0" transform="translate(0 0)');
    expect(first.svg).toContain('id="ground-cell-1" transform="translate(32 0)');
    expect(first.svg).toContain('id="counter" transform="translate(16 32)');
    expect(first.svg).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64" width="64" height="64">/,
    );
    expect(first.manifest.admission).toEqual(admission);
    expect(first.manifest.layers[0]?.references).toEqual([
      "cute-chibi-castle-defense-road-ew",
    ]);
    expect(first.manifest.svg_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(first.manifest.manifest_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects an incompatible road-to-grass adjacency with cell evidence", async () => {
    const { registry } = await checkedInRegistry();
    const invalid = structuredClone(cuteRoadScene()) as unknown as {
      layers: Array<{ cells?: Array<string | null> }>;
    };
    invalid.layers[0]!.cells![1] = "cute-chibi-castle-defense-grass-a";

    await expect(compileTileScene(invalid, registry)).rejects.toThrow(
      /cells 0\/1 edge mismatch.*east.*west/i,
    );
  });

  it("rejects a candidate from the wrong theme even when the asset id exists", async () => {
    const { registry } = await checkedInRegistry();
    const invalid = structuredClone(cuteRoadScene()) as unknown as {
      layers: Array<{ cells?: Array<string | null> }>;
    };
    invalid.layers[0]!.cells = [
      "heroic-stylized-castle-defense-road-ew",
      "heroic-stylized-castle-defense-road-ew",
    ];

    await expect(compileTileScene(invalid, registry)).rejects.toThrow(
      /does not match scene theme\/palette/i,
    );
  });

  it("compiles four deterministic real-layout exemplars per theme", async () => {
    const { registry } = await checkedInRegistry();
    for (const profile of TILE_THEME_PROFILES) {
      const specs = environmentSceneExemplarSpecs(profile);
      expect(specs).toHaveLength(4);
      const first = await Promise.all(
        specs.map((spec) => compileTileScene(spec, registry)),
      );
      const second = await Promise.all(
        specs.map((spec) => compileTileScene(spec, registry)),
      );
      expect(first).toEqual(second);
      expect(new Set(first.map((artifact) => artifact.manifest.scene_id)).size).toBe(4);
      expect(new Set(first.map((artifact) => artifact.manifest.svg_sha256)).size).toBe(4);
      expect(first.every((artifact) => artifact.manifest.admission.shipping === false)).toBe(true);
      expect(first.every((artifact) => artifact.svg.includes('width="128" height="96"'))).toBe(true);
    }
  });

  it("reproduces every checked-in exemplar SVG and manifest byte-for-byte", async () => {
    const { registry } = await checkedInRegistry();
    for (const profile of TILE_THEME_PROFILES) {
      const directory = resolve(exemplarRoot, profile);
      const rawIndex = JSON.parse(
        await readFile(resolve(directory, "index.json"), "utf8"),
      ) as unknown;
      const set = await verifyEnvironmentSceneExemplarSet(
        rawIndex,
        (file) => readFile(resolve(directory, file.slice(2)), "utf8"),
      );
      expect(set.admission).toEqual(admission);
      const artifacts = await Promise.all(
        environmentSceneExemplarSpecs(profile).map((spec) =>
          compileTileScene(spec, registry),
        ),
      );
      for (let index = 0; index < artifacts.length; index += 1) {
        const artifact = artifacts[index]!;
        const record = set.scenes[index]!;
        expect(artifact.svg).toBe(
          await readFile(resolve(directory, record.svg_file.slice(2)), "utf8"),
        );
        expect(artifact.manifest_json).toBe(
          await readFile(
            resolve(directory, record.manifest_file.slice(2)),
            "utf8",
          ),
        );
      }
    }
  });
});

describe("parallax set contract", () => {
  it("emits deterministic layer and set digests with shared style binding", async () => {
    const { registry } = await checkedInRegistry();
    const spec = {
      contract: PARALLAX_SET_CONTRACT,
      set_id: "castle-defense-grass-depth-preview",
      theme_profile: "cute_chibi_v1",
      palette_id: "cute-chibi-environment-v1",
      admission,
      provenance,
      layers: [
        {
          id: "far",
          asset_id: "cute-chibi-castle-defense-grass-a",
          scroll_depth: 0.25,
          scroll_intent: "horizontal_repeat",
        },
        {
          id: "near",
          asset_id: "cute-chibi-castle-defense-grass-b",
          scroll_depth: 0.75,
          scroll_intent: "horizontal_repeat",
        },
      ],
    } as const;

    const first = await compileParallaxSet(spec, registry);
    const second = await compileParallaxSet(spec, registry);
    expect(first).toEqual(second);
    expect(first.layers).toHaveLength(2);
    expect(first.layers.every((layer) => /^[0-9a-f]{64}$/.test(layer.svg_sha256))).toBe(true);
    expect(first.manifest_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects non-increasing depth and cross-theme assets", async () => {
    const { registry } = await checkedInRegistry();
    const base = {
      contract: PARALLAX_SET_CONTRACT,
      set_id: "bad-depth",
      theme_profile: "cute_chibi_v1",
      palette_id: "cute-chibi-environment-v1",
      admission,
      provenance,
      layers: [
        {
          id: "near",
          asset_id: "cute-chibi-castle-defense-grass-a",
          scroll_depth: 0.8,
          scroll_intent: "fixed",
        },
        {
          id: "far",
          asset_id: "cute-chibi-castle-defense-grass-b",
          scroll_depth: 0.2,
          scroll_intent: "fixed",
        },
      ],
    } as const;

    await expect(compileParallaxSet(base, registry)).rejects.toBeInstanceOf(
      TileSceneValidationError,
    );
    const crossTheme = structuredClone(base) as unknown as {
      layers: Array<{ asset_id: string; scroll_depth: number }>;
    };
    crossTheme.layers[0]!.scroll_depth = 0.2;
    crossTheme.layers[1]!.scroll_depth = 0.8;
    crossTheme.layers[1]!.asset_id = "heroic-stylized-castle-defense-grass-b";
    await expect(compileParallaxSet(crossTheme, registry)).rejects.toThrow(
      /does not share set theme\/palette/i,
    );
  });
});
