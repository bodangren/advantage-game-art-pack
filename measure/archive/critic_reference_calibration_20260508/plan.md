# Implementation Plan: Critic Reference Calibration with Real Demo Assets

## Phase 1: Demo Asset Source Programs
- [x] Task: Author source programs for all 14 families
  - [x] Write test that asserts every family in canon.py has a matching `reference/demo_assets/{family}_source.json`
  - [x] Create `reference/demo_assets/` directory
  - [x] Write minimal but representative source JSON for each family (character_sheet, prop_sheet, fx_sheet, tileset, background_scene, parallax_layer, ui_sheet, presentation_surface, directional_sheet, effect_sheet, projectile, pickup, interactable, book)
  - [x] Compile each source program to produce reference PNG
  - [x] Verify all 14 reference PNGs render without error
  - [x] Commit generated reference PNGs

**Note:** 10 of 14 families produce real compiled PNGs (character_sheet, prop_sheet, fx_sheet, tileset, directional_sheet, effect_sheet, projectile, pickup, book, parallax_layer). 4 families use placeholders due to missing source.png files in primitives: background_scene (scene assembly requires complex layout resolution), ui_sheet (panel_frame_core has no source.png), presentation_surface (requires background_scene_manifest), interactable (derived from pickup).

## Phase 2: Reference Asset Loader
- [x] Task: Replace mock baselines with real reference loader
  - [x] Write tests for `ReferenceAssetLoader` class resolving paths per family
  - [x] Implement `ReferenceAssetLoader` that reads `reference/demo_assets/{family}_reference.png`
  - [ ] Update family adapters to accept injected reference image instead of procedural mock (pending - requires Phase 3 integration)
  - [ ] Graceful fallback to procedural mock when reference asset is missing (backward compatible) (pending - requires Phase 3 integration)

## Phase 3: Threshold Recalibration
- [ ] Task: Recalibrate auto-approval thresholds against real demo assets
  - [x] Write test infrastructure for threshold validation
  - [ ] Full critic evaluation too slow (22+ seconds per family due to metrics computation); needs optimization before full recalibration
  - [ ] Implement `recalibrate --family all` batch mode that iterates all families
  - [ ] Update threshold pack JSON files with new calibrated values
  - [ ] Add tolerance margin so minor renderer drift does not false-reject

## Phase 4: Drift Monitor Real-Reference Integration
- [ ] Task: Wire drift monitor to real reference hashes
  - [ ] Write tests for drift detection when reference hash changes
  - [ ] Compute perceptual hash (pHash) of each demo asset at calibration time
  - [ ] Store reference hashes in `reference/demo_assets/.hashes.json`
  - [ ] Update drift monitor to compare candidate hashes against `.hashes.json` instead of synthetic baseline
  - [ ] Alert when candidate hash diverges beyond configured threshold

## Phase 5: Validation and Documentation
- [ ] Task: Verify calibration accuracy and document process
  - [ ] Run full critic suite against demo assets; record pass rate
  - [ ] Ensure `asf candidate recalibrate --family all` completes without errors
  - [ ] Update `reference/README.md` with instructions for regenerating demo assets
  - [ ] Manual review: inspect auto-approved vs rejected samples to confirm alignment with human judgment
