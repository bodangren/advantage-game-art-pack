# Plan: Presentation Surfaces: UI Atlases, Covers, and Loading Screens

## Phase 1: Contract-First Tests (Red)

- [ ] Add failing presentation-spec validation tests (surface kind, ordered
  entries, palette, unknown part/scene reference rejection).
- [ ] Add failing UI atlas grid tests (row-major layout, declared cell size
  and gutters, named frame rects in manifest).
- [ ] Add failing cover/loading tests (scene-spec background reuse, anchored
  character/prop layers, safe-zone rect emitted).
- [ ] Add failing determinism tests: identical input yields byte-identical
  SVG and manifest. Fixtures authored from the outputs they must produce
  (frozen-fixture lesson).

## Phase 2: UI Atlas Compiler

- [ ] Implement presentation spec types and strict validation under
  `src/lib/`.
- [ ] Implement the UI atlas compiler: frame grid layout, palette-slot
  theming per frame, manifest emission with named frame rects.

## Phase 3: Cover and Loading Compilers

- [ ] Implement cover/loading compilation: scene-spec background layer plus
  anchored character/prop compositions resolved through the existing engine.
- [ ] Emit safe-zone rect and per-layer digests in the manifest.

## Phase 4: Examples and Frozen Digests

- [ ] Author `examples/ui-atlas.json` with a seeded frame set (button states,
  panel, bar, icon placeholders) and freeze digests.
- [ ] Author `examples/cover.json` and `examples/loading.json` reusing the
  library reading-room scene and freeze digests.

## Phase 5: Desk, Render API, and Docs

- [ ] Add a desk preview for the three example surfaces.
- [ ] Verify the `/api/render` PNG path rasterizes presentation surfaces
  unchanged (palette inlining parity).
- [ ] Document the presentation JSON contracts in README or DESIGN.
