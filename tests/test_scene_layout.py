"""Tests for scene layout and background assembler schema validation."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
import unittest

from asf.scene_layout import (
    SCENE_LAYOUT_MODE,
    SUPPORTED_SCENE_TEMPLATES,
    SceneManifestValidationError,
    load_scene_program,
)


ROOT = Path(__file__).resolve().parents[1]


class SceneManifestSchemaTest(unittest.TestCase):
    """Validates scene manifest schema and field-level requirements."""

    def test_supported_templates_are_library_and_ruins(self) -> None:
        self.assertEqual(
            SUPPORTED_SCENE_TEMPLATES,
            ("library_room", "ruins_courtyard"),
        )

    def test_loads_minimal_valid_scene_manifest(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program = load_scene_program(path)
            self.assertEqual(program.family, "background_scene")
            self.assertEqual(program.template, "library_room")
            self.assertEqual(program.canvas.width, 256)
            self.assertEqual(program.canvas.height, 192)
            self.assertEqual(program.theme, "library")
            self.assertEqual(program.lighting.global_direction, "northwest")

    def test_rejects_unknown_family(self) -> None:
        manifest = {
            "family": "not_background_scene",
            "program_id": "test",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(
                SceneManifestValidationError, "unknown compiler family"
            ):
                load_scene_program(path)

    def test_rejects_missing_required_fields(self) -> None:
        manifest = {
            "family": "background_scene",
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(
                SceneManifestValidationError, "missing required key"
            ):
                load_scene_program(path)

    def test_rejects_unknown_template(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "unknown_template",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(
                SceneManifestValidationError, "unknown template"
            ):
                load_scene_program(path)

    def test_rejects_invalid_canvas_dimensions(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": -1, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(
                SceneManifestValidationError, "dimensions must be positive"
            ):
                load_scene_program(path)

    def test_rejects_invalid_lighting_direction(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [],
            "lighting": {"global_direction": "invalid", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(
                SceneManifestValidationError, "must be one of"
            ):
                load_scene_program(path)

    def test_rejects_invalid_ambient_strength(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [],
            "lighting": {"global_direction": "northwest", "ambient_strength": 1.5},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(
                SceneManifestValidationError, "ambient_strength must be between 0 and 1"
            ):
                load_scene_program(path)

    def test_rejects_extra_toplevel_fields(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
            "unexpected_field": True,
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(
                SceneManifestValidationError, "unexpected key"
            ):
                load_scene_program(path)

    def test_zones_require_rectangular_bounds(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [
                {"zone_id": "play_area", "role": "gameplay", "bounds": {"x": 0, "y": 0}},
            ],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(
                SceneManifestValidationError, "bounds must be a four-item array"
            ):
                load_scene_program(path)


class SceneManifestZoneTest(unittest.TestCase):
    """Validates zone definitions in scene manifests."""

    def test_gameplay_zone_requires_role(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [
                {
                    "zone_id": "play_area",
                    "role": "gameplay",
                    "bounds": [0, 0, 128, 128],
                    "reserved": True,
                },
            ],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program = load_scene_program(path)
            self.assertEqual(len(program.zones), 1)
            self.assertEqual(program.zones[0].role, "gameplay")
            self.assertTrue(program.zones[0].reserved)

    def test_decorative_zone_is_not_reserved_by_default(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [
                {
                    "zone_id": "shelf_area",
                    "role": "decoration",
                    "bounds": [0, 0, 64, 128],
                },
            ],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program = load_scene_program(path)
            self.assertFalse(program.zones[0].reserved)


class SceneManifestPropPlacementTest(unittest.TestCase):
    """Validates prop placement group definitions."""

    def test_prop_placement_requires_tile_reference(self) -> None:
        manifest = {
            "family": "background_scene",
            "program_id": "test_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "tile_sources": [
                {
                    "tile_id": "stone_floor_tile",
                    "family": "tileset",
                    "primitive_id": "floor_stone_01",
                },
            ],
            "zones": [],
            "prop_placement": [
                {
                    "group_id": "main_shelf",
                    "tile_id": "stone_floor_tile",
                    "placement_rules": {"symmetry": "horizontal"},
                },
            ],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program = load_scene_program(path)
            self.assertEqual(len(program.prop_placement), 1)
            self.assertEqual(program.prop_placement[0].group_id, "main_shelf")


if __name__ == "__main__":
    unittest.main()
