# Specification

## Overview

Fix two critical renderer bugs:
1. **Lighting double-darken**: The lighting pass applies ambient + directional darkening twice, producing images that are too dark.
2. **Layout resolver origin pile-up**: The layout resolver assigns `bounds=(0,0,32,32)` to all props, causing every prop to render at the origin instead of being distributed across the scene.

## Dependencies

- None (standalone bugfix track).

## Functional Requirements

### FR1: Lighting Math Correction

- The lighting pass must apply a single combined lighting factor per pixel.
- Ambient light provides a base brightness floor.
- Directional light adds intensity based on surface normal and light direction.
- The final pixel color must be: `base_color * clamp(ambient + directional, 0, 1)`.
- The current double-apply must be eliminated: no intermediate darken step followed by another darken.
- All lighting calculations must be unit-tested with known inputs and expected outputs.

### FR2: Layout Resolver Fix

- The layout resolver must calculate proper bounds for each prop based on the scene graph.
- Bounds must reflect the prop's assigned position, size, and z-order.
- Props must not overlap unless the scene graph explicitly specifies stacking.
- The default bounds `(0,0,32,32)` must only be used when no position information is available, not as a blanket assignment.
- Layout output must be deterministic: the same scene graph always produces the same bounds.

### FR3: Visual Regression Tests

- Create test fixtures with known-good rendered output.
- Compare renderer output against fixtures using pixel-diff with a tolerance threshold.
- Test lighting: render a scene with one directional light and verify pixel brightness matches expected values.
- Test layout: render a scene with 3+ props and verify no two props share the same bounds unless intended.

## Non-Functional Requirements

- Lighting fix must not change the rendering pipeline's performance by more than 5%.
- Layout resolver must handle scenes with up to 50 props in under 100ms.
- All fixes must be backward-compatible with existing scene definitions.

## Deliverables

- Corrected lighting pass implementation
- Corrected layout resolver implementation
- Unit tests for lighting math
- Unit tests for layout resolver
- Visual regression test fixtures with known-good outputs
- Updated renderer module

## Acceptance Criteria

- [ ] Lighting pass applies a single combined ambient + directional factor per pixel.
- [ ] Test fixtures with known lighting values produce correct output.
- [ ] Layout resolver assigns distinct, correct bounds to each prop.
- [ ] Scene with 3 props produces 3 non-overlapping bounds (unless stacked by design).
- [ ] Visual regression tests pass with pixel-diff tolerance ≤ 2%.
- [ ] Existing scene definitions render correctly after fixes.

## Out of Scope

- New lighting models (PBR, shadows, reflections).
- UI for editing layout positions interactively.
- Performance optimization of the rendering pipeline.
