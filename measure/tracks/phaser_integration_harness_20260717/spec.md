# Spec: Phaser Integration Harness

## Goal

Prove the export contract against the real downstream consumer. Build a minimal
Phaser 4 harness that loads a bundle export — composition SVG textures plus the
atlas JSON and sheet — exactly the way the advantage-games series will, with
the loader configuration captured as a checked-in, versioned contract.

## Product Direction

`measure/tech-stack.md` defines the loader boundary: Pixel SVG textures use
`this.load.svg`, raster images use `this.load.image`, spritesheets use
`this.load.spritesheet`, and atlas JSON/sheets use `this.load.atlas`. The
checked-in loader configuration in this track is the versioned deterministic
contract. The harness closes the loop by exporting a per-game bundle and
loading it through the same code path a game uses. Runtime SVG animation and
palette mutation remain deferred; the harness pins the load-time contract only.

## Functional Requirements

The harness is a downstream mixed-pack consumer, not the Fantasy Asset Forge
MCP owner. Current fixtures may exercise Pixel-native exports and must not be
described as Forge animation or complete-pack outputs. Future Forge artifacts
enter only after public-MCP version negotiation, digest validation, immutable
provenance, delivery-resolution review, and admission under
`forge-asset-interchange-manifest/v1` and `education-app-pack-profile/v1`.

- A checked-in Phaser loader-config contract module with explicit version,
  `this.load.svg` for Pixel SVG textures, and `this.load.atlas` for atlas JSON
  and sheets.
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

- [b] Loader-config contract module is checked in with a version and matches
      the documented Phaser load-time texture flow.
- [b] Smoke test exports the seeded bundle and asserts the harness-consumed
      file tree and atlas JSON shape; runs green under `npm test`.
- [b] Harness scene loads composition textures and the walk-cycle atlas using
      only the exported bundle artifacts.
- [b] Frozen export fixture is byte-stable across repeated exports.
- [b] Integration contract documented; desk links the harness preview.
- [b] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out Of Scope

- Runtime SVG animation, sprite playback logic, or palette mutation at runtime.
- Shipping the harness as part of any game; it is an example consumer.
- Asset loading for scenes/parallax (follows the scene engine track).
- Changes to the advantage-games series itself.
