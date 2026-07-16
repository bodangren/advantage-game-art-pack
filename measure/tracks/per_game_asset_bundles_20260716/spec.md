# Spec: Per-Game Asset Bundles

## Goal

Define a bundle manifest with validation and deterministic export for
coordinated per-game asset packs for the advantage-games series, per product.md:
"planned around per-game asset bundles, not only individual sprite outputs."

## Product Direction

A bundle manifest (strict JSON) lists pack slots (characters, enemies, props,
fx, tiles, ui, surfaces) referencing composition, timeline, or sheet specs by
id. Validation resolves and compiles every referenced spec. Export emits a
deterministic bundle directory: assets grouped by slot, a bundle.json with
SHA-256 digests, and a human-readable audit report.

## Acceptance Criteria

- [ ] Bundle manifest schema with strict validation: slot enum enforced, all
  references resolvable, no duplicate ids.
- [ ] Validation compiles every referenced spec and reports failures with slot
  and reference context.
- [ ] Export produces a deterministic layout: bundle/<game>/<slot>/<asset>.svg,
  bundle.json with per-asset digests, and an audit report.
- [ ] A seeded example bundle for one mini-game theme built from checked-in
  parts and specs.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out Of Scope

- Zip packaging, release CI, or store distribution.
- Game-runtime loader changes.
- Raster export.
- LLM brief or prompt integration.
