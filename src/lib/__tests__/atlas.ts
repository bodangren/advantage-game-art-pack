// Phase 1 stub for the atlas packer.
//
// This module exists solely so Phase 1 Red tests have a typed
// import surface that resolves cleanly under `tsc --noEmit` and
// under vitest's import-time checks. Runtime calls throw a
// deterministic "Phase 1 stub" Error, which is exactly what the
// Phase 1 Red tests assert against.
//
// Phase 3 (Atlas Packer) Green REPLACES this file by introducing
// `src/lib/atlas.ts` with the real `packAtlas` implementation and
// DELETES this stub. The error class name (`AtlasValidationError`)
// and the `AtlasMetadata` shape survive into Phase 3 — they are
// part of the atlas JSON contract, not the stub contract.

export class AtlasValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlasValidationError";
  }
}

export interface AtlasFrameRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AtlasMetadata {
  readonly version: 1;
  readonly frame_count: number;
  readonly frame_rects: ReadonlyArray<AtlasFrameRect>;
  readonly durations_ms: readonly number[];
  readonly sheet_digest: string;
  readonly sheet_width: number;
  readonly sheet_height: number;
}

export interface AtlasPackerOptions {
  readonly cols: number;
  readonly frame_w: number;
  readonly frame_h: number;
}

export interface AtlasPhaserLoadConfig {
  readonly key: string;
  readonly url: string;
  readonly svgConfig: { readonly width: number; readonly height: number };
}

export interface AtlasPacked {
  readonly sheet_svg: string;
  readonly atlas_json: AtlasMetadata;
  readonly phaser_load: AtlasPhaserLoadConfig;
}

export function validateAtlasMetadata(_metadata: unknown): AtlasMetadata {
  throw new Error("Phase 1 stub — implement in Phase 3");
}

export async function packAtlas(
  _timeline: unknown,
  _options: AtlasPackerOptions,
): Promise<AtlasPacked> {
  throw new Error("Phase 1 stub — implement in Phase 3");
}