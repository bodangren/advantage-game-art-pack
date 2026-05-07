# Implementation Plan: Critic Reference Calibration with Real Demo Assets

## Phase 1: Demo Asset Source Programs
- [ ] Task: Author source programs for all 10 families
  - [ ] Write test that asserts every family in canon.py has a matching `reference/demo_assets/{family}_source.json`
  - [ ] Create `reference/demo_assets/` directory
  - [ ] Write minimal but representative source JSON for each family (character_sheet, effect_sheet, tileset, scene, cover_surface, loading_surface, ui_sheet, directional_sheet, projectile, pickup)
  - [ ] Commit generated reference PNGs after manual visual confirmation

## Phase 2: Reference Asset Loader
- [ ] Task: Replace mock baselines with real reference loader
  - [ ] Write tests for `ReferenceAssetLoader` class resolving paths per family
  - [ ] Implement `ReferenceAssetLoader` that reads `reference/demo_assets/{family}_reference.png`
  - [ ] Update family adapters to accept injected reference image instead of procedural mock
  - [ ] Graceful fallback to procedural mock when reference asset is missing (backward compatible)

## Phase 3: Threshold Recalibration
- [ ] Task: Recalibrate auto-approval thresholds against real demo assets
  - [ ] Write test that runs critic on every demo asset and asserts auto-approval
  - [ ] Generate known-bad variants (wrong palette, wrong size) and assert rejection
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
