# Implementation Plan

## Phase 1: Primitive model and library layout

- [ ] Task: Design the primitive metadata schema and folder layout
  - [ ] Define required metadata fields for all primitive families
  - [ ] Define where image files, masks, overlays, and metadata live on disk
  - [ ] Document naming rules for primitive IDs and family subfolders

## Phase 2: Validation and registry tooling

- [ ] Task: Write tests for primitive manifest validation
  - [ ] Cover valid metadata for character, prop/FX, tile, and scene primitives
  - [ ] Cover invalid anchors, missing provenance, and duplicate primitive IDs
  - [ ] Cover deterministic manifest rebuild behavior
- [ ] Task: Implement the primitive registry and validation helpers
  - [ ] Add typed models for primitive metadata and manifest rows
  - [ ] Add commands to validate the library and rebuild `primitive_manifest.json`
  - [ ] Ensure validation errors identify the exact primitive file and field

## Phase 3: Promotion workflow

- [ ] Task: Write tests for primitive import, crop, and promotion
  - [ ] Cover import from a static source image and metadata file
  - [ ] Cover failure when crop regions or anchors are missing
  - [ ] Cover idempotent promotion of the same candidate twice
- [ ] Task: Implement the import and promotion CLI with provenance tracking
  - [ ] Add commands to crop/import candidates from source assets
  - [ ] Add promotion commands that move approved candidates into the library
  - [ ] Persist source path, source region, promotion timestamps, variant IDs, and critic-summary snapshots for generated candidates

## Phase 4: Seed library and consumer APIs

- [ ] Task: Seed the initial approved primitive library from the current demo corpus
  - [ ] Extract a starter set of character, prop/FX, tile, and scene motifs
  - [ ] Store anchors and tags for each seeded primitive
  - [ ] Mark the seed set as approved so later tracks can consume it immediately
- [ ] Task: Implement query helpers for compiler consumption
  - [ ] Add lookup helpers by family, subtype, theme, tag, and approval state
  - [ ] Add deterministic sorting rules when multiple primitives match
  - [ ] Document how compilers should request and filter primitives
- [ ] Task: Write the promotion SOP and verification fixtures
  - [ ] Document the exact steps to import, review, and promote a primitive
  - [ ] Add a fixture set that exercises the full promotion path end to end
  - [ ] Ensure the SOP distinguishes demo-seeded primitives, critic-passed generated candidates, and draft candidates
- [ ] Task: Run verification and capture the remaining primitive backlog
  - [ ] Run the primitive validation command
  - [ ] Rebuild `primitive_manifest.json` and verify deterministic output
  - [ ] Record which high-value primitives are still missing from the seed library
