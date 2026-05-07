# Effect Sheet Palette Quantization — Implementation Plan

## Phase 1: Investigation [ ]

- [ ] **T01 — Audit effect sheet compiler palette handling**
  Examine how _compile_effect_sheet handles palette spec; identify where dummy PaletteSpec is used and what real palette information should be passed.

## Phase 2: Implementation [ ]

- [ ] **T02 — Pass real palette hints to effect compiler**
  Modify _compile_effect_sheet to accept style_pack palette_limits and use them for quantization.

- [ ] **T03 — Apply median-cut quantization to effect output**
  Wire palette quantization into effect sheet compilation, similar to other compiler families.

## Phase 3: Testing [ ]

- [ ] **T04 — Verify palette enforcement on effect sheets**
  Run existing effect sheet tests; ensure they pass with real palette hints.

- [ ] **T05 — Add test for palette limit compliance**
  Write test that generates an effect sheet and verifies output respects palette_limits.

## Phase 4: Finalization [ ]

- [ ] **T06 — Update tech-debt.md**
  Mark effect_sheet palette quantization item as closed.

- [ ] **T07 — Update lessons-learned.md**
  Document the pattern for wiring palette quantization into new compiler families.