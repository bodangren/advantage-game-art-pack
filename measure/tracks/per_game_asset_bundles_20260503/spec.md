# Spec: Per-Game Asset Bundle System

## Problem

The product vision states "this product should therefore be planned around per-game asset bundles, not only individual sprite outputs." The downstream advantage-games series needs coordinated packs of characters, enemies, props, FX, tiles, scenes, parallax layers, UI atlases, and loading surfaces — but there is no packaging system that groups these into game-ready bundles.

## Goals

- Define a bundle manifest schema that references all asset types needed for a single game
- Validate bundle completeness against a checklist (characters, enemies, tiles, scenes, UI)
- Export bundles as directory trees with metadata suitable for engine import
- Support incremental bundle building (add assets as they become available)

## Non-Goals

- Runtime engine integration (consumers handle their own import)
- Asset versioning across bundles (single bundle snapshot)
- Automatic game-specific style pack selection

## Acceptance Criteria

- [ ] Bundle manifest JSON schema defined and validated
- [ ] `asf bundle create --name "library_dungeon" --style chibi` scaffolds a bundle directory
- [ ] `asf bundle validate --name "library_dungeon"` reports missing asset categories
- [ ] `asf bundle export --name "library_dungeon"` produces engine-ready directory tree
- [ ] Bundle includes metadata.json with asset count, style pack reference, and generation timestamp
- [ ] Unit tests cover manifest creation, validation, and export
