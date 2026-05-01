# Effect Overlay Generation Pipeline

## Problem

The product vision explicitly lists "Effect overlay generation" as a core
workflow: "Given requests like 'poison aura' or 'ice pulse', the product must
generate effects that can be exported as standalone sheets or layered onto
entities." No dedicated track exists for this capability. The current
prop_or_fx_sheet compiler handles props and simple FX, but lacks a compositing
pipeline that layers effect overlays onto entity sprites or generates standalone
effect sheets with transparency.

## Goal

Build an effect overlay pipeline that:
1. Generates standalone effect sprite sheets (glow, pulse, aura, particle
   bursts) as RGBA PNGs with transparency.
2. Composites effect overlays onto existing entity sprite sheets (e.g., add
   poison glow to a character).
3. Supports blend modes (additive, screen, multiply) for visual layering.

## Scope

### In Scope

- New compiler family `effect_sheet` for standalone effect generation.
- Effect compositor that takes an entity sheet + effect sheet and produces a
  composited output.
- Blend mode support: additive (glow), screen (fire), multiply (shadow).
- Per-frame effect timing metadata (JSON) for downstream animation playback.
- Effect primitives: glow_ring, pulse_wave, particle_burst, shadow_pool.
- Unit tests covering: standalone effect generation, entity+effect
  compositing, blend mode correctness, transparency handling.

### Out of Scope

- Real-time GPU shader effects (CPU-only rendering).
- Physics-based particle simulation.
- Sound or haptic effect synchronization.

## Success Criteria

- `compile_program` with `family="effect_sheet"` produces a valid RGBA PNG with
  transparent regions where no effect is present.
- Compositing an effect sheet onto an entity sheet produces correct pixel
  output for each blend mode (verified by pixel-level tests).
- Generated effect metadata JSON includes per-frame timing info.
- Existing compiler families are unaffected.
- New tests pass: `python3 -m unittest discover -s tests -v`.
