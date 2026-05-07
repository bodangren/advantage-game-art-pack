# Implementation Plan: Multi-Layout Pose Sheet Expansion

## Phase 1: Layout Schema & Types
- [x] Task: Extend layout type system
  - [x] Write tests for layout validation
  - [x] Add rows, columns, and row_labels to layout spec
  - [x] Validate row_labels length matches rows

## Phase 2: Compiler Support
- [x] Task: Update compiler for arbitrary grids
  - [x] Write tests for 3x2, 3x4, and custom grid rendering
  - [x] Modify canvas allocation to use rows×cols
  - [x] Map row_labels to animation state metadata
- [x] Task: Register new layouts in canon.py
  - [x] Add FAMILY_NAME entries for multi-layout sheets
  - [x] Update style pack defaults

## Phase 3: Downstream Verification
- [ ] Task: Verify with real game assets
  - [ ] Compile dragon_3x4_pose_sheet from spec
  - [ ] Compile castles_3x2_sheet from spec
  - [ ] Manual visual inspection of output PNGs
