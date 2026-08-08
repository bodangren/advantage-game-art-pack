import { sha256, validateSvgSource } from "./svg-assets";

export const TILE_CANDIDATE_MANIFEST_CONTRACT =
  "pixel-tile-candidate-manifest/v1" as const;
export const TILE_SCENE_CONTRACT = "pixel-tile-scene/v1" as const;
export const TILE_SCENE_ARTIFACT_CONTRACT =
  "pixel-tile-scene-artifact/v1" as const;
export const PARALLAX_SET_CONTRACT = "pixel-parallax-set/v1" as const;
export const TILE_SCENE_EXEMPLAR_SET_CONTRACT =
  "pixel-tile-scene-exemplar-set/v1" as const;

export const TILE_THEME_PROFILES = [
  "cute_chibi_v1",
  "heroic_stylized_v1",
] as const;
export type TileThemeProfile = (typeof TILE_THEME_PROFILES)[number];

export const ENVIRONMENT_SEMANTIC_ROLES = [
  "castle-defense.grass-a",
  "castle-defense.grass-b",
  "castle-defense.grass-c",
  "castle-defense.grass-d",
  "castle-defense.road-ew",
  "castle-defense.road-ns",
  "castle-defense.road-corner-ne",
  "potion-rush.shop-wall",
  "potion-rush.shop-floor",
  "potion-rush.shop-counter",
  "wizard-vs-zombie.ruins-tile",
  "rune-match.playfield-background",
] as const;
export type EnvironmentSemanticRole =
  (typeof ENVIRONMENT_SEMANTIC_ROLES)[number];

export const CARDINAL_EDGES = ["north", "east", "south", "west"] as const;
export type CardinalEdge = (typeof CARDINAL_EDGES)[number];

export interface TileEdgeContinuation {
  readonly seam: string;
  readonly continues: boolean;
}

export type TileEdges = Readonly<
  Record<CardinalEdge, TileEdgeContinuation>
>;

export interface CandidateAdmission {
  readonly state: "candidate_unadmitted";
  readonly shipping: false;
  readonly visual_review: "pending";
}

export interface PixelNativeProvenance {
  readonly origin: "pixel_native_svg";
  readonly authoring: "replacement_native";
  readonly source_repository: "pixel-art-generator";
  readonly created_utc: string;
  readonly reference_ids: readonly string[];
}

export interface TileCandidateRecord {
  readonly asset_id: string;
  readonly semantic_role: EnvironmentSemanticRole;
  readonly theme_profile: TileThemeProfile;
  readonly palette_id: string;
  readonly source_file: string;
  readonly view_box: readonly [number, number, number, number];
  readonly edges: TileEdges;
  readonly svg_sha256: string;
}

export interface TileCandidateManifestBody {
  readonly contract: typeof TILE_CANDIDATE_MANIFEST_CONTRACT;
  readonly batch_id: string;
  readonly theme_profile: TileThemeProfile;
  readonly palette_id: string;
  readonly admission: CandidateAdmission;
  readonly provenance: PixelNativeProvenance;
  readonly candidates: readonly TileCandidateRecord[];
}

export interface TileCandidateManifest extends TileCandidateManifestBody {
  readonly manifest_sha256: string;
}

export interface TileAsset extends TileCandidateRecord {
  readonly source: string;
  readonly admission: CandidateAdmission;
  readonly provenance: PixelNativeProvenance;
}

export type TileAssetRegistry = ReadonlyMap<string, TileAsset>;

export interface TileMapLayer {
  readonly kind: "tile_map";
  readonly id: string;
  readonly z_index: number;
  readonly columns: number;
  readonly rows: number;
  readonly tile_width: number;
  readonly tile_height: number;
  readonly cells: readonly (string | null)[];
}

export interface TilePlacement {
  readonly id: string;
  readonly asset_id: string;
  readonly x: number;
  readonly y: number;
}

export interface PlacementLayer {
  readonly kind: "placements";
  readonly id: string;
  readonly z_index: number;
  readonly placements: readonly TilePlacement[];
}

export type TileSceneLayer = TileMapLayer | PlacementLayer;

export interface TileSceneSpec {
  readonly contract: typeof TILE_SCENE_CONTRACT;
  readonly scene_id: string;
  readonly theme_profile: TileThemeProfile;
  readonly palette_id: string;
  readonly view_box: readonly [number, number, number, number];
  readonly admission: CandidateAdmission;
  readonly provenance: PixelNativeProvenance;
  readonly layers: readonly TileSceneLayer[];
}

export interface TileSceneLayerManifest {
  readonly id: string;
  readonly kind: TileSceneLayer["kind"];
  readonly z_index: number;
  readonly references: readonly string[];
  readonly rects: readonly {
    readonly asset_id: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }[];
  readonly layer_sha256: string;
}

export interface TileSceneArtifactManifestBody {
  readonly contract: typeof TILE_SCENE_ARTIFACT_CONTRACT;
  readonly scene_id: string;
  readonly theme_profile: TileThemeProfile;
  readonly palette_id: string;
  readonly view_box: readonly [number, number, number, number];
  readonly admission: CandidateAdmission;
  readonly provenance: PixelNativeProvenance;
  readonly layers: readonly TileSceneLayerManifest[];
  readonly svg_sha256: string;
}

export interface TileSceneArtifactManifest
  extends TileSceneArtifactManifestBody {
  readonly manifest_sha256: string;
}

export interface CompiledTileScene {
  readonly svg: string;
  readonly manifest: TileSceneArtifactManifest;
  readonly manifest_json: string;
}

