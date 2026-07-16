# Plan: Tile and Scene Composition Engine

## Phase 1: Contract-First Tests

- [ ] Add failing scene-spec validation tests (ordered layers, tile grids,
  prop placements, palette, unknown reference rejection).
- [ ] Add failing seam-safety tests for tile parts (edge-continuation
  contract, incompatible adjoining edges rejected).
- [ ] Add failing parallax-set metadata tests (shared palette, scroll depth,
  scroll intent, per-layer digests).
- [ ] Add failing determinism tests: identical scene input yields byte-
  identical SVG and manifest.

## Phase 2: Tile Parts and Seam Validation

- [ ] Author seam-safe tile parts (floor, wall, road, corner) with declared
  edge metadata.
- [ ] Implement tile edge-continuation validation in the part contract.

## Phase 3: Scene Compiler

- [ ] Implement scene spec types and strict validation under `src/lib/`.
- [ ] Implement the scene compiler: ordered layers, row-major tile grids, and
  anchor/position prop placement resolved through the existing composition
  engine.
- [ ] Implement deterministic scene serialization plus manifest emission
  (layer rects, tile map, scene digest).

## Phase 4: Parallax Export and Examples

- [ ] Implement parallax layer-set export with shared palette and scroll-depth
  metadata in a set manifest.
- [ ] Author the checked-in example scene (library reading room) with frozen
  digests.
- [ ] Author the checked-in parallax set example with frozen digests.

## Phase 5: Desk and Docs

- [ ] Add a desk preview for the example scene and parallax set.
- [ ] Document the scene and parallax JSON contracts in the README or DESIGN
  docs.

## Phase 6: Verification

- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Register scene and parallax refs in the bundle spec registry and record
  any shortcuts in `tech-debt.md`.
