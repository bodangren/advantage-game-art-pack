# Spec: Executable Contract Reference Documentation

## Goal

Author a single, auditable contract reference that documents every active
versioned contract in Pixel Art Generator - its ID and version, purpose, field
schema, validation rules, rejection behavior, and at least one checked-in example
input/output - and prove the documentation is correct by validating each example
against the real contract validators. This closes the "explicit schemas over
prose-heavy configuration" and "keep examples auditable" gaps in
`measure/product-guidelines.md` for engineers extending the system.

## Product Direction

Pixel now carries many versioned contracts (forge interchange v1, education-app
pack profiles v1/v2, temporal render artifacts v1, batch artifacts v1, five-clip
authoring v1, staging plans, dual-theme demand catalog v2, theme-pack production
plan v1). Each lives in a large `src/lib/*.ts` module and its exact field
schema, required vs optional fields, cardinality, digest rules, and fail-closed
behavior are discoverable only by reading code. This track surfaces them as a
consolidated reference without changing any contract: the validators are the
source of truth, and the docs are proven against them. It does not author,
admit, or visually accept production assets; examples reuse existing checked-in
non-production fixtures and frozen example specs.

## Functional Requirements

- A consolidated contract reference (markdown, under `docs/` or `measure/`)
  covering every active contract ID listed in this track's metadata, with for
  each: contract ID/version, owning module, purpose, field table (name, type,
  required/optional, cardinality, constraints), validation rules, and rejection
  behavior.
- At least one checked-in example input and its expected output per contract,
  stored alongside the reference, that is validated by a test against the real
  validator.
- A test suite that loads each documented example and asserts: valid examples
  pass the real validator, and at least one documented rejection case (per
  contract) fails with the documented reason - so the docs cannot drift from the
  code.
- Explicit "implemented now" vs "staged support" vs "planned later" markers per
  contract, matching the product-guidelines voice rule.
- A top-level index linking each contract to its reference section and owning
  module.

## Acceptance Criteria

- [ ] Every active contract ID in this track's metadata has a reference section
      with a field table, validation rules, and rejection behavior.
- [ ] Each contract has at least one checked-in example validated by a test
      against the real validator; documented rejection cases fail as documented.
- [ ] The doc-vs-code tests fail if a documented example stops matching the real
      validator (drift detection for documentation).
- [ ] "Implemented now / staged / planned" status is explicit per contract.
- [ ] `npm test`, `npm run typecheck`, and `npm run build` are green; no contract
      behavior is changed.

## Out of Scope

- Changing any contract, validator, or field schema; authoring or admitting
  production assets; visual acceptance; and modifying
  `measure/automation-supervisor.py`.
