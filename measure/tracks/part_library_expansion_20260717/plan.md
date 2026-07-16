# Plan: SVG Part Library Expansion

## Phase 1: Contract-First Tests

- [ ] Add failing validation tests for the planned archetype part fixtures
  (enemy, boss, NPC, prop, FX) covering metadata exact keys, anchors, and
  palette slots.
- [ ] Add failing catalog tests asserting the new part ids, slot coverage, and
  tag-based selection by archetype and theme.
- [ ] Add failing composition tests for the seeded enemy, boss, NPC, prop-set,
  and FX example specs with frozen digests.

## Phase 2: Character Archetype Parts

- [ ] Author body, feature, clothing, and weapon parts for two enemy
  archetypes and validate them.
- [ ] Author the boss archetype part set with declared anchors and palette
  slots.
- [ ] Author the NPC/rescue archetype part set.
- [ ] Add seeded enemy, boss, and NPC composition specs under `examples/` and
  register them in the bundle spec registry.

## Phase 3: Prop and FX Parts

- [ ] Author prop parts (chest, gate, potion, herb) with placement anchors.
- [ ] Author FX parts (projectile, aura) with palette slots.
- [ ] Add seeded prop-set and FX composition specs and register them in the
  bundle spec registry.

## Phase 4: Catalog, Bundle, and Desk Wiring

- [ ] Extend catalog tag selection so parts are queryable by archetype, slot,
  and theme.
- [ ] Extend the seeded example bundle to reference the new archetype
  compositions.
- [ ] Surface the new parts and compositions in the desk.

## Phase 5: Verification

- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Update product docs and lessons learned where the library contract
  changed.
