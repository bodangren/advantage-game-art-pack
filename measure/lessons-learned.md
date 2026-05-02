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

- (2026-04-05, sprite_compiler_mvp_20260405) Treat sample PNGs as reference material while keeping runtime output generated entirely from code + specs.
- (2026-04-05, candidate_generation_critic_loop_20260405) Demo assets are for canon extraction and critic calibration, not direct pixel sources for newly generated outputs.
- (2026-04-05, primitive_library_promotion_pipeline_20260405) Keep primitive manifests path-based and deterministic; rebuilds should sort by family, subtype, and primitive_id so seed data stays auditable in git.

## Planning Improvements

- (2026-04-05, sprite_compiler_mvp_20260405) Split roadmap into renderer foundation, richer part libraries, and batch orchestration to avoid scope collapse.
- (2026-04-17, prompt_to_asset_program_planner_20260405) Define provider abstraction before concrete implementations; this keeps the interface stable while allowing OpenAI/Anthropic/etc. to be swapped in.
- (2026-04-24, llm_planner_provider_impl_20260424) urllib.request.urlopen with a context manager (with statement) needs both `__enter__` and `__exit__` mocked; mocking just the return value causes AttributeError when exiting the with block.
- (2026-04-24, llm_planner_provider_impl_20260424) HTTP 429 (rate limit) is the only retryable HTTP error; other errors (500, etc.) should fail immediately rather than retry indefinitely.
- (2026-04-24, llm_planner_provider_impl_20260424) Anthropic usage dict uses `input_tokens`/`output_tokens` keys, not `prompt_tokens`/`completion_tokens`; normalize these in the trace building logic.
- (2026-04-24, review_app_auth_and_images_20260424) FastAPI authentication via Depends(require_auth) applies to all routes including POST actions. Use BaseHTTPMiddleware for path-level exemptions if needed.
- (2026-04-24, review_app_auth_and_images_20260424) Static file serving via Starlette's StaticFiles must be mounted on the app instance after middleware setup; mount inside on_startup to ensure directory exists.
- (2026-05-02, review_app_serving_20260425) FastAPI Form data dependencies require python-multipart package; install it separately from fastapi.
- (2026-04-24, review_app_auth_and_images_20260424) rendered_files stored as JSON strings in SQLite; parse them before passing to templates to avoid string/array confusion in Jinja2.
- (2026-04-23, lighting_renderer_fixes_20260423) Lighting double-darken: when directional shadow AND ambient darkening are both applied separately as darken steps, pixels get hit twice and become too dark. The fix is a single combined ambient+directional factor applied once.
- (2026-04-23, lighting_renderer_fixes_20260423) Shadow direction: for directional light, the OPPOSITE quadrant from the light source is shadow.
- (2026-04-23, lighting_renderer_fixes_20260423) Layout resolver origin pile-up: when every prop gets `(0,0,32,32)` regardless of tile_source, all props stack at origin.
- (2026-04-23, prompt_to_asset_program_planner_20260405) Planner context assembly must filter by family before exposing primitives to the prompt.
- (2026-04-24, critic_stack_auto_approval_20260405) Policy aggregation: structural FAIL always triggers REGENERATE regardless of style/novelty scores.
- (2026-04-24, batch_generation_release_manifests_20260405) When adding `to_dict` methods to dataclasses, convert all Path fields to strings explicitly; `asdict()` does not call `__str__` on Path objects.
- (2026-04-24, batch_generation_release_manifests_20260405) State machines that write at start AND end of each step must read the persisted state back before advancing.
- (2026-04-24, batch_generation_release_manifests_202605)) Per-asset state updates must check the existing state before overwriting to preserve already-completed work when resuming interrupted jobs.
- (2026-04-24, batch_generation_release_manifests_202605) Bounded retry loops must check `asset_state.X_retries >= max_X_retries` before marking FAILED, not after incrementing.
- (2026-04-24, renderer_palette_refinement_20260424) Palette quantization must be deterministic: use fixed bucket boundaries rather than floating-point operations that depend on iteration order.
- (2026-04-25, batch_release_bundle_20260425) BatchOrchestrator._run_compiling now calls actual compile_program instead of stubbing. Family-specific fallback programs are needed since batch jobs don't write programs upfront (character_sheet→knight_guard.json, prop_or_fx_sheet→book_stack.json, tileset→library_floor.json).
- (2026-04-25, batch_release_bundle_20260425) BatchOrchestrator._run_candidate_loop now wires build_candidate_job + run_candidate_job for actual candidate generation. Must handle missing threshold packs gracefully with warning and continue.
- (2026-04-25, batch_release_bundle_20260425) Asset state selected_path must be tracked through candidate loop. The sheet.png path from result.selected_candidate is stored so exporter can find the actual rendered PNG.
- (2026-05-01, orchestrator_consolidation_20260426) When consolidating duplicate classes, extend the more feature-complete class (BatchOrchestrator) rather than delegating from the simpler one (BatchRunner). Delegation requires reimplementing state machine transitions, which is error-prone and hard to maintain.
- (2026-05-02, scene_primitive_library_20260425) Scene programs must use family="prop_sheet" (not "props") for prop tile sources. FAMILY_NAMES is the source of truth for valid family values.
- (2026-05-02, scene_primitive_library_20260425) Scene primitive source.png dimensions must fit within the scene canvas; oversized tiles (512x512 in a 256x192 canvas) cause placement intrusions. Resize source images to match canvas scale before adding to library.
- (2026-05-02, critic_calibration_cli_20260425) ThresholdPack is a frozen dataclass; use dataclasses.replace() to create modified copies rather than mutating in place.
- (2026-05-02, directional_character_sheets_20260502) Adding a new compiler family requires: dataclass program type, layout mode constant, _load_*_program parser, _compile_* function, and wire into CompilerRegistry.definitions. When adding new family to FAMILY_NAMES, update corpus_manifest.json and test manifests that hardcode the family list.
- (2026-05-03, effect_overlay_pipeline_20260502) effect_sheet primitive_ids may be empty; use _require_string_tuple (allows empty) instead of _require_string_list (requires non-empty). New compiler families need EFFECT_LAYOUT_MODE, EffectSheetProgram dataclass with EffectSpec, _load_effect_sheet_program parser, _compile_effect_sheet function, and registry wiring.
- (2026-05-03, batch_entity_generation) PromptParser regex _COUNT_RE must use simple `(\d+)` pattern; complex patterns with specific word lists miss numeric counts when noun isn't in the list.
- (2026-05-03, batch_entity_generation) PaletteVariator needs multiple ramp variants per base ramp for distinct palettes; single-hash approach doesn't produce enough variation.
- (2026-05-03, bundle_system) Bundle export should not require all categories — bundles support incremental building and incomplete bundles are valid for export.
