# Autonomous Sprite Factory

Deterministic pixel-art sprite compiler prototype.

This repository does not generate images from prompts directly. It accepts a
strict JSON specification, applies a style pack, renders a fixed 3x3 64x64
sheet, validates the result, and exports both `sheet.png` and `metadata.json`.

## Current Scope

- Strict JSON spec loading into typed Python dataclasses
- One reusable style pack: `cute_chibi_v1`
- Deterministic rendering for slime and humanoid chibi archetypes
- Structural validation for dimensions, pivots, and palette bounds
- CLI export flow for example assets
- Conductor project docs and MVP track scaffold

## Repository Layout

- `src/asf/`: renderer, spec loading, exporter, validator, CLI
- `style_packs/`: JSON style pack definitions
- `examples/`: schema-compliant input specs
- `outputs/`: generated example artifacts
- `demo-assets/`: reference quality targets supplied with the repo
- `conductor/`: product, workflow, and track artifacts

## Commands

```bash
python3 -m unittest discover -s tests -v
python3 -m compileall src
python3 -m asf.cli --spec examples/swamp_slime.json --output outputs/swamp_slime
python3 -m asf.cli --spec examples/knight_guard.json --output outputs/knight_guard
python3 -m asf.cli --spec examples/ragged_prisoner.json --output outputs/ragged_prisoner
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
