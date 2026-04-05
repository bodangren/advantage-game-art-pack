# Autonomous Sprite Factory

Deterministic pixel-art sprite compiler prototype.

This repository does not generate images from prompts directly. It accepts a
strict JSON specification, applies a style pack, renders a fixed 3x3 64x64
sheet, validates the result, and exports both `sheet.png` and `metadata.json`.
It also includes a checked-in primitive library registry for reusable art
fragments.

## Current Scope

- Strict JSON spec loading into typed Python dataclasses
- One reusable style pack: `cute_chibi_v1`
- Deterministic rendering for slime and humanoid chibi archetypes
- Structural validation for dimensions, pivots, and palette bounds
- CLI export flow for example assets
- Primitive-library registry, manifest rebuilds, and query helpers
- Conductor project docs and MVP track scaffold

## Repository Layout

- `src/asf/`: renderer, spec loading, exporter, validator, CLI
- `style_packs/`: JSON style pack definitions
- `examples/`: schema-compliant input specs
- `outputs/`: generated example artifacts
- `library/`: primitive registry, seed metadata, and manifest
- `demo-assets/`: reference quality targets supplied with the repo
- `conductor/`: product, workflow, and track artifacts

## Commands

```bash
python3 -m unittest discover -s tests -v
python3 -m compileall src
python3 -m asf.cli --spec examples/swamp_slime.json --output outputs/swamp_slime
python3 -m asf.cli --spec examples/knight_guard.json --output outputs/knight_guard
python3 -m asf.cli --spec examples/ragged_prisoner.json --output outputs/ragged_prisoner
python3 -m asf.cli primitives import --repo-root . --source demo-assets/book_3x1_sheet.png --metadata tests/fixtures/primitives/book_stack_draft.json
python3 -m asf.cli primitives promote --repo-root . --candidate-dir library/candidates/prop_sheet/book_stack_core --approved-by codex-reviewer --promoted-at 2026-04-05T03:00:00Z
python3 -m asf.cli primitives validate --repo-root .
python3 -m asf.cli primitives rebuild --repo-root .
```

## Example Outputs

- `outputs/swamp_slime/`
- `outputs/knight_guard/`
- `outputs/ragged_prisoner/`

## MVP Limits

- No LLM prompt-to-spec generator yet
- No reusable external part-mask library yet
- No retry/regeneration loop yet
- No batch orchestration or engine integration yet
