# Specification

## Overview

Refactor the current prototype renderer into a formal compiler framework with
separate deterministic compilers for the main non-scene asset families:

- `character_sheet`
- `prop_or_fx_sheet`
- `tileset`

Each compiler must consume structured asset programs and approved primitives
instead of hand-coded special cases.

## Dependencies

- Recommended prior track: `style_canon_annotation_system_20260405`
- Recommended prior track: `primitive_library_promotion_pipeline_20260405`
- Existing baseline implementation: `sprite_compiler_mvp_20260405`

## Functional Requirements

### FR1: Compiler Registry and Program Schemas

- Define a compiler registry keyed by asset family.
- Define strict family-specific input schemas for asset programs.
- The program loader must reject unknown family names and invalid fields before
  any rendering begins.

### FR2: Character Sheet Compiler

- Replace the ad hoc MVP character renderer with a primitive-driven compiler.
- The character compiler must support:
  - body archetypes
  - equipment attachment points
  - palette selection
  - idle, walk, and action frame plans
  - bounded pose deltas
  - directional variants such as `facing_up`, `facing_down`, and
    `facing_camera`
  - row semantics for nonstandard layouts such as attack, defeat, or state rows

### FR3: Prop/FX Sheet Compiler

- Add deterministic support for animated or static prop/FX sheets such as:
  - books
  - orbs
  - spirits
  - glow bursts
  - slimes and other blob-like entities that fit the prop/FX family better
  - gates, castles, runes, and other interactables with row-based state changes

### FR4: Tileset Compiler

- Add a deterministic compiler for tile-family assets.
- It must support:
  - floor tiles
  - wall segments
  - trim modules
  - clutter tiles
  - damage/variation passes bounded by theme rules

### FR5: Common Output Manifests

- All compilers must export a common manifest envelope that records:
  - input program path or hash
  - compiler family and version
  - primitive IDs used
  - output file paths
  - dimensions and grid data

## Non-Functional Requirements

- Rendering must remain deterministic for unchanged inputs.
- Compiler outputs must be auditable and diffable in git.
- The framework must be extensible so later tracks can add the
  `background_scene` compiler cleanly.

## Deliverables

- Compiler registry and shared program loader
- Family-specific compilers for `character_sheet`, `prop_or_fx_sheet`, and `tileset`
- Family-specific sample programs
- Common output manifest schema
- Tests for validation, determinism, and output integrity

## Acceptance Criteria

- A character-sheet sample program compiles deterministically using primitives.
- A directional or row-semantic sheet sample program compiles deterministically.
- A prop/FX sample program compiles deterministically.
- A tileset sample program compiles deterministically.
- All outputs include a common manifest envelope with primitive provenance.
- The old MVP path is either removed or wrapped behind the new compiler interface.

## Out of Scope

- Background-scene assembly
- Review UI
- LLM prompt planning
- Auto-approval policy
