# Directional Character Sheet Renderer

## Problem

The product vision lists "directional character sheets" as the first downstream
consumer need for the advantage-games series. The existing character_sheet
compiler renders static or single-direction sprites. There is no dedicated path
for multi-frame directional animation cycles (4-direction or 8-direction
walk/idle/run animations) that games require for responsive character movement.

## Goal

Add a `directional_sheet` compiler family that produces sprite sheets containing
animation frames organized by facing direction. Output must be a single PNG with
a deterministic layout: rows = directions (N, NE, E, SE, S, SW, W, NW or
subset), columns = frames per direction.

## Scope

### In Scope

- New compiler family `directional_sheet` with its own render pipeline.
- Support for 4-direction (N/E/S/W) and 8-direction layouts.
- Configurable frames-per-direction (1–8) for walk, idle, and run cycles.
- Deterministic frame generation from part primitives and palette.
- Layout validation: correct row/column count, frame dimensions, palette
  compliance.
- Integration with existing spec schema (EntitySpec gains `directions` and
  `frames_per_direction` fields).
- Unit tests covering: single-frame idle, 4-direction walk, 8-direction run,
  palette enforcement, layout validation.

### Out of Scope

- Procedural motion interpolation between frames (future track).
- Bone/rig-based animation systems.
- Runtime animation playback (downstream consumer responsibility).

## Success Criteria

- `compile_program` with `family="directional_sheet"` produces a valid sprite
  sheet PNG where each row is a direction and each column is an animation frame.
- All generated sheets pass structural validation (dimension, palette, frame
  count).
- Existing character_sheet, prop_or_fx_sheet, and tileset families are
  unaffected.
- New tests pass: `python3 -m unittest discover -s tests -v`.
