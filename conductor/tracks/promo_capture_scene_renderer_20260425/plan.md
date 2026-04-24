# Implementation Plan

## Phase 1: Test Infrastructure & Scene Rendering Path

### Task 1.1: Write failing test for promo capture with scene_program rendering
- [ ] Write a test that creates a minimal scene program fixture and a promo capture job referencing it
- [ ] Assert that when `capture_conditions.scene_program` is set, `assemble_promo_capture_job` renders the scene instead of loading static promo.png
- [ ] Verify the rendered image differs from a fallback static image
- [ ] Run test and confirm it fails (Red phase)

### Task 1.2: Implement scene rendering path in assemble_promo_capture_job
- [ ] Modify `assemble_promo_capture_job` to check if `capture_conditions.scene_program` is set
- [ ] If set, load the scene program via `load_scene_program`
- [ ] Resolve the layout via `resolve_scene_layout`
- [ ] Assemble via `assemble_scene`
- [ ] Return the rendered scene image and manifest
- [ ] Run tests and confirm they pass (Green phase)

### Task 1.3: Write failing test for missing scene program error
- [ ] Write a test where `scene_program` points to a non-existent file
- [ ] Assert that `SurfaceAssemblyError` is raised with a clear message
- [ ] Run test and confirm it fails (Red phase)

### Task 1.4: Implement error handling for missing scene program
- [ ] Add validation that raises `SurfaceAssemblyError` when scene program file does not exist
- [ ] Run tests and confirm they pass (Green phase)

---

## Phase 2: Fallback Path & Regression Prevention

### Task 2.1: Write failing test for fallback when scene_program is absent
- [ ] Write a test where `capture_conditions.scene_program` is null/empty
- [ ] Ensure static `promo.png` is loaded (current behavior)
- [ ] Run test and confirm it fails because current implementation ignores scene_program entirely

### Task 2.2: Implement fallback path
- [ ] Modify `assemble_promo_capture_job` to fall back to static `promo.png` when `scene_program` is absent
- [ ] Run tests and confirm they pass (Green phase)

### Task 2.3: Run full test suite for regression
- [ ] Run all existing tests in `test_presentation_surfaces.py`
- [ ] Ensure no regressions in other surface families
- [ ] Fix any failures

---

## Phase 3: Manifest & Capture Conditions Recording

### Task 3.1: Verify manifest records scene_program as source asset
- [ ] Write/extend test to verify manifest's `source_assets` includes the scene_program path
- [ ] Run test and confirm it captures the scene_program

### Task 3.2: Ensure timing and frame_index are passed through
- [ ] Write/extend test for `timing` and `frame_index` in capture_conditions
- [ ] These are currently stored in manifest but not used; document that frame_index pass-through is for future animation support
- [ ] Run tests and confirm they pass

---

## Phase 4: Finalization

### Task 4.1: Update tech-debt.md
- [ ] Mark tech debt item "promo capture job stub" as Closed
- [ ] Add note about frame_index pass-through for future animation support as a new Open item if applicable

### Task 4.2: Update lessons-learned.md
- [ ] Add lesson about conditional rendering based on optional program fields
- [ ] Keep under 50 lines

### Task 4.3: Commit checkpoint
- [ ] Stage all changes
- [ ] Commit with message referencing MiniMax-M2 model
- [ ] Push