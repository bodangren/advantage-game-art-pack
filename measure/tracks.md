# Project Tracks

This file tracks all major tracks for the project.
Tracks dated before 2026-07-16 describe the retired Python/raster factory and
remain only as historical records. The active product is the TypeScript 7
vinext SVG desk.

- [x] **Track: Style canon and annotation system**
  *Link: [./measure/archive/style_canon_annotation_system_20260405/](./measure/archive/style_canon_annotation_system_20260405/)*

---

- [x] **Track: Primitive library and promotion pipeline**
  *Link: [./measure/archive/primitive_library_promotion_pipeline_20260405/](./measure/archive/primitive_library_promotion_pipeline_20260405/)*

---

- [x] **Track: Asset family compiler framework**
  *Link: [./measure/archive/asset_family_compiler_framework_20260405/](./measure/archive/asset_family_compiler_framework_20260405/)*

---

- [x] **Track: Candidate generation and critic loop**
  *Link: [./measure/archive/candidate_generation_critic_loop_20260405/](./measure/archive/candidate_generation_critic_loop_20260405/)*

---

- [x] **Track: Scene layout and background assembler**
  *Link: [./measure/archive/scene_layout_background_assembler_20260405/](./measure/archive/scene_layout_background_assembler_20260405/)*

---

- [x] **Track: Presentation surfaces and UI pipeline**
  *Link: [./measure/archive/presentation_surfaces_ui_pipeline_20260405/](./measure/archive/presentation_surfaces_ui_pipeline_20260405/)*

---

- [x] **Track: Review queue foundation**
  *Link: [./measure/archive/review_queue_foundation_20260405/](./measure/archive/review_queue_foundation_20260405/)*

---

- [x] **Track: Prompt-to-asset-program planner**
  *Link: [./measure/archive/prompt_to_asset_program_planner_20260405/](./measure/archive/prompt_to_asset_program_planner_20260405/)*
  Provider abstraction, prompt builder, structured parser, repair loop, eval fixtures, and CLI.

---

- [x] **Track: Critic calibration and auto-approval policy**
  *Link: [./measure/archive/critic_stack_auto_approval_20260405/](./measure/archive/critic_stack_auto_approval_20260405/)*
  Shared critic-result schema, policy decision types, family adapters, threshold packs for scene/presentation families, drift monitoring, review integration hooks.*

---

- [x] **Track: Batch generation and release manifests**
  *Link: [./measure/archive/batch_generation_release_manifests_20260405/](./measure/archive/batch_generation_release_manifests_20260405/)*
  Batch job schema, artifact layout, state machine, orchestrator with bounded retries, release bundle exporter, and seeded batch briefs for library and ruins mini-game themes.

---

- [x] **Track: Renderer Palette Refinement**
  *Fix renderer-side palette refinement so candidate loop survivors pass palette-limit structural check instead of always regenerating*
  *Link: [./archive/renderer_palette_refinement_20260424/](./archive/renderer_palette_refinement_20260424/)*

---

- [x] **Track: Review App Auth and Image Serving**
  *Add authentication and static image serving to the review queue FastAPI app*
  *Link: [./archive/review_app_auth_and_images_20260424/](./archive/review_app_auth_and_images_20260424/)*

---

- [x] **Track: LLM Planner Provider Implementations**
  *Implement concrete OpenAI and Anthropic provider adapters for the prompt-to-asset-program planner*
  *Link: [./archive/llm_planner_provider_impl_20260424/](./archive/llm_planner_provider_impl_20260424/)*

---

- [x] **Track: Lighting renderer fixes**
  *Link: [./measure/archive/lighting_renderer_fixes_20260423/](./measure/archive/lighting_renderer_fixes_20260423/)*
  Fix lighting pass double-darken bug and layout resolver origin pile-up bug.

---

- [x] **Track: Promo Capture Scene Renderer**
  *Wire promo capture job to scene renderer so capture_conditions are honored instead of loading a static promo.png*
  *Link: [./archive/promo_capture_scene_renderer_20260425/](./archive/promo_capture_scene_renderer_20260425/)*

## Completed Tracks

- [x] **Track: Critic Metrics Performance Optimization**
  *Link: [./archive/critic_metrics_performance_20260514/](./archive/critic_metrics_performance_20260514/)*
  Reduce _candidate_metrics time by 75% via downsampling and caching to unblock reference calibration.

- [x] **Track: Batch Release Bundle Exporter**
  *Wire release bundle export to actual compiled PNGs from candidate loop*
  *Link: [./archive/batch_release_bundle_20260425/](./archive/batch_release_bundle_20260425/)*