export interface TileSceneExemplarRecord {
  readonly scene_id: string;
  readonly svg_file: string;
  readonly manifest_file: string;
  readonly svg_sha256: string;
  readonly manifest_sha256: string;
}

export interface TileSceneExemplarSet {
  readonly contract: typeof TILE_SCENE_EXEMPLAR_SET_CONTRACT;
  readonly theme_profile: TileThemeProfile;
  readonly admission: CandidateAdmission;
  readonly scenes: readonly TileSceneExemplarRecord[];
  readonly set_sha256: string;
}

export const ENVIRONMENT_SCENE_EXEMPLAR_ROLES = [
  "castle-defense",
  "potion-rush",
  "wizard-vs-zombie",
  "rune-match",
] as const;
export type EnvironmentSceneExemplarRole =
  (typeof ENVIRONMENT_SCENE_EXEMPLAR_ROLES)[number];

export interface ParallaxLayerSpec {
  readonly id: string;
  readonly asset_id: string;
  readonly scroll_depth: number;
  readonly scroll_intent: "fixed" | "horizontal_repeat";
}

export interface ParallaxSetSpec {
  readonly contract: typeof PARALLAX_SET_CONTRACT;
  readonly set_id: string;
  readonly theme_profile: TileThemeProfile;
  readonly palette_id: string;
  readonly admission: CandidateAdmission;
  readonly provenance: PixelNativeProvenance;
  readonly layers: readonly ParallaxLayerSpec[];
}

export interface CompiledParallaxSet {
  readonly layers: readonly {
    readonly id: string;
    readonly asset_id: string;
    readonly scroll_depth: number;
    readonly scroll_intent: ParallaxLayerSpec["scroll_intent"];
    readonly svg: string;
    readonly svg_sha256: string;
  }[];
  readonly manifest_json: string;
  readonly manifest_sha256: string;
}

export class TileSceneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TileSceneValidationError";
  }
}

type UnknownRecord = Record<string, unknown>;
const SLUG_RE = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const MAX_NUMBER = 1_000_000;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, context: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new TileSceneValidationError(`${context} must be an object`);
  }
  return value;
}

function assertKeys(
  value: UnknownRecord,
  required: readonly string[],
  allowed: readonly string[],
  context: string,
): void {
  const missing = required.filter((key) => !(key in value));
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (missing.length > 0) {
    throw new TileSceneValidationError(
      `${context} missing required key(s): ${missing.join(", ")}`,
    );
  }
  if (extras.length > 0) {
    throw new TileSceneValidationError(
      `${context} contains unexpected key(s): ${extras.join(", ")}`,
    );
  }
}

function slug(value: unknown, context: string): string {
  if (typeof value !== "string" || !SLUG_RE.test(value)) {
    throw new TileSceneValidationError(`${context} must be a lowercase slug`);
  }
  return value;
}

function finite(value: unknown, context: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    Math.abs(value) > MAX_NUMBER
  ) {
    throw new TileSceneValidationError(
      `${context} must be a finite number within ${MAX_NUMBER}`,
    );
  }
  return value === 0 ? 0 : value;
}

function positiveInteger(value: unknown, context: string): number {
  const parsed = finite(value, context);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new TileSceneValidationError(`${context} must be a positive integer`);
  }
  return parsed;
}

function themeProfile(value: unknown, context: string): TileThemeProfile {
  if (
    typeof value !== "string" ||
    !(TILE_THEME_PROFILES as readonly string[]).includes(value)
  ) {
    throw new TileSceneValidationError(
      `${context} must be one of: ${TILE_THEME_PROFILES.join(", ")}`,
    );
  }
  return value as TileThemeProfile;
}

function viewBox(
  value: unknown,
  context: string,
): readonly [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new TileSceneValidationError(`${context} must be a four-item array`);
  }
  const parsed = value.map((item, index) => finite(item, `${context}[${index}]`));
  if (parsed[2]! <= 0 || parsed[3]! <= 0) {
    throw new TileSceneValidationError(`${context} dimensions must be positive`);
  }
  return [parsed[0]!, parsed[1]!, parsed[2]!, parsed[3]!];
}

function admission(value: unknown, context: string): CandidateAdmission {
  const parsed = record(value, context);
  assertKeys(
    parsed,
    ["state", "shipping", "visual_review"],
    ["state", "shipping", "visual_review"],
    context,
  );
  if (
    parsed.state !== "candidate_unadmitted" ||
    parsed.shipping !== false ||
    parsed.visual_review !== "pending"
  ) {
    throw new TileSceneValidationError(
      `${context} must remain candidate_unadmitted, shipping false, visual_review pending`,
    );
  }
  return {
    state: "candidate_unadmitted",
    shipping: false,
    visual_review: "pending",
  };
}

function provenance(value: unknown, context: string): PixelNativeProvenance {
  const parsed = record(value, context);
  assertKeys(
    parsed,
    [
      "origin",
      "authoring",
      "source_repository",
      "created_utc",
      "reference_ids",
    ],
    [
      "origin",
      "authoring",
      "source_repository",
      "created_utc",
      "reference_ids",
    ],
    context,
  );
  if (
    parsed.origin !== "pixel_native_svg" ||
    parsed.authoring !== "replacement_native" ||
    parsed.source_repository !== "pixel-art-generator"
  ) {
    throw new TileSceneValidationError(`${context} has invalid Pixel ownership`);
  }
  if (typeof parsed.created_utc !== "string" || !ISO_UTC_RE.test(parsed.created_utc)) {
    throw new TileSceneValidationError(`${context}.created_utc must be UTC ISO-8601`);
  }
  if (
    !Array.isArray(parsed.reference_ids) ||
    parsed.reference_ids.some((item) => typeof item !== "string" || item.length === 0)
  ) {
    throw new TileSceneValidationError(`${context}.reference_ids must be strings`);
  }
  return {
    origin: "pixel_native_svg",
    authoring: "replacement_native",
    source_repository: "pixel-art-generator",
    created_utc: parsed.created_utc,
    reference_ids: [...(parsed.reference_ids as string[])],
  };
}

