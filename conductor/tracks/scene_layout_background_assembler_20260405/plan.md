# Implementation Plan

## Phase 1: Scene schema and templates

- [ ] Task: Define the scene manifest schema, layout templates, and dependency rules
  - [ ] Define the required fields for canvas, theme, template, zones, lighting, and output options
  - [ ] Define how scene manifests reference approved tiles, props, and motifs
  - [ ] Document dependency rules so invalid template/asset combinations fail early

## Phase 2: Layout resolution

- [ ] Task: Write tests for layout resolution and template validation
  - [ ] Cover valid library and ruins scene manifests
  - [ ] Cover invalid zone definitions and invalid template references
  - [ ] Cover deterministic layout resolution for the same input manifest
- [ ] Task: Implement the scene manifest loader and template resolver
  - [ ] Add typed models for scene manifests and resolved layouts
  - [ ] Resolve reserved gameplay zones before any prop placement occurs
  - [ ] Ensure invalid templates fail with clear field-level errors

## Phase 3: Scene assembly

- [ ] Task: Write tests for tile/prop placement and negative-space reservation
  - [ ] Cover rejection of placements that intrude into reserved gameplay zones
  - [ ] Cover stable placement order under repeated runs
  - [ ] Cover missing tile/prop references and overlap guardrails
- [ ] Task: Implement the deterministic scene assembly pipeline
  - [ ] Assemble wall, floor, trim, focal motifs, and clutter from approved assets
  - [ ] Enforce template-specific placement rules and composition weights
  - [ ] Export a placement manifest alongside the rendered background

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
  - [ ] Confirm the reserved gameplay zones remain usable in both outputs
- [ ] Task: Run verification and document composition guardrails
  - [ ] Run the scene-layout and export tests
  - [ ] Recompile the sample scenes to confirm deterministic output
  - [ ] Document composition rules that future themes must obey