- [x] **Track: Scene Primitive Library Expansion** *Link: [./archive/scene_primitive_library_20260425/](./archive/scene_primitive_library_20260425/)*
  *Scene primitives (floor_stone_01, wall_library_01, cobble_01, bookshelf_01, ruins_pillar_01, rubble_01) added to library and scene assembler.*
- [x] **Track: Batch Enemy & NPC Generation Pipeline** *Link: [./archive/batch_enemy_npc_generation_20260503/](./archive/batch_enemy_npc_generation_20260503/)*
  Natural-language prompt-driven batch generation of themed entity families with palette variation
- [x] **Track: Per-Game Asset Bundle System** *Link: [./archive/per_game_asset_bundles_20260503/](./archive/per_game_asset_bundles_20260503/)*
  Bundle manifest, validation, and export for game-ready asset packages
- [x] **Track: Review App Hardening & UX Improvements** *Link: [./archive/review_app_hardening_20260503/](./archive/review_app_hardening_20260503/)*
  Path-level auth exemptions, batch approve/reject, thumbnail grid, keyboard shortcuts
- [x] **Track: Extract Shared _utc_now Utility** *Link: [./archive/extract_shared_utc_now_20260503/](./archive/extract_shared_utc_now_20260503/)*
  Extract duplicated `_utc_now()` to shared `asf/utils.py` module
- [x] **Track: End-to-End LLM-to-Asset Pipeline**
  *Single-command `asf generate` that runs planner → compiler → critic → review → export with real LLM credentials.*
  *Link: [./measure/archive/e2e_llm_asset_pipeline_20260508/](./measure/archive/e2e_llm_asset_pipeline_20260508/)*
  *Status: Complete — `asf generate` CLI with --brief, --theme, --count, --provider, --dry-run; credentials module with env var/config file resolution; BatchOrchestrator.run_from_plan() for in-memory plan-to-orchestrator bridge; full pipeline wired.*
- [x] **Track: Critic Reference Calibration with Real Demo Assets**
  *Link: [./archive/critic_reference_calibration_20260508/](./archive/critic_reference_calibration_20260508/)*
  *Replace mocked baselines with real reference PNGs for all 10 families and recalibrate auto-approval thresholds.*
  *Link: [./measure/archive/critic_reference_calibration_20260508/](./measure/archive/critic_reference_calibration_20260508/)*
- [x] **Track: CLI Resume Flag and LIVE_LLM Smoke Test** *Link: [./archive/cli_resume_smoke_test_20260509/](./archive/cli_resume_smoke_test_20260509/)* — Implement `--resume` for `asf generate` and add automated live LLM smoke test
  *Status: Complete — `--resume <job_id>` flag added to `asf generate`; orchestator.resume() wired to CLI; test_live_llm_smoke.py with 4 tests (skips gracefully without API key).*
- [x] **Track: Critic Calibration CLI**
  *Add recalibrate subcommand to candidate CLI for scripted threshold adjustment*
  *Link: [./archive/critic_calibration_cli_20260425/](./archive/critic_calibration_cli_20260425/)*
  *Status: Complete — Added `recalibrate --family X` CLI command for scripted threshold adjustment; calibrate command now accepts --family filter*
- [x] **Track: Review App Static File Serving**
  *Add static file serving to review app for actual image previews*
  *Link: [./archive/review_app_serving_20260425/](./archive/review_app_serving_20260425/)*
  *Status: Complete — StaticFiles mounted at /static for outputs directory; templates render actual images from rendered_files paths.*

- [x] **Track: Directional Character Sheet Renderer**
  *Multi-frame directional animation sheets (4/8-direction walk/idle/run) for the advantage-games series*
  *Link: [./archive/directional_character_sheets_20260502/](./archive/directional_character_sheets_20260502/)*
  *Status: Complete — DirectionalSheetProgram with directional_variants in style packs, direction-aware frame offsets, palette quantization, example programs, and CLI integration.*


- [x] **Track: Effect Overlay Generation Pipeline**
  *Standalone effect sheets and entity+effect compositing with blend modes*
  *Link: [./archive/effect_overlay_pipeline_20260502/](./archive/effect_overlay_pipeline_20260502/)*
  *Status: Complete — EffectSpec dataclass, effect_sheet family, _render_effect_frame, blend mode implementations (_blend_additive, _blend_screen, _blend_multiply), composite_effect_on_entity, effect_timing.json metadata, and CLI integration via `asf compile`.*
  *New files: programs/effect_sheet/poison_aura.json, programs/effect_sheet/ice_pulse.json*
  *Tests: EffectSheetProgramTest (9 tests) and EffectSpecTest (7 tests)*

