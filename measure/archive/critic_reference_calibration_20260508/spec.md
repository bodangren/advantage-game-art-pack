# Track: Critic Reference Calibration with Real Demo Assets

## Overview
Replace mocked style baselines in the critic stack with real reference demo assets for every supported family, enabling accurate auto-approval and drift monitoring.

## Goals
- Produce one canonical "golden" demo asset per family (character_sheet, prop_sheet, fx_sheet, tileset, background_scene, parallax_layer, ui_sheet, presentation_surface, directional_sheet, effect_sheet, projectile, pickup, interactable, book)
- Store demo assets under `reference/demo_assets/` with locked palettes and style packs
- Wire family adapters to load real reference PNGs instead of procedural mocks
- Recalibrate threshold packs so the auto-approval pass band matches human judgment on the demo set

## Acceptance Criteria
- [ ] Demo asset source programs exist for all 14 families in FAMILY_NAMES
- [ ] Each demo asset compiles to a reference PNG committed in `reference/demo_assets/`
- [ ] Family adapters load `reference/demo_assets/{family}_reference.png` when available
- [ ] Calibrated thresholds pass all demo assets through auto-approval and reject known-bad variants
- [ ] `asf candidate recalibrate --family all` uses real demo assets and updates threshold packs
- [ ] Drift monitor compares incoming candidates against real reference hashes, not synthetic baselines

## Non-Goals
- Automated reference asset regeneration on style change
- Per-game custom thresholds (handled in downstream per-game bundle track)
- Visual diff UI for manual threshold tuning
