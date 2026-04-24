# Spec: Renderer Palette Refinement

## Overview

The candidate generation loop exists, but the current renderer trips the palette-limit structural check and usually regenerates instead of selecting a survivor. This track implements renderer-side palette refinement so generated candidates can pass the existing quality thresholds.

## Functional Requirements

1. Analyze why the palette-limit structural check fails on rendered output
2. Implement palette quantization or color reduction in the renderer pipeline
3. Ensure rendered sprites stay within the style pack's palette constraints
4. Make the candidate loop select survivors instead of always regenerating
5. Add tests verifying palette compliance for rendered output

## Non-Functional Requirements

- Palette refinement must be deterministic (same input → same output)
- Must not increase render time by more than 20%
- Must preserve visual quality (no visible banding or artifacts)

## Acceptance Criteria

- [ ] Renderer output passes palette-limit structural check on first render
- [ ] Candidate loop selects survivors at least 50% of the time
- [ ] Palette compliance test verifies color count ≤ style pack limit
- [ ] Existing renderer tests pass unchanged
- [ ] Render time increase < 20% for standard 64x64 sprites

## Out of Style Pack

- Style pack palette definition changes
- New entity archetype renderers
- Visual quality subjective assessment
