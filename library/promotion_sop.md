# Primitive Promotion SOP

Use this workflow to move reusable art fragments into the approved primitive
library.

## 1. Prepare the candidate

- Start from a source asset that already exists in the repo.
- Create a metadata JSON file with:
  - `primitive_id`
  - `family`
  - `subtype`
  - `source_asset`
  - `source_path`
  - `source_region`
  - `anchors`
  - `compatible_palettes`
  - `compatible_themes`
  - `tags`
  - `motifs`
  - `approval_state: draft`
  - `promoted_at: null`
  - `provenance` with `source_kind`, `source_region`, `variant_id`, and an
    optional critic summary snapshot
- Draft candidates stay unapproved until review is complete.

## 2. Import the crop

- Run the import command to crop the source asset and stage the candidate:

```bash
python3 -m asf.cli primitives import \
  --repo-root . \
  --source demo-assets/book_3x1_sheet.png \
  --metadata tests/fixtures/primitives/book_stack_draft.json
```

- The staged candidate lands at `library/candidates/<family>/<primitive_id>/`.
- The import step must fail if the crop region or anchors are missing.

## 3. Review the staged candidate

- Inspect the staged crop and metadata.
- Confirm the source path, source region, anchors, provenance, and critic
  snapshot match the intended fragment.
- Demo-seeded primitives already in `library/primitives/...` are not promoted
  through this SOP; they are checked-in approved seeds.

## 4. Promote the candidate

- After review approval, promote the candidate into the approved library:

```bash
python3 -m asf.cli primitives promote \
  --repo-root . \
  --candidate-dir library/candidates/prop_sheet/book_stack_core \
  --approved-by codex-reviewer \
  --promoted-at 2026-04-05T03:00:00Z
```

- Promotion writes `library/primitives/<family>/<primitive_id>/primitive.json`
  and copies any staged companion files.
- The promotion step is idempotent. Re-running it with the same candidate and
  metadata must not change the approved files.

## 5. Rebuild and verify

- Rebuild the registry after promotion:

```bash
python3 -m asf.cli primitives rebuild --repo-root .
```

- Validate the library:

```bash
python3 -m asf.cli primitives validate --repo-root .
```

## Candidate Types

- `draft` candidates are staged and not yet approved.
- `reviewed_generated_output` candidates preserve critic provenance from the
  generation loop and become approved only after explicit promotion.
- Demo-seeded primitives live directly in `library/primitives/...` and are
  already approved for downstream compiler use.
