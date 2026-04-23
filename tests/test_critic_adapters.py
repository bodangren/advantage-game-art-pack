"""Tests for family critic adapters for scene and presentation families."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from PIL import Image

from asf.critic_adapters import (
    SUPPORTED_SCENE_AND_SURFACE_FAMILIES,
    adapt_novelty_critic,
    adapt_structural_critic,
    adapt_style_critic,
    check_near_duplicate,
    evaluate_family_candidate,
)


class FamilyAdapterSchemaTest(unittest.TestCase):
    """Validates that the shared envelope works across all supported families."""

    def test_supported_families_complete(self) -> None:
        expected = {
            "background_scene",
            "parallax_layer_set",
            "cover_surface",
            "loading_surface",
            "ui_sheet",
        }
        self.assertEqual(set(SUPPORTED_SCENE_AND_SURFACE_FAMILIES), expected)

    def test_structural_result_shape(self) -> None:
        with patch("asf.critic_adapters._family_threshold_pack") as mock_pack:
            mock_pack.return_value = MagicMock(
                structural_minimum_occupancy_ratio=0.05,
                structural_minimum_edge_density=0.04,
                reference_layout_types=("background_scene",),
            )
            fake_image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            result = adapt_structural_critic(fake_image, family="background_scene", repo_root=None)
            self.assertEqual(result.critic_name, "structural")

    def test_style_result_shape(self) -> None:
        with patch("asf.critic_adapters._family_threshold_pack") as mock_pack:
            mock_pack.return_value = MagicMock(
                structural_minimum_occupancy_ratio=0.05,
                structural_minimum_edge_density=0.04,
                reference_layout_types=("background_scene",),
                metric_weights={"color_count": 0.5},
            )
            with patch("asf.critic_adapters._family_references") as mock_refs:
                mock_refs.return_value = ()
                fake_image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
                result = adapt_style_critic(fake_image, family="background_scene", repo_root=None)
                self.assertEqual(result.critic_name, "style")

    def test_novelty_result_shape(self) -> None:
        with patch("asf.critic_adapters._family_threshold_pack") as mock_pack:
            mock_pack.return_value = MagicMock(
                near_duplicate_similarity=0.93,
                novelty_minimum_score=0.15,
                reference_layout_types=("background_scene",),
            )
            with patch("asf.critic_adapters._family_references") as mock_refs:
                mock_refs.return_value = ()
                with patch("asf.critic_adapters.evaluate_against_references") as mock_eval:
                    mock_eval.return_value = {
                        "novelty_score": 0.8,
                        "best_similarity": 0.2,
                        "near_duplicate": False,
                        "nearest_reference": None,
                        "reference_count": 0,
                    }
                    fake_image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
                    result = adapt_novelty_critic(fake_image, family="background_scene", repo_root=None)
                    self.assertEqual(result.critic_name, "novelty")


class DriftMonitoringTest(unittest.TestCase):
    """Validates near-duplicate and drift detection."""

    def test_check_near_duplicate_returns_false_for_novel(self) -> None:
        with patch("asf.critic_adapters._family_threshold_pack") as mock_pack:
            mock_pack.return_value = MagicMock(near_duplicate_similarity=0.93, novelty_minimum_score=0.15)
            with patch("asf.critic_adapters._family_references") as mock_refs:
                mock_refs.return_value = ()
                with patch("asf.critic_adapters.evaluate_against_references") as mock_eval:
                    mock_eval.return_value = {
                        "novelty_score": 0.8,
                        "best_similarity": 0.2,
                        "near_duplicate": False,
                        "nearest_reference": {"reference_id": "ref_001"},
                    }
                    fake_image = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
                    is_dup, entry = check_near_duplicate(fake_image, family="background_scene", repo_root=None)
                    self.assertFalse(is_dup)
                    self.assertIsNotNone(entry)


if __name__ == "__main__":
    unittest.main()
