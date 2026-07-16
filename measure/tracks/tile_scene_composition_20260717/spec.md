# Spec: Tile and Scene Composition Engine

## Goal

Add a scene composition layer on top of the existing engine: a strict scene
spec that assembles seam-safe tile grids, placed props, and ordered layers into
deterministic background SVGs, plus coordinated parallax layer sets. Covers
demand families 4–6 from `measure/game-asset-demand.md` (tiles and room
modules, full scene backgrounds, parallax layer sets), the largest remaining
product-vision gap.

## Product Direction

Backgrounds are scene assembly from approved tiles, props, and layout
templates — not another sprite renderer. A scene spec declares an ordered layer
list; each layer is either a tile grid (cell map over seam-safe tile parts) or
a set of prop placements resolved through the existing composition engine.
Parallax sets are coordinated per-layer exports sharing one palette and
carrying scroll-depth metadata so side-scrolling games can consume them as a
bundle. Per the boundary-extension lesson, the scene compiler wraps the
composition engine rather than modifying its internals.

## Functional Requirements

- Tile part category with a declared edge-continuation contract; seam safety is
  validated per tile pair that may adjoin.
- Strict scene spec: versioned id, viewBox, ordered layers (background,
  midground, foreground), tile grids with explicit cell maps, prop placements
  by anchor or position, and one palette.
- Scene compiler emits one deterministic SVG plus a machine-readable manifest
  (layer rects, tile map, per-layer and scene SHA-256 digests).
- Parallax layer-set export: one SVG per layer, shared palette, scroll-depth
  and scroll-intent metadata, and a set manifest.
- Checked-in examples: one full scene (library reading room) and one parallax
  set, both with frozen digests, registered in the bundle spec registry.
- Desk preview of the example scene and parallax set.

## Non-Functional Requirements

- Byte-identical SVG and manifest for identical scene input.
- All geometry honors the existing numeric bounds (1,000,000 magnitude, 1,000
  scale, 32,768px output axes).
- No new runtime dependencies; the composition, timeline, and atlas modules
  ship unchanged.
- Seam-safety and tile-grid math documented with deterministic layout rules.

## Acceptance Criteria

- [ ] Scene spec schema with strict validation: ordered layers, known tile and
  prop references only, explicit cell maps, single palette.
- [ ] Tile parts carry edge metadata and incompatible adjoining edges are
  rejected at validation time.
- [ ] Scene compiler produces byte-identical SVG for identical input and emits
  a manifest with layer rects, tile map, and digests.
- [ ] Parallax export emits coordinated layer SVGs with shared palette and
  scroll-depth metadata in a set manifest.
- [ ] The example scene and parallax set compile with frozen digests and
  resolve through the bundle spec registry.
- [ ] The desk previews the example scene and parallax set.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out Of Scope

- Auto-tiling or procedural terrain generation (cell maps are explicit).
- Animated or runtime-scrolling parallax; scroll behavior belongs to the game.
- Scene-aware lighting or shading passes.
- LLM authoring of scene specs.
