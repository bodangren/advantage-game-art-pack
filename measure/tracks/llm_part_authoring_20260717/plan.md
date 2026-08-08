# Plan: LLM Part and Spec Authoring Loop

The loop is SVG-native. Semantic 3D briefs route to public MCP ingestion; this
track does not claim Forge animation, atlas, or complete-pack outputs exist.

All implementation tasks are deferred to the Pixel authoring owner while the
cross-repo ingestion/pack path is active; `[b]` records that sequencing state.

## Phase 1: Contract-First Tests

- [b] Add failing tests for the provider abstraction using a mock provider
      (request shape, structured output parsing).
- [b] Add failing prompt-builder tests asserting catalog grounding (slots,
      anchors, palette slots, tags) and dialect rules via snapshots.
- [b] Add failing repair-loop tests: invalid output, error feedback, bounded
      retries, and unrepairable exit with diagnostic.

## Phase 2: Provider and Prompt Builder

- [b] Implement the provider interface and a deterministic mock provider for
      tests.
- [b] Implement the catalog-grounded prompt builder.

## Phase 3: Validate-and-Repair Loop

- [b] Implement the repair loop over `validateSvgSource` and composition-spec
      validation with bounded retries.
- [b] Implement staged artifact writing so authored parts and specs land in a
      staging area, never directly in the library.

## Phase 4: Entry Points and Eval Fixtures

- [b] Implement the authoring entry points for part and composition briefs.
- [b] Add eval fixtures: valid output, invalid-then-repaired, and unrepairable
      canned provider responses.

## Phase 5: Verification

- [b] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [b] Document the provider contract and authoring workflow; record any
      shortcuts in `tech-debt.md`.
