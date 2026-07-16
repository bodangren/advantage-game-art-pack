# Plan: Per-Game Asset Bundles

## Phase 1: Contract-First Tests

- [x] Add failing tests for bundle manifest parsing and validation (slot enum,
  duplicate ids, unresolvable references).
- [x] Add failing tests for export layout and digest manifest contracts.
- [x] Add failing determinism tests: identical bundle input yields identical
  export tree and digests.

## Phase 2: Manifest and Resolver

- [x] Implement bundle manifest types and strict validation under `src/lib/`.
- [x] Implement reference resolution from slots to composition, timeline, and
  sheet specs.
- [x] Implement compile-every-reference validation with slot-context error
  reporting.

## Phase 3: Exporter

- [x] Implement deterministic bundle directory writer (slot-grouped assets).
- [x] Implement bundle.json digest manifest emission.
- [x] Implement the human-readable audit report.

## Phase 4: Seeded Example and Verification

- [x] Author a seeded example bundle for one mini-game theme from checked-in
  parts and specs.
- [x] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [x] Document the bundle manifest and export contracts.
