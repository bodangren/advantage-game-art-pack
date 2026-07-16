# Plan: Phaser Integration Harness

## Phase 1: Contract-First Tests

- [ ] Add failing tests that export the seeded bundle into a fixture directory
  and assert the exact file tree the harness consumes.
- [ ] Add failing tests for the atlas-JSON-to-Phaser frame mapping (texture
  keys, frame rects, durations).
- [ ] Add failing tests for the loader-config contract module shape and
  contract version.

## Phase 2: Loader Contract

- [ ] Implement the checked-in Phaser loader-config contract module
  (`this.load.svg` keys and atlas loading).
- [ ] Document the integration contract (texture keys, frame rects, durations,
  digest pinning) in the README or DESIGN docs.

## Phase 3: Harness Scene

- [ ] Add the harness scene loading the exported bundle (composition textures
  plus the knight walk-cycle atlas) with Phaser 4 as a dev-only dependency.
- [ ] Add a desk page linking the integration preview.

## Phase 4: Smoke Test and Fixture

- [ ] Wire the Node smoke test to export-then-assert against the harness
  contract.
- [ ] Freeze the deterministic export fixture shared by the smoke test and the
  harness.

## Phase 5: Verification

- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Record the runtime-animation deferral and any harness limitations in
  `tech-debt.md`.
