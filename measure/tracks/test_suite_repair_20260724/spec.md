# Spec: Repository Test Suite Repair: Frozen Digest and Palette Declaration

## Goal

Repair the two known repository-wide test-suite failures documented as Open
Medium tech debt in `measure/tech-debt.md`:

1. One frozen composition digest mismatch.
2. One palette-declaration mismatch for the unused `cloth-light` / `cloth-shadow`
   slots.

The full `npm test` run must exit 0 with zero skipped matched tests for the two
named failures, without masking them, regressing the green Forge ingestion slice
(135/135), or weakening any contract.

## Product Direction

A green repository-wide suite is the foundation every other track stands on.
The tech-debt row explicitly states the two asset-quality failures must not be
masked when reporting the full suite. This track fixes the root cause rather
than freezing a new digest over a bug or deleting a palette slot to silence a
warning. It does not author, accept, or promote any production art; visual
acceptance gates remain untouched and out of scope.

## Functional Requirements

- Reproduce both failures locally with exact, named test titles and capture the
  current failure output as evidence before any change.
- Diagnose whether the digest mismatch is a frozen-fixture drift (output changed)
  or a genuine composition bug (output is wrong) and resolve accordingly:
  re-freeze only when the new output is provably correct and deterministic; fix
  the code when the output is wrong.
- Diagnose whether the `cloth-light` / `cloth-shadow` palette mismatch is a stale
  declaration (slots declared but unused) or a missing-values regression (slots
  used but undeclared) per the `mockup_art_pass_20260717` library-blast-radius
  lesson, and resolve at the correct layer.
- Add regression tests that pin the corrected behavior so the two failures cannot
  silently return.
- Preserve the existing green ingestion slice and all frozen fixtures that are
  not the subject of this repair.

## Acceptance Criteria

- [ ] `npm test` exits 0 across the full repository suite.
- [ ] `npm run typecheck` and `npm run build` exit 0.
- [ ] The two previously-failing tests now pass at the assertion level (not via
      `.skip`); no new skips are introduced.
- [ ] Regression tests exist for both repaired behaviors and fail when the bug is
      reintroduced.
- [ ] The Open Medium tech-debt row is updated to Resolved with evidence in
      `measure/tech-debt.md`.

## Out of Scope

- Re-authoring SVG art, visual acceptance, Forge ingestion changes, new asset
  families, and any modification of `measure/automation-supervisor.py`.
