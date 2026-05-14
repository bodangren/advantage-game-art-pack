# Plan: Critic Metrics Performance Optimization

## Phase 1: Profile and Benchmark
- [ ] Write benchmark tests for `_candidate_metrics` with 7 demo reference PNGs
- [ ] Profile hot paths (cProfile / line_profiler)
- [ ] Identify biggest bottlenecks (likely per-pixel Python loops, full-res comparisons)

## Phase 2: Downsampling Optimization
- [ ] Write tests verifying downsampled metrics match full-res within tolerance
- [ ] Implement configurable downsample factor (e.g., 0.25x) for metric computation
- [ ] Use Pillow `resize` with LANCZOS for fast downsampling
- [ ] Verify score drift is <1% vs full resolution

## Phase 3: Caching and Memoization
- [ ] Write tests for metrics cache hit/miss behavior
- [ ] Cache reference asset metrics so they are computed once per calibration session
- [ ] Cache intermediate per-image results with LRU eviction
- [ ] Verify 7-reference family evaluation time meets <5s target

## Phase 4: Integration and Verification
- [ ] Run full test suite (`python3 -m pytest`)
- [ ] Run benchmark comparison before/after
- [ ] Update tech-debt.md to mark performance issue Resolved
- [ ] Update lessons-learned.md with optimization insights
- [ ] Commit and push
