# Implementation Plan

## Phase 1: Candidate schema and deterministic search controls

- [ ] Task: Define the candidate-job schema, threshold config layout, and artifact paths
  - [ ] Define the required fields for family, program hash, variant budget, retry budget, and output roots
  - [ ] Define where candidate manifests, critic results, and selected outputs live on disk
  - [ ] Define the plain-text config format for family-specific threshold packs
- [ ] Task: Write tests for deterministic variant generation contracts
  - [ ] Cover identical output for the same program plus variant controls
  - [ ] Cover bounded distinct output across different valid variant controls
  - [ ] Cover rejection of malformed candidate jobs and invalid variant ranges

## Phase 2: Core critics and calibration

- [ ] Task: Write tests for structural, style, and novelty scoring during candidate selection
  - [ ] Cover structural failures that must immediately reject a candidate
  - [ ] Cover style scoring against canon baselines with family-specific tolerances
  - [ ] Cover novelty failures for near-duplicates of demo assets or approved references
- [ ] Task: Implement the generation-time critics and calibration harness
  - [ ] Add structural, style, and novelty critic modules for candidate selection
  - [ ] Add a calibration command that replays the demo corpus against repo-tracked threshold packs
  - [ ] Emit per-family calibration reports showing pass and fail counts under the chosen target band

## Phase 3: Selection loop, manifests, and verification

- [ ] Task: Write tests for candidate ranking, retry behavior, and manifest export
  - [ ] Cover selection of the best surviving candidate from one candidate set
  - [ ] Cover regenerate results when every candidate misses thresholds
  - [ ] Cover manifest completeness for both rejected and selected candidates
- [ ] Task: Implement the candidate-generation loop and result manifests
  - [ ] Execute bounded candidate generation using compiler variant controls
  - [ ] Rank candidates using the configured critics and thresholds
  - [ ] Persist candidate manifests, critic summaries, nearest-reference evidence, and the final selection result
- [ ] Task: Run verification and document the operating rules
  - [ ] Run deterministic-search, critic, and anti-copy tests
  - [ ] Execute calibration on the seeded demo corpus and record the current pass-rate results
  - [ ] Document the no-copy rule and exactly when the loop should select, retry, or fail
