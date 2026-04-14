"""Tests for presentation surface schema validation."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
import unittest

from asf.presentation_surfaces import (
    ALL_SURFACE_FAMILIES,
    SURFACE_FAMILY_COVER,
    SURFACE_FAMILY_LOADING,
    SURFACE_FAMILY_PARALLAX,
    SURFACE_FAMILY_PROMO,
    SURFACE_FAMILY_UI_SHEET,
    SUPPORTED_PARALLAX_LAYER_ROLES,
    SUPPORTED_UI_SHEET_TYPES,
    CoverSurfaceProgram,
    LoadingSurfaceProgram,
    ParallaxLayerSetProgram,
    PresentationSurfaceValidationError,
    PromoCaptureJobProgram,
    UISheetProgram,
    load_cover_surface,
    load_loading_surface,
    load_parallax_layer_set,
    load_presentation_surface,
    load_promo_capture_job,
    load_ui_sheet,
)


def _write_json(tmp_dir: str, payload: dict) -> Path:
    path = Path(tmp_dir) / "surface.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def _minimal_cover() -> dict:
    return {
        "surface_family": "cover_surface",
        "program_id": "dragon_flight_cover_v1",
        "program_version": 1,
        "style_pack": "cute_chibi_v1",
        "theme": "dragon_flight",
        "canvas": {"width": 512, "height": 384},
        "focal_subject": {
            "tile_id": "hero_dragon",
            "family": "characters",
            "primitive_id": "dragon_001",
        },
        "background_scene_manifest": "programs/scene/dragon_sky_main.json",
        "title_safe_zone": [32, 16, 448, 80],
        "output": {"variant_id": "v1"},
    }


def _minimal_loading() -> dict:
    return {
        "surface_family": "loading_surface",
        "program_id": "dragon_flight_loading_v1",
        "program_version": 1,
        "style_pack": "cute_chibi_v1",
        "theme": "dragon_flight",
        "canvas": {"width": 512, "height": 384},
        "background_scene_manifest": "programs/scene/dragon_sky_main.json",
        "output": {"variant_id": "v1"},
    }


def _minimal_parallax() -> dict:
    return {
        "surface_family": "parallax_layer_set",
        "program_id": "dragon_flight_parallax_v1",
        "program_version": 1,
        "style_pack": "cute_chibi_v1",
        "theme": "dragon_flight",
        "canvas": {"width": 512, "height": 384},
        "layers": [
            {
                "layer_role": "top",
                "tile_sources": [
                    {"tile_id": "cloud_far", "family": "props", "primitive_id": "cloud_001"}
                ],
                "density": 0.3,
                "contrast": 0.5,
            },
            {
                "layer_role": "middle",
                "tile_sources": [
                    {"tile_id": "cloud_mid", "family": "props", "primitive_id": "cloud_002"}
                ],
                "density": 0.6,
                "contrast": 0.7,
            },
            {
                "layer_role": "bottom",
                "tile_sources": [
                    {"tile_id": "mountain", "family": "props", "primitive_id": "mountain_001"}
                ],
                "density": 0.9,
                "contrast": 1.0,
            },
        ],
        "output": {"variant_id": "v1"},
    }


def _minimal_ui_sheet() -> dict:
    return {
        "surface_family": "ui_sheet",
        "program_id": "dragon_flight_icons_v1",
        "program_version": 1,
        "style_pack": "cute_chibi_v1",
        "sheet_type": "icon_sheet",
        "canvas": {"width": 128, "height": 128},
        "tile_sources": [
            {"tile_id": "coin_icon", "family": "ui", "primitive_id": "coin_001"}
        ],
        "states": ["normal"],
        "output": {"variant_id": "v1"},
    }


def _minimal_promo() -> dict:
    return {
        "surface_family": "promo_capture_job",
        "program_id": "dragon_flight_promo_v1",
        "program_version": 1,
        "source_bundle": "outputs/dragon_flight/bundle_v1",
        "capture_conditions": {
            "scene_program": "programs/scene/dragon_sky_main.json",
        },
        "output": {"variant_id": "v1"},
    }


class SurfaceFamilyConstantsTest(unittest.TestCase):

    def test_all_surface_families_contains_five_families(self) -> None:
        self.assertEqual(len(ALL_SURFACE_FAMILIES), 5)

    def test_surface_family_values(self) -> None:
        self.assertIn("cover_surface", ALL_SURFACE_FAMILIES)
        self.assertIn("loading_surface", ALL_SURFACE_FAMILIES)
        self.assertIn("parallax_layer_set", ALL_SURFACE_FAMILIES)
        self.assertIn("ui_sheet", ALL_SURFACE_FAMILIES)
        self.assertIn("promo_capture_job", ALL_SURFACE_FAMILIES)

    def test_parallax_layer_roles(self) -> None:
        self.assertEqual(SUPPORTED_PARALLAX_LAYER_ROLES, ("top", "middle", "bottom"))

    def test_ui_sheet_types(self) -> None:
        self.assertIn("icon_sheet", SUPPORTED_UI_SHEET_TYPES)
        self.assertIn("panel_strip", SUPPORTED_UI_SHEET_TYPES)
        self.assertIn("stateful_button", SUPPORTED_UI_SHEET_TYPES)


class CoverSurfaceValidationTest(unittest.TestCase):

    def test_loads_valid_cover_surface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_cover())
            program = load_cover_surface(path)
            self.assertIsInstance(program, CoverSurfaceProgram)
            self.assertEqual(program.surface_family, "cover_surface")
            self.assertEqual(program.program_id, "dragon_flight_cover_v1")
            self.assertEqual(program.program_version, 1)
            self.assertEqual(program.theme, "dragon_flight")
            self.assertEqual(program.canvas.width, 512)
            self.assertEqual(program.canvas.height, 384)
            self.assertEqual(program.focal_subject.tile_id, "hero_dragon")
            self.assertEqual(program.title_safe_zone, (32, 16, 448, 80))
            self.assertEqual(program.negative_space_zones, ())

    def test_loads_cover_with_negative_space_zones(self) -> None:
        payload = _minimal_cover()
        payload["negative_space_zones"] = [[0, 200, 256, 184], [256, 200, 256, 184]]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            program = load_cover_surface(path)
            self.assertEqual(len(program.negative_space_zones), 2)
            self.assertEqual(program.negative_space_zones[0], (0, 200, 256, 184))

    def test_loads_cover_with_debug_overlay(self) -> None:
        payload = _minimal_cover()
        payload["output"]["debug_overlay"] = True
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            program = load_cover_surface(path)
            self.assertTrue(program.output.debug_overlay)

    def test_rejects_missing_required_field(self) -> None:
        payload = _minimal_cover()
        del payload["focal_subject"]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "missing required key"):
                load_cover_surface(path)

    def test_rejects_unexpected_field(self) -> None:
        payload = _minimal_cover()
        payload["extra_field"] = "oops"
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "unexpected key"):
                load_cover_surface(path)

    def test_rejects_zero_canvas_dimension(self) -> None:
        payload = _minimal_cover()
        payload["canvas"] = {"width": 0, "height": 384}
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "dimensions must be positive"):
                load_cover_surface(path)

    def test_rejects_invalid_title_safe_zone(self) -> None:
        payload = _minimal_cover()
        payload["title_safe_zone"] = [0, 0, 0, 80]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "width and height must be positive"):
                load_cover_surface(path)

    def test_rejects_non_integer_title_safe_zone(self) -> None:
        payload = _minimal_cover()
        payload["title_safe_zone"] = [32.5, 16, 448, 80]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "must contain integers"):
                load_cover_surface(path)

    def test_deterministic_output_for_identical_inputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_cover())
            program_a = load_cover_surface(path)
            program_b = load_cover_surface(path)
            self.assertEqual(program_a, program_b)

    def test_to_dict_is_json_serializable(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_cover())
            program = load_cover_surface(path)
            d = program.to_dict()
            serialized = json.dumps(d)
            self.assertIn("cover_surface", serialized)


class LoadingSurfaceValidationTest(unittest.TestCase):

    def test_loads_valid_loading_surface(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_loading())
            program = load_loading_surface(path)
            self.assertIsInstance(program, LoadingSurfaceProgram)
            self.assertEqual(program.surface_family, "loading_surface")
            self.assertEqual(program.canvas.width, 512)

    def test_rejects_missing_background_manifest(self) -> None:
        payload = _minimal_loading()
        del payload["background_scene_manifest"]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "missing required key"):
                load_loading_surface(path)

    def test_rejects_empty_background_manifest(self) -> None:
        payload = _minimal_loading()
        payload["background_scene_manifest"] = ""
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "non-empty string"):
                load_loading_surface(path)

    def test_deterministic_for_identical_inputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_loading())
            self.assertEqual(load_loading_surface(path), load_loading_surface(path))

    def test_wrong_family_raises_on_typed_loader(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_cover())
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "expected surface_family"):
                load_loading_surface(path)


class ParallaxLayerSetValidationTest(unittest.TestCase):

    def test_loads_valid_parallax_layer_set(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_parallax())
            program = load_parallax_layer_set(path)
            self.assertIsInstance(program, ParallaxLayerSetProgram)
            self.assertEqual(program.surface_family, "parallax_layer_set")
            self.assertEqual(len(program.layers), 3)
            roles = [layer.layer_role for layer in program.layers]
            self.assertIn("top", roles)
            self.assertIn("middle", roles)
            self.assertIn("bottom", roles)

    def test_layer_density_and_contrast_preserved(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_parallax())
            program = load_parallax_layer_set(path)
            top = next(l for l in program.layers if l.layer_role == "top")
            self.assertAlmostEqual(top.density, 0.3)
            self.assertAlmostEqual(top.contrast, 0.5)

    def test_rejects_unknown_layer_role(self) -> None:
        payload = _minimal_parallax()
        payload["layers"][0]["layer_role"] = "horizon"
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "layer_role must be one of"):
                load_parallax_layer_set(path)

    def test_rejects_duplicate_layer_roles(self) -> None:
        payload = _minimal_parallax()
        payload["layers"][1]["layer_role"] = "top"
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "duplicate layer_role"):
                load_parallax_layer_set(path)

    def test_rejects_density_out_of_range(self) -> None:
        payload = _minimal_parallax()
        payload["layers"][0]["density"] = 1.5
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "density must be between 0 and 1"):
                load_parallax_layer_set(path)

    def test_rejects_contrast_out_of_range(self) -> None:
        payload = _minimal_parallax()
        payload["layers"][0]["contrast"] = -0.1
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "contrast must be between 0 and 1"):
                load_parallax_layer_set(path)

    def test_rejects_empty_layers(self) -> None:
        payload = _minimal_parallax()
        payload["layers"] = []
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "at least one layer"):
                load_parallax_layer_set(path)

    def test_tile_sources_in_layer_are_parsed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_parallax())
            program = load_parallax_layer_set(path)
            top = next(l for l in program.layers if l.layer_role == "top")
            self.assertEqual(len(top.tile_sources), 1)
            self.assertEqual(top.tile_sources[0].tile_id, "cloud_far")

    def test_deterministic_for_identical_inputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_parallax())
            self.assertEqual(load_parallax_layer_set(path), load_parallax_layer_set(path))


class UISheetValidationTest(unittest.TestCase):

    def test_loads_valid_ui_sheet(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_ui_sheet())
            program = load_ui_sheet(path)
            self.assertIsInstance(program, UISheetProgram)
            self.assertEqual(program.surface_family, "ui_sheet")
            self.assertEqual(program.sheet_type, "icon_sheet")
            self.assertEqual(len(program.tile_sources), 1)
            self.assertEqual(program.states, ("normal",))

    def test_loads_stateful_button_with_multiple_states(self) -> None:
        payload = _minimal_ui_sheet()
        payload["sheet_type"] = "stateful_button"
        payload["states"] = ["normal", "hover", "pressed"]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            program = load_ui_sheet(path)
            self.assertEqual(program.states, ("normal", "hover", "pressed"))

    def test_rejects_unknown_sheet_type(self) -> None:
        payload = _minimal_ui_sheet()
        payload["sheet_type"] = "animated_sprite"
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "sheet_type must be one of"):
                load_ui_sheet(path)

    def test_rejects_empty_state_string(self) -> None:
        payload = _minimal_ui_sheet()
        payload["states"] = ["normal", ""]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "non-empty string"):
                load_ui_sheet(path)

    def test_rejects_missing_canvas(self) -> None:
        payload = _minimal_ui_sheet()
        del payload["canvas"]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "missing required key"):
                load_ui_sheet(path)

    def test_deterministic_for_identical_inputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_ui_sheet())
            self.assertEqual(load_ui_sheet(path), load_ui_sheet(path))

    def test_to_dict_is_json_serializable(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_ui_sheet())
            program = load_ui_sheet(path)
            serialized = json.dumps(program.to_dict())
            self.assertIn("ui_sheet", serialized)


class PromoCaptureJobValidationTest(unittest.TestCase):

    def test_loads_valid_promo_capture_job(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_promo())
            program = load_promo_capture_job(path)
            self.assertIsInstance(program, PromoCaptureJobProgram)
            self.assertEqual(program.surface_family, "promo_capture_job")
            self.assertEqual(program.source_bundle, "outputs/dragon_flight/bundle_v1")
            self.assertEqual(
                program.capture_conditions.scene_program,
                "programs/scene/dragon_sky_main.json",
            )
            self.assertIsNone(program.capture_conditions.timing)
            self.assertIsNone(program.capture_conditions.frame_index)

    def test_loads_promo_with_timing_and_frame_index(self) -> None:
        payload = _minimal_promo()
        payload["capture_conditions"]["timing"] = 2.5
        payload["capture_conditions"]["frame_index"] = 30
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            program = load_promo_capture_job(path)
            self.assertAlmostEqual(program.capture_conditions.timing, 2.5)
            self.assertEqual(program.capture_conditions.frame_index, 30)

    def test_rejects_negative_timing(self) -> None:
        payload = _minimal_promo()
        payload["capture_conditions"]["timing"] = -1.0
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "timing must be non-negative"):
                load_promo_capture_job(path)

    def test_rejects_negative_frame_index(self) -> None:
        payload = _minimal_promo()
        payload["capture_conditions"]["frame_index"] = -5
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "frame_index must be non-negative"):
                load_promo_capture_job(path)

    def test_rejects_missing_source_bundle(self) -> None:
        payload = _minimal_promo()
        del payload["source_bundle"]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "missing required key"):
                load_promo_capture_job(path)

    def test_rejects_missing_capture_conditions(self) -> None:
        payload = _minimal_promo()
        del payload["capture_conditions"]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "missing required key"):
                load_promo_capture_job(path)

    def test_rejects_missing_scene_program_in_conditions(self) -> None:
        payload = _minimal_promo()
        del payload["capture_conditions"]["scene_program"]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "missing required key"):
                load_promo_capture_job(path)

    def test_deterministic_for_identical_inputs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_promo())
            self.assertEqual(load_promo_capture_job(path), load_promo_capture_job(path))


class LoadPresentationSurfaceDispatchTest(unittest.TestCase):

    def test_dispatches_to_cover(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_cover())
            program = load_presentation_surface(path)
            self.assertIsInstance(program, CoverSurfaceProgram)

    def test_dispatches_to_loading(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_loading())
            program = load_presentation_surface(path)
            self.assertIsInstance(program, LoadingSurfaceProgram)

    def test_dispatches_to_parallax(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_parallax())
            program = load_presentation_surface(path)
            self.assertIsInstance(program, ParallaxLayerSetProgram)

    def test_dispatches_to_ui_sheet(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_ui_sheet())
            program = load_presentation_surface(path)
            self.assertIsInstance(program, UISheetProgram)

    def test_dispatches_to_promo(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_promo())
            program = load_presentation_surface(path)
            self.assertIsInstance(program, PromoCaptureJobProgram)

    def test_rejects_unknown_surface_family(self) -> None:
        payload = _minimal_cover()
        payload["surface_family"] = "splash_screen"
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "unknown surface_family"):
                load_presentation_surface(path)

    def test_rejects_missing_surface_family(self) -> None:
        payload = _minimal_cover()
        del payload["surface_family"]
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, payload)
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "'surface_family' must be"):
                load_presentation_surface(path)

    def test_rejects_non_object_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "surface.json"
            path.write_text(json.dumps([1, 2, 3]), encoding="utf-8")
            with self.assertRaisesRegex(PresentationSurfaceValidationError, "expected a JSON object"):
                load_presentation_surface(path)

    def test_cover_surface_manifest_includes_asset_dependencies(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = _write_json(tmp_dir, _minimal_cover())
            program = load_cover_surface(path)
            self.assertEqual(
                program.background_scene_manifest, "programs/scene/dragon_sky_main.json"
            )
            self.assertEqual(program.focal_subject.family, "characters")
            self.assertEqual(program.focal_subject.primitive_id, "dragon_001")


if __name__ == "__main__":
    unittest.main()
