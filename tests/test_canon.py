"""Tests for canon validation, metrics, and generation."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

from asf.canon import (
    CANON_DIRNAME,
    MANIFEST_FILENAME,
    CanonValidationError,
    build_style_canon,
    extract_image_metrics,
    load_annotation,
    load_corpus_manifest,
    validate_corpus,
)


ROOT = Path(__file__).resolve().parents[1]
CANON_ROOT = ROOT / CANON_DIRNAME
MANIFEST = CANON_ROOT / MANIFEST_FILENAME
DEMO_ASSETS = ROOT / "demo-assets"
ANNOTATION_DIR = CANON_ROOT / "annotations"


class CanonLoadingTest(unittest.TestCase):
    """Validates the corpus manifest and annotation contract."""

    def test_manifest_covers_demo_assets(self) -> None:
        manifest = load_corpus_manifest(MANIFEST)

        self.assertEqual(len(manifest["assets"]), len(list(DEMO_ASSETS.iterdir())))
        self.assertIn("background_scene", manifest["taxonomy"]["families"])
        self.assertIn("pose_sheet_3x3", manifest["taxonomy"]["layout_types"])

    def test_annotation_loads_for_real_asset(self) -> None:
        annotation = load_annotation(ANNOTATION_DIR / "player_3x3_pose_sheet.json")

        self.assertEqual(annotation["family"], "character_sheet")
        self.assertTrue(annotation["gold_reference"])
        self.assertIn("wizard hat", annotation["motif_tags"])
        self.assertIn("idle", annotation["animation_tags"])

    def test_rejects_annotation_field_omission(self) -> None:
        manifest_path = _write_minimal_canon_project(
            {
                "lighting": False,
                "family": "prop_sheet",
            }
        )

        with self.assertRaisesRegex(
            CanonValidationError, "annotation missing required key"
        ):
            validate_corpus(manifest_path)

    def test_rejects_invalid_family_name(self) -> None:
        manifest_path = _write_minimal_canon_project(
            {
                "family": "invalid_family",
            }
        )

        with self.assertRaisesRegex(
            CanonValidationError,
            "annotation.family must be one of the approved family names",
        ):
            validate_corpus(manifest_path)


class CanonMetricsTest(unittest.TestCase):
    """Validates deterministic canon metrics and output generation."""

    def test_extracts_deterministic_metrics(self) -> None:
        annotation = load_annotation(ANNOTATION_DIR / "player_3x3_pose_sheet.json")
        image_path = DEMO_ASSETS / "player_3x3_pose_sheet.png"

        first = extract_image_metrics(
            image_path, annotation, layout_type="pose_sheet_3x3"
        )
        second = extract_image_metrics(
            image_path, annotation, layout_type="pose_sheet_3x3"
        )

        self.assertEqual(first, second)
        self.assertIsNotNone(first["frame_to_frame_drift"])
        self.assertGreater(first["color_count"], 0)

    def test_canon_build_is_stable(self) -> None:
        first = build_style_canon(ROOT)
        second = build_style_canon(ROOT)

        first_hash = hashlib.sha256(
            json.dumps(first, sort_keys=True).encode("utf-8")
        ).hexdigest()
        second_hash = hashlib.sha256(
            json.dumps(second, sort_keys=True).encode("utf-8")
        ).hexdigest()
        self.assertEqual(first_hash, second_hash)
        self.assertIn("family_baselines", first)
        self.assertIn("gold_reference_clusters", first)


def _write_minimal_canon_project(overrides: dict[str, object]) -> Path:
    repo_root = Path(tempfile.mkdtemp(prefix="pixel-art-canon-"))
    (repo_root / "demo-assets").mkdir()
    (repo_root / "canon" / "annotations").mkdir(parents=True)
    Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(
        repo_root / "demo-assets" / "mini.png"
    )
    annotation_payload = {
        "version": 1,
        "asset_id": "mini",
        "source_path": "demo-assets/mini.png",
        "family": overrides.get("family", "prop_sheet"),
        "layout_type": "strip_3x1",
        "gold_reference": False,
        "theme_tags": ["test"],
        "motif_tags": ["test"],
        "material_tags": ["wood"],
        "animation_tags": [],
        "palette": {
            "dominant_colors": ["#ff0000"],
            "ramps": [
                {
                    "name": "red",
                    "colors": ["#ff0000", "#cc0000", "#880000"],
                    "role": "dominant",
                }
            ],
        },
        "outline": {
            "thickness_px": 1,
            "continuity": "continuous",
            "presence": "hard",
        },
        "lighting": {
            "direction": "top_left",
            "highlight_style": "rim_light",
            "shadow_style": "contact_shadow",
        },
        "silhouette": {
            "occupancy_band": "compact",
            "bbox_usage": "tight",
        },
        "reserved_gameplay_space": [],
    }
    if overrides.get("lighting") is False:
        annotation_payload.pop("lighting")
    annotation_path = repo_root / "canon" / "annotations" / "mini.json"
    annotation_path.write_text(json.dumps(annotation_payload), encoding="utf-8")
    manifest_path = repo_root / "canon" / MANIFEST_FILENAME
    manifest_path.write_text(
        json.dumps(
            {
                "version": 1,
                "source_root": "demo-assets",
                "annotation_root": "canon/annotations",
                "taxonomy": {
                    "families": [
                        "character_sheet",
                        "prop_sheet",
                        "fx_sheet",
                        "tileset",
                        "background_scene",
                        "parallax_layer",
                        "ui_sheet",
                        "presentation_surface",
                    ],
                    "layout_types": [
                        "pose_sheet_3x3",
                        "strip_3x1",
                        "scene_full_frame",
                        "atlas_square",
                    ],
                },
                "assets": [
                    {
                        "asset_id": "mini",
                        "source_path": "demo-assets/mini.png",
                        "annotation_path": "canon/annotations/mini.json",
                        "family": "prop_sheet",
                        "layout_type": "strip_3x1",
                        "dimensions": {"width": 4, "height": 4},
                        "transparency": "opaque",
                        "structure_notes": ["toy example"],
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    return manifest_path


if __name__ == "__main__":
    unittest.main()
