# Specification

## Overview

Build the pipeline for non-core runtime surfaces required by the
`advantage-games` series. This includes cover surfaces, loading/start
backgrounds, parallax layer bundles, and UI-support atlases. These outputs are
not incidental polish; they are shipped assets already used by the downstream
game catalog and game runtimes.

This track also defines how gameplay promo stills are derived so they do not
become ad hoc art requests.

## Dependencies

- Recommended prior track: `style_canon_annotation_system_20260405`
- Recommended prior track: `primitive_library_promotion_pipeline_20260405`
- Recommended prior track: `asset_family_compiler_framework_20260405`
- Recommended prior track: `scene_layout_background_assembler_20260405`
- Recommended prior track: `candidate_generation_critic_loop_20260405`

## Functional Requirements

### FR1: Presentation and UI Family Schemas

- Define strict schemas for:
  - `cover_surface`
  - `loading_surface`
  - `parallax_layer_set`
  - `ui_sheet`
  - `promo_capture_job`
- Each schema must be machine-readable and validated before generation.

### FR2: Cover and Loading Surface Generation

- Generate cover and loading surfaces from approved runtime assets, scene
  backgrounds, and templated composition rules.
- Cover generation must support:
  - title-safe composition zones
  - focal subject selection
  - background/foreground layering
  - readable negative space for future text overlays

### FR3: Parallax Layer Set Generation

- Generate coordinated parallax layer bundles for scrollers and flight games.
- Each set must include at least:
  - top/far layer
  - middle layer
  - bottom/near layer
- The layers must be stylistically coordinated but visually separable by depth.

### FR4: UI Sheet Generation

- Generate support sheets or atlases for runtime UI use cases.
- Initial supported examples should include:
  - item or icon sheets
  - panel/ornament strips
  - stateful UI components where the downstream runtime already uses atlases

### FR5: Promo Capture Workflow

- Define a deterministic workflow to derive gameplay promo stills from running
  games or compiled scene outputs.
- Promo still generation must record source assets and capture conditions so the
  outputs remain reproducible and auditable.

### FR6: Surface Manifests

- Export manifests that tie each surface back to:
  - source assets or scene manifests
  - compiler/pipeline version
  - layout template
  - theme pack

## Non-Functional Requirements

- Surfaces must stay consistent with the global style canon and game-specific
  theme packs.
- Cover and loading surfaces must be deterministic for identical inputs.
- Promo still derivation must prefer replayable capture flows over manual image
  editing.
- Surface manifests and outputs must be ingestible by the candidate-generation
  and critic-loop tracks without ad hoc adapters.

## Deliverables

- Presentation/UI schemas
- Cover and loading surface generator
- Parallax layer set generator
- UI-sheet generator
- Promo capture workflow and manifests
- Sample outputs aligned to at least one `advantage-games` title family
- Tests for validation, determinism, and manifest export

## Acceptance Criteria

- A cover surface can be generated from a game bundle manifest deterministically.
- A loading surface can be generated from a theme and scene manifest.
- A parallax layer set is generated as a coordinated top/middle/bottom bundle.
- A UI sheet can be generated and exported with metadata.
- A promo still can be derived by a reproducible capture or render path with an
  attached manifest.
- Generated surface manifests can be handed to the candidate loop without
  manual rewriting.

## Out of Scope

- Human review UI implementation
- LLM planner internals
- Batch-orchestration internals beyond consuming generated surface manifests
