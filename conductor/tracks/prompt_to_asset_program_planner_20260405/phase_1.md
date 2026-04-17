# Phase 1: Interfaces and Schemas

**Status**: Complete

## What was implemented

### Provider Interface (`src/asf/planner/provider.py`)

- `PlannerProvider` abstract base class defining the provider contract
- `ProviderResponse` dataclass for structured responses
- `PlannerTrace` TypedDict for request tracing (provider, model, token counts, raw response)
- `ProviderConfig` TypedDict for configuration (api_key, model, base_url, max_retries, timeout)
- `ProviderParseError` and `ProviderAPIError` for error handling
- Concrete implementations can subclass `PlannerProvider` and implement `submit_prompt()` and `provider_name`

### Schema Definitions (`src/asf/planner/schemas.py`)

**Asset Family Enums**:
- `AssetFamily`: `CHARACTER_SHEET`, `PROP_OR_FX_SHEET`, `TILESET`, `BACKGROUND_SCENE`

**Program Dataclasses**:
- `CharacterSheetProgram`: entity_type, archetype, directions, animations, palette_ramp, primitive_references, presentation_surface
- `PropOrFxSheetProgram`: prop_type, layout_mode, palette_ramp, primitive_references, presentation_surface
- `TilesetProgram`: tile_type, layout_mode, tile_categories, palette_ramp, primitive_references, presentation_surface
- `BackgroundSceneProgram`: scene_type, parallax_layers, palette_ramp, primitive_references, presentation_surface

**Supporting Types**:
- `PaletteRamp`: primary, secondary, accent
- `PrimitiveReference`: family, subtype, primitive_id
- `ThemePackReference`: theme_id, motif_ids
- `CharacterDirection`: FACING_UP, FACING_DOWN, FACING_CAMERA
- `TilesetLayout`: TILE_ATLAS, TILE_STRIP
- `PresentationSurfaceType`: RUNTIME_SHEET, PARALLAX_LAYER, LOADING_SURFACE, COVER

**Brief Schemas**:
- `UserBrief`: request, family, style_pack, theme_pack, constraints
- `BatchBrief`: request, families, style_pack, theme_pack, shared_constraints, per_asset_constraints
- `BatchPlannerManifest`: manifest_id, brief, programs, trace_path, metadata

**Validation and Serialization**:
- `SchemaValidationError` for validation failures
- `serialize_program()` function for JSON serialization
- `write_program()` function for disk output

### Tests (`tests/test_planner_schemas.py`)

12 tests covering:
- Program dataclass defaults and construction
- Serialization of programs with and without theme packs
- Write/read round-trip
- Brief schema construction
- Schema validation error handling

## Files created

- `src/asf/planner/__init__.py` - Public API exports
- `src/asf/planner/provider.py` - Provider interface
- `src/asf/planner/schemas.py` - All schema definitions
- `tests/test_planner_schemas.py` - Unit tests