function tileEdges(value: unknown, context: string): TileEdges {
  const parsed = record(value, context);
  assertKeys(parsed, CARDINAL_EDGES, CARDINAL_EDGES, context);
  return Object.fromEntries(
    CARDINAL_EDGES.map((edge) => {
      const edgeContext = `${context}.${edge}`;
      const raw = record(parsed[edge], edgeContext);
      assertKeys(raw, ["seam", "continues"], ["seam", "continues"], edgeContext);
      if (typeof raw.continues !== "boolean") {
        throw new TileSceneValidationError(`${edgeContext}.continues must be boolean`);
      }
      return [edge, { seam: slug(raw.seam, `${edgeContext}.seam`), continues: raw.continues }];
    }),
  ) as unknown as TileEdges;
}

function semanticRole(value: unknown, context: string): EnvironmentSemanticRole {
  if (
    typeof value !== "string" ||
    !(ENVIRONMENT_SEMANTIC_ROLES as readonly string[]).includes(value)
  ) {
    throw new TileSceneValidationError(`${context} is not a known environment role`);
  }
  return value as EnvironmentSemanticRole;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function validateEnvironmentSceneExemplarSet(
  value: unknown,
): TileSceneExemplarSet {
  const root = record(value, "tile scene exemplar set");
  assertKeys(
    root,
    ["contract", "theme_profile", "admission", "scenes", "set_sha256"],
    ["contract", "theme_profile", "admission", "scenes", "set_sha256"],
    "tile scene exemplar set",
  );
  if (root.contract !== TILE_SCENE_EXEMPLAR_SET_CONTRACT) {
    throw new TileSceneValidationError(
      `tile scene exemplar set.contract must be ${TILE_SCENE_EXEMPLAR_SET_CONTRACT}`,
    );
  }
  const profile = themeProfile(
    root.theme_profile,
    "tile scene exemplar set.theme_profile",
  );
  if (!Array.isArray(root.scenes) || root.scenes.length !== 4) {
    throw new TileSceneValidationError(
      "tile scene exemplar set.scenes must contain exactly four scenes",
    );
  }
  const prefix = profile === "cute_chibi_v1" ? "cute-chibi" : "heroic-stylized";
  const scenes = root.scenes.map((value, index) => {
    const context = `tile scene exemplar set.scenes[${index}]`;
    const raw = record(value, context);
    assertKeys(
      raw,
      ["scene_id", "svg_file", "manifest_file", "svg_sha256", "manifest_sha256"],
      ["scene_id", "svg_file", "manifest_file", "svg_sha256", "manifest_sha256"],
      context,
    );
    const expectedRole = ENVIRONMENT_SCENE_EXEMPLAR_ROLES[index]!;
    const expectedId = `${prefix}-${expectedRole}-environment-exemplar`;
    if (raw.scene_id !== expectedId) {
      throw new TileSceneValidationError(
        `${context}.scene_id must be ${expectedId}`,
      );
    }
    const svgFile = raw.svg_file;
    const manifestFile = raw.manifest_file;
    if (
      typeof svgFile !== "string" ||
      !svgFile.startsWith("./") ||
      !svgFile.endsWith(".svg") ||
      svgFile.includes("..")
    ) {
      throw new TileSceneValidationError(`${context}.svg_file must be local`);
    }
    if (
      typeof manifestFile !== "string" ||
      !manifestFile.startsWith("./") ||
      !manifestFile.endsWith(".manifest.json") ||
      manifestFile.includes("..")
    ) {
      throw new TileSceneValidationError(`${context}.manifest_file must be local`);
    }
    if (
      typeof raw.svg_sha256 !== "string" ||
      !SHA256_RE.test(raw.svg_sha256) ||
      typeof raw.manifest_sha256 !== "string" ||
      !SHA256_RE.test(raw.manifest_sha256)
    ) {
      throw new TileSceneValidationError(`${context} digests must be SHA-256`);
    }
    return {
      scene_id: expectedId,
      svg_file: svgFile,
      manifest_file: manifestFile,
      svg_sha256: raw.svg_sha256,
      manifest_sha256: raw.manifest_sha256,
    };
  });
  if (typeof root.set_sha256 !== "string" || !SHA256_RE.test(root.set_sha256)) {
    throw new TileSceneValidationError(
      "tile scene exemplar set.set_sha256 must be SHA-256",
    );
  }
  return {
    contract: TILE_SCENE_EXEMPLAR_SET_CONTRACT,
    theme_profile: profile,
    admission: admission(root.admission, "tile scene exemplar set.admission"),
    scenes,
    set_sha256: root.set_sha256,
  };
}

export async function verifyEnvironmentSceneExemplarSet(
  value: unknown,
  loadFile: (file: string) => Promise<string> | string,
): Promise<TileSceneExemplarSet> {
  const set = validateEnvironmentSceneExemplarSet(value);
  const { set_sha256: _setSha256, ...body } = set;
  if ((await sha256(stableJson(body))) !== set.set_sha256) {
    throw new TileSceneValidationError("tile scene exemplar set digest mismatch");
  }
  for (const scene of set.scenes) {
    const svg = await loadFile(scene.svg_file);
    if ((await sha256(svg)) !== scene.svg_sha256) {
      throw new TileSceneValidationError(`${scene.scene_id} exemplar SVG digest mismatch`);
    }
    let manifestValue: unknown;
    try {
      manifestValue = JSON.parse(await loadFile(scene.manifest_file));
    } catch {
      throw new TileSceneValidationError(`${scene.scene_id} manifest must be JSON`);
    }
    const manifest = record(manifestValue, `${scene.scene_id} manifest`);
    assertKeys(
      manifest,
      [
        "contract",
        "scene_id",
        "theme_profile",
        "palette_id",
        "view_box",
        "admission",
        "provenance",
        "layers",
        "svg_sha256",
        "manifest_sha256",
      ],
      [
        "contract",
        "scene_id",
        "theme_profile",
        "palette_id",
        "view_box",
        "admission",
        "provenance",
        "layers",
        "svg_sha256",
        "manifest_sha256",
      ],
      `${scene.scene_id} manifest`,
    );
    if (
      manifest.contract !== TILE_SCENE_ARTIFACT_CONTRACT ||
      manifest.scene_id !== scene.scene_id ||
      manifest.theme_profile !== set.theme_profile ||
      manifest.svg_sha256 !== scene.svg_sha256 ||
      manifest.manifest_sha256 !== scene.manifest_sha256
    ) {
      throw new TileSceneValidationError(`${scene.scene_id} manifest binding mismatch`);
    }
    const { manifest_sha256: _manifestSha256, ...manifestBodyValue } = manifest;
    if ((await sha256(stableJson(manifestBodyValue))) !== scene.manifest_sha256) {
      throw new TileSceneValidationError(`${scene.scene_id} manifest digest mismatch`);
    }
  }
  return set;
}

function manifestBody(manifest: TileCandidateManifest): TileCandidateManifestBody {
  const { manifest_sha256: _manifestSha256, ...body } = manifest;
  return body;
}

export function edgesAreCompatible(
  first: TileEdgeContinuation,
  second: TileEdgeContinuation,
): boolean {
  return first.continues && second.continues && first.seam === second.seam;
}

const EXEMPLAR_ADMISSION: CandidateAdmission = {
  state: "candidate_unadmitted",
  shipping: false,
  visual_review: "pending",
};

const EXEMPLAR_PROVENANCE: PixelNativeProvenance = {
  origin: "pixel_native_svg",
  authoring: "replacement_native",
  source_repository: "pixel-art-generator",
  created_utc: "2026-07-22T19:09:22Z",
  reference_ids: [],
};

function exemplarBinding(profile: TileThemeProfile): {
  readonly assetPrefix: string;
  readonly paletteId: string;
} {
  return profile === "cute_chibi_v1"
    ? {
        assetPrefix: "cute-chibi",
        paletteId: "cute-chibi-environment-v1",
      }
    : {
        assetPrefix: "heroic-stylized",
        paletteId: "heroic-stylized-environment-v1",
      };
}

function tileMapLayer(
  id: string,
  cells: readonly string[],
): TileMapLayer {
  return {
    kind: "tile_map",
    id,
    z_index: 0,
    columns: 4,
    rows: 3,
    tile_width: 32,
    tile_height: 32,
    cells,
  };
}

export function environmentSceneExemplarSpecs(
  profile: TileThemeProfile,
): readonly TileSceneSpec[] {
  const { assetPrefix, paletteId } = exemplarBinding(profile);
  const asset = (id: string) => `${assetPrefix}-${id}`;
  const scene = (
    role: EnvironmentSceneExemplarRole,
    layers: readonly TileSceneLayer[],
  ): TileSceneSpec => ({
    contract: TILE_SCENE_CONTRACT,
    scene_id: `${assetPrefix}-${role}-environment-exemplar`,
    theme_profile: profile,
    palette_id: paletteId,
    view_box: [0, 0, 128, 96],
    admission: EXEMPLAR_ADMISSION,
    provenance: EXEMPLAR_PROVENANCE,
    layers,
  });

  const grass = [
    asset("castle-defense-grass-a"),
    asset("castle-defense-grass-b"),
    asset("castle-defense-grass-c"),
    asset("castle-defense-grass-d"),
  ] as const;
  const road = asset("castle-defense-road-ew");
  const shopFloor = asset("potion-rush-shop-floor");
  const shopWall = asset("potion-rush-shop-wall");
  const shopCounter = asset("potion-rush-shop-counter");
  const ruins = asset("wizard-vs-zombie-ruins-tile");
  const playfield = asset("rune-match-playfield-background");

  return [
    scene("castle-defense", [
      tileMapLayer("terrain", [
        grass[0], grass[1], grass[2], grass[3],
        road, road, road, road,
        grass[2], grass[0], grass[3], grass[1],
      ]),
    ]),
    scene("potion-rush", [
      tileMapLayer("floor", Array.from({ length: 12 }, () => shopFloor)),
      {
        kind: "placements",
        id: "shop-fixtures",
        z_index: 10,
        placements: [
          ...Array.from({ length: 4 }, (_, index) => ({
            id: `wall-${index}`,
            asset_id: shopWall,
            x: index * 32,
            y: 0,
          })),
          {
            id: "service-counter",
            asset_id: shopCounter,
            x: 48,
            y: 40,
          },
        ],
      },
    ]),
    scene("wizard-vs-zombie", [
      tileMapLayer("ruins", Array.from({ length: 12 }, () => ruins)),
    ]),
    scene("rune-match", [
      tileMapLayer("playfield", Array.from({ length: 12 }, () => playfield)),
    ]),
  ];
}

export function assertCompatibleTileEdges(
  first: TileAsset,
  firstEdge: CardinalEdge,
  second: TileAsset,
  secondEdge: CardinalEdge,
  context: string,
): void {
  if (!edgesAreCompatible(first.edges[firstEdge], second.edges[secondEdge])) {
    throw new TileSceneValidationError(
      `${context} edge mismatch: ${first.asset_id}.${firstEdge} ` +
        `(${first.edges[firstEdge].seam}/${String(first.edges[firstEdge].continues)}) ` +
        `cannot adjoin ${second.asset_id}.${secondEdge} ` +
        `(${second.edges[secondEdge].seam}/${String(second.edges[secondEdge].continues)})`,
    );
  }
}

export function validateTileCandidateManifest(
  value: unknown,
): TileCandidateManifest {
  const root = record(value, "tile candidate manifest");
  assertKeys(
    root,
    [
      "contract",
      "batch_id",
      "theme_profile",
      "palette_id",
      "admission",
      "provenance",
      "candidates",
      "manifest_sha256",
    ],
    [
      "contract",
      "batch_id",
      "theme_profile",
      "palette_id",
      "admission",
      "provenance",
      "candidates",
      "manifest_sha256",
    ],
    "tile candidate manifest",
  );
  if (root.contract !== TILE_CANDIDATE_MANIFEST_CONTRACT) {
    throw new TileSceneValidationError(
      `tile candidate manifest.contract must be ${TILE_CANDIDATE_MANIFEST_CONTRACT}`,
    );
  }
  const profile = themeProfile(root.theme_profile, "tile candidate manifest.theme_profile");
  const paletteId = slug(root.palette_id, "tile candidate manifest.palette_id");
  if (!Array.isArray(root.candidates)) {
    throw new TileSceneValidationError("tile candidate manifest.candidates must be an array");
  }
  const seenAssets = new Set<string>();
  const candidates = root.candidates.map((value, index) => {
    const context = `tile candidate manifest.candidates[${index}]`;
    const raw = record(value, context);
    assertKeys(
      raw,
      [
        "asset_id",
        "semantic_role",
        "theme_profile",
        "palette_id",
        "source_file",
        "view_box",
        "edges",
        "svg_sha256",
      ],
      [
        "asset_id",
        "semantic_role",
        "theme_profile",
        "palette_id",
        "source_file",
        "view_box",
        "edges",
        "svg_sha256",
      ],
      context,
    );
    const assetId = slug(raw.asset_id, `${context}.asset_id`);
    if (seenAssets.has(assetId)) {
      throw new TileSceneValidationError(`${context}.asset_id duplicates ${assetId}`);
    }
    seenAssets.add(assetId);
    if (raw.theme_profile !== profile || raw.palette_id !== paletteId) {
      throw new TileSceneValidationError(
        `${context} theme/palette must match its manifest`,
      );
    }
    if (typeof raw.source_file !== "string" || !/^\.\/[a-z0-9-]+\.svg$/.test(raw.source_file)) {
      throw new TileSceneValidationError(`${context}.source_file must be a local SVG path`);
    }
    if (typeof raw.svg_sha256 !== "string" || !SHA256_RE.test(raw.svg_sha256)) {
      throw new TileSceneValidationError(`${context}.svg_sha256 must be lowercase SHA-256`);
    }
    return {
      asset_id: assetId,
      semantic_role: semanticRole(raw.semantic_role, `${context}.semantic_role`),
      theme_profile: profile,
      palette_id: paletteId,
      source_file: raw.source_file,
      view_box: viewBox(raw.view_box, `${context}.view_box`),
      edges: tileEdges(raw.edges, `${context}.edges`),
      svg_sha256: raw.svg_sha256,
    } satisfies TileCandidateRecord;
  });
  if (typeof root.manifest_sha256 !== "string" || !SHA256_RE.test(root.manifest_sha256)) {
    throw new TileSceneValidationError(
      "tile candidate manifest.manifest_sha256 must be lowercase SHA-256",
    );
  }
  return {
    contract: TILE_CANDIDATE_MANIFEST_CONTRACT,
    batch_id: slug(root.batch_id, "tile candidate manifest.batch_id"),
    theme_profile: profile,
    palette_id: paletteId,
    admission: admission(root.admission, "tile candidate manifest.admission"),
    provenance: provenance(root.provenance, "tile candidate manifest.provenance"),
    candidates,
    manifest_sha256: root.manifest_sha256,
  };
}

function validateSvgCandidateSource(source: string, candidate: TileCandidateRecord): void {
  try {
    validateSvgSource(
      source,
      {
        version: 1,
        part_id: candidate.asset_id,
        slot: "tile",
        source_file: candidate.source_file,
        view_box: candidate.view_box,
        anchors: {},
        z_index: 0,
        palette_slots: [],
        tags: [candidate.semantic_role, candidate.theme_profile],
        description: `Replacement/native candidate ${candidate.semantic_role}`,
      },
      `tile candidate ${candidate.asset_id}`,
    );
  } catch (error) {
    throw new TileSceneValidationError(
      error instanceof Error
        ? error.message
        : `${candidate.asset_id} has invalid SVG source`,
    );
  }
  const root = source.match(/^\s*<svg\b([^>]*)>/i)?.[1];
  const expectedWidth = String(candidate.view_box[2]);
  const expectedHeight = String(candidate.view_box[3]);
  if (!root || !/\bxmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(root)) {
    throw new TileSceneValidationError(
      `tile candidate ${candidate.asset_id} root must declare the SVG namespace`,
    );
  }
  if (
    !new RegExp(`\\bwidth="${expectedWidth}"`).test(root) ||
    !new RegExp(`\\bheight="${expectedHeight}"`).test(root)
  ) {
    throw new TileSceneValidationError(
      `tile candidate ${candidate.asset_id} root width/height must equal its viewBox dimensions`,
    );
  }
}

export async function verifyTileCandidateManifest(
  value: unknown,
  loadSource: (sourceFile: string) => Promise<string> | string,
): Promise<TileCandidateManifest> {
  const manifest = validateTileCandidateManifest(value);
  const expectedManifestHash = await sha256(stableJson(manifestBody(manifest)));
  if (expectedManifestHash !== manifest.manifest_sha256) {
    throw new TileSceneValidationError("tile candidate manifest digest mismatch");
  }
  for (const candidate of manifest.candidates) {
    const source = await loadSource(candidate.source_file);
    validateSvgCandidateSource(source, candidate);
    if ((await sha256(source)) !== candidate.svg_sha256) {
      throw new TileSceneValidationError(`${candidate.asset_id} SVG digest mismatch`);
    }
  }
  return manifest;
}

export function validateCandidateThemePair(
  manifests: readonly TileCandidateManifest[],
): void {
  if (manifests.length !== TILE_THEME_PROFILES.length) {
    throw new TileSceneValidationError(
      `theme pair requires ${TILE_THEME_PROFILES.length} manifests`,
    );
  }
  for (const profile of TILE_THEME_PROFILES) {
    const manifest = manifests.find((item) => item.theme_profile === profile);
    if (!manifest) {
      throw new TileSceneValidationError(`theme pair missing ${profile}`);
    }
    const roles = manifest.candidates.map((candidate) => candidate.semantic_role);
    if (
      roles.length !== ENVIRONMENT_SEMANTIC_ROLES.length ||
      new Set(roles).size !== roles.length ||
      ENVIRONMENT_SEMANTIC_ROLES.some((role) => !roles.includes(role))
    ) {
      throw new TileSceneValidationError(
        `${profile} must contain exactly one candidate for every environment role`,
      );
    }
  }
}

export async function buildTileAssetRegistry(
  manifests: readonly unknown[],
  loadSource: (
    manifest: TileCandidateManifest,
    sourceFile: string,
  ) => Promise<string> | string,
): Promise<TileAssetRegistry> {
  const normalizedManifests = manifests.map(validateTileCandidateManifest);
  validateCandidateThemePair(normalizedManifests);
  const registry = new Map<string, TileAsset>();
  for (const manifest of normalizedManifests) {
    if (
      (await sha256(stableJson(manifestBody(manifest)))) !==
      manifest.manifest_sha256
    ) {
      throw new TileSceneValidationError(
        `tile candidate manifest ${manifest.batch_id} digest mismatch`,
      );
    }
    for (const candidate of manifest.candidates) {
      if (registry.has(candidate.asset_id)) {
        throw new TileSceneValidationError(`duplicate tile asset ${candidate.asset_id}`);
      }
      const source = await loadSource(manifest, candidate.source_file);
      validateSvgCandidateSource(source, candidate);
      if ((await sha256(source)) !== candidate.svg_sha256) {
        throw new TileSceneValidationError(`${candidate.asset_id} SVG digest mismatch`);
      }
      registry.set(candidate.asset_id, {
        ...candidate,
        source,
        admission: manifest.admission,
        provenance: manifest.provenance,
      });
    }
  }
  return registry;
}

function sceneLayer(value: unknown, index: number): TileSceneLayer {
  const context = `tile scene.layers[${index}]`;
  const raw = record(value, context);
  if (raw.kind === "tile_map") {
    assertKeys(
      raw,
      ["kind", "id", "z_index", "columns", "rows", "tile_width", "tile_height", "cells"],
      ["kind", "id", "z_index", "columns", "rows", "tile_width", "tile_height", "cells"],
      context,
    );
    const columns = positiveInteger(raw.columns, `${context}.columns`);
    const rows = positiveInteger(raw.rows, `${context}.rows`);
    if (!Array.isArray(raw.cells) || raw.cells.length !== columns * rows) {
      throw new TileSceneValidationError(
        `${context}.cells must contain columns * rows entries in row-major order`,
      );
    }
    const cells = raw.cells.map((cell, cellIndex) => {
      if (cell === null) return null;
      return slug(cell, `${context}.cells[${cellIndex}]`);
    });
    return {
      kind: "tile_map",
      id: slug(raw.id, `${context}.id`),
      z_index: finite(raw.z_index, `${context}.z_index`),
      columns,
      rows,
      tile_width: positiveInteger(raw.tile_width, `${context}.tile_width`),
      tile_height: positiveInteger(raw.tile_height, `${context}.tile_height`),
      cells,
    };
  }
  if (raw.kind === "placements") {
    assertKeys(
      raw,
      ["kind", "id", "z_index", "placements"],
      ["kind", "id", "z_index", "placements"],
      context,
    );
    if (!Array.isArray(raw.placements)) {
      throw new TileSceneValidationError(`${context}.placements must be an array`);
    }
    const seen = new Set<string>();
    const placements = raw.placements.map((value, placementIndex) => {
      const placementContext = `${context}.placements[${placementIndex}]`;
      const placement = record(value, placementContext);
      assertKeys(
        placement,
        ["id", "asset_id", "x", "y"],
        ["id", "asset_id", "x", "y"],
        placementContext,
      );
      const id = slug(placement.id, `${placementContext}.id`);
      if (seen.has(id)) {
        throw new TileSceneValidationError(`${placementContext}.id duplicates ${id}`);
      }
      seen.add(id);
      return {
        id,
        asset_id: slug(placement.asset_id, `${placementContext}.asset_id`),
        x: finite(placement.x, `${placementContext}.x`),
        y: finite(placement.y, `${placementContext}.y`),
      };
    });
    return {
      kind: "placements",
      id: slug(raw.id, `${context}.id`),
      z_index: finite(raw.z_index, `${context}.z_index`),
      placements,
    };
  }
  throw new TileSceneValidationError(
    `${context}.kind must be tile_map or placements`,
  );
}

export function validateTileSceneSpec(value: unknown): TileSceneSpec {
  const root = record(value, "tile scene");
  assertKeys(
    root,
    [
      "contract",
      "scene_id",
      "theme_profile",
      "palette_id",
      "view_box",
      "admission",
      "provenance",
      "layers",
    ],
    [
      "contract",
      "scene_id",
      "theme_profile",
      "palette_id",
      "view_box",
      "admission",
      "provenance",
      "layers",
    ],
    "tile scene",
  );
  if (root.contract !== TILE_SCENE_CONTRACT) {
    throw new TileSceneValidationError(
      `tile scene.contract must be ${TILE_SCENE_CONTRACT}`,
    );
  }
  if (!Array.isArray(root.layers) || root.layers.length === 0) {
    throw new TileSceneValidationError("tile scene.layers must be non-empty");
  }
  const layers = root.layers.map(sceneLayer);
  const ids = layers.map((layer) => layer.id);
  if (new Set(ids).size !== ids.length) {
    throw new TileSceneValidationError("tile scene layer ids must be unique");
  }
  for (let index = 1; index < layers.length; index += 1) {
    if (layers[index - 1]!.z_index >= layers[index]!.z_index) {
      throw new TileSceneValidationError(
        "tile scene layers must be ordered by strictly increasing z_index",
      );
    }
  }
  return {
    contract: TILE_SCENE_CONTRACT,
    scene_id: slug(root.scene_id, "tile scene.scene_id"),
    theme_profile: themeProfile(root.theme_profile, "tile scene.theme_profile"),
    palette_id: slug(root.palette_id, "tile scene.palette_id"),
    view_box: viewBox(root.view_box, "tile scene.view_box"),
    admission: admission(root.admission, "tile scene.admission"),
    provenance: provenance(root.provenance, "tile scene.provenance"),
    layers,
  };
}

function assetForScene(
  registry: TileAssetRegistry,
  assetId: string,
  scene: TileSceneSpec,
  context: string,
): TileAsset {
  const asset = registry.get(assetId);
  if (!asset) {
    throw new TileSceneValidationError(`${context} unknown tile asset ${assetId}`);
  }
  if (
    asset.theme_profile !== scene.theme_profile ||
    asset.palette_id !== scene.palette_id
  ) {
    throw new TileSceneValidationError(
      `${context} tile asset ${assetId} does not match scene theme/palette`,
    );
  }
  return asset;
}

function svgChildren(source: string, assetId: string): string {
  const match = source.match(/^\s*<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/i);
  if (!match) {
    throw new TileSceneValidationError(`${assetId} has invalid SVG source`);
  }
  return match[1]!.trim();
}

function scaleFor(asset: TileAsset, width: number, height: number): string {
  const [, , sourceWidth, sourceHeight] = asset.view_box;
  return `${width / sourceWidth} ${height / sourceHeight}`;
}

export async function compileTileScene(
  value: unknown,
  registry: TileAssetRegistry,
): Promise<CompiledTileScene> {
  const scene = validateTileSceneSpec(value);
  const layerSvgs: string[] = [];
  const layerManifests: TileSceneLayerManifest[] = [];
  for (const layer of scene.layers) {
    const items: string[] = [];
    const rects: TileSceneLayerManifest["rects"][number][] = [];
    const references = new Set<string>();
    if (layer.kind === "tile_map") {
      const assets = layer.cells.map((assetId, cellIndex) =>
        assetId === null
          ? null
          : assetForScene(
              registry,
              assetId,
              scene,
              `tile scene layer ${layer.id} cell ${cellIndex}`,
            ),
      );
      for (let row = 0; row < layer.rows; row += 1) {
        for (let column = 0; column < layer.columns; column += 1) {
          const index = row * layer.columns + column;
          const asset = assets[index];
          if (!asset) continue;
          if (column + 1 < layer.columns) {
            const right = assets[index + 1];
            if (right) {
              assertCompatibleTileEdges(
                asset,
                "east",
                right,
                "west",
                `tile scene layer ${layer.id} cells ${index}/${index + 1}`,
              );
            }
          }
          if (row + 1 < layer.rows) {
            const below = assets[index + layer.columns];
            if (below) {
              assertCompatibleTileEdges(
                asset,
                "south",
                below,
                "north",
                `tile scene layer ${layer.id} cells ${index}/${index + layer.columns}`,
              );
            }
          }
          const x = column * layer.tile_width;
          const y = row * layer.tile_height;
          references.add(asset.asset_id);
          rects.push({
            asset_id: asset.asset_id,
            x,
            y,
            width: layer.tile_width,
            height: layer.tile_height,
          });
          items.push(
            `    <g id="${layer.id}-cell-${index}" transform="translate(${x} ${y}) scale(${scaleFor(asset, layer.tile_width, layer.tile_height)})">${svgChildren(asset.source, asset.asset_id)}</g>`,
          );
        }
      }
    } else {
      for (const placement of layer.placements) {
        const asset = assetForScene(
          registry,
          placement.asset_id,
          scene,
          `tile scene layer ${layer.id} placement ${placement.id}`,
        );
        references.add(asset.asset_id);
        rects.push({
          asset_id: asset.asset_id,
          x: placement.x,
          y: placement.y,
          width: asset.view_box[2],
          height: asset.view_box[3],
        });
        items.push(
          `    <g id="${placement.id}" transform="translate(${placement.x} ${placement.y})">${svgChildren(asset.source, asset.asset_id)}</g>`,
        );
      }
    }
    const layerSvg = [
      `  <g id="${layer.id}" data-layer-kind="${layer.kind}" data-z-index="${layer.z_index}">`,
      ...items,
      "  </g>",
    ].join("\n");
    layerSvgs.push(layerSvg);
    layerManifests.push({
      id: layer.id,
      kind: layer.kind,
      z_index: layer.z_index,
      references: [...references].sort(),
      rects,
      layer_sha256: await sha256(layerSvg),
    });
  }
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${scene.view_box.join(" ")}" width="${scene.view_box[2]}" height="${scene.view_box[3]}">`,
    ...layerSvgs,
    "</svg>",
    "",
  ].join("\n");
  const body: TileSceneArtifactManifestBody = {
    contract: TILE_SCENE_ARTIFACT_CONTRACT,
    scene_id: scene.scene_id,
    theme_profile: scene.theme_profile,
    palette_id: scene.palette_id,
    view_box: scene.view_box,
    admission: scene.admission,
    provenance: scene.provenance,
    layers: layerManifests,
    svg_sha256: await sha256(svg),
  };
  const manifest: TileSceneArtifactManifest = {
    ...body,
    manifest_sha256: await sha256(stableJson(body)),
  };
  return { svg, manifest, manifest_json: stableJson(manifest) };
}

