# Implementation Plan

## Phase 1: Corpus model and schema

- [ ] Task: Define the asset family taxonomy and corpus inventory format
  - [ ] Create a machine-readable manifest format for every file under `demo-assets/`
  - [ ] Define the allowed family names and layout-type labels
  - [ ] Document how future assets are added to the inventory
- [ ] Task: Define the annotation schema and storage layout
  - [ ] Choose the on-disk paths for annotations, canon output, and family guides
  - [ ] Define required fields for palette, lighting, silhouette, materials, and motif tags
  - [ ] Define optional fields for family-specific data such as frame mappings and reserved zones

## Phase 2: Validation and canon generation tooling

- [ ] Task: Write tests for corpus manifest validation and annotation schema validation
  - [ ] Cover success cases for each supported asset family
  - [ ] Cover failure cases for missing required fields and invalid enums
  - [ ] Cover mismatch cases where manifest and annotation paths disagree
- [ ] Task: Implement the corpus manifest loader and annotation validators
  - [ ] Add typed Python models for manifest rows and annotations
  - [ ] Add a validation command that reports file path and field-level failures
  - [ ] Ensure validation can be run from the repo root with a single command
- [ ] Task: Write tests for style metric extraction and canon generation
  - [ ] Cover deterministic metric extraction on a fixed sample asset
  - [ ] Cover aggregation across multiple assets in the same family
  - [ ] Cover per-family baseline summary output used by later critic calibration
  - [ ] Cover regeneration of `style_canon.json` without drift
- [ ] Task: Implement the style metric extractor and canon generator
  - [ ] Add image-analysis helpers for occupancy, edge density, palette counts, and highlight density
  - [ ] Aggregate family-level metrics into a single canon artifact
  - [ ] Emit per-family baseline ranges and gold-reference cluster summaries for later critic tuning
  - [ ] Add a CLI command to rebuild the canon from `demo-assets/` and annotations

## Phase 3: Seed data and documentation

- [ ] Task: Annotate the current demo asset corpus
  - [ ] Create one annotation file per asset currently present under `demo-assets/`
  - [ ] Mark the strongest examples in each family as `gold_reference`
  - [ ] Verify annotations cover the newly added tiles, props, backgrounds, and any future presentation-surface examples imported from downstream repos
- [ ] Task: Write the family-specific style guides and reference manifests
  - [ ] Create one markdown guide per family using the generated canon and annotations
  - [ ] Include examples of allowed motifs, forbidden drift, and composition notes
  - [ ] Document acceptable drift boundaries and obvious no-copy failures around gold references
  - [ ] Document the expected use of gold references in later planner and critic tracks
- [ ] Task: Run verification and record remaining annotation gaps
  - [ ] Run the annotation validation command
  - [ ] Run the canon-generation command and verify deterministic output
  - [ ] Record any unresolved ambiguity in the guides rather than leaving it implicit
