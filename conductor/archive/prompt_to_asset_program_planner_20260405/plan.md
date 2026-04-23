# Implementation Plan

## Phase 1: Interfaces and schemas

- [x] Task: Update the tech-stack proposal and define the planner/provider interfaces
  - [x] Document the chosen provider-agnostic interface before coding
  - [x] Define how API keys, model names, and request tracing are configured
  - [x] Document how planner traces are stored for later debugging and review
- [x] Task: Define the brief schema, asset-program schema, and theme-pack schema
  - [x] Define one user-brief schema and one batch-brief schema
  - [x] Define the planner outputs for `character_sheet`, `prop_or_fx_sheet`, `tileset`, and `background_scene`
  - [x] Define how planner outputs request directional variants, row-state layouts, and per-game presentation surfaces
  - [x] Define theme-pack references and validation rules

## Phase 2: Planner and repair loop

- [x] Task: Write tests for planner prompt assembly and structured-output parsing
  - [x] Cover context assembly from canon, theme packs, and primitive availability
  - [x] Cover parsing of valid structured planner output
  - [x] Cover malformed JSON and missing required fields
- [x] Task: Implement the provider abstraction, prompt builder, and structured parser
  - [x] Add a provider interface and at least one concrete implementation
  - [x] Build prompts from canon, themes, and family-specific constraints
  - [x] Parse and validate structured planner output into typed models
- [x] Task: Write tests for the validation and repair loop
  - [x] Cover malformed JSON returned by the provider
  - [x] Cover unknown primitive references and unknown theme references
  - [x] Cover final failure when repair attempts are exhausted
- [x] Task: Implement validation, repair prompts, and failure reporting
  - [x] Add schema validation before any compiler receives planner output
  - [x] Add a repair prompt path that can fix invalid planner JSON
  - [x] Return structured errors when planner output cannot be repaired

## Phase 3: Batch planning and evaluation

- [x] Task: Write tests for sample briefs across all supported asset families
  - [x] Cover character, prop/FX, tile, and scene briefs
  - [x] Cover briefs requesting multiple related assets in one batch
  - [x] Cover contradictory briefs that should fail fast
- [x] Task: Implement the batch planner CLI and manifest output
  - [x] Add a command that reads a brief and writes a planner manifest to disk
  - [x] Include per-asset family programs and shared batch constraints
  - [x] Store prompt traces and provider metadata with the planner output
- [x] Task: Build offline eval fixtures and score planner adherence
  - [x] Add a fixed set of representative briefs to the repo
  - [x] Score schema adherence, invalid-reference rate, and repair-loop frequency
  - [x] Document how planners are compared without relying on subjective visual judgment
- [x] Task: Run verification and document prompt-governance rules
  - [x] Run planner, repair-loop, and eval tests
  - [x] Verify the planner never generates image-like freeform output in production mode
  - [x] Document the exact rules that keep the planner constrained to asset programs
