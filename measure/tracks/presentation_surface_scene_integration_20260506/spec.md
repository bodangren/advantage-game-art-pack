# Track: Presentation Surface-to-Scene Assembler Integration

## Overview
Align cover and loading surface backgrounds with real scene assembler output instead of hardcoded paths.

## Goals
- Replace hardcoded `outputs/{scene_program_name}/base.png` with actual scene render
- Wire derived gameplay still capture for covers
- End-to-end cover/loading generation for every game bundle

## Acceptance Criteria
- [ ] Presentation surfaces accept explicit resolved scene image path
- [ ] Scene assembler output correctly feeds into cover/loading generation
- [ ] Gameplay still capture derived from actual rendered frames
- [ ] All presentation surface tests pass with new path resolution
- [ ] Manual verification of generated covers

## Non-Goals
- Changing scene assembler core logic
- New rendering effects
