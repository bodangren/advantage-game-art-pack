# Plan: Animation Timelines and Atlas Packing

## Phase 1: Contract-First Tests

- [ ] Add failing tests for timeline spec parsing and validation (frame list,
  durations, part/anchor references, frame ids).
- [ ] Add failing tests for atlas metadata schema (frame rects, durations,
  sheet digest).
- [ ] Add failing determinism tests: identical timeline input yields identical
  frame SVGs and digests.

## Phase 2: Timeline Compiler

- [ ] Implement timeline spec types and strict validation under `src/lib/`.
- [ ] Implement frame expansion with per-frame overrides (part swaps, placement
  offsets, palette values) reusing the composition engine.
- [ ] Implement per-frame deterministic serialization and SHA-256 digest
  recording.

## Phase 3: Atlas Packer

- [ ] Implement stable row-major grid layout math ordered by frame id.
- [ ] Implement deterministic SVG sprite-sheet serialization.
- [ ] Implement atlas JSON metadata emission and a Phaser load-time contract
  fixture test.

## Phase 4: Desk Preview and Example

- [ ] Add a checked-in example timeline (minimum 4 frames) with expected
  digests.
- [ ] Add desk preview of the frame sequence and its atlas.
- [ ] Document the timeline and atlas JSON contracts in README or DESIGN docs.

## Phase 5: Verification

- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Update the animation/atlas tech-debt entry to reflect delivery.
