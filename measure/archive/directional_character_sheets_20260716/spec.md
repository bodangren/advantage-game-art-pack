# Spec: Directional Character Sheets

## Goal

Compose multi-frame directional character sheets (4- and 8-direction idle/walk)
from SVG parts via the timeline and atlas pipeline. Restores parity with the
retired Python capability and serves the top downstream consumer need in
product.md.

## Product Direction

A directional spec (strict JSON) maps a direction set (4-way or 8-way enum) to
per-direction frame sequences, using anchor-driven part swaps and declared flip
transforms per direction. Expansion produces one timeline per direction, each
compiled and packed by the animation/atlas pipeline. Output is one atlas per
direction plus a sheet manifest with digests. Everything is deterministic.

## Acceptance Criteria

- [ ] Directional spec schema with strict validation: fixed direction enum,
  consistent frame counts across directions, declared flips only.
- [ ] Expansion to per-direction timelines is deterministic; identical input
  yields byte-identical sheets and matching digests.
- [ ] Checked-in example: a knight-style character (reusing body, shirt, hair,
  weapon parts) with walk and idle in 4 directions, exported as atlases plus a
  sheet manifest JSON.
- [ ] Desk preview with a direction selector and frame playback.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out Of Scope

- Auto-generated in-between frames or interpolation.
- Mirroring inference beyond explicitly declared flip rules.
- Raster export.
- Runtime animation systems.
