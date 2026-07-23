# Spec: Cross-Output Determinism Regression Suite

## Goal

Add a dedicated, always-on regression suite that proves Pixel's deterministic
outputs are byte-identical across repeated runs and detects drift the moment a
composition, atlas, bundle, manifest, or rasterized PNG diverges from its frozen
identity. This addresses the recurring frozen-digest drift captured in
`measure/lessons-learned.md` (atlas `id` field, `head_idiom_fix` silhouette
regression, `mockup_art_pass` palette blast radius) and the open digest-mismatch
debt at its root.

## Product Direction

Determinism is a stated architectural choice ("Composition is deterministic and
does not rely on stochastic image models") and a quality gate. Today drift is
caught reactively, often by manual browser review (the `head_idiom_fix` lesson).
This track makes the determinism contract executable and automatic: identical
input must yield byte-identical SVG, JSON manifest, atlas, bundle export, and
rasterized PNG bytes across two consecutive runs from a clean state. It does not
admit production assets, re-freeze production digests, or perform visual
acceptance; it pins already-frozen example and fixture outputs.

## Functional Requirements

- A determinism harness under `src/lib/` that, for a declared set of frozen
  example specs (compositions, atlases, directional sheets, bundles, temporal
  staging fixtures), runs each pipeline twice from a clean in-memory state and
  compares output bytes.
- Byte-identity assertions for: composed SVG, serialized JSON manifest, packed
  atlas SVG, bundle export tree (`bundle.json` + per-slot SVG + digests), and
  render-API PNG bytes (palette-inlined, resvg `fitTo: "original"`).
- Stable serialization ordering: object keys, layer priorities, frame order, and
  manifest field order must be canonical and reproducible.
- A doctor-style guard that fails closed when a frozen example's recorded digest
  no longer matches its freshly computed digest, naming the offending output and
  the drifted file.
- A documented, single-command entry point (`npm run test:determinism` or an
  opt-in vitest tag) so the suite is runnable in isolation and in CI.
- Cross-platform safety note recorded where WASM rasterization (resvg) or path
  separators could legitimately differ; such cases are pinned to the Linux build
  gate and documented, not silently allowed to vary.

## Acceptance Criteria

- [ ] Contract-first tests fail before implementation and pass after.
- [ ] Two consecutive clean-state runs of every pinned example produce
      byte-identical SVG, JSON, atlas, bundle, and PNG outputs.
- [ ] Introducing a deliberate non-determinism (e.g. unstable key order, time
      stamp, or random offset) causes the suite to fail with a named, actionable
      diff.
- [ ] `npm test`, `npm run typecheck`, and `npm run build` are green; the
      determinism suite is runnable in isolation.
- [ ] A lessons-learned entry captures the canonical-serialization pattern this
      suite enforces.

## Out of Scope

- Re-authoring art, visual acceptance, admitting production assets, modifying
  `measure/automation-supervisor.py`, and any change to the Forge ingestion
  boundary contracts.
