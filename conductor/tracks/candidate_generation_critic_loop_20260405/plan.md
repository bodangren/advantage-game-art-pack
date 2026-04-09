# Implementation Plan

## Phase 1: Candidate schema and deterministic search controls

- [x] Task: Define the candidate-job schema, threshold config layout, and artifact paths
  - [x] Define the required fields for family, program hash, variant budget, retry budget, and output roots
  - [x] Define where candidate manifests, critic results, and selected outputs live on disk
  - [x] Define the plain-text config format for family-specific threshold packs
- [x] Task: Write tests for deterministic variant generation contracts
  - [x] Cover identical output for the same program plus variant controls
  - [x] Cover bounded distinct output across different valid variant controls
  - [x] Cover rejection of malformed candidate jobs and invalid variant ranges

## Phase 2: Core critics and calibration

- [x] Task: Write tests for structural, style, and novelty scoring during candidate selection
  - [x] Cover structural failures that must immediately reject a candidate
  - [x] Cover style scoring against canon baselines with family-specific tolerances
  - [x] Cover novelty failures for near-duplicates of demo assets or approved references
- [x] Task: Implement the generation-time critics and calibration harness
  - [x] Add structural, style, and novelty critic modules for candidate selection
  - [x] Add a calibration command that replays the demo corpus against repo-tracked threshold packs
  - [x] Emit per-family calibration reports showing pass and fail counts under the chosen target band

## Phase 3: Selection loop, manifests, and verification

- [x] Task: Write tests for candidate ranking, retry behavior, and manifest export
  - [x] Cover selection of the best surviving candidate from one candidate set
  - [x] Cover regenerate results when every candidate misses thresholds
  - [x] Cover manifest completeness for both rejected and selected candidates
- [x] Task: Implement the candidate-generation loop and result manifests
  - [x] Execute bounded candidate generation using compiler variant controls
  - [x] Rank candidates using the configured critics and thresholds
  - [x] Persist candidate manifests, critic summaries, nearest-reference evidence, and the final selection result
- [x] Task: Run verification and document the operating rules
  - [x] Run deterministic-search, critic, and anti-copy tests
  - [x] Execute calibration on the seeded demo corpus and record the current pass-rate results
  - [x] Document the no-copy rule and exactly when the loop should select, retry, or fail
