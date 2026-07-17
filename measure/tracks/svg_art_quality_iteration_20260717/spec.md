# Spec: SVG Part Art Quality Iteration

## Goal

Raise the shipped part library from "technically shaded" to genuinely decent
pixel art. The review page (`measure/review.html`) compares every shipped
composition against its mmx reference mockup; today all seven rows read as
flat, misproportioned placeholders. Iterate each archetype's parts until the
compositions track their references' silhouettes, proportions, and shading,
staying inside the safe flat-shape SVG dialect.

## Product Direction

The 2026-07-17 mockup art pass established the ramp/shading vocabulary but
left the art itself weak: the knight reads as a villager in a dress (the
armor rebuild was deferred), the dragon is an abstract polygon pile, the
goblin's signature huge ears are tiny horns, the aura reads as a UI reticle,
and the shackles read as soap bubbles. The references in
`demo-assets/reference/` prove the target look is achievable with flat
banded shapes. Quality bar: each row must be recognizable as its reference
subject at 64px without squinting — correct silhouette first, then interior
shading.

## Functional Requirements

- Checked-in review-page scratch (`measure/review-scratch.mts`) that
  regenerates `measure/review.html` from disk parts + example specs and can
  rasterize per-row PNGs for headless iteration.
- Knight set rebuilt as plate armor (new `armor-plate`, `helmet-knight`,
  `cape-red`, `sword-long` parts); `examples/svg_character.json` repointed to
  them. The villager base parts (`body-base`, `shirt-tunic`, `hair-short`,
  `sword-basic`) stay untouched — walk-cycle and directional animation
  fixtures keep their character.
- Goblin, spectre, dragon, and prisoner archetype part sets reworked in
  place toward their mockups (silhouette, face, signature features, held
  items).
- Prop set (chest, gate, potion, herb) and FX set (projectile, aura)
  reworked in place toward their mockups.
- Every reworked composition browser/raster-verified against its reference
  row on the regenerated review page.
- Re-freeze `examples/composition-digests.json`; update catalog/archetype
  tests for the new knight parts.

## Non-Functional Requirements

- Parts stay validator-clean: flat shapes only, `var(--slot)` fills matching
  declared palette slots, viewBox matching metadata, no `<style>`/`data-*`.
- Anchor names stay stable on reworked parts (`root`/`head`/`torso`/`hand`)
  so existing compositions and attachments keep resolving.
- Deterministic output; digests re-frozen from real compiler output.
- Suite stays green, including the post-Green sentinel, typecheck, build.

## Acceptance Criteria

- [ ] Review scratch regenerates the page and per-row PNGs.
- [ ] All seven review rows read as their reference subject at 64px,
  verified via browser screenshots of the regenerated page.
- [ ] New knight parts cataloged; svg_character.json repointed; catalog and
  archetype test counts updated.
- [ ] Digests re-frozen; `npm test`, `npm run typecheck`, `npm run build`
  green.
