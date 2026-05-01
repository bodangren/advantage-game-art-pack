# Effect Overlay Generation Pipeline — Implementation Plan

## Phase 1: Schema and Foundation [ ]

- [ ] **T01 — EffectSpec dataclass**
  Define `EffectSpec` dataclass with fields: `effect_type` (glow, pulse, aura,
  burst), `duration_frames`, `blend_mode` (additive, screen, multiply),
  `intensity` (0.0–1.0), `color_tint` (optional RGB). Write tests for: valid
  construction, default values, invalid effect_type rejection.

- [ ] **T02 — Register effect_sheet family**
  Add `"effect_sheet"` to `FAMILY_NAMES`. Write test verifying family is
  recognized by validation.

- [ ] **T03 — Effect primitive library**
  Create `style_packs/effects/` directory with primitive manifests for:
  `glow_ring.json`, `pulse_wave.json`, `particle_burst.json`,
  `shadow_pool.json`. Each manifest defines shape, size, alpha curve, and
  color channels. Write tests for: manifest loading, required fields present.

## Phase 2: Effect Renderer [ ]

- [ ] **T04 — Standalone effect renderer**
  Implement `_render_effect_frame(spec, style_pack, frame_index)` that produces
  a single RGBA Image for one frame of an effect. Uses alpha channel for
  transparency (0 = transparent, 255 = full effect). Write tests for: output
  is RGBA mode, alpha channel has non-zero values in effect region, frame 0
  differs from frame N.

- [ ] **T05 — Effect sheet compositor**
  Implement `_composite_effect_sheet(frames)` that arranges effect frames into
  a horizontal strip PNG. Write test: verify output width = frame_width ×
  frame_count, height = frame_height.

- [ ] **T06 — Wire effect_sheet into compile_program**
  Add `effect_sheet` case to compiler dispatch. Write integration test:
  compile a glow_ring spec, verify output PNG is RGBA with correct dimensions.

## Phase 3: Blend Mode Compositor [ ]

- [ ] **T07 — Blend mode implementations**
  Implement `_blend_additive(base, overlay)`, `_blend_screen(base, overlay)`,
  `_blend_multiply(base, overlay)`. Each operates on RGBA pixel pairs. Write
  tests for: additive brightens, screen lightens dark areas, multiply darkens,
  transparent overlay pixels leave base unchanged.

- [ ] **T08 — Entity+Effect compositor**
  Implement `composite_effect_on_entity(entity_sheet, effect_sheet, blend_mode,
  frame_mapping)` that applies effect to entity frames at specified frame
  indices. Write test: composite glow onto entity, verify center pixels are
  brighter than original.

- [ ] **T09 — Multi-effect layering**
  Support compositing multiple effects in sequence (e.g., shadow + glow).
  Write test: layer two effects, verify cumulative pixel changes.

## Phase 4: Metadata and CLI [ ]

- [ ] **T10 — Effect timing metadata**
  Generate `effect_timing.json` alongside effect sheets containing:
  `frame_duration_ms`, `loop`, `total_duration_ms`, `blend_mode`. Write test:
  metadata file exists and contains required keys.

- [ ] **T11 — CLI subcommand for effects**
  Add `asf compile effect` subcommand. Write test: invoke CLI, verify exit
  code 0 and output files (PNG + JSON) exist.

- [ ] **T12 — Example effect specs**
  Create `examples/poison_aura.json` and `examples/ice_pulse.json`. Write
  smoke test that compiles both without error.

## Phase 5: Documentation [ ]

- [ ] **T13 — Update tracks.md and lessons-learned.md**
  Mark track complete, record lessons learned about alpha channel handling and
  blend mode pixel math.
