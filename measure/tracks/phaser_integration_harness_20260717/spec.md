# Spec: Phaser Integration Harness

## Goal

Prove the export contract against the real downstream consumer. Build a minimal
Phaser 4 harness that loads a bundle export — composition SVG textures plus the
atlas JSON and sheet — exactly the way the advantage-games series will, with
the loader configuration captured as a checked-in, versioned contract.

## Product Direction

`measure/tech-stack.md` defines Phaser 4 `this.load.svg` rasterization as the
deterministic integration contract and notes that a copied loader configuration
is that contract — but nothing consumer-side currently exercises it. The
harness closes the loop: exporting a per-game bundle and loading it through the
same code path a game uses validates composition SVG, atlas JSON (frame rects,
durations), and sheet digests end to end. Runtime SVG animation and palette
mutation remain deferred per the tech-stack; the harness pins the load-time
contract only.

## Functional Requirements

- A checked-in Phaser loader-config contract module (texture keys, atlas
  loading via `this.load.svg`) with an explicit contract version.
- A Node-side smoke test that exports the seeded bundle into a fixture
  directory and asserts the exact file tree and atlas JSON shape the harness
  consumes.
- A harness scene that loads the exported bundle: composition SVGs as textures
  and the knight walk-cycle sheet with its atlas JSON (frame rects, durations).
- A desk page linking the integration preview.
- The integration contract (texture keys, frame rects, durations, digest
  pinning) documented in the README or DESIGN docs.

## Non-Functional Requirements

- Phaser 4 is added as a dev-only dependency; production dependencies and the
  compiler modules ship unchanged.
- The smoke test is deterministic and runs under `npm test` without a browser
  or network.
- The export fixture used by the smoke test and the harness is frozen and
  reproducible from the checked-in bundle spec.
- No changes to the timeline, atlas, directional, or bundle compiler internals;
  the harness consumes exports at the boundary.

## Acceptance Criteria

- [ ] Loader-config contract module is checked in with a version and matches
  the documented Phaser load-time texture flow.
- [ ] Smoke test exports the seeded bundle and asserts the harness-consumed
  file tree and atlas JSON shape; runs green under `npm test`.
- [ ] Harness scene loads composition textures and the walk-cycle atlas using
  only the exported bundle artifacts.
- [ ] Frozen export fixture is byte-stable across repeated exports.
- [ ] Integration contract documented; desk links the harness preview.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out Of Scope

- Runtime SVG animation, sprite playback logic, or palette mutation at runtime.
- Shipping the harness as part of any game; it is an example consumer.
- Asset loading for scenes/parallax (follows the scene engine track).
- Changes to the advantage-games series itself.
