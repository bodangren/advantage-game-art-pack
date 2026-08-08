import { describe, expect, it } from "vitest";

import {
  TILE_SCENE_REFERENCE_BOARD_CONTRACT,
  TILE_SCENE_REFERENCE_BOARD_MAPPING,
  TileSceneReferenceBoardValidationError,
  digestTileSceneReferenceBoard,
  validateTileSceneReferenceBoard,
  verifyTileSceneReferenceBoardArtifacts,
  type TileSceneReferenceBoard,
} from "./tile-scene-reference-board";

const encoder = new TextEncoder();

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashBytes(bytes: Uint8Array): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes))));
}

const contents = new Map<string, Uint8Array>([
  ["references/rb-01/raw.png", encoder.encode("raw")],
  ["references/rb-01/clean-2x.png", encoder.encode("clean")],
  ["references/rb-01/preview.png", encoder.encode("preview")],
  ["references/rb-01/material.png", encoder.encode("material")],
  ["references/rb-01/edge-proof.png", encoder.encode("edge-proof")],
  ["references/rb-01/gameplay-overlay.png", encoder.encode("overlay")],
  ["references/rb-01/cross-theme.png", encoder.encode("comparison")],
]);

async function artifact(
  artifact_id: string,
  reference: string,
  role:
    | "raw_source"
    | "clean_2x_target"
    | "delivery_preview"
    | "material_sample"
    | "repetition_or_edge_proof"
    | "gameplay_overlay"
    | "cross_theme_comparison",
  width: number,
  height: number,
) {
  const bytes = contents.get(reference)!;
  return {
    artifact_id,
    reference,
    role,
    sha256: await hashBytes(bytes),
    width,
    height,
    mime_type: "image/png" as const,
    byte_length: bytes.byteLength,
  };
}

async function fixture(
  state: "test_fixture" | "draft" | "production_ready" = "test_fixture",
): Promise<TileSceneReferenceBoard> {
  const raw = await artifact("source-main", "references/rb-01/raw.png", "raw_source", 1024, 1024);
  const board = {
    contract_id: TILE_SCENE_REFERENCE_BOARD_CONTRACT,
    board_id: "RB-01",
    scene_family: "castle-defense",
    theme_profile: "cute_chibi_v1",
    reference_state: state,
    admission: {
      state: "candidate_unadmitted",
      shipping: false,
      visual_review: "pending",
    },
    downstream_bindings: {
      gate_closed: state !== "production_ready",
      accepted_manifest_sha256: state === "production_ready" ? "1".repeat(64) : null,
      corpus_sha256: state === "production_ready" ? "2".repeat(64) : null,
      mechanic_capability_sha256: state === "production_ready" ? "3".repeat(64) : null,
      responsive_matrix_sha256: state === "production_ready" ? "4".repeat(64) : null,
      usage_matrix_sha256: state === "production_ready" ? "5".repeat(64) : null,
      ontology_sha256: state === "production_ready" ? "6".repeat(64) : null,
      variant_rules_sha256: state === "production_ready" ? "7".repeat(64) : null,
      environment_kits_sha256: state === "production_ready" ? "8".repeat(64) : null,
      audio_roles_sha256: state === "production_ready" ? "9".repeat(64) : null,
      gap_analysis_sha256: state === "production_ready" ? "a".repeat(64) : null,
      owner_approval: {
        approved: state === "production_ready",
        approval_id: state === "production_ready" ? "approval-rb-01" : null,
        approval_sha256: state === "production_ready" ? "b".repeat(64) : null,
      },
      unresolved_must_have_ids: [],
    },
    theme_distinction: {
      paired_board_id: "RB-02",
      geometry_reused: false,
      comparison_artifact_id: "cross-theme",
    },
    source_artifacts: [
      {
        artifact: raw,
        generator: {
          implementation: state === "test_fixture" ? "mock_fixture_generator" : "reading_advantage_ai",
          implementation_revision: "c".repeat(64),
          provider: state === "test_fixture" ? "mock" : "openai",
          requested_model: state === "test_fixture" ? "mock-image-v1" : "gpt-image-1",
          resolved_model: state === "test_fixture" ? "mock-image-v1" : "gpt-image-1",
          prompt: "A coherent castle defense scene reference with readable material language.",
          requested_size: { width: 1024, height: 1024 },
          requested_seed: state === "test_fixture" ? 17 : null,
          provider_forwarded_size: true,
          provider_forwarded_seed: state === "test_fixture",
          deterministic_claim: state === "test_fixture",
          actual_output: {
            sha256: raw.sha256,
            width: raw.width,
            height: raw.height,
            mime_type: raw.mime_type,
            byte_length: raw.byte_length,
          },
          generated_at: "2026-07-23T05:00:00.000Z",
          latency_ms: 12,
          request_id: null,
          response_id: null,
        },
      },
    ],
    derived_artifacts: [
      await artifact("clean-2x", "references/rb-01/clean-2x.png", "clean_2x_target", 512, 512),
      await artifact("preview", "references/rb-01/preview.png", "delivery_preview", 256, 256),
      await artifact("material", "references/rb-01/material.png", "material_sample", 128, 128),
      await artifact("edge-proof", "references/rb-01/edge-proof.png", "repetition_or_edge_proof", 256, 256),
      await artifact("gameplay-overlay", "references/rb-01/gameplay-overlay.png", "gameplay_overlay", 512, 512),
      await artifact("cross-theme", "references/rb-01/cross-theme.png", "cross_theme_comparison", 512, 256),
    ],
    board_sha256: "0".repeat(64),
  } as const;
  return { ...board, board_sha256: await digestTileSceneReferenceBoard(board) } as TileSceneReferenceBoard;
}

