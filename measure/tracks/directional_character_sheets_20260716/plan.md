# Plan: Directional Character Sheets

## Phase 1: Contract-First Tests

- [x] Add failing tests for directional spec parsing and validation (direction
  enum, frame-count consistency, declared flips).
- [x] Add failing tests for sheet manifest schema (directions, frames, rects,
  digests).
- [x] Add failing determinism tests for expansion and sheet output.

## Phase 2: Direction Expansion

- [x] Implement direction enum and per-direction anchor/flip override mapping.
- [x] Implement expansion of a directional spec into per-direction timeline
  specs.
- [x] Implement validation that expanded timelines reference only known parts
  and anchors.

## Phase 3: Sheet Assembly and Manifest

- [x] Implement per-direction atlas generation via the atlas packer.
- [x] Implement sheet manifest emission (directions, frames, rects, digests).
- [~] Add fixture tests pinning the sheet manifest contract for downstream
  Phaser loading.

## Phase 4: Example and Desk Preview

- [ ] Author the checked-in knight-style 4-direction walk+idle example.
- [ ] Add desk preview with direction selector and frame playback.
- [ ] Document the directional spec and sheet manifest contracts.

## Phase 5: Verification

- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Update product docs to note directional sheet capability.
