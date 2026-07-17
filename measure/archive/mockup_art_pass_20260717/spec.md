# Spec: Mockup-Driven Part Art Pass

## Goal

Raise the shipped part library from flat single-tone primitives to cohesive
pixel-art characters by iterating against mmx-generated reference mockups,
using a palette-ramp shading vocabulary that stays inside the safe flat-shape
SVG dialect. The target look is 16-bit pixel art for game export — not
soft-shaded vector art.

## Product Direction

The head-idiom fix made characters structurally coherent; the art itself is
still flat and generic. mmx produces strong pixel-art mockups (see
`demo-assets/reference/goblin-mockup_*.jpg`) whose style is built entirely
from flat banded shapes — 3-tone ramps, highlights, form shadows — which the
existing dialect can already express. The render API makes iteration a fast
spec → image loop. Pixel-art shading means ramps, banding, and dither; blur,
filters, and CSS gradients are deliberately excluded (they fight the medium
and the deterministic validator).

## Functional Requirements

- Reference mockups for every shipped archetype (base humanoid/knight,
  goblin, spectre, dragon, prisoner) plus the prop and FX sets, generated
  with mmx and checked into `demo-assets/reference/` with a manifest mapping
  each file to its archetype and prompt.
- Palette ramp convention: character materials carry light/base/shadow
  slots (e.g. `skin`, `skin-light`, `skin-shadow`); composition palettes
  provide every ramp tone their parts declare.
- Shading vocabulary, all flat shapes: highlight shapes, form shadows,
  under-chin/under-arm shadows, and a ground-shadow ellipse under
  characters; dither texture via small rects. Documented in DESIGN/README.
- Rework the knight set and the four archetype sets toward their mockups
  fairly closely (silhouette, face, clothing, held items), plus the prop
  and FX sets.
- Iterate each composition through the render API and desk until it
  visually tracks its mockup's structure; final state browser-verified.
- Re-freeze every affected fixture (example digests, walk-cycle, knight
  manifest).

## Non-Functional Requirements

- Parts stay validator-clean with exact-key metadata; no dialect changes.
- Deterministic output; fixtures re-frozen from real compiler output.
- Suite stays green, including the post-Green phase-1 sentinel.

## Acceptance Criteria

- [ ] Reference mockups and manifest checked in for all shipped archetypes.
- [ ] Character palettes carry light/base/shadow ramps and parts use them.
- [ ] Shading shapes (highlights, form shadows, ground shadow) present in
  the shipped compositions.
- [ ] Each archetype composition visibly tracks its mockup in browser
  review.
- [ ] All fixtures re-frozen; `npm run typecheck`, `npm test`, and
  `npm run build` pass.

## Out Of Scope

- Dialect extensions (gradients, filters, patterns).
- New archetypes or new slots.
- Timeline/directional engine changes (frames inherit part art).
- Scene, tile, and parallax work.
