# Implementation Plan

## Phase 1: Registry and schemas

- [x] Task: Define the compiler registry interface and family program schemas
  - [x] Define the shared compiler interface, variant controls, and output envelope
  - [x] Define separate JSON schemas for `character_sheet`, `prop_or_fx_sheet`, and `tileset`
  - [x] Define the repo paths for sample programs and compiled outputs
- [x] Task: Write tests for compiler registry behavior and program validation
  - [x] Cover dispatch to the correct compiler by family name
  - [x] Cover invalid family names and malformed programs
  - [x] Cover output-manifest shape validation
- [x] Task: Implement the registry, shared program loader, and common output manifests
  - [x] Add typed models for family programs and shared output envelopes
  - [x] Add registry lookup and compile entry points
  - [x] Ensure every compiler writes the common manifest fields consistently

## Phase 2: Character compiler refactor

- [x] Task: Write tests for the primitive-based character compiler
  - [x] Cover primitive lookup and anchor usage
  - [x] Cover deterministic pose-sheet generation with idle, walk, and action frames
  - [x] Cover stable output for the same variant ID and bounded differences across different variant IDs
  - [x] Cover directional variants and row-based state layouts
  - [x] Cover failure when required primitives or anchors are missing
- [x] Task: Implement the primitive-based character sheet compiler
  - [x] Replace ad hoc character drawing with primitive assembly and palette application
  - [x] Support equipment attachment and bounded pose deltas
  - [x] Support deterministic variant IDs or candidate knobs consumed by later critic loops
  - [x] Support directional sheet variants and nonstandard row semantics
  - [x] Preserve the existing metadata contract where still applicable

## Phase 3: Prop/FX and tileset compilers

- [x] Task: Write tests for the prop/FX compiler
  - [x] Cover static and animated sheet layouts
  - [x] Cover state-row layouts such as correct/incorrect, charged, or destroyed
  - [x] Cover palette application, glow layers, and deterministic motion deltas
  - [x] Cover manifest output, primitive provenance, and variant controls
- [x] Task: Implement the prop/FX compiler
  - [x] Compile books, orbs, spirits, and similar assets from approved primitives
  - [x] Support configurable sheet layouts such as `3x1` and `3x3`
  - [x] Expose bounded variant controls for later candidate search without breaking determinism
  - [x] Export manifests and metadata aligned with the shared envelope
- [x] Task: Write tests for the tileset compiler
  - [x] Cover tile-grid dimensions and seam-safe output
  - [x] Cover deterministic variation rules
  - [x] Cover rejection of invalid tile program definitions
- [x] Task: Implement the tileset compiler
  - [x] Assemble floor, wall, trim, and clutter tiles from approved primitives
  - [x] Apply bounded variation rules without changing determinism
  - [x] Export tile manifests and variant metadata that later scene assembly and candidate scoring can consume

## Phase 4: Verification and extension notes

- [x] Task: Run verification and document compiler extension points
  - [x] Run all compiler validation and determinism tests
  - [x] Compile one sample program for each supported family, including at least two variant IDs for one family
  - [x] Document the extension hooks required for the later background-scene compiler
