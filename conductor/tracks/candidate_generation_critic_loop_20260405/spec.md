# Specification

## Overview

Build the bounded candidate-generation loop that turns a compiler program into
multiple original asset candidates, scores those candidates against the
demo-derived canon, blocks near-copy outputs, and selects the best candidate or
requests another bounded retry.

This is the quality loop between deterministic compilers and later review or
release policy. It must not generate by directly copying demo-art pixels.

## Dependencies

- Recommended prior track: `style_canon_annotation_system_20260405`
- Recommended prior track: `primitive_library_promotion_pipeline_20260405`
- Recommended prior track: `asset_family_compiler_framework_20260405`

## Functional Requirements

### FR1: Candidate Job Schema

- Define a strict candidate-generation job schema.
- Each job must record:
  - target family
  - source program path or hash
  - variant budget or search range
  - critic configuration version
  - canon version
  - output root
  - retry budget

### FR2: Deterministic Variant Generation

- Invoke compilers with deterministic variant controls such as `variant_id` or
  equivalent bounded knobs.
- The same program plus the same variant controls must produce identical
  outputs.
- Different valid variant controls may produce distinct outputs, but only
  through compiler logic and approved primitives, never by directly reusing demo
  pixels.

### FR3: Core Critic Scoring for Candidate Selection

- Add the core scoring needed during generation-time selection:
  - structural checks
  - style scoring against canon baselines
  - novelty checks against demo assets and approved outputs
- The style critic must use the canon artifacts rather than ad hoc constants.
- The novelty critic must detect near-duplicates of demo assets and approved
  references before a candidate can survive the loop.

### FR4: Selection, Retry, and Failure Routing

- Rank or otherwise compare generated candidates within one job.
- Select the best surviving candidate when thresholds are met.
- Return a structured regenerate or fail result when all candidates fall below
  thresholds.
- Persist per-candidate reasons, scores, and evidence pointers.

### FR5: Calibration and Threshold Targets

- Provide a calibration workflow for the demo corpus.
- Threshold configs must support explicit target pass-rate bands such as `0.8`
  or `0.9`, stored in repo-tracked plain files.
- Calibration output must show which demo assets pass or fail under the current
  thresholds.

### FR6: Candidate Manifests and Auditability

- Export a manifest for every candidate and every selected result.
- Candidate manifests must include:
  - program hash
  - variant controls
  - primitive IDs used
  - critic summaries
  - nearest-reference evidence
  - final selection outcome

## Non-Functional Requirements

- Candidate search must remain deterministic for unchanged inputs and unchanged
  search ranges.
- Threshold files and calibration reports must be plain text and tracked in git.
- The loop must make near-copy failures obvious instead of silently relying on a
  human reviewer to notice them.

## Deliverables

- Candidate job schema
- Candidate-generation runner or CLI
- Core structural, style, and novelty critics for generation-time selection
- Threshold configuration files and calibration reports
- Candidate and selection manifests
- Tests for determinism, calibration, and anti-copy behavior

## Acceptance Criteria

- Running the same candidate job twice with unchanged inputs produces the same
  selected result and manifests.
- Different variant controls can yield bounded distinct candidates for at least
  one supported family.
- A near-duplicate of a demo asset is flagged before selection.
- A calibration report exists that measures what share of the demo corpus passes
  the configured thresholds.
- The selected candidate manifest records why it beat the rejected candidates.

## Out of Scope

- Human review UI implementation
- Final cross-repo release policy
- LLM planner implementation
- Multi-machine batch scaling
