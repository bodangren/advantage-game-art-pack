# Primitive Library

This directory holds approved reusable primitives for the asset compiler
pipeline.

## Layout

- `library/primitives/<family>/<primitive_id>/primitive.json`
- `library/primitives/<family>/<primitive_id>/` may also contain optional
  companion files such as `mask.png`, `anchor_overlay.json`, or other
  non-image metadata files.
- `library/candidates/<family>/<primitive_id>/primitive.json` stores staged
  candidates before promotion.
- `library/primitive_manifest.json` is the deterministic registry rebuilt from
  the primitive metadata on disk.

## Naming Rules

- `primitive_id` must be a lowercase slug using letters, numbers, `-`, `_`, or
  `.`.
- `<family>` must match one of the approved family names from the canon:
  `character_sheet`, `prop_sheet`, `fx_sheet`, `tileset`, `background_scene`,
  `parallax_layer`, `ui_sheet`, or `presentation_surface`.
- Each primitive directory must contain exactly one `primitive.json`.
- Source paths and companion files are stored as relative paths so the library
  stays git-friendly and deterministic.

## Provenance Contract

- `source_asset` names the originating approved asset or candidate.
- `source_path` points to the original source file inside the repo.
- `source_region` records the exact crop or source slice used for the
  primitive.
- `anchors` define attachment points for later compilers.
- Approved primitives record `approval_state`, `promoted_at`, and provenance
  details so downstream review pages can answer where the primitive came from
  and who approved it.

## Workflow

See [promotion_sop.md](./promotion_sop.md) for the import, review, and
promotion sequence.
