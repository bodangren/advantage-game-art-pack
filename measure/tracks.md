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

- [x] **Track: SVG Part Library Expansion**
  *Link: [./archive/part_library_expansion_20260717/](./archive/part_library_expansion_20260717/)*
  *Status: Complete — archetype part sets (goblin + spectre enemies, dragon boss, prisoner NPC) plus prop/fx parts grown 4 → 26 catalog entries, tag-based selection (`selectParts`/`catalogEntries`), seeded set compositions, and demand-audit-grounded archetype choices. Tests, typecheck, and build green.*

- [x] **Track: Composition Render API**
  *Link: [./archive/render_api_20260717/](./archive/render_api_20260717/)*
  *Status: Complete — render module with palette inlining and PNG rasterization, `/api/render` route covered by node-level mock req/res tests plus live curl smoke (SVG, PNG, 400, 405). Tests, typecheck, and build green.*

- [x] **Track: Mockup-Driven Part Art Pass**
  *Link: [./archive/mockup_art_pass_20260717/](./archive/mockup_art_pass_20260717/)*
  *Status: Complete as historical prototype evidence only — curated MMX mockups
  and the derived SVG pass are not production-authorized references or pack
  members. Current downstream production requires accepted ontology hashes and
  its built-in image generator. The archived mechanical tests remain historical
  evidence; current visual admission remains closed.*

## Retired (never started — Python/raster era)

- [-] **Track: Release Bundle PNG Export** *Link: [./measure/archive/release_bundle_png_export_20260508/](./measure/archive/release_bundle_png_export_20260508/)*
- [-] **Track: Review App Batch Approve/Reject Workflow** *Link: [./measure/archive/review_app_batch_workflow_20260508/](./measure/archive/review_app_batch_workflow_20260508/)*
- [-] **Track: Critic Metrics Performance Optimization** *Link: [./measure/archive/critic_metrics_performance_optimization_20260524/](./measure/archive/critic_metrics_performance_optimization_20260524/)*
- [-] **Track: Interactable and Book Compiler Families** *Link: [./measure/archive/interactable_and_book_compiler_20260524/](./measure/archive/interactable_and_book_compiler_20260524/)*

## Active and Upcoming Tracks

- [~] **SVG Part Art Quality Iteration**
  _Link: [./tracks/svg_art_quality_iteration_20260717/](./tracks/svg_art_quality_iteration_20260717/)_
  Re-author/rebuild SVG-native parts against valid generated references. Current
  outputs remain barred from production until visual acceptance.

- [~] **Tile and Scene Composition Engine**
  _Link: [./tracks/tile_scene_composition_20260717/](./tracks/tile_scene_composition_20260717/)_
  Pixel-owned SVG-native tiles, scenes, and parallax exports. The S2 browser,
  seam, and composition scaffold passes mechanically but its 24 candidates and
  eight exemplars failed Kimi visual admission. S3 generation is blocked on the
  downstream accepted ontology hashes, a provenance-capable built-in-generator
  contract, and reference-board approval. The strict draft board validator is
  implemented and green, but all current outputs remain non-shipping.

- [b] **Phaser Integration Harness** (blocked:admitted-model-five-clips-and-pack)
      _Link: [./tracks/phaser_integration_harness_20260717/](./tracks/phaser_integration_harness_20260717/)_
      Downstream mixed-pack consumer and export harness; strict temporal staging
      exists, but admitted playback inputs and browser/Kimi acceptance do not.

- [b] **LLM Part and Spec Authoring Loop** (blocked:accepted-reference-assets-and-production-contract)
      _Link: [./tracks/llm_part_authoring_20260717/](./tracks/llm_part_authoring_20260717/)_
      SVG-native authoring remains local and semantic 3D requests route to public
      MCP ingestion.

- [b] **Presentation Surfaces: UI Atlases, Covers, and Loading Screens** (blocked:tile-scene-and-import-acceptance)
      _Link: [./tracks/presentation_surfaces_20260718/](./tracks/presentation_surfaces_20260718/)_
      SVG-native layouts that may reference validated imported artifacts.

- [~] **Fantasy Asset Forge MCP Pack Ingestion**
      _Link: [./tracks/fantasy_asset_forge_mcp_pack_ingestion_20260722/](./tracks/fantasy_asset_forge_mcp_pack_ingestion_20260722/)_
      Public MCP discovery/retrieval, negotiated static interchange, immutable
      imports, exact-five temporal reconstruction, and deterministic non-shipping
      work-order planning. The 26 frames, five pose sheets, atlas, source GLB,
      phase-bearing bundle, public chunks, and local five-clip playback pass the
      mechanical qualification boundary; this baseline is not the final pose or
      animation library. The current S13 model still fails visual admission, and
      production roster freeze, pack admission, downstream playback, and final
      Kimi acceptance remain blocked by the accepted-model and downstream
      ontology/policy gates.

- [ ] **Repository Test Suite Repair: Frozen Digest and Palette Declaration**
      _Link: [./tracks/test_suite_repair_20260724/](./tracks/test_suite_repair_20260724/)_
      Repair the two known repository-wide failures (one frozen composition digest
      mismatch and one `cloth-light` / `cloth-shadow` palette-declaration
      mismatch) without masking, skipping, or regressing the green Forge
      ingestion slice. Unblocks a green baseline every other track depends on.

- [ ] **Cross-Output Determinism Regression Suite**
      _Link: [./tracks/determinism_regression_suite_20260724/](./tracks/determinism_regression_suite_20260724/)_
      Always-on byte-determinism guard proving composed SVG, JSON manifests,
      packed atlases, bundle exports, and rasterized PNGs are byte-identical
      across clean-state runs; detects frozen-digest drift early instead of via
      manual browser review. Depends on the repaired green baseline.

- [ ] **Continuous Integration Quality Gate Pipeline**
      _Link: [./tracks/ci_quality_gate_pipeline_20260724/](./tracks/ci_quality_gate_pipeline_20260724/)_
      GitHub Actions pipeline running `typecheck`, `test`, and `build` on every
      PR and push, with live/external `*.live.test.ts` tests isolated behind an
      opt-in secret-gated job so default CI stays green. Enforces the repaired
      baseline continuously.

- [ ] **Executable Contract Reference Documentation**
      _Link: [./tracks/contract_reference_documentation_20260724/](./tracks/contract_reference_documentation_20260724/)_
      Consolidated, auditable reference for every active versioned contract
      (forge interchange v1, education-app pack profiles v1/v2, temporal render
      artifacts v1, batch artifacts v1, five-clip authoring, staging plans,
      dual-theme demand catalog v2, theme-pack production plan v1) with field
      schemas, validation rules, and checked-in examples validated against the
      real validators so docs cannot drift from code.
