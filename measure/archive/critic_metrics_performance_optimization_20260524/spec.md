# Spec: Critic Metrics Performance Optimization

## Goal
Reduce `_candidate_metrics` computation time by at least 75% so full critic evaluation on 7 demo reference assets per family runs in under 5 seconds total. This unblocks the reference calibration pipeline and makes the auto-approval critic loop practical for batch generation.

## Background
`_candidate_metrics` currently takes 1-4 seconds per large image. A full family evaluation with 7 references takes 22+ seconds. The function performs multiple independent Python-level pixel iterations over the same image data (dominant_colors, hue_distribution, value_distribution, contact_shadow_area, highlight_density), plus PIL filter operations (edge_density, frame_drift). Large images such as `scene_full_frame` and `background_scene` are especially affected.

## Acceptance Criteria
- [ ] `_candidate_metrics` runs in <1s per large image (down from 1-4s)
- [ ] Full 7-reference family evaluation runs in <5s total
- [ ] All existing critic and candidate_loop tests still pass with identical scores
- [ ] Metrics remain deterministic (no floating-point score drift across runs)
- [ ] Tech-debt.md updated with resolution notes

## Out of Scope
- Changing critic scoring algorithms or threshold logic
- Replacing the entire critic adapter/policy stack
- Parallel/multi-threaded evaluation (single-threaded optimization only)
