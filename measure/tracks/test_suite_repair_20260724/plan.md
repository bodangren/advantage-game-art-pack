# Plan: Repository Test Suite Repair: Frozen Digest and Palette Declaration

All tasks are unblocked and do not depend on visual acceptance. Fix root causes;
never skip, freeze over a bug, or weaken a contract to make a test pass. Preserve
the green Forge ingestion slice (135/135).

## Phase 1: Reproduce and Pin (Red)

- [ ] Add a regression test that runs the two known-failing tests by exact title
      and asserts they currently fail with the documented mismatch messages,
      capturing the failure output as checked-in evidence
      (`measure/tracks/test_suite_repair_20260724/failure-evidence.txt`).
- [ ] Add failing regression tests that pin the *correct* post-fix behavior for
      both the frozen composition digest and the `cloth-light` / `cloth-shadow`
      palette declaration, so they fail now and pass after the fix.

## Phase 2: Diagnose

- [ ] Determine whether the composition digest mismatch is frozen-fixture drift
      (output legitimately changed) or a composition bug (output is wrong) by
      diffing the generated SVG/manifest bytes against the frozen fixture and
      tracing the producing code path; record the verdict in the commit note.
- [ ] Determine whether the palette mismatch is a stale declaration (slots
      declared, unused) or a missing-values regression (slots used, undeclared)
      by grepping for `cloth-light` / `cloth-shadow` usage across catalog parts,
      examples, and inline fixtures; record the verdict in the commit note.

## Phase 3: Implement the Repair

- [ ] Fix the composition digest mismatch: if drift, re-freeze the fixture only
      after proving the new output is deterministic and correct; if a bug, fix
      the producing code so the existing frozen digest holds.
- [ ] Fix the `cloth-light` / `cloth-shadow` palette mismatch at the correct
      layer (remove the stale declaration, or supply the missing values across
      every affected composition/example/fixture per the blast-radius lesson).
- [ ] Remove any temporary diagnostic scaffolding added during diagnosis.

## Phase 4: Verify and Close Debt

- [ ] Run `npm test`, `npm run typecheck`, and `npm run build`; confirm all three
      exit 0 with no new skips and the ingestion slice still reports 135/135.
- [ ] Confirm the Phase 1 regression tests fail when the bug is reintroduced
      (mutation check) and pass on the fixed tree.
- [ ] Update the Open Medium tech-debt row in `measure/tech-debt.md` to Resolved
      with the commit SHA and a one-line evidence note; add a lessons-learned
      entry if the root cause is a new recurring gotcha.
