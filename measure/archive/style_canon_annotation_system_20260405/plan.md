# Implementation Plan

## Phase 1: Corpus model and schema

- [x] Task: Define the asset family taxonomy and corpus inventory format
  - [x] Create a machine-readable manifest format for every file under `demo-assets/`
  - [x] Define the allowed family names and layout-type labels
  - [x] Document how future assets are added to the inventory
- [x] Task: Define the annotation schema and storage layout
  - [x] Choose the on-disk paths for annotations, canon output, and family guides
  - [x] Define required fields for palette, lighting, silhouette, materials, and motif tags
  - [x] Define optional fields for family-specific data such as frame mappings and reserved zones

## Phase 2: Validation and canon generation tooling

- [x] Task: Write tests for corpus manifest validation and annotation schema validation
  - [x] Cover success cases for each supported asset family
  - [x] Cover failure cases for missing required fields and invalid enums
  - [x] Cover mismatch cases where manifest and annotation paths disagree
- [x] Task: Implement the corpus manifest loader and annotation validators
  - [x] Add typed Python models for manifest rows and annotations
  - [x] Add a validation command that reports file path and field-level failures
  - [x] Ensure validation can be run from the repo root with a single command
- [x] Task: Write tests for style metric extraction and canon generation
  - [x] Cover deterministic metric extraction on a fixed sample asset
  - [x] Cover aggregation across multiple assets in the same family
  - [x] Cover per-family baseline summary output used by later critic calibration
  - [x] Cover regeneration of `style_canon.json` without drift
- [x] Task: Implement the style metric extractor and canon generator
  - [x] Add image-analysis helpers for occupancy, edge density, palette counts, and highlight density
  - [x] Aggregate family-level metrics into a single canon artifact
  - [x] Emit per-family baseline ranges and gold-reference cluster summaries for later critic tuning
  - [x] Add a CLI command to rebuild the canon from `demo-assets/` and annotations

## Phase 3: Seed data and documentation

- [x] Task: Annotate the current demo asset corpus
  - [x] Create one annotation file per asset currently present under `demo-assets/`
  - [x] Mark the strongest examples in each family as `gold_reference`
  - [x] Verify annotations cover the newly added tiles, props, backgrounds, and any future presentation-surface examples imported from downstream repos
- [x] Task: Write the family-specific style guides and reference manifests
  - [x] Create one markdown guide per family using the generated canon and annotations
  - [x] Include examples of allowed motifs, forbidden drift, and composition notes
  - [x] Document acceptable drift boundaries and obvious no-copy failures around gold references
  - [x] Document the expected use of gold references in later planner and critic tracks
- [x] Task: Run verification and record remaining annotation gaps
  - [x] Run the annotation validation command
  - [x] Run the canon-generation command and verify deterministic output
  - [x] Record any unresolved ambiguity in the guides rather than leaving it implicit
