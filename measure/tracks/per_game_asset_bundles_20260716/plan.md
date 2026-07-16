# Plan: Per-Game Asset Bundles

## Phase 1: Contract-First Tests

- [ ] Add failing tests for bundle manifest parsing and validation (slot enum,
  duplicate ids, unresolvable references).
- [ ] Add failing tests for export layout and digest manifest contracts.
- [ ] Add failing determinism tests: identical bundle input yields identical
  export tree and digests.

## Phase 2: Manifest and Resolver

- [ ] Implement bundle manifest types and strict validation under `src/lib/`.
- [ ] Implement reference resolution from slots to composition, timeline, and
  sheet specs.
- [ ] Implement compile-every-reference validation with slot-context error
  reporting.

## Phase 3: Exporter

- [ ] Implement deterministic bundle directory writer (slot-grouped assets).
- [ ] Implement bundle.json digest manifest emission.
- [ ] Implement the human-readable audit report.

## Phase 4: Seeded Example and Verification

- [ ] Author a seeded example bundle for one mini-game theme from checked-in
  parts and specs.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Document the bundle manifest and export contracts.
