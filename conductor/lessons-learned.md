# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or
> below 50 lines.

## Architecture & Design

- (2026-04-05, sprite_compiler_mvp_20260405) Start with typed specs and one renderer path; keeps asset contract stable while part library is thin.
- (2026-04-05, style_canon_annotation_system_20260405) Treat backgrounds as scene assembly from approved tiles, props, and layout templates, not another sprite-sheet renderer.
- (2026-04-05, presentation_surfaces_ui_pipeline_20260405) Track covers, loading backgrounds, parallax layers, and UI atlases explicitly for downstream game series.

## Recurring Gotchas

- (2026-04-05, sprite_compiler_mvp_20260405) Local envs may have Pillow but not pytest; default automation should use `unittest`.

## Patterns That Worked Well

- (2026-04-05, sprite_compiler_mvp_20260405) Treat sample PNGs as reference
  material while keeping runtime output generated entirely from code + specs.
- (2026-04-05, candidate_generation_critic_loop_20260405) Demo assets are for canon extraction and critic calibration, not direct pixel sources for newly generated outputs.
- (2026-04-05, review_queue_foundation_20260405) Separate primitive review from compiled-asset review so human approval remains bounded and auditable.
- (2026-04-05, primitive_library_promotion_pipeline_20260405) Keep primitive manifests path-based and deterministic; rebuilds should sort by family, subtype, and primitive_id so seed data stays auditable in git.

## Planning Improvements

- (2026-04-05, sprite_compiler_mvp_20260405) Split roadmap into renderer foundation, richer part libraries, and batch orchestration to avoid scope collapse.
- (2026-04-05, candidate_generation_critic_loop_20260405) Treat quality as a bounded loop: generate original variants, score them against canon and novelty checks, then escalate only the survivors to review.
- (2026-04-05, sprite_compiler_mvp_20260405) Keep pose blocks and export metadata in the validation contract; that keeps the CLI and downstream consumers aligned before rendering starts.
- (2026-04-05, style_canon_annotation_system_20260405) Keep annotation tags human-readable and alpha-aware; bucket colors without treating transparency as black, and keep optional frame-grid or notes fields explicit in validation.
- (2026-04-17, prompt_to_asset_program_planner_20260405) Define provider abstraction before concrete implementations; this keeps the interface stable while allowing OpenAI/Anthropic/etc. to be swapped in.
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
- (2026-04-16, review_queue_foundation_20260405) FastAPI + SQLite + server-rendered Jinja2 is a lightweight stack ideal for local dev; avoid adding heavy frontend deps until the review UX actually needs them.
- (2026-04-16, review_queue_foundation_20260405) Store critic scores and rendered files as JSON strings in SQLite; parse on read rather than over-normalizing into separate columns.
- (2026-04-16, review_queue_foundation_20260405) Provide integration hooks (create_primitive_candidate, create_compiled_asset_candidate) so other tracks can feed the queue without inventing parallel workflows.
- (2026-04-23, lighting_renderer_fixes_20260423) Lighting double-darken: when directional shadow AND ambient darkening are both applied separately as darken steps, pixels get hit twice and become too dark. The fix is a single combined ambient+directional factor applied once. Spec: `base * clamp(ambient + directional, 0, 1)`.
- (2026-04-23, lighting_renderer_fixes_20260423) Shadow direction: for directional light, the OPPOSITE quadrant from the light source is shadow. For `dx>0` (east), left half (x<width//2) is shadow. For `dy<0` (north), bottom half (y>=height//2) is shadow. This inverts the naive interpretation.
- (2026-04-23, lighting_renderer_fixes_20260423) Layout resolver origin pile-up: when every prop gets `(0,0,32,32)` regardless of tile_source, all props stack at origin. The fix is to use actual tile dimensions and implement collision-aware placement. Multi-prop tests must verify bounds-distinctness, not just count.
- (2026-04-23, lighting_renderer_fixes_20260423) When adding `repo_root` parameter to existing functions, all call sites must be updated. Prefer default arguments (`Path(".")`) to maintain backward compatibility with existing callers.
- (2026-04-23, prompt_to_asset_program_planner_20260405) Planner context assembly (canon + style packs + primitives) must filter by family before exposing primitives to the prompt. This prevents the planner from referencing primitives that don't match the requested asset family.
- (2026-04-23, prompt_to_asset_program_planner_20260405) The repair loop should return a structured dict (not attempt re-parsing) so the caller controls the retry flow. Keep repair attempts bounded (max 3) to avoid infinite loops.
- (2026-04-24, critic_stack_auto_approval_20260405) Define shared CriticResult/PolicyOutcome schemas before concrete implementations; this allows adapters for different families while keeping the policy contract stable.
- (2026-04-24, critic_stack_auto_approval_20260405) Threshold packs must live as repo-tracked JSON files, not code constants; calibration replay must be reproducible for the same approved set and config.
- (2026-04-24, critic_stack_auto_approval_20260405) Family adapters should wrap the existing core critic logic rather than reimplementing it; this avoids diverging scoring paths across families.
- (2026-04-24, critic_stack_auto_approval_20260405) Policy aggregation: structural FAIL always triggers REGENERATE regardless of style/novelty scores. Novelty FAIL also triggers REGENERATE. Only when both structural and novelty pass does avg(style, novelty) determine AUTO_APPROVED vs NEEDS_REVIEW.
- (2026-04-24, critic_stack_auto_approval_20260405) Override preserves the original policy result and human reason in the candidate record so the audit trail is complete.
- (2026-04-24, batch_generation_release_manifests_20260405) When adding `to_dict` methods to dataclasses, convert all Path fields to strings explicitly; `asdict()` does not call `__str__` on Path objects and causes `TypeError: Object of type PosixPath is not JSON serializable`.
- (2026-04-24, batch_generation_release_manifests_20260405) State machines that write at start AND end of each step must read the persisted state back before advancing; otherwise in-memory state from the previous step overwrites the persisted state in the next step's write.
- (2026-04-24, batch_generation_release_manifests_20260405) Per-asset state updates must check the existing state before overwriting to preserve already-completed work when resuming interrupted jobs.
- (2026-04-24, batch_generation_release_manifests_20260405) Use index-based update maps instead of appending to a list when updating asset_states to preserve non-updated entries; append-based updates lose entries at indices not in the update list.
- (2026-04-24, batch_generation_release_manifests_20260405) Bounded retry loops must check `asset_state.X_retries >= max_X_retries` before marking FAILED, not after incrementing; otherwise the check is off-by-one and allows one extra attempt beyond the configured limit.
