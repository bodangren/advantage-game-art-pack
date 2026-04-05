# Implementation Plan

## Phase 1: Shared schema and calibration config

- [ ] Task: Define the shared critic-result schema, policy schema, and threshold config format
  - [ ] Define the final envelope for per-critic outputs and aggregated policy decisions
  - [ ] Define the on-disk layout for per-family threshold packs and calibration reports
  - [ ] Document how pass-rate target bands such as `0.8` and `0.9` are represented in config
- [ ] Task: Write tests for config parsing, calibration fixtures, and explanation schemas
  - [ ] Cover valid and invalid threshold-pack files
  - [ ] Cover demo-corpus calibration inputs and known-failure fixtures
  - [ ] Cover structured explanation fields and reason-code stability
- [ ] Task: Implement config loaders and the calibration replay harness
  - [ ] Load family-specific threshold packs from repo-tracked files
  - [ ] Replay the existing critics against seeded fixtures and approved assets
  - [ ] Export calibration reports that record pass and fail counts per family

## Phase 2: Family adapters and drift monitoring

- [ ] Task: Write tests for scene and presentation family adapters
  - [ ] Cover `background_scene`, `parallax_layer_set`, `cover_surface`, `loading_surface`, and `ui_sheet`
  - [ ] Cover shared-envelope compatibility with the existing core critics
  - [ ] Cover family-specific threshold overrides where one metric should be weighted differently
- [ ] Task: Implement family adapters, threshold packs, and duplicate or drift monitoring
  - [ ] Adapt the existing structural, style, and novelty critics to the remaining families
  - [ ] Add repo-tracked threshold packs for each supported family
  - [ ] Add duplicate or drift monitoring across the approved asset set and seeded references

## Phase 3: Policy integration and operations

- [ ] Task: Write tests for policy aggregation, overrides, and downstream integration
  - [ ] Cover `auto_approved`, `needs_review`, and `regenerate` outcomes
  - [ ] Cover reviewer overrides that preserve the original policy result
  - [ ] Cover persistence of critic and policy outputs in review records and batch manifests
- [ ] Task: Implement the policy aggregator and review or batch integrations
  - [ ] Combine existing critic outputs into one final decision with clear reasons
  - [ ] Persist calibrated results and policy outputs on review candidates
  - [ ] Export policy and calibration metadata into batch manifests and audit reports
- [ ] Task: Run verification and document policy operations
  - [ ] Run calibration, adapter, aggregation, and override tests
  - [ ] Verify at least one seeded example in each decision lane
  - [ ] Document when to tighten thresholds, rerun calibration, or override the policy manually
