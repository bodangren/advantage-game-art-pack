# Implementation Plan

## Phase 1: Schemas and downstream audit fixtures

- [ ] Task: Define schemas for cover surfaces, loading surfaces, parallax bundles, UI sheets, and promo capture jobs
  - [ ] Define required fields, output paths, and manifest envelopes for each surface family
  - [ ] Define how these schemas reference runtime assets, scene outputs, and theme packs
  - [ ] Document which downstream `advantage-games` examples each schema is intended to match
- [ ] Task: Write tests for presentation-surface validation
  - [ ] Cover valid cover, loading, parallax, UI, and promo-capture job definitions
  - [ ] Cover missing template references and invalid asset dependencies
  - [ ] Cover deterministic manifest generation for unchanged inputs

## Phase 2: Cover/loading and parallax generation

- [ ] Task: Implement validators, typed models, and surface manifests
  - [ ] Add typed models for each presentation/UI family
  - [ ] Add validation commands that fail before rendering on malformed input
  - [ ] Emit manifests that preserve source assets and pipeline versions
- [ ] Task: Write tests for cover and loading surface generation
  - [ ] Cover title-safe composition zones and focal-subject placement
  - [ ] Cover deterministic output from identical runtime assets and templates
  - [ ] Cover failure when required source assets are unavailable
- [ ] Task: Implement the cover and loading surface generator
  - [ ] Compose approved scene backgrounds and runtime assets into templated surfaces
  - [ ] Reserve safe zones for text/title overlays
  - [ ] Export both surfaces and manifests
- [ ] Task: Write tests for parallax layer generation
  - [ ] Cover top/middle/bottom layer coordination
  - [ ] Cover repeat-safe edge handling
  - [ ] Cover depth separation rules and deterministic outputs
- [ ] Task: Implement the parallax layer set generator
  - [ ] Generate top, middle, and bottom layers as one coordinated bundle
  - [ ] Apply layer-specific density and contrast rules
  - [ ] Export manifests describing intended scroll order and layer role

## Phase 3: UI sheets and promo derivation

- [ ] Task: Write tests for UI-sheet generation and promo-capture manifests
  - [ ] Cover stateful UI atlas generation
  - [ ] Cover reproducible promo-capture job definitions
  - [ ] Cover linkage back to the source runtime asset bundle
- [ ] Task: Implement the UI-sheet generator and promo-capture workflow
  - [ ] Generate item/icon/support atlases from approved primitives and motifs
  - [ ] Define a reproducible promo still derivation path from running games or compiled scenes
  - [ ] Persist source bundle, capture conditions, and manifest metadata
- [ ] Task: Run verification and add one downstream-aligned sample pack
  - [ ] Run all presentation/UI validation and generation tests
  - [ ] Generate one sample set aligned to a known downstream title family such as `dragon-flight`, `dragon-rider`, or `wizard-vs-zombie`
  - [ ] Verify the sample manifests can be consumed by the later candidate-generation and critic-loop flow
  - [ ] Document which surface families remain unmet for other downstream titles
