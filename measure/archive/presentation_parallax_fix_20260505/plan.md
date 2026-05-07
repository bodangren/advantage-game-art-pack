# Presentation Surfaces Parallax Fix — Implementation Plan

## Phase 1: Investigation [ ]

- [ ] **T01 — Locate parallax tiling code**
  Find `_apply_parallax_tiling` or equivalent in presentation_surfaces.py; examine current pseudo-random offset logic.

## Phase 2: Implementation [ ]

- [ ] **T02 — Replace pseudo-random with deterministic offset**
  Use seeded hash-based offset or tile-flipping for guaranteed edge seamlessness.

## Phase 3: Testing [ ]

- [ ] **T03 — Verify parallax behavior unchanged**
  Run existing presentation surfaces tests.

- [ ] **T04 — Verify edge seamlessness**
  Confirm repeat patterns align correctly.

## Phase 4: Finalization [ ]

- [ ] **T05 — Update tech-debt.md**
  Mark parallax tiling item as closed.

- [ ] **T06 — Update lessons-learned.md**
  Document the fix and approach.