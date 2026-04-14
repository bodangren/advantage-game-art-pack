# Implementation Plan

## Phase 1: Schemas and downstream audit fixtures

- [x] Task: Define schemas for cover surfaces, loading surfaces, parallax bundles, UI sheets, and promo capture jobs
  - [x] Define required fields, output paths, and manifest envelopes for each surface family
  - [x] Define how these schemas reference runtime assets, scene outputs, and theme packs
  - [x] Document which downstream `advantage-games` examples each schema is intended to match
- [x] Task: Write tests for presentation-surface validation
  - [x] Cover valid cover, loading, parallax, UI, and promo-capture job definitions
  - [x] Cover missing template references and invalid asset dependencies
  - [x] Cover deterministic manifest generation for unchanged inputs

## Phase 2: Cover/loading and parallax generation

- [x] Task: Implement validators, typed models, and surface manifests
  - [x] Add typed models for each presentation/UI family
  - [x] Add validation commands that fail before rendering on malformed input
  - [x] Emit manifests that preserve source assets and pipeline versions
- [x] Task: Write tests for cover and loading surface generation
  - [x] Cover title-safe composition zones and focal-subject placement
  - [x] Cover deterministic output from identical runtime assets and templates
  - [x] Cover failure when required source assets are unavailable
- [x] Task: Implement the cover and loading surface generator
  - [x] Compose approved scene backgrounds and runtime assets into templated surfaces
  - [x] Reserve safe zones for text/title overlays
  - [x] Export both surfaces and manifests
- [x] Task: Write tests for parallax layer generation
  - [x] Cover top/middle/bottom layer coordination
  - [x] Cover repeat-safe edge handling
  - [x] Cover depth separation rules and deterministic outputs
- [x] Task: Implement the parallax layer set generator
  - [x] Generate top, middle, and bottom layers as one coordinated bundle
  - [x] Apply layer-specific density and contrast rules
  - [x] Export manifests describing intended scroll order and layer role

## Phase 3: UI sheets and promo derivation

- [x] Task: Write tests for UI-sheet generation and promo-capture manifests
  - [x] Cover stateful UI atlas generation
  - [x] Cover reproducible promo-capture job definitions
  - [x] Cover linkage back to the source runtime asset bundle
- [x] Task: Implement the UI-sheet generator and promo-capture workflow
  - [x] Generate item/icon/support atlases from approved primitives and motifs
  - [x] Define a reproducible promo still derivation path from running games or compiled scenes
  - [x] Persist source bundle, capture conditions, and manifest metadata
- [x] Task: Run verification and add one downstream-aligned sample pack
  - [x] Run all presentation/UI validation and generation tests
  - [x] Generate one sample set aligned to a known downstream title family such as `dragon-flight`, `dragon-rider`, or `wizard-vs-zombie`
  - [x] Verify the sample manifests can be consumed by the later candidate-generation and critic-loop flow
  - [x] Document which surface families remain unmet for other downstream titles
