"""Tests for reference asset loader."""
from __future__ import annotations

from pathlib import Path

import pytest

from asf.canon import FAMILY_NAMES
from asf.reference_loader import ReferenceAssetLoader, ReferenceImage


REFERENCE_DIR = Path("reference/demo_assets")


class TestReferenceAssetLoader:
    """Tests for ReferenceAssetLoader class."""

    def test_loader_initialization(self):
        """Loader initializes with default values."""
        loader = ReferenceAssetLoader()
        assert loader.reference_dir == REFERENCE_DIR
        assert loader.repo_root == Path.cwd()

    def test_loader_with_custom_paths(self, tmp_path):
        """Loader accepts custom reference_dir and repo_root."""
        loader = ReferenceAssetLoader(reference_dir=tmp_path / "ref", repo_root=tmp_path)
        assert loader.reference_dir == tmp_path / "ref"
        assert loader.repo_root == tmp_path

    @pytest.mark.parametrize("family", FAMILY_NAMES)
    def test_load_reference_image(self, family: str):
        """Every family should have a reference image that can be loaded."""
        loader = ReferenceAssetLoader()
        ref = loader.load_reference_image(family)
        assert ref is not None, f"Failed to load reference for family {family}"
        assert ref.family == family
        assert ref.image is not None
        assert ref.image.size[0] > 0 and ref.image.size[1] > 0

    @pytest.mark.parametrize("family", FAMILY_NAMES)
    def test_reference_image_has_metrics(self, family: str):
        """Reference image should have computed metrics."""
        loader = ReferenceAssetLoader()
        ref = loader.load_reference_image(family)
        assert ref.metrics is not None
        assert "color_count" in ref.metrics
        assert "non_transparent_occupancy_ratio" in ref.metrics

    def test_load_nonexistent_family_returns_none(self):
        """Loading a non-existent family returns None gracefully."""
        loader = ReferenceAssetLoader()
        ref = loader.load_reference_image("nonexistent_family")
        assert ref is None

    def test_all_references_by_family(self):
        """Can retrieve all references organized by family."""
        loader = ReferenceAssetLoader()
        all_refs = loader.all_references_by_family()
        assert isinstance(all_refs, dict)
        for family in FAMILY_NAMES:
            assert family in all_refs, f"Family {family} not found in references"
            assert len(all_refs[family]) == 1

    def test_reference_image_path(self):
        """Reference image path follows expected convention."""
        loader = ReferenceAssetLoader()
        for family in FAMILY_NAMES:
            expected_path = REFERENCE_DIR / f"{family}_reference.png"
            ref = loader.load_reference_image(family)
            if ref is not None:
                assert ref.path == expected_path

    def test_has_reference(self):
        """has_reference returns True only for families with reference files."""
        loader = ReferenceAssetLoader()
        for family in FAMILY_NAMES:
            assert loader.has_reference(family) is True

    def test_has_reference_false_for_nonexistent(self):
        """has_reference returns False for non-existent families."""
        loader = ReferenceAssetLoader()
        assert loader.has_reference("nonexistent_family") is False