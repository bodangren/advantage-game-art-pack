# Plan: UI Sheet Bin Packing Optimization

## Tasks

- [ ] 1. Implement `_bin_pack_layout` function in `presentation_surfaces.py`
  - [ ] 1.1 Define function signature: `_bin_pack_layout(tiles: list[TileSourceRef], canvas_w: int, canvas_h: int) -> list[tuple[int, int, int, int]]`
  - [ ] 1.2 Implement best-fit decreasing algorithm
  - [ ] 1.3 Return list of (x, y, w, h) placements
  - [ ] 1.4 Raise `SurfaceAssemblyError` on overflow

- [ ] 2. Update `assemble_ui_sheet` to use `_bin_pack_layout`
  - [ ] 2.1 Import `_bin_pack_layout`
  - [ ] 2.2 Call `_bin_pack_layout` instead of inline row-wrap logic
  - [ ] 2.3 Map placements back to tile images

- [ ] 3. Add unit tests
  - [ ] 3.1 `test_bin_pack_varying_sizes` — verify tiles pack efficiently
  - [ ] 3.2 `test_bin_pack_overflow_error` — verify error when canvas too small
  - [ ] 3.3 `test_bin_pack_maintains_spacing` — verify 2px spacing between tiles
  - [ ] 3.4 `test_bin_pack_empty_tiles` — verify edge case with no tiles

- [ ] 4. Run all tests and verify build
  - [ ] 4.1 `python -m pytest tests/test_presentation_surfaces.py -v`
  - [ ] 4.2 Verify all tests pass

- [ ] 5. Functional verification via browser-harness
  - [ ] 5.1 Start dev server
  - [ ] 5.2 Navigate to app
  - [ ] 5.3 Check for console errors
  - [ ] 5.4 Take screenshot and verify
  - [ ] 5.5 Stop dev server

- [ ] 6. Finalize
  - [ ] 6.1 Commit checkpoint
  - [ ] 6.2 Update memory files
  - [ ] 6.3 Push
