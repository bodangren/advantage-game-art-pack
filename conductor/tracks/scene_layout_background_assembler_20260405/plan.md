# Implementation Plan

## Phase 1: Scene schema and templates

- [x] Task: Define the scene manifest schema, layout templates, and dependency rules
  - [x] Define the required fields for canvas, theme, template, zones, lighting, and output options
  - [x] Define how scene manifests reference approved tiles, props, and motifs
  - [x] Document dependency rules so invalid template/asset combinations fail early

> Phase 1 complete (2026-04-09). Implemented:
> - `SceneProgram` dataclass with typed fields for all manifest elements
> - `CanvasSpec`, `GameplayZone`, `LightingSpec`, `TileSource`, `PropPlacement`, `FocalMotif`, `DecalPass`, `OutputSpec`
> - Supported templates: `library_room`, `ruins_courtyard`
> - Supported lighting directions: north, northeast, east, southeast, south, southwest, west, northwest
> - Validation errors with field-level context for all schema violations
> - Tests in `tests/test_scene_layout.py` (13 tests, all passing)

## Phase 2: Layout resolution

- [x] Task: Write tests for layout resolution and template validation
  - [x] Cover valid library and ruins scene manifests
  - [x] Cover invalid zone definitions and invalid template references
  - [x] Cover deterministic layout resolution for the same input manifest
- [x] Task: Implement the scene manifest loader and template resolver
  - [x] Add typed models for scene manifests and resolved layouts
  - [x] Resolve reserved gameplay zones before any prop placement occurs
  - [x] Ensure invalid templates fail with clear field-level errors

> Phase 2 complete (2026-04-10). Implemented:
> - `ResolvedLayout`, `ResolvedZone`, `ResolvedPropPlacement` dataclasses
> - `resolve_scene_layout()` function with zone validation and overlap detection
> - Tests in `tests/test_scene_layout.py` (19 tests, all passing)
> - 6 new tests covering template resolution, deterministic output, zone bounds, and overlap detection

## Phase 3: Scene assembly

- [x] Task: Write tests for tile/prop placement and negative-space reservation
  - [x] Cover rejection of placements that intrude into reserved gameplay zones
  - [x] Cover stable placement order under repeated runs
  - [x] Cover missing tile/prop references and overlap guardrails
- [ ] Task: Implement the deterministic scene assembly pipeline
  - [ ] Assemble wall, floor, trim, focal motifs, and clutter from approved assets
  - [ ] Enforce template-specific placement rules and composition weights
  - [ ] Export a placement manifest alongside the rendered background

> Phase 3 tests complete (2026-04-11). Added:
> - `test_placement_in_gameplay_zone_rejected`: verifies prop placements that overlap reserved zones raise LayoutResolutionError
> - `test_stable_placement_order_under_repeated_runs`: verifies 5 consecutive runs produce identical group_id ordering
> - `test_missing_tile_reference_uses_default_bounds`: verifies unresolved tile references fall back to 32x32 default bounds
> - Fixed bug: `resolve_scene_layout` now raises LayoutResolutionError instead of silently allowing intrusions

## Phase 4: Lighting, decals, and verification

- [ ] Task: Write tests for lighting passes, decal passes, and manifest export
  - [ ] Cover deterministic emissive source placement and shadow application
  - [ ] Cover decal constraints such as cracks, grass, dust, and runes
  - [ ] Cover placement-manifest completeness and debug-overlay generation
- [ ] Task: Implement the lighting pass, decal pass, and scene-manifest exporter
  - [ ] Add global and local lighting passes bounded by the style canon
  - [ ] Add deterministic ground and wall decal placement rules
  - [ ] Export debug overlays that label zones and major placements
- [ ] Task: Add sample library and ruins scene manifests and verify outputs
  - [ ] Create one sample scene manifest per template
  - [ ] Compile both scenes and save their placement manifests
  - [ ] Ensure the rendered outputs and manifests are compatible with later candidate-loop ingestion
  - [ ] Confirm the reserved gameplay zones remain usable in both outputs
- [ ] Task: Run verification and document composition guardrails
  - [ ] Run the scene-layout and export tests
  - [ ] Recompile the sample scenes to confirm deterministic output
  - [ ] Document composition rules that future themes must obey
