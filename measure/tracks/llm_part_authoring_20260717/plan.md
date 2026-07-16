# Plan: LLM Part and Spec Authoring Loop

## Phase 1: Contract-First Tests

- [ ] Add failing tests for the provider abstraction using a mock provider
  (request shape, structured output parsing).
- [ ] Add failing prompt-builder tests asserting catalog grounding (slots,
  anchors, palette slots, tags) and dialect rules via snapshots.
- [ ] Add failing repair-loop tests: invalid output, error feedback, bounded
  retries, and unrepairable exit with diagnostic.

## Phase 2: Provider and Prompt Builder

- [ ] Implement the provider interface and a deterministic mock provider for
  tests.
- [ ] Implement the catalog-grounded prompt builder.

## Phase 3: Validate-and-Repair Loop

- [ ] Implement the repair loop over `validateSvgSource` and composition-spec
  validation with bounded retries.
- [ ] Implement staged artifact writing so authored parts and specs land in a
  staging area, never directly in the library.

## Phase 4: Entry Points and Eval Fixtures

- [ ] Implement the authoring entry points for part and composition briefs.
- [ ] Add eval fixtures: valid output, invalid-then-repaired, and unrepairable
  canned provider responses.

## Phase 5: Verification

- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Document the provider contract and authoring workflow; record any
  shortcuts in `tech-debt.md`.
