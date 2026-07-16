# Spec: LLM Part and Spec Authoring Loop

## Goal

Deliver the product's first stated objective: let an LLM author new SVG parts
and composition specs through a constrained contract. Provider-abstracted,
catalog-grounded, with a validate-and-repair loop so only contract-passing
artifacts ever reach the library staging area.

## Product Direction

The product vision is an LLM-friendly factory, yet every prior track deferred
LLM authoring. The catalog already exposes part ids, slots, anchors, palette
slots, and tags as JSON for prompt context; this track builds the authoring
loop around it. Per the planner lesson from the retired project, the provider
abstraction is defined before any concrete implementation so providers can be
swapped without touching the loop. Authored artifacts land in a staging area —
never directly in the library — keeping human review in the promotion path.

## Functional Requirements

- A provider abstraction (structured text generation from a prompt) with a
  deterministic mock provider used by all tests.
- A prompt builder that injects catalog JSON (slots, anchors, palette slots,
  tags) and the safe SVG dialect rules, with snapshot-tested output.
- A validate-and-repair loop: LLM output is parsed, run through
  `validateSvgSource` or composition-spec validation, and on failure the error
  feedback is returned to the provider for a bounded number of repair retries;
  unrepairable output exits with a diagnostic.
- Authoring entry points that take a text brief and produce a staged part or
  composition spec.
- Eval fixtures with canned provider outputs: valid, invalid-then-repaired,
  and unrepairable.

## Non-Functional Requirements

- No network access in tests; the mock provider makes the loop fully
  deterministic.
- Provider adapters are isolated modules; the core loop adds no new runtime
  dependencies.
- Credentials resolve from environment variables only and are never written to
  disk or logged.
- Given fixed provider output, the loop is byte-deterministic, including the
  staged artifacts.

## Acceptance Criteria

- [ ] Provider interface is defined and exercised through the mock provider;
  request shape and output parsing are covered by tests.
- [ ] Prompt builder output is snapshot-tested and provably includes catalog
  grounding and dialect rules.
- [ ] Repair loop feeds validation errors back to the provider, respects the
  retry bound, and exits with a diagnostic on unrepairable output.
- [ ] Authoring entry points stage parts and specs without touching the
  checked-in library.
- [ ] Eval fixtures cover valid, invalid-then-repaired, and unrepairable
  canned outputs.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out Of Scope

- Freeform text-to-image or diffusion workflows (product non-goal).
- Automatic promotion of staged artifacts into the library.
- A desk UI for authoring; entry points are module/CLI level.
- Concrete paid provider adapters beyond one reference adapter behind the
  abstraction.