- [x] **Track: Visual Refresh: Define Unique Identity**
  *Link: [./archive/visual_refresh_20260425/](./archive/visual_refresh_20260425/)*
  *Status: Complete*

- [x] **Track: Orchestrator Consolidation**
  *Link: [./archive/orchestrator_consolidation_20260426/](./archive/orchestrator_consolidation_20260426/)*
  Merge BatchRunner and BatchOrchestrator into single state machine. Consolidation complete - BatchOrchestrator is now the single source of truth, BatchRunner deprecated with warning.

---

- [x] **Track: Renderer Part Library Integration**
  *PartLibrary class stamps approved primitives onto rendered canvas; SpriteSpec gains optional part_library_refs field for primitive overlay. Backward compatible.*
  *Link: [./archive/renderer_part_library_integration_20260504/](./archive/renderer_part_library_integration_20260504/)*
  *Status: Complete — PartLibrary class, PartLibraryRef dataclass in specs.py, renderer integration with optional part_library parameter, tests passing.*

---

- [x] **Track: Wire Orchestrator Programs**
  *Wire `_generate_programs` and `_write_programs` into `_run_planning` stage so programs are written when planner_context is provided.*
  *Link: [./archive/wire_orchestrator_programs_20260504/](./archive/wire_orchestrator_programs_20260504/)*
  *Status: Complete — Methods now called in planning stage; guard checks planner_context exists before writing.*

---

- [x] **Track: Effect Sheet Palette Quantization**
  *EffectSheetProgram now accepts palette field; _compile_effect_sheet uses real palette and applies median-cut quantization.*
  *Link: [./archive/effect_sheet_palette_quantization_20260505/](./archive/effect_sheet_palette_quantization_20260505/)*
  *Status: Complete — Added palette field to EffectSheetProgram and JSON schema; effect sheet compiler now applies palette quantization.*

---

- [x] **Track: Presentation Surfaces Parallax Fix**
  *Replace pseudo-random offset with seeded deterministic hash-based offset for guaranteed edge seamlessness.*
  *Link: [./archive/presentation_parallax_fix_20260505/](./archive/presentation_parallax_fix_20260505/)*
  *Status: Complete — Replaced pseudo-random `(x_offset * 3) % canvas_w` with seeded hash-based offset; all tests passing.*

---

- [x] **Track: UI Sheet Bin Packing Optimization**
  *Implement best-fit decreasing bin packing for UI sheet layout instead of naive row-wrap*
  *Link: [./archive/ui_sheet_bin_packing_20260505/](./archive/ui_sheet_bin_packing_20260505/)*
  *Status: Complete — _bin_pack_layout function implements BFD algorithm; 7 unit tests pass; all 85 presentation_surfaces tests pass.*

- [x] **Track: Multi-Layout Pose Sheet Expansion (3×2, 3×4, Custom Grids)**
  *Link: [./archive/multi_layout_pose_sheet_expansion_20260506/](./archive/multi_layout_pose_sheet_expansion_20260506/)*
  Expand compiler to support arbitrary row/column layouts for downstream game assets.
  *Status: Complete — Added pose_sheet_3x2 and pose_sheet_3x4 to LAYOUT_TYPES; updated _frame_drift in canon.py and candidate_loop.py to handle new grid dimensions; canon manifest updated; test suite passes.*

- [x] **Track: Projectile, Pickup, and Interactable Compiler Family**
  *Link: [./archive/projectile_pickup_interactable_compiler_20260506/](./archive/projectile_pickup_interactable_compiler_20260506/)*
  Dedicated compiler family for directional projectiles and single-image pickups/interactables.
  *Status: Complete — Families registered, ProjectileSheetProgram and PickupSheetProgram implemented, primitives added, programs created, all tests pass.*

- [x] **Track: Presentation Surface-to-Scene Assembler Integration**
  *Link: [./archive/presentation_surface_scene_integration_20260506/](./archive/presentation_surface_scene_integration_20260506/)*
  Align cover/loading backgrounds with real scene assembler output instead of hardcoded paths.
   *Status: Complete — rendered_scene_image parameter added to assemble_cover_surface and assemble_loading_surface; backward compatible fallback to base.png convention; tests pass.*

