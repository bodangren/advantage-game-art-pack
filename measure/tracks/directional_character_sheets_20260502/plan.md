# Directional Character Sheet Renderer — Implementation Plan

## Phase 1: Schema and Validation [ ]

- [ ] **T01 — Add directional fields to EntitySpec**
  Add `directions` (list of direction strings, default `["S"]`) and
  `frames_per_direction` (int, default `1`) fields to the EntitySpec dataclass.
  Write tests first: verify defaults, valid direction strings, rejection of
  invalid directions.

- [ ] **T02 — Add directional_sheet to FAMILY_NAMES**
  Register `"directional_sheet"` in the family constant set. Write test that
  verifies the family name is recognized by validation.

- [ ] **T03 — Layout validation for directional sheets**
  Implement validation rule: output PNG dimensions must equal
  `(frame_w * frames_per_direction, frame_h * len(directions))`. Write tests
  for correct layout, wrong row count, wrong column count.

## Phase 2: Renderer Core [ ]

- [ ] **T04 — Directional frame generator**
  Implement `_render_directional_frames(spec, style_pack)` that produces a
  list of frame images (one per direction × frame index). Each frame uses
  existing part primitives composited with directional variations (e.g., limb
  position offsets per direction). Write tests for: single direction produces 1
  frame, 4 directions × 3 frames produces 12 frames, frame dimensions match
  spec.

- [ ] **T05 — Directional sheet compositor**
  Implement `_composite_directional_sheet(frames, directions, fpd)` that
  arranges frames into a grid PNG: row 0 = first direction, row 1 = second
  direction, etc. Write test: verify pixel data placement at expected grid
  positions.

- [ ] **T06 — Wire into compile_program**
  Add `directional_sheet` case to the compiler dispatch. Write integration test
  that compiles a minimal directional spec and produces a valid PNG with
  correct dimensions.

## Phase 3: Style Pack Integration [ ]

- [ ] **T07 — Directional part variations**
  Extend style pack schema to support per-direction part variant overrides
  (e.g., `front_hair`, `back_hair`). Write test that style pack with directional
  variants produces different pixel output per direction.

- [ ] **T08 — Palette enforcement on directional output**
  Verify that median-cut palette quantization applies to directional sheet
  output. Write test: generate directional sheet, quantize, confirm palette
  limit not exceeded.

## Phase 4: CLI and Examples [ ]

- [ ] **T09 — CLI subcommand for directional sheets**
  Add `asf compile directional` subcommand that accepts a directional spec
  file and outputs the sprite sheet. Write test: invoke CLI, verify exit code 0
  and output file exists.

- [ ] **T10 — Example directional specs**
  Create 2 example specs: `examples/knight_walk_4dir.json` (4-direction walk)
  and `examples/mage_idle_8dir.json` (8-direction idle). Write smoke test that
  compiles both without error.

## Phase 5: Documentation [ ]

- [ ] **T11 — Update tracks.md and lessons-learned.md**
  Mark track complete, record lessons learned about directional frame layout
  and part variation patterns.
