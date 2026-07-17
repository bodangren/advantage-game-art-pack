# Spec: SVG Part Library Expansion

## Goal

Grow the checked-in SVG part library beyond the single knight set into a
multi-archetype library covering the advantage-games demand audit: enemy, boss,
and NPC/rescue archetypes plus prop and FX parts. Every downstream engine
already shipped (timelines, directional sheets, bundles) composes parts, so the
library is the foundation for all remaining asset families.

## Product Direction

The demand audit (`measure/game-asset-demand.md`) shows the series needs more
than one player archetype: companion units, rescue targets, bosses, species
variants, props, pickups, and FX. New parts stay small, text-authored SVG with
full metadata (anchors, palette slots, layer priority, tags) so they remain
LLM-selectable through the catalog JSON. Seeded compositions prove each
archetype compiles deterministically and register in the bundle spec registry
so bundles can reference them immediately.

## Functional Requirements

- Body, feature, clothing, and weapon/trinket part sets for two enemy
  archetypes, one boss archetype, and one NPC/rescue archetype.
- Standalone prop parts (chest, gate, potion, herb) with placement anchors and
  FX parts (projectile, aura) with palette slots.
- Every part passes the safe SVG dialect validation and carries complete,
  exact-key metadata.
- Catalog tag selection extended so parts are queryable by archetype, slot,
  and theme for LLM prompt context.
- Seeded example compositions for each new archetype and for prop/FX sets,
  checked in under `examples/` and registered in the bundle spec registry.
- The seeded example bundle references the new archetype compositions.

## Non-Functional Requirements

- Deterministic composition and serialization; frozen digests for every seeded
  example.
- No new runtime dependencies.
- All parts respect the existing numeric bounds and the banned-feature rules of
  the safe SVG dialect.
- Catalog output remains stable, sorted JSON suitable for LLM context.

## Acceptance Criteria

- [ ] All new parts validate against the safe SVG dialect and appear in the
  catalog JSON with slots, anchors, palette slots, layer priorities, and tags.
- [ ] Tag-based catalog queries select parts by archetype, slot, and theme.
- [ ] Seeded enemy, boss, NPC, prop-set, and FX compositions compile to
  deterministic SVG with recorded SHA-256 digests.
- [ ] The new compositions are registered in the bundle spec registry and the
  example bundle resolves them without validation errors.
- [ ] The desk lists the new parts and previews the new compositions.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out Of Scope

- New compiler engine features (scene grids, parallax layers).
- LLM authoring of parts; this track hand-authors the library the LLM track
  will later extend.
- Runtime Phaser integration.
- Migrating or importing the retired Python/raster PNG primitives.
