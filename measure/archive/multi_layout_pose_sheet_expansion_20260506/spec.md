# Track: Multi-Layout Pose Sheet Expansion (3×2, 3×4, Custom Grids)

## Overview
Expand the compiler to support arbitrary row/column layouts beyond pose_sheet_3x3 and strip_3x1 for downstream advantage-games assets.

## Goals
- Add 3×2, 3×4, and custom grid layouts
- Support stateful row semantics (attack, defeat, correct/incorrect)
- Update LAYOUT_TYPES and compiler pipeline

## Acceptance Criteria
- [ ] dragon_3x4_pose_sheet, castles_3x2_sheet, rune_base_3x2_pose_sheet compile correctly
- [ ] Custom row/column counts configurable in spec
- [ ] Stateful row labels map to animation frames
- [ ] All new layouts covered by unit tests
- [ ] Existing 3x3 and strip_3x1 layouts still pass

## Non-Goals
- Non-rectangular layouts
- Animated GIF or sprite atlas output
