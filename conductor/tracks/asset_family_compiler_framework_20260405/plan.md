# Implementation Plan

## Phase 1: Registry and schemas

- [ ] Task: Define the compiler registry interface and family program schemas
  - [ ] Define the shared compiler interface and output envelope
  - [ ] Define separate JSON schemas for `character_sheet`, `prop_or_fx_sheet`, and `tileset`
  - [ ] Define the repo paths for sample programs and compiled outputs
- [ ] Task: Write tests for compiler registry behavior and program validation
  - [ ] Cover dispatch to the correct compiler by family name
  - [ ] Cover invalid family names and malformed programs
  - [ ] Cover output-manifest shape validation
- [ ] Task: Implement the registry, shared program loader, and common output manifests
  - [ ] Add typed models for family programs and shared output envelopes
  - [ ] Add registry lookup and compile entry points
  - [ ] Ensure every compiler writes the common manifest fields consistently

## Phase 2: Character compiler refactor

- [ ] Task: Write tests for the primitive-based character compiler
  - [ ] Cover primitive lookup and anchor usage
  - [ ] Cover deterministic pose-sheet generation with idle, walk, and action frames
  - [ ] Cover directional variants and row-based state layouts
  - [ ] Cover failure when required primitives or anchors are missing
- [ ] Task: Implement the primitive-based character sheet compiler
  - [ ] Replace ad hoc character drawing with primitive assembly and palette application
  - [ ] Support equipment attachment and bounded pose deltas
  - [ ] Support directional sheet variants and nonstandard row semantics
  - [ ] Preserve the existing metadata contract where still applicable

## Phase 3: Prop/FX and tileset compilers

- [ ] Task: Write tests for the prop/FX compiler
  - [ ] Cover static and animated sheet layouts
  - [ ] Cover state-row layouts such as correct/incorrect, charged, or destroyed
  - [ ] Cover palette application, glow layers, and deterministic motion deltas
  - [ ] Cover manifest output and primitive provenance
- [ ] Task: Implement the prop/FX compiler
  - [ ] Compile books, orbs, spirits, and similar assets from approved primitives
  - [ ] Support configurable sheet layouts such as `3x1` and `3x3`
  - [ ] Export manifests and metadata aligned with the shared envelope
- [ ] Task: Write tests for the tileset compiler
  - [ ] Cover tile-grid dimensions and seam-safe output
  - [ ] Cover deterministic variation rules
  - [ ] Cover rejection of invalid tile program definitions
- [ ] Task: Implement the tileset compiler
  - [ ] Assemble floor, wall, trim, and clutter tiles from approved primitives
  - [ ] Apply bounded variation rules without changing determinism
  - [ ] Export tile manifests that later scene assembly can consume

## Phase 4: Verification and extension notes

- [ ] Task: Run verification and document compiler extension points
  - [ ] Run all compiler validation and determinism tests
  - [ ] Compile one sample program for each supported family
  - [ ] Document the extension hooks required for the later background-scene compiler
