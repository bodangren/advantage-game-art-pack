# Implementation Plan: Presentation Surface-to-Scene Integration

## Phase 1: Path Resolution
- [ ] Task: Refactor background resolution
  - [ ] Write tests for explicit path passing
  - [ ] Update cover/loading compilers to accept scene image path parameter
  - [ ] Remove hardcoded `outputs/{name}/base.png` convention

## Phase 2: Scene Assembler Wiring
- [ ] Task: Connect assembler output to presentation pipeline
  - [ ] Write tests for end-to-end flow
  - [ ] Pass actual scene render path from assembler to cover generator
  - [ ] Handle missing scene gracefully (fallback to placeholder)

## Phase 3: Gameplay Still Capture
- [ ] Task: Add still capture from gameplay frames
  - [ ] Write tests for frame extraction
  - [ ] Capture representative frame from rendered animation
  - [ ] Use as loading screen background

## Phase 4: Verification
- [ ] Task: End-to-end bundle test
  - [ ] Generate complete asset bundle for one game
  - [ ] Verify cover and loading images use correct scene backgrounds
  - [ ] Manual visual inspection
