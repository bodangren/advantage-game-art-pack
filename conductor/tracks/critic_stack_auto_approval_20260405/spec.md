# Specification

## Overview

Build the critic stack and the decision policy that determines whether an asset
can be auto-approved, must be reviewed by a human, or must be regenerated.

The critic system must combine hard deterministic checks with softer style and
semantic checks. It must also produce explanations that are useful in the
review queue instead of opaque scores only.

## Dependencies

- Recommended prior track: `style_canon_annotation_system_20260405`
- Recommended prior track: `review_queue_foundation_20260405`
- Recommended prior track: `prompt_to_asset_program_planner_20260405`
- Recommended prior track: `asset_family_compiler_framework_20260405`
- Recommended prior track: `scene_layout_background_assembler_20260405`

## Functional Requirements

### FR1: Critic Result Schema

- Define a shared result schema for all critics.
- The schema must include:
  - critic name
  - pass/fail outcome
  - score
  - confidence
  - reasons
  - evidence pointers
  - recommended next action

### FR2: Structural Critic

- Add deterministic structural checks for every family:
  - pose-sheet dimensions and pivots
  - tile seams and tile-grid integrity
  - scene-manifest completeness
  - file presence and manifest-path integrity

### FR3: Style Critic

- Compare outputs against the style canon using measurable heuristics.
- At minimum, score:
  - palette usage
  - occupancy and silhouette size
  - edge density
  - highlight density
  - contact-shadow area
  - lighting consistency

### FR4: Semantic and Novelty Critics

- Add a semantic critic that judges whether the output still reads as the
  intended concept or asset family.
- Add a novelty critic that detects:
  - near duplicates of approved assets
  - excessive drift from the approved reference cluster

### FR5: Auto-Approval Policy

- Combine critic outputs into one decision:
  - `auto_approved`
  - `needs_review`
  - `regenerate`
- The policy must be configurable with explicit thresholds.

### FR6: Review Queue Integration

- Push critic results and final decisions into the review system.
- Review pages must display explanations instead of only raw numbers.

## Non-Functional Requirements

- Structural critics must remain deterministic.
- Thresholds and policy config must live in plain files, not code-only constants.
- Reviewers must be able to understand why a candidate was escalated.

## Deliverables

- Critic result schema
- Structural critic modules
- Style critic modules
- Semantic and novelty critic adapters
- Decision-policy configuration
- Integration with review candidate records
- Tests for critic outputs and decision aggregation

## Acceptance Criteria

- Structural failures are caught before an asset can be auto-approved.
- Style scoring uses the canon rather than ad hoc thresholds.
- The decision policy routes candidates into all three lanes when appropriate.
- Review pages can display critic explanations and recommended next actions.
- Duplicate or near-duplicate candidates are identified before approval.

## Out of Scope

- Full batch orchestration
- Human review UI implementation beyond integrating existing review pages
