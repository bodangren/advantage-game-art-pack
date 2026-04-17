"""Tests for planner schemas and validation."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from asf.planner.schemas import (
    AssetFamily,
    BackgroundSceneProgram,
    BatchBrief,
    BatchPlannerManifest,
    CharacterDirection,
    CharacterSheetProgram,
    PaletteRamp,
    PresentationSurfaceType,
    PrimitiveReference,
    PropOrFxSheetProgram,
    SchemaValidationError,
    ThemePackReference,
    TilesetLayout,
    TilesetProgram,
    UserBrief,
    serialize_program,
    write_program,
)


class SchemaValidationTest(unittest.TestCase):
    """Validates planner schema construction and serialization."""

    def test_character_sheet_program_defaults(self) -> None:
        program = CharacterSheetProgram(
            style_pack="cute_chibi_v1",
            entity_type="slime",
            archetype="blob",
        )
        self.assertEqual(program.family, AssetFamily.CHARACTER_SHEET)
        self.assertEqual(program.style_pack, "cute_chibi_v1")
        self.assertEqual(program.entity_type, "slime")
        self.assertEqual(program.archetype, "blob")
        self.assertEqual(
            program.directions,
            (
                CharacterDirection.FACING_DOWN,
                CharacterDirection.FACING_UP,
                CharacterDirection.FACING_CAMERA,
            ),
        )

    def test_prop_sheet_program_defaults(self) -> None:
        program = PropOrFxSheetProgram(
            style_pack="cute_chibi_v1",
            prop_type="chest",
        )
        self.assertEqual(program.family, AssetFamily.PROP_OR_FX_SHEET)
        self.assertEqual(program.layout_mode, "strip_3x1")

    def test_tileset_program_defaults(self) -> None:
        program = TilesetProgram(
            style_pack="cute_chibi_v1",
            tile_type="floor",
        )
        self.assertEqual(program.family, AssetFamily.TILESET)
        self.assertEqual(program.layout_mode, TilesetLayout.TILE_ATLAS)
        self.assertIn("floor", program.tile_categories)

    def test_background_scene_program_defaults(self) -> None:
        program = BackgroundSceneProgram(
            style_pack="cute_chibi_v1",
            scene_type="library_room",
        )
        self.assertEqual(program.family, AssetFamily.BACKGROUND_SCENE)
        self.assertEqual(program.presentation_surface, PresentationSurfaceType.LOADING_SURFACE)

    def test_serialize_character_sheet(self) -> None:
        program = CharacterSheetProgram(
            style_pack="cute_chibi_v1",
            entity_type="slime",
            archetype="blob",
            palette_ramp=PaletteRamp(primary="green", secondary="dark_green", accent="yellow"),
            primitive_references=(
                PrimitiveReference(family="body", subtype="blob", primitive_id="slime_body_01"),
            ),
        )
        serialized = serialize_program(program)
        self.assertEqual(serialized["family"], "character_sheet")
        self.assertEqual(serialized["style_pack"], "cute_chibi_v1")
        self.assertEqual(serialized["palette_ramp"]["primary"], "green")
        self.assertEqual(len(serialized["primitive_references"]), 1)

    def test_serialize_with_theme_pack(self) -> None:
        program = CharacterSheetProgram(
            style_pack="cute_chibi_v1",
            entity_type="slime",
            archetype="blob",
            theme_pack=ThemePackReference(
                theme_id="swamp_v1",
                motif_ids=("murky", "algae", "moss"),
            ),
        )
        serialized = serialize_program(program)
        self.assertEqual(serialized["theme_pack"]["theme_id"], "swamp_v1")
        self.assertEqual(serialized["theme_pack"]["motif_ids"], ["murky", "algae", "moss"])

    def test_write_and_read_program(self) -> None:
        program = TilesetProgram(
            style_pack="cute_chibi_v1",
            tile_type="floor",
            tile_categories=("floor",),
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "program.json"
            write_program(path, program)
            content = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(content["family"], "tileset")
            self.assertEqual(content["tile_type"], "floor")


class BriefSchemaTest(unittest.TestCase):
    """Validates brief schema construction."""

    def test_user_brief_basic(self) -> None:
        brief = UserBrief(
            request="Generate a slime character in swamp style",
            family=AssetFamily.CHARACTER_SHEET,
            style_pack="swamp_v1",
        )
        self.assertEqual(brief.family, AssetFamily.CHARACTER_SHEET)
        self.assertIn("slime", brief.request)

    def test_batch_brief_multiple_families(self) -> None:
        brief = BatchBrief(
            request="Generate a dungeon set: character, tiles, and props",
            families=(
                AssetFamily.CHARACTER_SHEET,
                AssetFamily.TILESET,
                AssetFamily.PROP_OR_FX_SHEET,
            ),
            style_pack="dungeon_v1",
        )
        self.assertEqual(len(brief.families), 3)

    def test_batch_brief_with_shared_constraints(self) -> None:
        brief = BatchBrief(
            request="Same style, different enemies",
            families=(AssetFamily.CHARACTER_SHEET, AssetFamily.CHARACTER_SHEET),
            style_pack="swamp_v1",
            shared_constraints={"palette_family": "swamp"},
        )
        self.assertEqual(brief.shared_constraints["palette_family"], "swamp")


class SchemaValidationErrorTest(unittest.TestCase):
    """Validates that schema validation catches bad data."""

    def test_require_string_rejects_empty(self) -> None:
        from asf.planner.schemas import _require_string
        with self.assertRaises(SchemaValidationError):
            _require_string({}, "missing")

    def test_require_string_rejects_non_string(self) -> None:
        from asf.planner.schemas import _require_string
        with self.assertRaises(SchemaValidationError):
            _require_string({"key": 123}, "key")


if __name__ == "__main__":
    unittest.main()