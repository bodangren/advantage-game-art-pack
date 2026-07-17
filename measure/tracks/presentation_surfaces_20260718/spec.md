# Spec: Presentation Surfaces: UI Atlases, Covers, and Loading Screens

## Goal

Cover demand families 7–9 from `measure/game-asset-demand.md` (UI atlases and
auxiliary sheets, cover art and selection-card surfaces, loading and
start-screen backgrounds) — the last uncovered families in the downstream
consumer series. Add a strict presentation spec that composes approved parts,
scenes, and text-free decorative layouts into deterministic SVG surfaces plus
machine-readable manifests, with checked-in examples for the library-quest
game.

## Product Direction

Presentation surfaces are compositions, not a new renderer. A UI atlas is an
ordered grid of named UI frames (buttons, panels, icons, bars) compiled from
catalog parts with slot-based palette theming; covers and loading screens are
single-surface compositions that reuse scene backgrounds (from
`tile_scene_composition_20260717`), character compositions, and prop placement
through the existing engine. Every surface emits one deterministic SVG plus a
manifest (frame rects, slot assignments, digests) so games can slice atlases
and verify surfaces at build time. Text rendering stays out of scope — title
and label art is baked by downstream games, not this factory.

## Functional Requirements

- Strict presentation spec: versioned id, surface kind (`ui-atlas`, `cover`,
  `loading`), viewBox, ordered entries referencing catalog parts or scene
  specs, one palette, unknown-reference rejection.
- UI atlas compiler: row-major frame grid with declared cell size and
  gutters, named frames in the manifest (`<name>: {x, y, w, h}`), and a
  seeded frame set (button states, panel, bar, icon placeholders).
- Cover/loading compiler: layered composition reusing a scene spec as
  background plus anchored character/prop compositions; declared safe-zone
  rect in the manifest for downstream title art.
- Determinism: identical input yields byte-identical SVG and manifest;
  checked-in examples (`examples/ui-atlas.json`, `examples/cover.json`,
  `examples/loading.json`) with frozen digests.
- Desk preview for all three example surfaces.

## Acceptance Criteria

- Contract-first tests fail before implementation and pass after; the three
  example surfaces regenerate byte-identically from committed specs.
- Manifests carry frame rects (atlas) or safe-zone + layer digests
  (cover/loading); palette inlining matches the render-API raster path so
  PNG export works unchanged.
- `npm test`, `npm run typecheck`, and `npm run build` are green.

## Out of Scope

- Text/font rendering, animation, nine-slice runtime behavior, and any
  modification of the composition engine internals (extend at boundaries per
  the boundary-extension lesson).
