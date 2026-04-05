# Specification

## Overview

Build the LLM planner that converts natural-language asset briefs into strict
asset programs and batch manifests. The planner is not allowed to generate
pixels. Its job is to choose families, themes, motifs, primitives, and bounded
constraints that later deterministic compilers can execute.

## Dependencies

- Recommended prior track: `style_canon_annotation_system_20260405`
- Recommended prior track: `asset_family_compiler_framework_20260405`
- Recommended prior track: `scene_layout_background_assembler_20260405`

## Functional Requirements

### FR1: Provider Abstraction

- Introduce a provider abstraction so the planner can call an LLM without
  hardwiring the repository to one vendor.
- The abstraction must support:
  - prompt submission
  - structured-output parsing
  - retry or repair prompts
  - trace logging

### FR2: Brief and Program Schemas

- Define a strict schema for user briefs and batch briefs.
- Define strict family-specific program schemas for planner output.
- Planner output must be expressible without prose-only fields.

### FR3: Style-Context Assembly

- The planner must assemble context from:
  - the style canon
  - theme packs
  - primitive availability
  - family-specific constraints
- The planner must not reference primitives or themes that do not exist.

### FR4: Validation and Repair

- Validate planner output against the target program schema.
- If output is malformed, run a repair loop that asks the planner to fix the
  invalid JSON or invalid references.
- If repair still fails, return a structured error instead of silently falling
  back to vague defaults.

### FR5: Batch Planning

- Support planning multiple assets from one brief.
- Batch output must preserve:
  - requested families
  - requested counts
  - theme relationships
  - shared constraints such as “same style, same library, different enemy types”
  - per-game bundle requirements such as runtime sheets, parallax layers,
    loading surfaces, and covers

### FR6: Planner Evaluation Set

- Build a fixed eval set of sample briefs covering:
  - character sheets
  - prop/FX sheets
  - tilesets
  - background scenes
- Use the eval set to measure schema adherence and invalid-reference rate.

## Non-Functional Requirements

- Planner outputs must be stored and auditable.
- The system must remain usable even when the provider returns malformed output.
- The implementation must make it obvious that the LLM generates programs, not
  images.

## Deliverables

- Planner provider interface
- Prompt builder and structured parser
- Brief schemas, theme-pack schemas, and program schemas
- Repair loop implementation
- Batch planner CLI
- Offline planner eval fixtures and scoring output

## Acceptance Criteria

- Given representative briefs, the planner emits valid programs for every
  supported asset family.
- Invalid planner output is either repaired into valid output or returned as a
  structured failure.
- The planner never references unknown theme packs or unavailable primitives.
- The batch planner can emit a manifest that later compiler tracks can consume
  directly.

## Out of Scope

- Pixel generation
- Review UI implementation
- Critic implementation
- Final release bundling
