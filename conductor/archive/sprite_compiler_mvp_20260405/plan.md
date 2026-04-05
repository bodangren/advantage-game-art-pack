# Implementation Plan

## Phase 1: Conductor and project foundation

- [x] Task: Define project docs and initial MVP track
  - [x] Capture product definition from the supplied PRD
  - [x] Define the initial Python/Pillow tech stack
  - [x] Create workflow, lessons learned, and tech debt artifacts
- [x] Task: Create Python package skeleton and example spec
  - [x] Add source, tests, style pack, and example directories
  - [x] Add an executable CLI entry point

## Phase 2: Spec contract and deterministic renderer

- [x] Task: Write tests for spec loading and validation
  - [x] Cover valid spec parsing
  - [x] Cover failure on unsupported style packs
- [x] Task: Implement typed spec parsing and style pack loading
  - [x] Add dataclasses and validation helpers
  - [x] Load style pack definitions from JSON
- [x] Task: Write tests for deterministic frame rendering
  - [x] Assert repeated renders are byte-identical
  - [x] Assert rendered frame and sheet dimensions
- [x] Task: Implement deterministic 3x3 sprite rendering
  - [x] Render idle, walk, and action frame variations
  - [x] Apply style-pack palette and outline rules

## Phase 3: Export and validation

- [x] Task: Write tests for export metadata and validator checks
  - [x] Validate metadata frame mappings
  - [x] Validate sheet size and palette limits
- [x] Task: Implement exporter and quality critic
  - [x] Export `sheet.png` and `metadata.json`
  - [x] Enforce structural validation before export
- [x] Task: Run automated verification and document MVP gaps
  - [x] Run `python3 -m unittest discover -s tests -v`
  - [x] Run `python3 -m compileall src`
  - [x] Record remaining limitations in docs
