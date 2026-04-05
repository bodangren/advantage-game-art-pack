# Specification

## Overview

Build the repo-wide critic calibration layer and decision policy that turns
core candidate-level critic results into stable thresholds, review-facing
explanations, and final routing decisions.

This track assumes the candidate-generation critic loop already produces
structural, style, and novelty results for the core compiler families. It must
not create a second competing scoring path.

## Dependencies

- Recommended prior track: `style_canon_annotation_system_20260405`
- Recommended prior track: `candidate_generation_critic_loop_20260405`
- Recommended prior track: `review_queue_foundation_20260405`
- Recommended prior track: `prompt_to_asset_program_planner_20260405`
- Recommended prior track: `scene_layout_background_assembler_20260405`
- Recommended prior track: `presentation_surfaces_ui_pipeline_20260405`

## Functional Requirements

### FR1: Shared Critic Result and Policy Schema

- Define one shared result schema for all families and all policy decisions.
- The schema must include:
  - critic name
  - pass/fail outcome
  - score
  - confidence
  - reasons
  - evidence pointers
  - recommended next action
  - policy decision and policy version when aggregated

### FR2: Family Adapters and Coverage

- Reuse the core candidate-level critics across the remaining families that were
  not covered by the first loop.
- At minimum, add adapters or family-specific wrappers for:
  - `background_scene`
  - `parallax_layer_set`
  - `cover_surface`
  - `loading_surface`
  - `ui_sheet`
- All adapters must preserve one shared result envelope.

### FR3: Calibration Workflow and Threshold Management

- Add a calibration workflow that replays critics against:
  - the hand-authored demo corpus
  - approved generated assets
  - known failure fixtures
- Threshold configs must support explicit target pass-rate bands such as `0.8`
  or `0.9`, with per-family overrides stored in repo-tracked plain files.

### FR4: Auto-Approval and Review Routing Policy

- Combine critic outputs into one final decision:
  - `auto_approved`
  - `needs_review`
  - `regenerate`
- The policy must explain which critic or threshold controlled the decision.
- Reviewers must be able to override the policy while preserving audit history.

### FR5: Review and Batch Integration

- Push critic results, calibrated thresholds, and policy decisions into the
  review system and batch manifests.
- Review pages and batch reports must display explanations instead of only raw
  numbers.

### FR6: Duplicate and Drift Monitoring

- Surface near duplicates and excessive drift not only within one candidate set
  but across the broader approved library over time.
- Provide a repeatable recalibration command so threshold changes are auditable.

## Non-Functional Requirements

- Thresholds and policy config must live in plain files, not code-only
  constants.
- Reviewers must be able to understand why a candidate was escalated or
  auto-approved.
- Calibration outputs must be reproducible for the same approved set and config
  files.

## Deliverables

- Shared critic and policy-result schema
- Family adapter modules for scene and presentation families
- Threshold configuration files and calibration reports
- Policy aggregator and override workflow
- Integration with review candidates and batch manifests
- Tests for calibration, aggregation, and overrides

## Acceptance Criteria

- A calibration report exists for the demo corpus and approved-set fixtures
  under repo-tracked threshold configs.
- Scene and presentation families can emit critic results using the same shared
  envelope as core runtime assets.
- The decision policy routes candidates into all three lanes when appropriate.
- Review pages and batch manifests display explanations and recommended next
  actions.
- Overrides preserve both the original policy result and the human decision.

## Out of Scope

- Re-implementing the core candidate-generation critic loop
- Human review UI redesign beyond integration hooks
- Multi-machine release orchestration
