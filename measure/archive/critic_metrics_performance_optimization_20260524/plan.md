# Plan: Critic Metrics Performance Optimization

## Phase 1: Benchmark & Baseline (TDD)
- [ ] Write `test_critic_metrics_performance.py` with benchmark tests that time `_candidate_metrics` on small, medium, and large fixture images
- [ ] Add deterministic fixture images (64x64, 256x256, 512x512, 1024x1024) to `tests/fixtures/`
- [ ] Run benchmarks and record baseline timings per image size
- [ ] Commit benchmark test so future regressions are caught

## Phase 2: Single-Pass Pixel Aggregation (TDD)
- [ ] Write tests asserting that a unified pixel scan produces identical results to separate scans
- [ ] Refactor `_candidate_metrics` to perform ONE pass over pixel data, collecting:
  - quantized color counts
  - opaque pixel count
  - hue/value bucket counts
  - highlight pixel count
  - contact-shadow pixel count
- [ ] Remove redundant intermediate list constructions (`list(rgba.getdata())` called once, not per helper)
- [ ] Verify all existing candidate_loop tests pass

## Phase 3: Downsampling for Large Images (TDD)
- [ ] Write tests for downsampled metric equivalence (downsampled 512px image scores within 1% of full-size)
- [ ] Add `max_dimension` parameter to `_candidate_metrics` (default 256)
- [ ] Implement Lanczos/Box downsample when either image dimension exceeds threshold
- [ ] Verify frame_drift and edge_density still work correctly on downsampled images
- [ ] Ensure no score drift in existing test suite

## Phase 4: Caching by Image Hash (TDD)
- [ ] Write tests for LRU cache hit/miss behavior on repeated identical images
- [ ] Add `@functools.lru_cache` or dict-based cache keyed by `(image_hash, layout_type)`
- [ ] Ensure cache is bounded (max 128 entries) to prevent unbounded memory growth
- [ ] Verify cache does not leak across test cases

## Phase 5: Edge Density & Frame Drift Optimization (TDD)
- [ ] Write tests ensuring edge_density results match before/after optimization
- [ ] Replace `ImageFilter.FIND_EDGES` + Python pixel loop with numpy-based or PIL-native sum where available
- [ ] Optimize `_frame_drift` by reducing redundant crop/conversion operations
- [ ] Verify all compiler and candidate_loop tests pass

## Phase 6: Integration & Verification
- [ ] Re-run benchmark tests and confirm 75%+ speedup
- [ ] Run full test suite: `python3 -m unittest discover -s tests -v`
- [ ] Run critic adapter and policy tests to confirm no score drift
- [ ] Update tech-debt.md to mark critic metrics item resolved
- [ ] Update tracks.md and commit
