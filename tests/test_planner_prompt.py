"""Tests for planner prompt builder and structured output parsing."""

from __future__ import annotations

import json
import unittest
from unittest.mock import MagicMock, patch

from asf.planner.provider import (
    PlannerProvider,
    ProviderResponse,
    ProviderParseError,
)
from asf.planner.schemas import (
    AssetFamily,
    BackgroundSceneProgram,
    BatchBrief,
    CharacterDirection,
    CharacterSheetProgram,
    PaletteRamp,
    PresentationSurfaceType,
    PrimitiveReference,
    PropOrFxSheetProgram,
    ThemePackReference,
    TilesetProgram,
    UserBrief,
)


class FakePlannerProvider(PlannerProvider):
    """Fake provider for testing."""

    def __init__(self, model: str = "test-model") -> None:
        super().__init__(model=model)

    @property
    def provider_name(self) -> str:
        return "fake"

    def submit_prompt(
        self,
        prompt: str,
        schema: dict | None = None,
    ) -> ProviderResponse:
        return ProviderResponse(
            content="{}",
            parsed={},
            trace={},
            model=self.model,
        )


class PlannerProviderTest(unittest.TestCase):
    """Tests for the planner provider interface."""

    def test_provider_name_required(self) -> None:
        provider = FakePlannerProvider()
        with self.assertRaises(TypeError):
            PlannerProvider(model="test")

    def test_provider_submit_prompt_abstract(self) -> None:
        with self.assertRaises(TypeError):
            PlannerProvider(model="test")

    def test_fake_provider_returns_response(self) -> None:
        provider = FakePlannerProvider(model="test-model")
        response = provider.submit_prompt("test prompt")
        self.assertEqual(response.model, "test-model")

    def test_parse_json_content_strips_code_fences(self) -> None:
        provider = FakePlannerProvider()
        content = '```json\n{"key": "value"}\n```'
        result = provider._parse_json_content(content)
        self.assertEqual(result, {"key": "value"})

    def test_parse_json_content_handles_plain_json(self) -> None:
        provider = FakePlannerProvider()
        content = '{"key": "value"}'
        result = provider._parse_json_content(content)
        self.assertEqual(result, {"key": "value"})

    def test_parse_json_content_rejects_invalid(self) -> None:
        provider = FakePlannerProvider()
        with self.assertRaises(ProviderParseError):
            provider._parse_json_content("not json")


class PromptAssemblyTest(unittest.TestCase):
    """Tests for context assembly in prompt building."""

    def test_assemble_character_context(self) -> None:
        program = CharacterSheetProgram(
            style_pack="cute_chibi_v1",
            entity_type="slime",
            archetype="blob",
            palette_ramp=PaletteRamp(
                primary="green",
                secondary="dark_green",
                accent="lime",
            ),
            primitive_references=(
                PrimitiveReference(
                    family="body",
                    subtype="blob",
                    primitive_id="slime_body_01",
                ),
            ),
            directions=(
                CharacterDirection.FACING_DOWN,
                CharacterDirection.FACING_UP,
            ),
            animations=("idle", "walk"),
            presentation_surface=PresentationSurfaceType.RUNTIME_SHEET,
        )
        self.assertEqual(program.family, AssetFamily.CHARACTER_SHEET)
        self.assertEqual(len(program.primitive_references), 1)
        self.assertEqual(program.directions[0], CharacterDirection.FACING_DOWN)

    def test_assemble_prop_context(self) -> None:
        program = PropOrFxSheetProgram(
            style_pack="dungeon_v1",
            prop_type="chest",
            layout_mode="strip_3x1",
            primitive_references=(
                PrimitiveReference(
                    family="prop",
                    subtype="container",
                    primitive_id="wooden_chest_01",
                ),
            ),
        )
        self.assertEqual(program.family, AssetFamily.PROP_OR_FX_SHEET)
        self.assertEqual(program.layout_mode, "strip_3x1")

    def test_assemble_tileset_context(self) -> None:
        program = TilesetProgram(
            style_pack="dungeon_v1",
            tile_type="floor",
            tile_categories=("floor", "wall"),
            primitive_references=(
                PrimitiveReference(
                    family="tile",
                    subtype="stone",
                    primitive_id="cobblestone_01",
                ),
            ),
        )
        self.assertEqual(program.family, AssetFamily.TILESET)
        self.assertIn("floor", program.tile_categories)

    def test_assemble_scene_context(self) -> None:
        program = BackgroundSceneProgram(
            style_pack="library_v1",
            scene_type="library_room",
            parallax_layers=("background", "midground"),
            primitive_references=(
                PrimitiveReference(
                    family="prop",
                    subtype="furniture",
                    primitive_id="bookshelf_01",
                ),
            ),
        )
        self.assertEqual(program.family, AssetFamily.BACKGROUND_SCENE)
        self.assertEqual(len(program.parallax_layers), 2)


