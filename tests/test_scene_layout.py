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


class LayoutResolverTest(unittest.TestCase):
    """Tests for deterministic layout resolution and template validation."""

    def test_library_room_template_resolves_valid_manifest(self) -> None:
        from asf.scene_layout import resolve_scene_layout, ResolvedLayout
        manifest = {
            "family": "background_scene",
            "program_id": "test_library_scene",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [
                {"zone_id": "play_area", "role": "gameplay", "bounds": [64, 96, 128, 96]},
            ],
            "tile_sources": [
                {"tile_id": "floor_tile", "family": "tileset", "primitive_id": "stone_floor_01"},
            ],
            "prop_placement": [
                {"group_id": "shelf_group", "tile_id": "floor_tile", "placement_rules": {"weight": 0.5}},
            ],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program = load_scene_program(path)
            resolved = resolve_scene_layout(program)
            self.assertIsInstance(resolved, ResolvedLayout)
            self.assertEqual(resolved.program_id, "test_library_scene")
            self.assertEqual(len(resolved.resolved_zones), 1)
            self.assertEqual(resolved.resolved_zones[0].zone_id, "play_area")

    def test_ruins_courtyard_template_resolves_valid_manifest(self) -> None:
        from asf.scene_layout import resolve_scene_layout, ResolvedLayout
        manifest = {
            "family": "background_scene",
            "program_id": "test_ruins_scene",
            "program_version": 1,
            "template": "ruins_courtyard",
            "canvas": {"width": 320, "height": 240},
            "theme": "ruins",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [
                {"zone_id": "stage_area", "role": "gameplay", "bounds": [80, 120, 160, 120]},
            ],
            "tile_sources": [
                {"tile_id": "cobble_tile", "family": "tileset", "primitive_id": "cobble_01"},
            ],
            "prop_placement": [
                {"group_id": "pillar_group", "tile_id": "cobble_tile", "placement_rules": {"weight": 0.3}},
            ],
            "lighting": {"global_direction": "east", "ambient_strength": 0.7},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program = load_scene_program(path)
            resolved = resolve_scene_layout(program)
            self.assertIsInstance(resolved, ResolvedLayout)
            self.assertEqual(resolved.program_id, "test_ruins_scene")
            self.assertEqual(len(resolved.resolved_zones), 1)

    def test_zone_outside_canvas_fails(self) -> None:
        from asf.scene_layout import resolve_scene_layout
        manifest = {
            "family": "background_scene",
            "program_id": "test_invalid_zone",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [
                {"zone_id": "out_of_bounds", "role": "gameplay", "bounds": [200, 150, 128, 128]},
            ],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program = load_scene_program(path)
            with self.assertRaisesRegex(Exception, "exceed.*canvas"):
                resolve_scene_layout(program)

    def test_overlapping_reserved_zones_fails(self) -> None:
        from asf.scene_layout import resolve_scene_layout
        manifest = {
            "family": "background_scene",
            "program_id": "test_overlap",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [
                {"zone_id": "play_area_1", "role": "gameplay", "bounds": [0, 0, 64, 64], "reserved": True},
                {"zone_id": "play_area_2", "role": "gameplay", "bounds": [32, 32, 64, 64], "reserved": True},
            ],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program = load_scene_program(path)
            with self.assertRaisesRegex(Exception, "overlap"):
                resolve_scene_layout(program)

    def test_deterministic_resolution_same_input(self) -> None:
        from asf.scene_layout import resolve_scene_layout
        manifest = {
            "family": "background_scene",
            "program_id": "test_deterministic",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [
                {"zone_id": "play_area", "role": "gameplay", "bounds": [64, 96, 128, 96]},
            ],
            "tile_sources": [
                {"tile_id": "floor_tile", "family": "tileset", "primitive_id": "stone_floor_01"},
            ],
            "prop_placement": [
                {"group_id": "shelf_group", "tile_id": "floor_tile", "placement_rules": {"weight": 0.5}},
            ],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program1 = load_scene_program(path)
            program2 = load_scene_program(path)
            resolved1 = resolve_scene_layout(program1)
            resolved2 = resolve_scene_layout(program2)
            self.assertEqual(resolved1.resolved_zones[0].bounds, resolved2.resolved_zones[0].bounds)

    def test_prop_placement_respects_gameplay_zones(self) -> None:
        from asf.scene_layout import resolve_scene_layout
        manifest = {
            "family": "background_scene",
            "program_id": "test_zone_respect",
            "program_version": 1,
            "template": "library_room",
            "canvas": {"width": 256, "height": 192},
            "theme": "library",
            "subtheme": "ancient",
            "style_pack": "cute_chibi_v1",
            "zones": [
                {"zone_id": "play_area", "role": "gameplay", "bounds": [64, 96, 128, 96], "reserved": True},
            ],
            "tile_sources": [
                {"tile_id": "floor_tile", "family": "tileset", "primitive_id": "stone_floor_01"},
            ],
            "prop_placement": [
                {"group_id": "shelf_group", "tile_id": "floor_tile", "placement_rules": {"weight": 0.5}},
            ],
            "lighting": {"global_direction": "northwest", "ambient_strength": 0.8},
            "output": {"variant_id": None},
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "scene.json"
            path.write_text(json.dumps(manifest), encoding="utf-8")
            program = load_scene_program(path)
            resolved = resolve_scene_layout(program)
            for prop in resolved.resolved_placements:
                prop_box = prop.bounds
                play_zone = resolved.resolved_zones[0].bounds
                if _boxes_overlap(prop_box, play_zone):
                    self.fail(f"Prop placement {prop.group_id} overlaps with reserved gameplay zone")


def _boxes_overlap(a: tuple[int, int, int, int], b: tuple[int, int, int, int]) -> bool:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    a_right, a_bottom = ax + aw, ay + ah
    b_right, b_bottom = bx + bw, by + bh
    return ax < b_right and a_right > bx and ay < b_bottom and a_bottom > by


if __name__ == "__main__":
    unittest.main()
