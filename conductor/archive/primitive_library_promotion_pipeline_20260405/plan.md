# Implementation Plan

## Phase 1: Primitive model and library layout

- [x] Task: Design the primitive metadata schema and folder layout
  - [x] Define required metadata fields for all primitive families
  - [x] Define where image files, masks, overlays, and metadata live on disk
  - [x] Document naming rules for primitive IDs and family subfolders

## Phase 2: Validation and registry tooling

- [x] Task: Write tests for primitive manifest validation
  - [x] Cover valid metadata for character, prop/FX, tile, and scene primitives
  - [x] Cover invalid anchors, missing provenance, and duplicate primitive IDs
  - [x] Cover deterministic manifest rebuild behavior
- [x] Task: Implement the primitive registry and validation helpers
  - [x] Add typed models for primitive metadata and manifest rows
  - [x] Add commands to validate the library and rebuild `primitive_manifest.json`
  - [x] Ensure validation errors identify the exact primitive file and field

## Phase 3: Promotion workflow

- [x] Task: Write tests for primitive import, crop, and promotion
  - [x] Cover import from a static source image and metadata file
  - [x] Cover failure when crop regions or anchors are missing
  - [x] Cover idempotent promotion of the same candidate twice
- [x] Task: Implement the import and promotion CLI with provenance tracking
  - [x] Add commands to crop/import candidates from source assets
  - [x] Add promotion commands that move approved candidates into the library
  - [x] Persist source path, source region, promotion timestamps, variant IDs, and critic-summary snapshots for generated candidates

## Phase 4: Seed library and consumer APIs

- [x] Task: Seed the initial approved primitive library from the current demo corpus
  - [x] Extract a starter set of character, prop/FX, tile, and scene motifs
  - [x] Store anchors and tags for each seeded primitive
  - [x] Mark the seed set as approved so later tracks can consume it immediately
- [x] Task: Implement query helpers for compiler consumption
  - [x] Add lookup helpers by family, subtype, theme, tag, and approval state
  - [x] Add deterministic sorting rules when multiple primitives match
  - [x] Document how compilers should request and filter primitives
- [x] Task: Write the promotion SOP and verification fixtures
  - [x] Document the exact steps to import, review, and promote a primitive
  - [x] Add a fixture set that exercises the full promotion path end to end
  - [x] Ensure the SOP distinguishes demo-seeded primitives, critic-passed generated candidates, and draft candidates
- [x] Task: Run verification and capture the remaining primitive backlog
  - [x] Run the primitive validation command
  - [x] Rebuild `primitive_manifest.json` and verify deterministic output
  - [x] Record which high-value primitives are still missing from the seed library
