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
- (2026-04-05, candidate_generation_critic_loop_20260502) Demo assets are for canon extraction and critic calibration, not direct pixel sources for newly generated outputs.
- (2026-04-05, primitive_library_promotion_pipeline_20260405) Keep primitive manifests path-based and deterministic; rebuilds should sort by family, subtype, and primitive_id so seed data stays auditable in git.

## Planning Improvements

- (2026-04-05, sprite_compiler_mvp_20260405) Split roadmap into renderer foundation, richer part libraries, and batch orchestration to avoid scope collapse.
- (2026-04-17, prompt_to_asset_program_planner_20260405) Define provider abstraction before concrete implementations; this keeps the interface stable while allowing OpenAI/Anthropic/etc. to be swapped in.
- (2026-04-24, llm_planner_provider_impl_20260424) urllib urlopen context manager needs both `__enter__` and `__exit__` mocked; HTTP 429 is the only retryable error; Anthropic uses `input_tokens`/`output_tokens` keys.
- (2026-04-24, review_app_auth_and_images_20260424) FastAPI Depends(require_auth) applies to all routes; use BaseHTTPMiddleware for path exemptions. StaticFiles must mount after middleware in on_startup. rendered_files in SQLite need parsing before templates.
- (2026-05-02, review_app_serving_20260425) FastAPI Form data requires python-multipart package separately from fastapi.
- (2026-04-23, lighting_renderer_fixes_20260423) Lighting double-darken: single combined ambient+directional factor applied once; shadow direction is OPPOSITE quadrant from light source. Layout resolver origin pile-up when all props get same bounds.
- (2026-04-24, batch_generation_release_manifests_20260405) `to_dict` on dataclasses with Path fields needs explicit str() conversion. State machines must read persisted state back before advancing. Per-asset updates must check existing state before overwriting.
- (2026-04-24, renderer_palette_refinement_20260424) Palette quantization must be deterministic: fixed bucket boundaries rather than floating-point depending on iteration order.
- (2026-04-25, batch_release_bundle_20260425) Family-specific fallback programs needed since batch jobs don't write programs upfront. Asset state selected_path must be tracked through candidate loop.
- (2026-05-01, orchestrator_consolidation_20260426) When consolidating duplicate classes, extend the more feature-complete class (BatchOrchestrator) rather than delegating from the simpler one (BatchRunner).
- (2026-05-02, scene_primitive_library_20260425) Scene programs must use family="prop_sheet" (not "props"). Scene primitive source.png dimensions must fit within scene canvas.
- (2026-05-02, critic_calibration_cli_20260425) ThresholdPack is frozen dataclass; use dataclasses.replace() to create modified copies.
- (2026-05-02, directional_character_sheets_20260502) Adding new compiler family requires: dataclass program type, layout mode constant, _load_*_program parser, _compile_* function, and registry wiring. When adding family to FAMILY_NAMES, update corpus_manifest.json and test manifests.
- (2026-05-03, batch_entity_generation) PromptParser regex _COUNT_RE must use simple `(\d+)` pattern; complex patterns miss counts when noun not in list. PaletteVariator needs multiple ramp variants per base ramp for distinct palettes.
- (2026-05-03, bundle_system) Bundle export should not require all categories — bundles support incremental building and incomplete bundles are valid for export.
- (2026-05-03, extract_shared_utc_now) When refactoring duplicated utilities, prefer importing from a shared module over removing the duplicate definition; tests verify the shared import works correctly before removing the local copies.
