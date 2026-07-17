# Plan: SVG Part Library Expansion

## Phase 1: Contract-First Tests

- [x] Add failing validation tests for the planned archetype part fixtures
  (enemy, boss, NPC, prop, FX) covering metadata exact keys, anchors, and
  palette slots.
- [x] Add failing catalog tests asserting the new part ids, slot coverage, and
  tag-based selection by archetype and theme.
- [x] Add failing composition tests for the seeded enemy, boss, NPC, prop-set,
  and FX example specs with frozen digests.

## Phase 2: Character Archetype Parts

- [x] Author body, feature, clothing, and weapon parts for two enemy
  archetypes and validate them.
- [x] Author the boss archetype part set with declared anchors and palette
  slots.
- [x] Author the NPC/rescue archetype part set.
- [x] Add seeded enemy, boss, and NPC composition specs under `examples/` and
  register them in the bundle spec registry.

## Phase 3: Prop and FX Parts

- [x] Author prop parts (chest, gate, potion, herb) with placement anchors.
- [x] Author FX parts (projectile, aura) with palette slots.
- [x] Add seeded prop-set and FX composition specs and register them in the
  bundle spec registry.

## Phase 4: Catalog, Bundle, and Desk Wiring

- [x] Extend catalog tag selection so parts are queryable by archetype, slot,
  and theme.
- [x] Extend the seeded example bundle to reference the new archetype
  compositions.
- [x] Surface the new parts and compositions in the desk.

## Phase 5: Verification

- [x] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [x] Update product docs and lessons learned where the library contract
  changed.