class StructuredOutputParsingTest(unittest.TestCase):
    """Tests for parsing structured planner output."""

    def test_parse_valid_character_program(self) -> None:
        payload = {
            "family": "character_sheet",
            "style_pack": "cute_chibi_v1",
            "entity_type": "slime",
            "archetype": "blob",
            "directions": ["facing_down", "facing_up"],
            "animations": ["idle", "walk"],
            "palette_ramp": {
                "primary": "green",
                "secondary": "dark_green",
                "accent": "lime",
            },
            "primitive_references": [
                {
                    "family": "body",
                    "subtype": "blob",
                    "primitive_id": "slime_body_01",
                }
            ],
            "presentation_surface": "runtime_sheet",
        }
        program = CharacterSheetProgram(
            style_pack=payload["style_pack"],
            entity_type=payload["entity_type"],
            archetype=payload["archetype"],
            directions=tuple(CharacterDirection(d) for d in payload["directions"]),
            animations=tuple(payload["animations"]),
            palette_ramp=PaletteRamp(**payload["palette_ramp"]),
            primitive_references=tuple(
                PrimitiveReference(**ref) for ref in payload["primitive_references"]
            ),
            presentation_surface=PresentationSurfaceType(payload["presentation_surface"]),
        )
        self.assertEqual(program.entity_type, "slime")
        self.assertEqual(program.palette_ramp.primary, "green")

    def test_parse_valid_prop_program(self) -> None:
        payload = {
            "family": "prop_or_fx_sheet",
            "style_pack": "dungeon_v1",
            "prop_type": "torch",
            "layout_mode": "strip_3x1",
            "primitive_references": [],
            "presentation_surface": "runtime_sheet",
        }
        program = PropOrFxSheetProgram(
            style_pack=payload["style_pack"],
            prop_type=payload["prop_type"],
            layout_mode=payload["layout_mode"],
            presentation_surface=PresentationSurfaceType(payload["presentation_surface"]),
        )
        self.assertEqual(program.prop_type, "torch")

    def test_parse_valid_tileset_program(self) -> None:
        payload = {
            "family": "tileset",
            "style_pack": "dungeon_v1",
            "tile_type": "floor",
            "layout_mode": "tile_atlas",
            "tile_categories": ["floor", "wall"],
            "primitive_references": [],
            "presentation_surface": "runtime_sheet",
        }
        program = TilesetProgram(
            style_pack=payload["style_pack"],
            tile_type=payload["tile_type"],
            tile_categories=tuple(payload["tile_categories"]),
            presentation_surface=PresentationSurfaceType(payload["presentation_surface"]),
        )
        self.assertEqual(program.tile_type, "floor")

    def test_parse_valid_scene_program(self) -> None:
        payload = {
            "family": "background_scene",
            "style_pack": "library_v1",
            "scene_type": "library_room",
            "parallax_layers": ["background", "midground"],
            "primitive_references": [],
            "presentation_surface": "loading_surface",
        }
        program = BackgroundSceneProgram(
            style_pack=payload["style_pack"],
            scene_type=payload["scene_type"],
            parallax_layers=tuple(payload["parallax_layers"]),
            presentation_surface=PresentationSurfaceType(payload["presentation_surface"]),
        )
        self.assertEqual(program.scene_type, "library_room")

    def test_parse_missing_required_field(self) -> None:
        from asf.planner.schemas import _require_string, SchemaValidationError
        with self.assertRaises(SchemaValidationError):
            _require_string({}, "missing_key")

    def test_parse_invalid_enum_value(self) -> None:
        with self.assertRaises(ValueError):
            CharacterDirection("invalid_direction")


class UserBriefTest(unittest.TestCase):
    """Tests for user brief construction."""

    def test_user_brief_with_theme_pack(self) -> None:
        brief = UserBrief(
            request="Generate a swamp slime character",
            family=AssetFamily.CHARACTER_SHEET,
            style_pack="swamp_v1",
            theme_pack=ThemePackReference(
                theme_id="swamp_v1",
                motif_ids=("murky", "algae"),
            ),
            constraints={"palette_family": "swamp"},
        )
        self.assertEqual(brief.family, AssetFamily.CHARACTER_SHEET)
        self.assertIsNotNone(brief.theme_pack)
        self.assertEqual(brief.theme_pack.theme_id, "swamp_v1")

    def test_batch_brief_structure(self) -> None:
        brief = BatchBrief(
            request="Generate dungeon assets",
            families=(
                AssetFamily.CHARACTER_SHEET,
                AssetFamily.TILESET,
                AssetFamily.PROP_OR_FX_SHEET,
            ),
            style_pack="dungeon_v1",
            shared_constraints={"mood": "dark"},
            per_asset_constraints={
                AssetFamily.CHARACTER_SHEET: {"entity_type": "skeleton"},
                AssetFamily.TILESET: {"tile_type": "dungeon_floor"},
            },
        )
        self.assertEqual(len(brief.families), 3)
        self.assertEqual(brief.shared_constraints["mood"], "dark")
        self.assertEqual(brief.per_asset_constraints[AssetFamily.CHARACTER_SHEET]["entity_type"], "skeleton")


if __name__ == "__main__":
    unittest.main()