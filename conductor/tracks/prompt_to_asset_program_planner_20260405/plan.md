# Implementation Plan

## Phase 1: Interfaces and schemas

- [ ] Task: Update the tech-stack proposal and define the planner/provider interfaces
  - [ ] Document the chosen provider-agnostic interface before coding
  - [ ] Define how API keys, model names, and request tracing are configured
  - [ ] Document how planner traces are stored for later debugging and review
- [ ] Task: Define the brief schema, asset-program schema, and theme-pack schema
  - [ ] Define one user-brief schema and one batch-brief schema
  - [ ] Define the planner outputs for `character_sheet`, `prop_or_fx_sheet`, `tileset`, and `background_scene`
  - [ ] Define how planner outputs request directional variants, row-state layouts, and per-game presentation surfaces
  - [ ] Define theme-pack references and validation rules

## Phase 2: Planner and repair loop

- [ ] Task: Write tests for planner prompt assembly and structured-output parsing
  - [ ] Cover context assembly from canon, theme packs, and primitive availability
  - [ ] Cover parsing of valid structured planner output
  - [ ] Cover malformed JSON and missing required fields
- [ ] Task: Implement the provider abstraction, prompt builder, and structured parser
  - [ ] Add a provider interface and at least one concrete implementation
  - [ ] Build prompts from canon, themes, and family-specific constraints
  - [ ] Parse and validate structured planner output into typed models
- [ ] Task: Write tests for the validation and repair loop
  - [ ] Cover malformed JSON returned by the provider
  - [ ] Cover unknown primitive references and unknown theme references
  - [ ] Cover final failure when repair attempts are exhausted
- [ ] Task: Implement validation, repair prompts, and failure reporting
  - [ ] Add schema validation before any compiler receives planner output
  - [ ] Add a repair prompt path that can fix invalid planner JSON
  - [ ] Return structured errors when planner output cannot be repaired

## Phase 3: Batch planning and evaluation

- [ ] Task: Write tests for sample briefs across all supported asset families
  - [ ] Cover character, prop/FX, tile, and scene briefs
  - [ ] Cover briefs requesting multiple related assets in one batch
  - [ ] Cover contradictory briefs that should fail fast
- [ ] Task: Implement the batch planner CLI and manifest output
  - [ ] Add a command that reads a brief and writes a planner manifest to disk
  - [ ] Include per-asset family programs and shared batch constraints
  - [ ] Store prompt traces and provider metadata with the planner output
- [ ] Task: Build offline eval fixtures and score planner adherence
  - [ ] Add a fixed set of representative briefs to the repo
  - [ ] Score schema adherence, invalid-reference rate, and repair-loop frequency
  - [ ] Document how planners are compared without relying on subjective visual judgment
- [ ] Task: Run verification and document prompt-governance rules
  - [ ] Run planner, repair-loop, and eval tests
  - [ ] Verify the planner never generates image-like freeform output in production mode
  - [ ] Document the exact rules that keep the planner constrained to asset programs