- [x] **Track: Composable SVG Asset Factory Pivot**
  *Link: [./archive/composable_svg_assets_20260716/](./archive/composable_svg_assets_20260716/)*
  TypeScript 7/vinext SVG-first reusable parts, named-anchor composition, deterministic metadata, and Phaser load-time texture exports. The previous Python/raster project was retired; the browser desk and compiler contract are complete.
  *Status: Complete — engine, catalog, and desk shipped; 79/79 tests, typecheck, and build re-verified green in the 2026-07-17 review.*

- [x] **Track: Animation Timelines and Atlas Packing**
  *Link: [./archive/animation_timeline_atlas_packing_20260716/](./archive/animation_timeline_atlas_packing_20260716/)*
  *Status: Complete — deterministic timeline specs with per-frame overrides and SHA-256 digests (`src/lib/timeline.ts`), row-major atlas packer with inlined palettes and sheet safety guard (`src/lib/atlas.ts`), checked-in walk-cycle example with frozen fixtures, desk animation dock, and post-Green sentinel. 48/48 tests, typecheck, and build green.*

- [x] **Track: Directional Character Sheets**
  *Link: [./archive/directional_character_sheets_20260716/](./archive/directional_character_sheets_20260716/)*
  *Status: Complete — 4/8-way directional spec with declared flips (`src/lib/directional.ts`), per-direction timelines compiled and packed via the timeline/atlas pipeline, digest-pinned sheet manifest, checked-in knight walk+idle example with frozen manifest, and desk direction dock with selector + playback. 68/68 tests, typecheck, and build green.*

- [x] **Track: Per-Game Asset Bundles**
  *Link: [./archive/per_game_asset_bundles_20260716/](./archive/per_game_asset_bundles_20260716/)*
  *Status: Complete — strict bundle manifest with slot enum and registry-based reference resolution (`src/lib/bundles.ts`), compile-every-reference validation with slot/ref error context, deterministic export tree (`bundle/<game>/<slot>/<asset>.svg` + bundle.json digests + audit report), and a seeded library-quest example. 79/79 tests, typecheck, and build green.*

## Retired (never started — Python/raster era)

- [-] **Track: Release Bundle PNG Export** *Link: [./measure/archive/release_bundle_png_export_20260508/](./measure/archive/release_bundle_png_export_20260508/)*
- [-] **Track: Review App Batch Approve/Reject Workflow** *Link: [./measure/archive/review_app_batch_workflow_20260508/](./measure/archive/review_app_batch_workflow_20260508/)*
- [-] **Track: Critic Metrics Performance Optimization** *Link: [./measure/archive/critic_metrics_performance_optimization_20260524/](./measure/archive/critic_metrics_performance_optimization_20260524/)*
- [-] **Track: Interactable and Book Compiler Families** *Link: [./measure/archive/interactable_and_book_compiler_20260524/](./measure/archive/interactable_and_book_compiler_20260524/)*

## Active Tracks (TypeScript SVG desk)

- [x] **Track: Mockup-Driven Part Art Pass**
  *Link: [./tracks/mockup_art_pass_20260717/](./tracks/mockup_art_pass_20260717/)*
  mmx-generated pixel-art reference mockups checked in with a manifest; palette-ramp shading vocabulary (light/base/shadow, flat banded shapes, dither — no blur/filters); rework all shipped part sets toward the mockups with browser verification. Depends on render_api_20260717.

- [ ] **Track: Tile and Scene Composition Engine**
  *Link: [./tracks/tile_scene_composition_20260717/](./tracks/tile_scene_composition_20260717/)*
  Scene spec with seam-safe tile grids, ordered layers, and prop placement compiled through the existing engine; deterministic scene SVG + manifest, parallax layer-set export, checked-in examples. Depends on part_library_expansion_20260717.

- [ ] **Track: Phaser Integration Harness**
  *Link: [./tracks/phaser_integration_harness_20260717/](./tracks/phaser_integration_harness_20260717/)*
  Minimal Phaser 4 consumer proving the export contract: versioned loader-config module, harness scene loading a bundle export (composition textures + walk-cycle atlas), deterministic export fixture and Node smoke test. Depends on per_game_asset_bundles_20260716.

- [ ] **Track: LLM Part and Spec Authoring Loop**
  *Link: [./tracks/llm_part_authoring_20260717/](./tracks/llm_part_authoring_20260717/)*
  Provider-abstracted, catalog-grounded authoring loop with bounded validate-and-repair retries; authored parts/specs land in a staging area, mock provider and eval fixtures keep tests deterministic. Depends on part_library_expansion_20260717.
