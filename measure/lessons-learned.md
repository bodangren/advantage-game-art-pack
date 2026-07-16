# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or
> below 50 lines.

## Architecture & Design

- (2026-04-05, sprite_compiler_mvp_20260405) Start with typed specs and one renderer path; keeps asset contract stable while part library is thin.
- (2026-04-05, style_canon_annotation_system_20260405) Treat backgrounds as scene assembly from approved tiles, props, and layout templates, not another sprite-sheet renderer.
- (2026-04-05, presentation_surfaces_ui_pipeline_20260405) Track covers, loading backgrounds, parallax layers, and UI atlases explicitly for downstream game series.

## Recurring Gotchas

- (2026-07-16, composable_svg_assets_20260716) The active project is TypeScript 7 + vinext; use Vitest and browser smoke checks rather than Python tooling.
- (2026-07-16, animation_timeline_atlas_packing_20260716) validateSvgSource bans `<style>` and `data-*` attributes, so packed sheets cannot reuse it directly: the atlas inlines palette refs (no `<style>`/`var()` in the sheet) and validates against an engine-mirroring allowlist with a documented `data-part-id`/`data-slot` delta.
- (2026-07-16, animation_timeline_atlas_packing_20260716) Frozen contract fixtures must carry every input the frozen output needs: the P1 atlas fixture froze Phaser key "walk-cycle" without a timeline id field and was unachievable until the schema gained `id`. Author fixture inputs from the outputs they must produce.
- (2026-07-16, animation_timeline_atlas_packing_20260716) Tests that spawn a child `vitest run` need an explicit `testTimeout`; the child reloads every test file and outgrows the 5s default as the suite grows.
- (2026-07-16, directional_character_sheets_20260716 + per_game_asset_bundles_20260716) Extend the pipeline at its boundaries, not its internals: declared flips wrap the compiled frame SVG (mirror group + re-digest) and bundle refs resolve through a code-side registry, so timeline/atlas/compiler modules shipped unchanged.

## Patterns That Worked Well

- (2026-04-05, sprite_compiler_mvp_20260405) Treat sample PNGs as reference material while keeping runtime output generated entirely from code + specs.
- (2026-04-05, candidate_generation_critic_loop_20260502) Demo assets are for canon extraction and critic calibration, not direct pixel sources for newly generated outputs.
- (2026-04-05, primitive_library_promotion_pipeline_20260405) Keep primitive manifests path-based and deterministic; rebuilds should sort by family, subtype, and primitive_id so seed data stays auditable in git.

## Planning Improvements

- (2026-04-05, sprite_compiler_mvp_20260405) Split roadmap into renderer foundation, richer part libraries, and batch orchestration to avoid scope collapse.
- (2026-04-17, prompt_to_asset_program_planner_20260405) Define provider abstraction before concrete implementations; this keeps the interface stable while allowing OpenAI/Anthropic/etc. to be swapped in.
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
- (2026-05-03, scene_layout_background_assembler) When a tile has primitive.json but no source.png, log a WARNING with tile_id, family, and primitive_id so the omission is visible in logs rather than silently dropping tiles from renders.
- (2026-05-04, renderer_part_library_integration) Circular imports between modules (specs↔part_library, canon↔specs) can be resolved by: (1) avoid top-level imports when possible, (2) move imports inside functions for late binding, or (3) define shared dataclasses in a low-level module without imports. PartLibraryRef defined in specs.py to avoid circular dependency.
- (2026-05-04, wire_orchestrator_programs_20260504) When wiring unused methods into a state machine, guard calls with relevant context checks — e.g., `if self.planner_context:` prevents breaking backward compatibility when planner integration is not configured.
- (2026-05-05, effect_sheet_palette_quantization_20260505) When adding palette to a dataclass that already has a style_pack field, the style pack loads correctly even with a dummy palette; but quantization needs the real palette from the program. Effect sheet required adding palette field to EffectSheetProgram dataclass and the JSON schema.
- (2026-05-05, presentation_parallax_fix_20260505) Seeded hash-based offsets (using hash of program_id + layer_role) provide deterministic, analytically reproducible tile placement for parallax tiling instead of pseudo-random offsets.
- (2026-05-05, ui_sheet_bin_packing_20260505) Best-fit decreasing (BFD) bin packing: sort tiles by area descending, place each in best-fit row or new row. Row class with __slots__ keeps memory low; overflow check after layout pass using sum of final row positions.
- (2026-05-06, multi_layout_pose_sheet_expansion) When adding new layout types to LAYOUT_TYPES, must also update corpus_manifest.json taxonomy.layout_types AND the test helper _write_minimal_canon_project, else validation tests fail. _frame_drift in candidate_loop.py also needs updating to handle the new grid dimensions.
- (2026-07-16, project_replacement) The previous Python/raster factory was intentionally retired. Do not reintroduce compatibility layers; port only behavior that supports the SVG product contract.
- (2026-05-06, projectile_pickup_interactable_compiler) When adding new compiler families, update both canon.FAMILY_NAMES (for corpus validation) and compilers.SUPPORTED_COMPILER_FAMILIES (for compilation). Projectile rotation uses PIL Image.rotate with DIRECTION_ANGLES mapping. Test helpers must be updated when adding families/layouts.
- (2026-05-09, cli_resume_smoke_test) When adding optional --resume to a CLI subcommand that requires --brief, make --brief optional at parser level and validate at runtime; return early when resuming so brief is not needed. Create orchestrator with job_root pointing to same location used by run_from_plan (`.asf/generate`), not a different path.
- (2026-05-09, critic_reference_calibration) FAMILY_NAMES naming differs from compilers.py (prop_or_fx_sheet vs prop_sheet/fx_sheet, parallax_layer_set vs parallax_layer). Presentation surfaces use surface_family field. ReferenceAssetLoader provides clean abstraction for loading reference PNGs with family-to-layout-type mapping.
