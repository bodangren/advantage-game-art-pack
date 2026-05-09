"""Tests for reference demo asset coverage."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from asf.canon import FAMILY_NAMES


REFERENCE_DIR = Path("reference/demo_assets")


class TestReferenceAssetCoverage:
    """Test that reference demo assets exist for all families."""

    def test_reference_dir_exists(self):
        """Reference directory should exist."""
        assert REFERENCE_DIR.is_dir(), f"Reference dir {REFERENCE_DIR} does not exist"

    @pytest.mark.parametrize("family", FAMILY_NAMES)
    def test_source_program_exists(self, family: str):
        """Every family in FAMILY_NAMES should have a source JSON."""
        source_path = REFERENCE_DIR / f"{family}_source.json"
        assert source_path.exists(), (
            f"Missing source program for family '{family}': "
            f"{source_path} does not exist"
        )

    @pytest.mark.parametrize("family", FAMILY_NAMES)
    def test_source_program_valid_json(self, family: str):
        """Every source program should be valid JSON."""
        source_path = REFERENCE_DIR / f"{family}_source.json"
        if not source_path.exists():
            pytest.skip(f"Source program {source_path} does not exist")
        with open(source_path) as f:
            data = json.load(f)
        assert isinstance(data, dict), f"{family} source is not a JSON object"

    @pytest.mark.parametrize("family", FAMILY_NAMES)
    def test_reference_png_exists(self, family: str):
        """Every family should have a compiled reference PNG."""
        ref_path = REFERENCE_DIR / f"{family}_reference.png"
        assert ref_path.exists(), (
            f"Missing reference PNG for family '{family}': "
            f"{ref_path} does not exist"
        )