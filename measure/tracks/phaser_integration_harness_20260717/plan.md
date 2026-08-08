# Plan: Phaser Integration Harness

This is a downstream mixed-pack harness. It does not discover or retrieve MCP
artifacts and does not claim Forge atlas or complete-pack outputs exist.

All implementation tasks are dependency-deferred until accepted mixed-pack and
Forge atlas inputs exist; `[b]` records that state without claiming completion.

## Phase 1: Contract-First Tests

- [b] Add failing tests that export the seeded bundle into a fixture directory
      and assert the exact file tree the harness consumes.
- [b] Add failing tests for the atlas-JSON-to-Phaser frame mapping (texture
      keys, frame rects, durations).
- [b] Add failing tests for the loader-config contract module shape and
      contract version.

## Phase 2: Loader Contract

- [b] Implement the checked-in Phaser loader-config contract module using
      `this.load.svg` for Pixel SVG textures and `this.load.atlas` for atlas JSON
      and sheets.
- [b] Document the integration contract (texture keys, frame rects, durations,
      digest pinning) in the README or DESIGN docs.

## Phase 3: Harness Scene

- [b] Add the harness scene loading the exported bundle (composition textures
      plus the knight walk-cycle atlas) with Phaser 4 as a dev-only dependency.
- [b] Add a desk page linking the integration preview.

## Phase 4: Smoke Test and Fixture

- [b] Wire the Node smoke test to export-then-assert against the harness
      contract.
- [b] Freeze the deterministic export fixture shared by the smoke test and the
      harness.

## Phase 5: Verification

- [b] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [b] Record the runtime-animation deferral and any harness limitations in
      `tech-debt.md`.
