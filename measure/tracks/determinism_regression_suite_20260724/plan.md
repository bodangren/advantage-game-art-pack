# Plan: Cross-Output Determinism Regression Suite

Start from the green baseline delivered by `test_suite_repair_20260724`. This
track does not admit production assets or re-freeze production digests; it pins
already-frozen example/fixture outputs and detects drift early. Follow
Contract-First TDD: failing tests before implementation.

## Phase 1: Contract-First Tests (Red)

- [ ] Add failing tests asserting that two consecutive clean-state runs of a
      representative frozen composition yield byte-identical SVG and JSON
      manifest bytes.
- [ ] Add failing tests asserting byte-identity for the packed atlas SVG, the
      bundle export tree (`bundle.json` + per-slot SVG + digests), and the
      render-API PNG bytes (palette-inlined, resvg `fitTo: "original"`).
- [ ] Add a failing doctor-style guard test that, given a frozen example whose
      recorded digest no longer matches its freshly computed digest, fails closed
      and names the offending output and drifted file.
- [ ] Add a failing mutation test that injects a deliberate non-determinism
      (unstable key order, timestamp, or random offset) and asserts the suite
      fails with a named, actionable diff.

## Phase 2: Determinism Harness

- [ ] Implement the determinism harness under `src/lib/` (e.g.
      `determinism.ts`) that runs a declared set of frozen example specs twice
      from a clean in-memory state and exposes byte comparisons per output kind.
- [ ] Implement canonical serialization ordering for object keys, layer
      priorities, frame order, and manifest field order so outputs are
      reproducible.
- [ ] Implement the doctor-style drift guard that records and re-checks frozen
      example digests and reports the offending output on mismatch.

## Phase 3: Pinned Examples and Entry Point

- [ ] Declare the pinned example set (compositions, atlas, directional sheet,
      bundle, temporal staging fixture) and record their frozen digests in a
      checked-in manifest consumed by the guard.
- [ ] Add a single-command entry point (`npm run test:determinism` or an opt-in
      vitest tag) so the suite is runnable in isolation and in CI.
- [ ] Document cross-platform cases where WASM rasterization or path separators
      could legitimately differ; pin those to the Linux build gate with a note
      rather than allowing silent variation.

## Phase 4: Verify and Document

- [ ] Run `npm test`, `npm run typecheck`, and `npm run build`; confirm green and
      that the determinism suite passes in isolation.
- [ ] Confirm the Phase 1 mutation test still fails on injected
      non-determinism and passes on the clean tree.
- [ ] Add a lessons-learned entry capturing the canonical-serialization pattern
      this suite enforces; run `measure/doctor.sh` to confirm structural checks
      pass.
