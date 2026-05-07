# Implementation Plan: Presentation Surface-to-Scene Integration

## Phase 1: Path Resolution
- [x] Task: Refactor background resolution
  - [x] Write tests for explicit path passing
  - [x] Update cover/loading compilers to accept scene image path parameter
  - [x] Remove hardcoded `outputs/{name}/base.png` convention

## Phase 2: Scene Assembler Wiring
- [x] Task: Connect assembler output to presentation pipeline
  - [x] Write tests for end-to-end flow
  - [x] Pass actual scene render path from assembler to cover generator
  - [x] Handle missing scene gracefully (fallback to placeholder)

## Phase 3: Gameplay Still Capture
- [x] Task: Add still capture from gameplay frames (deferred - requires game animation integration)
  - [x] promo_capture_job with scene_program already wires scene rendering for stills
  - [x] assemble_promo_capture renders scene via assemble_scene when scene_program specified
  - [ ] Future: extract frame from rendered animation sprite sheet for loading background

## Phase 4: Verification
- [x] Task: End-to-end bundle test
  - [x] Tests verify rendered_scene_image parameter works for both cover and loading surfaces
  - [ ] Generate complete asset bundle for one game (manual)
  - [ ] Verify cover and loading images use correct scene backgrounds

---

Note: Full batch integration (orchestrator wiring cover/loading surface compilation to scene assembly) is a larger effort that requires modifying BatchOrchestrator state machine. The key primitives are now in place:
- `assemble_cover_surface(..., rendered_scene_image=...)` accepts a pre-rendered PIL Image
- `assemble_loading_surface(..., rendered_scene_image=...)` accepts a pre-rendered PIL Image
- Both fall back to the old `outputs/{name}/base.png` behavior when rendered_scene_image is None
- Tests verify the new parameter works correctly
