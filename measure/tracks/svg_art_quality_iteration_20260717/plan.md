# Plan: SVG Part Art Quality Iteration

## Phase 1: Iteration Loop

- [ ] Write `measure/review-scratch.mts` (Node `--experimental-strip-types`):
  reads parts from `src/assets/svg-parts/**`, composes the seven example
  specs, inlines palettes, regenerates `measure/review.html`; `--png <dir>`
  rasterizes per-row PNGs via resvg-wasm for headless review.
- [ ] Verify the scratch reproduces the current page byte-structure and
  renders match the checked-in page.

## Phase 2: Knight Armor Set

- [ ] Add `armor-plate` (shirt), `helmet-knight` (hair), `cape-red`
  (feature), `sword-long` (weapon) parts toward `knight-mockup_001.jpg`.
- [ ] Repoint `examples/svg_character.json` to the new parts with a steel
  palette; keep villager parts untouched for the animation fixtures.
- [ ] Register the four parts in `src/lib/catalog.ts`; update catalog and
  archetype part-count tests.
- [ ] Iterate via scratch PNG until the knight row tracks its reference.

## Phase 3: Archetype Art Passes (parallel)

- [ ] Goblin set (body, rags, ears, club) toward `goblin-mockup_001.jpg`.
- [ ] Spectre set (body, shroud, eyes, orb) toward `spectre-mockup_001.jpg`.
- [ ] Dragon set (body, wings, plate, breath) toward `dragon-mockup_001.jpg`.
- [ ] Prisoner set (body, tatters, hair, shackles) toward
  `prisoner-mockup_002.jpg`.
- [ ] Prop set (chest, gate, potion, herb) toward their mockups.
- [ ] FX set (projectile, aura) toward their mockups.

## Phase 4: Integration and Verification

- [ ] Re-freeze `examples/composition-digests.json` from real compiler
  output; regenerate `measure/review.html`.
- [ ] Browser-verify all seven rows against references via kimi-webbridge
  screenshots; fix stragglers.
- [ ] Run `npm run typecheck`, `npm test`, `npm run build`; update lessons
  learned.
