# Presentation Surfaces Parallax Fix

## Problem

The parallax tiling in `presentation_surfaces.py` uses a pseudo-random offset `(x_offset * 3) % canvas_w` which is deterministic but not analytically reproducible for repeat-safe edge handling. This makes it difficult to guarantee edge seamlessness when tiles need to repeat.

## Goal

Replace pseudo-random offsets with a seeded deterministic grid or tile-flipping approach for guaranteed edge seamlessness.

## Scope

### In Scope

- Replace pseudo-random offset with deterministic seeded offset in parallax tiling
- Ensure repeat-safe edge handling
- Maintain existing output dimensions and behavior
- Update tests if needed

### Out of Scope

- Changes to the overall presentation surfaces pipeline
- Changes to cover/loading surface generation

## Success Criteria

- Parallax tiling produces deterministic, seamlessness-guaranteed output
- All existing tests pass
- Edge handling works correctly for repeat patterns