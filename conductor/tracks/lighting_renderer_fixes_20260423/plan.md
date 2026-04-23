# Implementation Plan

## Phase 1: Lighting Fix and Tests

- [ ] Task: Write tests for correct lighting math.
  - [ ] Define test fixtures with known ambient, directional, and base color values.
  - [ ] Write expected-output tests for single-pass combine: `color * clamp(ambient + directional, 0, 1)`.
  - [ ] Verify current tests fail (confirming the double-darken bug).
- [ ] Task: Fix the lighting pass.
  - [ ] Remove the intermediate darken step.
  - [ ] Apply ambient and directional in a single combine pass.
  - [ ] Run lighting tests and verify they pass.
- [ ] Task: Conductor — User Manual Verification 'Phase 1: Lighting Fix and Tests' (Protocol in workflow.md)

## Phase 2: Layout Resolver Fix and Tests

- [ ] Task: Write tests for correct layout resolution.
  - [ ] Define test scenes with 3+ props at distinct positions.
  - [ ] Write expected-output tests verifying each prop gets unique bounds.
  - [ ] Verify current tests fail (confirming origin pile-up bug).
- [ ] Task: Fix the layout resolver.
  - [ ] Calculate bounds from scene graph positions, sizes, and z-order.
  - [ ] Use `(0,0,32,32)` only as a fallback when no position data exists.
  - [ ] Ensure deterministic output for the same scene graph.
  - [ ] Run layout tests and verify they pass.
- [ ] Task: Conductor — User Manual Verification 'Phase 2: Layout Resolver Fix and Tests' (Protocol in workflow.md)

## Phase 3: Visual Regression Verification

- [ ] Task: Create visual regression test fixtures.
  - [ ] Render a scene with one directional light and capture known-good output.
  - [ ] Render a scene with 3+ positioned props and capture known-good output.
  - [ ] Store fixtures with version metadata.
- [ ] Task: Implement pixel-diff comparison.
  - [ ] Compare renderer output against fixtures with tolerance ≤ 2%.
  - [ ] Report per-pixel and aggregate diff metrics.
  - [ ] Write tests that assert fixtures match.
- [ ] Task: Run full verification.
  - [ ] Run all unit tests (lighting, layout).
  - [ ] Run all visual regression tests.
  - [ ] Verify existing scene definitions render correctly.
- [ ] Task: Conductor — User Manual Verification 'Phase 3: Visual Regression Verification' (Protocol in workflow.md)
