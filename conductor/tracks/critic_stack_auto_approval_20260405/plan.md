# Implementation Plan

## Phase 1: Shared critic contracts

- [ ] Task: Define the critic result schema and decision-policy thresholds
  - [ ] Define one result envelope shared by all critics
  - [ ] Define the policy inputs required to decide `auto_approved`, `needs_review`, or `regenerate`
  - [ ] Store thresholds and policy rules in repo-tracked config files

## Phase 2: Structural and style critics

- [ ] Task: Write tests for structural critic checks across supported asset families
  - [ ] Cover character/prop sheets, tilesets, and background scenes
  - [ ] Cover manifest-path integrity and missing output-file failures
  - [ ] Cover deterministic pass/fail results for unchanged inputs
- [ ] Task: Implement the structural critics
  - [ ] Add per-family structural validators
  - [ ] Wrap structural outputs in the shared critic-result schema
  - [ ] Ensure hard failures prevent accidental auto-approval
- [ ] Task: Write tests for style-metric scoring against canon baselines
  - [ ] Cover in-range and out-of-range metrics using fixed fixtures
  - [ ] Cover family-specific tolerances rather than one global threshold
  - [ ] Cover explanation text or reason codes for failed style checks
- [ ] Task: Implement the style critic using canon metrics and heuristics
  - [ ] Compare candidate outputs against the canon artifacts produced earlier
  - [ ] Score palette, occupancy, edge density, highlight density, and lighting traits
  - [ ] Emit clear reasons and evidence pointers in the result envelope

## Phase 3: Semantic/novelty scoring and policy integration

- [ ] Task: Write tests for semantic and novelty scoring adapters
  - [ ] Cover semantic mismatches such as “zombie requested but wizard-looking output produced”
  - [ ] Cover near-duplicate detection against approved references
  - [ ] Cover drift detection away from the approved style cluster
- [ ] Task: Implement the semantic critic adapter, similarity checks, and decision aggregator
  - [ ] Add a provider-agnostic semantic scoring adapter
  - [ ] Add similarity and duplicate checks against approved reference assets
  - [ ] Combine all critic outputs into one policy decision
- [ ] Task: Integrate critic outputs with review statuses and auto-approval rules
  - [ ] Store critic results on review candidates
  - [ ] Set candidate status based on the decision policy
  - [ ] Ensure reviewers can override a policy result while preserving audit history
- [ ] Task: Run verification and document critic override policy
  - [ ] Run the structural, style, semantic, and policy tests
  - [ ] Verify each decision lane with seeded fixtures
  - [ ] Document when reviewers should trust, override, or tighten a critic threshold
