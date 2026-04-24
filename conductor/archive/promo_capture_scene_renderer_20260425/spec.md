# Specification

## Overview

Wire the `promo_capture_job` surface program to the scene renderer so that `capture_conditions` (scene_program, timing, frame_index) are honored instead of blindly loading a static `promo.png` from the source bundle.

## Background

The `assemble_promo_capture_job` function in `src/asf/presentation_surfaces.py` currently loads a pre-existing `promo.png` file from the source bundle directory. The `capture_conditions` block in the program JSON contains:

- `scene_program`: path to a scene program to render
- `timing`: float (seconds into animation)
- `frame_index`: int (frame number)

These are completely ignored. The fix renders the scene program when specified and uses the timing/frame_index to select the appropriate frame.

## Functional Requirements

### FR1: Conditional Scene Rendering

- When `capture_conditions.scene_program` is specified in the promo capture job, render that scene program using `assemble_scene` instead of loading a static image.
- When `scene_program` is absent or null, fall back to loading `source_bundle/promo.png` (current behavior).

### FR2: Frame Selection from Capture Conditions

- Support `frame_index` in `capture_conditions` to select a specific frame from the rendered scene.
- Support `timing` as an alternative to `frame_index` for time-based selection.
- If neither is specified, render the scene at default state (frame 0).

### FR3: Preserve Existing Contract

- The function signature and return type of `assemble_promo_capture_job` must remain unchanged.
- The manifest must still record source assets and capture conditions for reproducibility.

### FR4: Error Handling

- If `scene_program` is specified but the file does not exist, raise `SurfaceAssemblyError` with a clear message.
- If rendering fails, raise `SurfaceAssemblyError` wrapping the underlying error.

## Non-Functional Requirements

- Deterministic output for identical inputs.
- No regression: existing promo capture jobs that rely on static `promo.png` must continue to work.
- Minimal code duplication: reuse existing `assemble_scene` and `load_scene_program`.

## Acceptance Criteria

- [ ] AC1: A promo capture job with `capture_conditions.scene_program` set renders the scene and ignores the static `promo.png`.
- [ ] AC2: A promo capture job without `scene_program` falls back to loading `source_bundle/promo.png`.
- [ ] AC3: `frame_index` is passed through to the scene renderer when specified.
- [ ] AC4: The manifest correctly records `scene_program`, `timing`, and `frame_index` as source assets.
- [ ] AC5: All existing tests pass (no regression).
- [ ] AC6: New unit tests cover the scene rendering path and the fallback path.

## Out of Scope

- Animation timeline simulation beyond frame_index (future enhancement).
- Game-runtime capture integration (future enhancement).
- Post-processing effects for promo stills beyond scene rendering.