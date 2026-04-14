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
- (2026-04-05, presentation_surfaces_ui_pipeline_20260405) The downstream game series needs runtime assets and presentation surfaces; covers, loading backgrounds, parallax layers, and UI atlases must be tracked explicitly.

## Recurring Gotchas

- (2026-04-05, sprite_compiler_mvp_20260405) Local environments may have Pillow
  but not pytest, so default automation should use `unittest`.

## Patterns That Worked Well

- (2026-04-05, sprite_compiler_mvp_20260405) Treat sample PNGs as reference
  material while keeping runtime output generated entirely from code + specs.
- (2026-04-05, candidate_generation_critic_loop_20260405) Demo assets are for canon extraction and critic calibration, not direct pixel sources for newly generated outputs.
- (2026-04-05, review_queue_foundation_20260405) Separate primitive review from compiled-asset review so human approval remains bounded and auditable.
- (2026-04-05, primitive_library_promotion_pipeline_20260405) Keep primitive manifests path-based and deterministic; rebuilds should sort by family, subtype, and primitive_id so seed data stays auditable in git.

## Planning Improvements

- (2026-04-05, sprite_compiler_mvp_20260405) Split the roadmap into renderer
  foundation, richer part libraries, and batch orchestration to avoid scope
  collapse in the first slice.
- (2026-04-05, candidate_generation_critic_loop_20260405) Treat quality as a bounded loop: generate original variants, score them against canon and novelty checks, then escalate only the survivors to review.
- (2026-04-05, sprite_compiler_mvp_20260405) Keep pose blocks and export metadata in the validation contract; that keeps the CLI and downstream consumers aligned before rendering starts.
- (2026-04-05, style_canon_annotation_system_20260405) Keep annotation tags human-readable and alpha-aware; bucket colors without treating transparency as black, and keep optional frame-grid or notes fields explicit in validation.
- (2026-04-05, style_canon_annotation_system_20260405) Family guides read better when the canon exposes both representative swatches and a short narrative palette family note instead of raw hex values alone.
- (2026-04-05, primitive_library_promotion_pipeline_20260405) Seeded primitives can reference approved demo assets directly through relative source paths, which avoids copying image binaries until the promotion workflow needs them.
- (2026-04-05, asset_family_compiler_framework_20260405) Approved primitive images are the fastest path to high-quality smoke tests; keep the renderer deterministic, but treat the primitive crop as the visual source of truth.
- (2026-04-05, asset_family_compiler_framework_20260405) Keep `variant_id` in the manifest envelope and normalize paths from the repo root so output hashes and audit trails stay stable across temp output directories.
- (2026-04-05, candidate_generation_critic_loop_20260405) Calibration should read the tracked `canon/style_canon.json` snapshot and cache reference thumbnails; rebuilding canon from source assets for every report is too slow.
- (2026-04-09, scene_layout_background_assembler_20260405) Use strict required-keys validation combined with separate optional-keys allowlist; this catches typos early while keeping optional fields manageable.
- (2026-04-10, scene_layout_background_assembler_20260405) Layout resolver should validate zone bounds against canvas dimensions and detect reserved-zone overlaps before any prop placement; deterministic resolution relies on sorted iteration order for zones and placements.
- (2026-04-11, scene_layout_background_assembler_20260405) Prop intrusions into reserved zones must raise errors rather than silently succeeding; a boolean guard flag that is set but never checked is indistinguishable from no check at all.
- (2026-04-12, scene_layout_background_assembler_20260405) Scene assembly should resolve tile images lazily at render time rather than eagerly loading all primitives into memory; this keeps the assembly pipeline deterministic while avoiding large memory spikes.
- (2026-04-12, scene_layout_background_assembler_20260405) Keep debug overlays as a separate RGBA image composited on top rather than mutating the base scene; this preserves the clean render for export while enabling visual inspection.
- (2026-04-13, scene_layout_background_assembler_20260405) When a parser function uses `_require_rect` (which returns 4 values), ensure the corresponding dataclass field is `tuple[int, int, int, int]` not `tuple[int, int]`; misalignment causes runtime unpacking errors in downstream code.
- (2026-04-13, scene_layout_background_assembler_20260405) Identical if/else branches are a smell that the resolver is stubbed, not implemented; tests that only exercise single-prop sample scenes won't catch piled-at-origin placements. Add a multi-prop bounds-distinctness test before declaring a resolver done.
- (2026-04-13, scene_layout_background_assembler_20260405) Pick one bounds convention for machine-readable manifests and enforce it at the dataclass boundary; mixing (x,y,w,h) for zones with (x,y,x2,y2) for motifs guarantees a downstream consumer will misread one.
- (2026-04-14, presentation_surfaces_ui_pipeline_20260405) Surface assembly must be deterministic; test manifests not pixels; raise `SurfaceAssemblyError` on missing required inputs.
