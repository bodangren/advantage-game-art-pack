# Plan: Executable Contract Reference Documentation

This track changes no contract and admits no assets; examples reuse existing
checked-in non-production fixtures and frozen example specs. Documentation is
executable: every documented example is validated against the real contract
validators. Follow Contract-First TDD: write the doc-vs-code validation tests
first, then author docs and examples.

## Phase 1: Contract-First Tests (Red)

- [ ] Add a test that, for each active contract ID, loads its documented example
      input and asserts it passes the real validator, and loads at least one
      documented rejection case and asserts it fails with the documented reason.
- [ ] Add a drift-detection test that fails if any documented field table,
      validation rule, or "implemented/staged/planned" status contradicts the
      real validator's behavior.
- [ ] Add a test asserting the top-level index links every contract ID to a
      reference section and its owning module.

## Phase 2: Reference Authoring

- [ ] Create the consolidated contract reference (markdown under `docs/` or
      `measure/`) with one section per active contract: ID/version, owning
      module, purpose, field table, validation rules, rejection behavior.
- [ ] Mark each contract explicitly as "implemented now", "staged support", or
      "planned later" per the product-guidelines voice rule.
- [ ] Author the top-level index linking each contract ID to its reference
      section and owning module.

## Phase 3: Checked-in Examples

- [ ] Add at least one checked-in example input and expected output per contract,
      reusing existing non-production fixtures and frozen example specs where
      possible.
- [ ] Add at least one documented rejection case per contract, with the expected
      failure reason.

## Phase 4: Verify

- [ ] Run `npm test`, `npm run typecheck`, and `npm run build`; confirm green and
      that no contract behavior changed.
- [ ] Confirm the Phase 1 drift-detection test fails when a documented example is
      deliberately broken and passes on the correct tree.
- [ ] Run `measure/doctor.sh` to confirm structural checks pass; add a
      lessons-learned entry only if a new doc-vs-code pattern emerges.