export async function compileParallaxSet(
  value: unknown,
  registry: TileAssetRegistry,
): Promise<CompiledParallaxSet> {
  const root = record(value, "parallax set");
  assertKeys(
    root,
    ["contract", "set_id", "theme_profile", "palette_id", "admission", "provenance", "layers"],
    ["contract", "set_id", "theme_profile", "palette_id", "admission", "provenance", "layers"],
    "parallax set",
  );
  if (root.contract !== PARALLAX_SET_CONTRACT) {
    throw new TileSceneValidationError(
      `parallax set.contract must be ${PARALLAX_SET_CONTRACT}`,
    );
  }
  const profile = themeProfile(root.theme_profile, "parallax set.theme_profile");
  const paletteId = slug(root.palette_id, "parallax set.palette_id");
  const parsedAdmission = admission(root.admission, "parallax set.admission");
  const parsedProvenance = provenance(root.provenance, "parallax set.provenance");
  if (!Array.isArray(root.layers) || root.layers.length === 0) {
    throw new TileSceneValidationError("parallax set.layers must be non-empty");
  }
  let lastDepth = -1;
  const ids = new Set<string>();
  const layers = await Promise.all(
    root.layers.map(async (value, index) => {
      const context = `parallax set.layers[${index}]`;
      const raw = record(value, context);
      assertKeys(
        raw,
        ["id", "asset_id", "scroll_depth", "scroll_intent"],
        ["id", "asset_id", "scroll_depth", "scroll_intent"],
        context,
      );
      const id = slug(raw.id, `${context}.id`);
      if (ids.has(id)) {
        throw new TileSceneValidationError(`${context}.id duplicates ${id}`);
      }
      ids.add(id);
      const depth = finite(raw.scroll_depth, `${context}.scroll_depth`);
      if (depth < 0 || depth > 1 || depth <= lastDepth) {
        throw new TileSceneValidationError(
          "parallax layers must use strictly increasing scroll_depth from 0 through 1",
        );
      }
      lastDepth = depth;
      if (raw.scroll_intent !== "fixed" && raw.scroll_intent !== "horizontal_repeat") {
        throw new TileSceneValidationError(
          `${context}.scroll_intent must be fixed or horizontal_repeat`,
        );
      }
      const assetId = slug(raw.asset_id, `${context}.asset_id`);
      const asset = registry.get(assetId);
      if (!asset) {
        throw new TileSceneValidationError(`${context} unknown tile asset ${assetId}`);
      }
      if (asset.theme_profile !== profile || asset.palette_id !== paletteId) {
        throw new TileSceneValidationError(`${context} asset does not share set theme/palette`);
      }
      return {
        id,
        asset_id: assetId,
        scroll_depth: depth,
        scroll_intent: raw.scroll_intent,
        svg: asset.source,
        svg_sha256: await sha256(asset.source),
      } as const;
    }),
  );
  const body = {
    contract: PARALLAX_SET_CONTRACT,
    set_id: slug(root.set_id, "parallax set.set_id"),
    theme_profile: profile,
    palette_id: paletteId,
    admission: parsedAdmission,
    provenance: parsedProvenance,
    layers: layers.map(({ svg: _svg, ...layer }) => layer),
  };
  const manifestSha256 = await sha256(stableJson(body));
  return {
    layers,
    manifest_json: stableJson({ ...body, manifest_sha256: manifestSha256 }),
    manifest_sha256: manifestSha256,
  };
}
