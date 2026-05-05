# Implementation Plan: Multi-Layout Pose Sheet Expansion

## Phase 1: Layout Schema & Types
- [ ] Task: Extend layout type system
  - [ ] Write tests for layout validation
  - [ ] Add rows, columns, and row_labels to layout spec
  - [ ] Validate row_labels length matches rows

## Phase 2: Compiler Support
- [ ] Task: Update compiler for arbitrary grids
  - [ ] Write tests for 3x2, 3x4, and custom grid rendering
  - [ ] Modify canvas allocation to use rows×cols
  - [ ] Map row_labels to animation state metadata
- [ ] Task: Register new layouts in canon.py
  - [ ] Add FAMILY_NAME entries for multi-layout sheets
  - [ ] Update style pack defaults

## Phase 3: Downstream Verification
- [ ] Task: Verify with real game assets
  - [ ] Compile dragon_3x4_pose_sheet from spec
  - [ ] Compile castles_3x2_sheet from spec
  - [ ] Manual visual inspection of output PNGs
