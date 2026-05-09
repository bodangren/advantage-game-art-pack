"""Tests for threshold recalibration with real demo assets."""
from __future__ import annotations

from pathlib import Path

import pytest

from asf.canon import FAMILY_NAMES
from asf.reference_loader import ReferenceAssetLoader
from asf.candidate_loop import load_threshold_pack


class TestThresholdRecalibration:
    """Tests for threshold recalibration against demo assets."""

    def test_load_all_threshold_packs(self):
        """All families with threshold packs can be loaded."""
        for family in FAMILY_NAMES:
            pack_path = Path(f"critic_thresholds/{family}.json")
            if pack_path.exists():
                pack = load_threshold_pack(pack_path)
                assert pack.family == family

    def test_threshold_pack_structure_valid(self):
        """Each threshold pack has valid structure."""
        for family in FAMILY_NAMES:
            pack_path = Path(f"critic_thresholds/{family}.json")
            if not pack_path.exists():
                continue

            pack = load_threshold_pack(pack_path)

            assert pack.version == 1
            assert pack.family == family
            assert pack.critic_config_version == 1
            assert isinstance(pack.target_pass_band, tuple)
            assert len(pack.target_pass_band) == 2
            assert pack.target_pass_band[0] < pack.target_pass_band[1]
            assert isinstance(pack.reference_layout_types, tuple)
            assert pack.structural_minimum_occupancy_ratio >= 0
            assert pack.structural_minimum_edge_density >= 0
            assert pack.style_minimum_score >= 0
            assert pack.novelty_minimum_score >= 0
            assert pack.near_duplicate_similarity >= 0
            assert pack.near_duplicate_similarity <= 1

    def test_reference_images_have_valid_metrics(self):
        """Reference images have computed metrics matching expected structure."""
        loader = ReferenceAssetLoader()
        for family in FAMILY_NAMES:
            ref = loader.load_reference_image(family)
            if ref is None:
                continue
            assert ref.metrics is not None
            assert "color_count" in ref.metrics
            assert "non_transparent_occupancy_ratio" in ref.metrics
            assert "edge_density" in ref.metrics