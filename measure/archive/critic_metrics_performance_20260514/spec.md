# Spec: Critic Metrics Performance Optimization

## Problem
`_candidate_metrics` is very slow (1-4s per large image). Full critic evaluation on 7 demo reference assets takes 22+ seconds per family, making threshold recalibration tests impractical. This blocks the `critic_reference_calibration_20260508` track.

## Goal
Reduce critic metrics computation time by at least 75% (target: <5s per family for 7 references) through caching, downsampling, and algorithmic optimization.

## Acceptance Criteria
- [ ] `_candidate_metrics` runs in <1s per large image (down from 1-4s)
- [ ] Full 7-reference family evaluation runs in <5s total
- [ ] All existing critic tests still pass (same scores)
- [ ] Metrics are deterministic (no score drift)
- [ ] Tech-debt.md updated with resolution notes
