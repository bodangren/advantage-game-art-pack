# Plan: Presentation Surfaces: UI Atlases, Covers, and Loading Screens

Use replacement SVG-native assets or validated public-MCP imports only; do not
treat current Pixel prototypes or unprovided Forge atlas/pack outputs as
production inputs. Every surface records profile, provenance, delivery-
resolution review, and pack-admission evidence. All implementation tasks remain
dependency-deferred on the active tile/scene work and accepted imported assets;
`[b]` records that state.

## Phase 1: Contract-First Tests (Red)

- [b] Add failing presentation-spec validation tests (surface kind, ordered
      entries, palette, unknown part/scene reference rejection).
- [b] Add failing UI atlas grid tests (row-major layout, declared cell size
      and gutters, named frame rects in manifest).
- [b] Add failing cover/loading tests (scene-spec background reuse, anchored
      character/prop layers, safe-zone rect emitted).
- [b] Add failing determinism tests: identical input yields byte-identical
      SVG and manifest. Fixtures authored from the outputs they must produce
      (frozen-fixture lesson).

## Phase 2: UI Atlas Compiler

- [b] Implement presentation spec types and strict validation under
      `src/lib/`.
- [b] Implement the UI atlas compiler: frame grid layout, palette-slot
      theming per frame, manifest emission with named frame rects.

## Phase 3: Cover and Loading Compilers

- [b] Implement cover/loading compilation: scene-spec background layer plus
      anchored character/prop compositions resolved through the existing engine.
- [b] Emit safe-zone rect and per-layer digests in the manifest.

## Phase 4: Examples and Frozen Digests

- [b] Author `examples/ui-atlas.json` with a seeded frame set (button states,
      panel, bar, icon placeholders) and freeze digests.
- [b] Author `examples/cover.json` and `examples/loading.json` reusing the
      library reading-room scene and freeze digests.

## Phase 5: Desk, Render API, and Docs

- [b] Add a desk preview for the three example surfaces.
- [b] Verify the `/api/render` PNG path rasterizes presentation surfaces
      unchanged (palette inlining parity).
- [b] Document the presentation JSON contracts in README or DESIGN.
