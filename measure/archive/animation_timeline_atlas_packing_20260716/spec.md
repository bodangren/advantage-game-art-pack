# Spec: Animation Timelines and Atlas Packing

## Goal

Extend the SVG composition engine with deterministic animation timelines and
sprite-sheet atlas packing. Clears the deferred Medium tech-debt item; animation
and packing were first-phase non-goals and are now scheduled.

## Product Direction

A timeline spec (strict JSON) declares an ordered frame list. Each frame reuses
a composition spec with optional per-frame overrides (part swaps, placement
offsets, palette values). Frames compile through the existing composition engine
into deterministic per-frame SVG. The atlas packer lays frames out in a stable
row-major grid ordered by frame id and emits one SVG sprite sheet plus JSON
metadata (frame rects, durations, sheet digest).

## Acceptance Criteria

- [ ] Timeline spec schema with strict validation: non-empty frame list, known
  part/anchor references only, positive frame durations, stable frame ids.
- [ ] Frame compiler produces byte-identical SVG for identical input; each frame
  records a SHA-256 digest in the timeline metadata.
- [ ] Atlas packer emits a deterministic SVG sheet with documented grid math and
  an atlas JSON contract (frame rects, durations, sheet digest).
- [ ] Atlas JSON is consumable by the Phaser load-time texture flow, covered by
  a fixture test documenting the contract.
- [ ] The desk previews a frame sequence and its atlas for a checked-in example.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out Of Scope

- Raster PNG export or anti-aliased rasterization.
- Tweening, easing, or interpolation engines.
- Runtime skeletal or bone-based animation.
- LLM authoring of timelines.
