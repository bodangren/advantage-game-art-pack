# Track: UI Sheet Bin Packing Optimization

## Problem Statement

The UI sheet layout (in `assemble_ui_sheet` in `presentation_surfaces.py`) uses a naive left-to-right row-wrap algorithm that places icons sequentially and wraps to the next row when reaching the canvas edge. This wastes canvas space when icons have varying sizes.

## Spec

Implement a best-fit bin-packing algorithm for UI sheet layout:

1. **Algorithm**: Use best-fit decreasing (BFD) bin packing:
   - Sort tiles by area (width × height) descending
   - For each tile, find the best-fit position among existing rows or start a new row
   - "Best fit" = smallest remaining width in a row that can accommodate the tile

2. **Data structure**: Maintain row state as (row_y, row_height, row_used_width, remaining_width)

3. **Constraints**:
   - Maintain 2px spacing between tiles
   - New row starts when tile doesn't fit in any existing row
   - Canvas overflow should raise `SurfaceAssemblyError` (existing behavior)

4. **Interface**: `assemble_ui_sheet` accepts same `UISheetProgram` and produces same `SurfaceAssemblyResult`

5. **Tests**: Add tests for varying-size tiles, verify no overflow when canvas is sufficient, verify overflow error when canvas is too small

## Dependencies

- `src/asf/presentation_surfaces.py` — `assemble_ui_sheet`
- `tests/test_presentation_surfaces.py` — existing UI sheet tests

## Deliverables

- `_bin_pack_layout(tiles, canvas_w, canvas_h)` function
- Updated `assemble_ui_sheet` using bin packing
- Unit tests for bin packing logic
- All existing tests continue to pass
