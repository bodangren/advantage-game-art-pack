# Project Tracks

This file tracks all major tracks for the project.

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

## Upcoming Tracks

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
- [x] **Track: Extract Shared _utc_now Utility** *Link: [./tracks/extract_shared_utc_now_20260503/](./tracks/extract_shared_utc_now_20260503/)*
  Extract duplicated `_utc_now()` to shared `asf/utils.py` module
- [x] **Track: UI Sheet Bin Packing Optimization**
  *Implement best-fit decreasing bin packing for UI sheet layout instead of naive row-wrap*
  *Link: [./tracks/ui_sheet_bin_packing_20260505/](./tracks/ui_sheet_bin_packing_20260505/)*
  *Status: Complete — _bin_pack_layout function implements BFD algorithm; 7 unit tests pass; all 85 presentation_surfaces tests pass.*

- [ ] **Track: Next feature** (none pending — no current_directive.md found)
- [x] **Track: Critic Calibration CLI**
  *Add recalibrate subcommand to candidate CLI for scripted threshold adjustment*
  *Link: [./archive/critic_calibration_cli_20260425/](./archive/critic_calibration_cli_20260425/)*
  *Status: Complete — Added `recalibrate --family X` CLI command for scripted threshold adjustment; calibrate command now accepts --family filter*
- [x] **Track: Review App Static File Serving**
  *Add static file serving to review app for actual image previews*
  *Link: [./tracks/review_app_serving_20260425/](./tracks/review_app_serving_20260425/)*
  *Status: Complete — StaticFiles mounted at /static for outputs directory; templates render actual images from rendered_files paths.*

- [x] **Track: Directional Character Sheet Renderer**
  *Multi-frame directional animation sheets (4/8-direction walk/idle/run) for the advantage-games series*
  *Link: [./tracks/directional_character_sheets_20260502/](./tracks/directional_character_sheets_20260502/)*
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
  *Link: [./tracks/renderer_part_library_integration_20260504/](./tracks/renderer_part_library_integration_20260504/)*
  *Status: Complete — PartLibrary class, PartLibraryRef dataclass in specs.py, renderer integration with optional part_library parameter, tests passing.*

---

- [x] **Track: Wire Orchestrator Programs**
  *Wire `_generate_programs` and `_write_programs` into `_run_planning` stage so programs are written when planner_context is provided.*
  *Link: [./tracks/wire_orchestrator_programs_20260504/](./tracks/wire_orchestrator_programs_20260504/)*
  *Status: Complete — Methods now called in planning stage; guard checks planner_context exists before writing.*

---

- [x] **Track: Effect Sheet Palette Quantization**
  *EffectSheetProgram now accepts palette field; _compile_effect_sheet uses real palette and applies median-cut quantization.*
  *Link: [./tracks/effect_sheet_palette_quantization_20260505/](./tracks/effect_sheet_palette_quantization_20260505/)*
  *Status: Complete — Added palette field to EffectSheetProgram and JSON schema; effect sheet compiler now applies palette quantization.*

---

- [x] **Track: Presentation Surfaces Parallax Fix**
  *Replace pseudo-random offset with seeded deterministic hash-based offset for guaranteed edge seamlessness.*
  *Link: [./tracks/presentation_parallax_fix_20260505/](./tracks/presentation_parallax_fix_20260505/)*
  *Status: Complete — Replaced pseudo-random `(x_offset * 3) % canvas_w` with seeded hash-based offset; all tests passing.*

---

- [x] **Track: UI Sheet Bin Packing Optimization**
  *Implement best-fit decreasing bin packing for UI sheet layout instead of naive row-wrap*
  *Link: [./tracks/ui_sheet_bin_packing_20260505/](./tracks/ui_sheet_bin_packing_20260505/)*
  *Status: Complete — _bin_pack_layout function implements BFD algorithm; 7 unit tests pass; all 85 presentation_surfaces tests pass.*