describe("tile-scene-reference-board/v1", () => {
  it("fixes all eight board identities to the four scene families and two theme profiles", () => {
    expect(TILE_SCENE_REFERENCE_BOARD_MAPPING).toEqual({
      "RB-01": { scene_family: "castle-defense", theme_profile: "cute_chibi_v1" },
      "RB-02": { scene_family: "castle-defense", theme_profile: "heroic_stylized_v1" },
      "RB-03": { scene_family: "potion-rush", theme_profile: "cute_chibi_v1" },
      "RB-04": { scene_family: "potion-rush", theme_profile: "heroic_stylized_v1" },
      "RB-05": { scene_family: "wizard-vs-zombie", theme_profile: "cute_chibi_v1" },
      "RB-06": { scene_family: "wizard-vs-zombie", theme_profile: "heroic_stylized_v1" },
      "RB-07": { scene_family: "rune-match", theme_profile: "cute_chibi_v1" },
      "RB-08": { scene_family: "rune-match", theme_profile: "heroic_stylized_v1" },
    });
  });

  it("accepts a complete mock-only test fixture with its downstream gate explicitly closed", async () => {
    const board = await fixture();
    const parsed = await validateTileSceneReferenceBoard(board);
    expect(parsed.downstream_bindings.gate_closed).toBe(true);
    expect(parsed.admission).toEqual({
      state: "candidate_unadmitted",
      shipping: false,
      visual_review: "pending",
    });
    await expect(verifyTileSceneReferenceBoardArtifacts(parsed, contents)).resolves.toEqual(parsed);
  });

  it("allows a production-ready reference board only with accepted hashes and owner approval while keeping shipping false", async () => {
    const board = await fixture("production_ready");
    const parsed = await validateTileSceneReferenceBoard(board);
    expect(parsed.downstream_bindings.gate_closed).toBe(false);
    expect(parsed.downstream_bindings.owner_approval.approved).toBe(true);
    expect(parsed.admission.shipping).toBe(false);
  });

  it.each([
    ["accepted hash", (board: any) => { board.downstream_bindings.corpus_sha256 = null; }],
    ["owner approval", (board: any) => { board.downstream_bindings.owner_approval.approved = false; }],
    ["closed gate", (board: any) => { board.downstream_bindings.gate_closed = true; }],
    ["unresolved Must-have", (board: any) => { board.downstream_bindings.unresolved_must_have_ids = ["must-have.tile.wall"]; }],
  ])("rejects production-ready state without %s", async (_label, mutate) => {
    const board: any = await fixture("production_ready");
    mutate(board);
    board.board_sha256 = await digestTileSceneReferenceBoard(board);
    await expect(validateTileSceneReferenceBoard(board)).rejects.toBeInstanceOf(TileSceneReferenceBoardValidationError);
  });

  it("rejects missing required derived roles and duplicate artifact references", async () => {
    const missing: any = await fixture();
    missing.derived_artifacts = missing.derived_artifacts.filter((item: any) => item.role !== "gameplay_overlay");
    missing.board_sha256 = await digestTileSceneReferenceBoard(missing);
    await expect(validateTileSceneReferenceBoard(missing)).rejects.toThrow(/gameplay_overlay/);

    const duplicate: any = await fixture();
    duplicate.derived_artifacts[1].reference = duplicate.derived_artifacts[0].reference;
    duplicate.board_sha256 = await digestTileSceneReferenceBoard(duplicate);
    await expect(validateTileSceneReferenceBoard(duplicate)).rejects.toThrow(/duplicate artifact reference/);
  });

  it.each([
    "file:/tmp/raw.png",
    "data:image/png;base64,AAAA",
    "references/rb-01/../raw.png",
    "references/./rb-01/raw.png",
  ])("rejects non-portable artifact reference %s", async (reference) => {
    const board: any = await fixture();
    board.source_artifacts[0].artifact.reference = reference;
    board.board_sha256 = await digestTileSceneReferenceBoard(board);
    await expect(validateTileSceneReferenceBoard(board)).rejects.toThrow(/portable relative reference/);
  });

  it("rejects canonical board digest drift and actual artifact hash drift", async () => {
    const digestDrift: any = await fixture();
    digestDrift.source_artifacts[0].generator.prompt = "mutated after signing";
    await expect(validateTileSceneReferenceBoard(digestDrift)).rejects.toThrow(/board_sha256/);

    const artifactDrift = await fixture();
    const drifted = new Map(contents);
    drifted.set("references/rb-01/raw.png", encoder.encode("bad"));
    await expect(verifyTileSceneReferenceBoardArtifacts(artifactDrift, drifted)).rejects.toThrow(/SHA-256 drift/);
  });

  it("rejects cross-theme geometry reuse and incorrect paired-board identity", async () => {
    const reuse: any = await fixture();
    reuse.theme_distinction.geometry_reused = true;
    reuse.board_sha256 = await digestTileSceneReferenceBoard(reuse);
    await expect(validateTileSceneReferenceBoard(reuse)).rejects.toThrow(/geometry_reused/);

    const wrongPair: any = await fixture();
    wrongPair.theme_distinction.paired_board_id = "RB-04";
    wrongPair.board_sha256 = await digestTileSceneReferenceBoard(wrongPair);
    await expect(validateTileSceneReferenceBoard(wrongPair)).rejects.toThrow(/paired_board_id/);
  });

  it.each(["mmx", "openrouter", "article_generator"])("rejects the %s provider", async (provider) => {
    const board: any = await fixture("production_ready");
    board.source_artifacts[0].generator.provider = provider;
    board.board_sha256 = await digestTileSceneReferenceBoard(board);
    await expect(validateTileSceneReferenceBoard(board)).rejects.toThrow(/provider/);
  });

  it("rejects mock production, false deterministic claims, and forwarded-seed claims without a request", async () => {
    const mockProduction: any = await fixture("production_ready");
    mockProduction.source_artifacts[0].generator.implementation = "mock_fixture_generator";
    mockProduction.source_artifacts[0].generator.provider = "mock";
    mockProduction.source_artifacts[0].generator.deterministic_claim = true;
    mockProduction.board_sha256 = await digestTileSceneReferenceBoard(mockProduction);
    await expect(validateTileSceneReferenceBoard(mockProduction)).rejects.toThrow(/mock/);

    const falseDeterminism: any = await fixture("draft");
    falseDeterminism.source_artifacts[0].generator.deterministic_claim = true;
    falseDeterminism.board_sha256 = await digestTileSceneReferenceBoard(falseDeterminism);
    await expect(validateTileSceneReferenceBoard(falseDeterminism)).rejects.toThrow(/deterministic_claim/);

    const falseForwarding: any = await fixture("draft");
    falseForwarding.source_artifacts[0].generator.provider_forwarded_seed = true;
    falseForwarding.board_sha256 = await digestTileSceneReferenceBoard(falseForwarding);
    await expect(validateTileSceneReferenceBoard(falseForwarding)).rejects.toThrow(/provider_forwarded_seed/);
  });

  it("rejects generator actual-output provenance that disagrees with the raw source", async () => {
    const board: any = await fixture();
    board.source_artifacts[0].generator.actual_output.width += 1;
    board.board_sha256 = await digestTileSceneReferenceBoard(board);
    await expect(validateTileSceneReferenceBoard(board)).rejects.toThrow(/actual_output/);
  });

  it("rejects a forwarded-size claim when requested and actual dimensions differ", async () => {
    const board: any = await fixture("production_ready");
    board.source_artifacts[0].generator.requested_size.width = 2048;
    board.board_sha256 = await digestTileSceneReferenceBoard(board);
    await expect(validateTileSceneReferenceBoard(board)).rejects.toThrow(/provider_forwarded_size/);
  });

  it("rejects unknown keys instead of silently accepting provenance gaps", async () => {
    const board: any = await fixture();
    board.source_artifacts[0].generator.provider_response = { hidden: true };
    board.board_sha256 = await digestTileSceneReferenceBoard(board);
    await expect(validateTileSceneReferenceBoard(board)).rejects.toThrow(/unexpected field/);
  });
});
