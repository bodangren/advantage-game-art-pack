# Plan: Mockup-Driven Part Art Pass

## Phase 1: Reference Mockups

- [ ] Generate and curate mmx mockups for the five character archetypes;
  check into `demo-assets/reference/` with a prompt/archetype manifest.
- [ ] Generate and curate mmx mockups for the prop and FX sets; extend the
  manifest.

## Phase 2: Shading Convention

- [ ] Add failing ramp-convention tests: character palettes carry
  light/base/shadow ramps and every declared ramp slot is used by parts.
- [ ] Document the flat-shape shading vocabulary (ramps, banding, dither,
  ground shadow; no blur/filters) in DESIGN.md and the README contract.

## Phase 3: Art Pass

- [ ] Rework the knight set (body, shirt, hair, sword) toward its mockup;
  browser-verify via the render API.
- [ ] Rework the goblin set toward its mockup; browser-verify.
- [ ] Rework the spectre set toward its mockup; browser-verify.
- [ ] Rework the dragon set toward its mockup; browser-verify.
- [ ] Rework the prisoner set toward its mockup; browser-verify.
- [ ] Rework the prop set (chest, gate, potion, herb) with ramps and
  shading; browser-verify.
- [ ] Rework the FX set (projectile, aura) with banded glow shapes;
  browser-verify.

## Phase 4: Fixtures and Verification

- [ ] Update example palettes with ramps and re-freeze all fixtures.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`; update
  lessons learned.
