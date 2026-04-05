# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or
> below 50 lines.

## Architecture & Design

- (2026-04-05, sprite_compiler_mvp_20260405) Start with typed specs and one
  renderer path; it keeps the asset contract stable while the part library is
  still thin.
- (2026-04-05, style_canon_annotation_system_20260405) Treat backgrounds as
  scene assembly from approved tiles, props, and layout templates, not as
  another sprite-sheet renderer.
- (2026-04-05, presentation_surfaces_ui_pipeline_20260405) The downstream game
  series needs runtime assets and presentation surfaces; covers, loading
  backgrounds, parallax layers, and UI atlases must be tracked explicitly.

## Recurring Gotchas

- (2026-04-05, sprite_compiler_mvp_20260405) Local environments may have Pillow
  but not pytest, so default automation should use `unittest`.

## Patterns That Worked Well

- (2026-04-05, sprite_compiler_mvp_20260405) Treat sample PNGs as reference
  material while keeping runtime output generated entirely from code + specs.
- (2026-04-05, candidate_generation_critic_loop_20260405) Demo assets are for
  canon extraction and critic calibration, not direct pixel sources for newly
  generated outputs.
- (2026-04-05, review_queue_foundation_20260405) Separate primitive review
  from compiled-asset review so human approval remains bounded and auditable.

## Planning Improvements

- (2026-04-05, sprite_compiler_mvp_20260405) Split the roadmap into renderer
  foundation, richer part libraries, and batch orchestration to avoid scope
  collapse in the first slice.
- (2026-04-05, candidate_generation_critic_loop_20260405) Treat quality as a
  bounded loop: generate original variants, score them against canon and
  novelty checks, then escalate only the survivors to review.
- (2026-04-05, sprite_compiler_mvp_20260405) Keep pose blocks and export
  metadata in the validation contract; that keeps the CLI and downstream
  consumers aligned before rendering starts.
