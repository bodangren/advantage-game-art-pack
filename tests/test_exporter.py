"""Tests for exporter metadata and validation."""

from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from asf.critic import validate_sheet
from asf.exporter import build_metadata, export_asset
from asf.renderer import render_sheet
from asf.specs import load_spec
from asf.style_packs import load_style_pack


ROOT = Path(__file__).resolve().parents[1]
EXAMPLE_SPEC = ROOT / "examples" / "swamp_slime.json"
STYLE_PACKS = ROOT / "style_packs"


class ExporterTest(unittest.TestCase):
    """Validates export outputs and metadata contracts."""

    def test_metadata_contains_expected_frame_mapping(self) -> None:
        spec = load_spec(EXAMPLE_SPEC)
        metadata = build_metadata(spec)

        self.assertEqual(metadata["frames"]["idle"], [0, 1, 2])
        self.assertEqual(metadata["frames"]["walk"], [3, 4, 5])
        self.assertEqual(metadata["frames"]["action"], [6, 7, 8])
        self.assertEqual(metadata["pivot"], [32, 56])

    def test_export_writes_sheet_and_metadata(self) -> None:
        spec = load_spec(EXAMPLE_SPEC)
        style_pack = load_style_pack(spec.style_pack, spec.palette, STYLE_PACKS)

        with tempfile.TemporaryDirectory() as tmp_dir:
            export_asset(spec, style_pack, tmp_dir)
            sheet_path = Path(tmp_dir) / "sheet.png"
            metadata_path = Path(tmp_dir) / "metadata.json"

            self.assertTrue(sheet_path.exists())
            self.assertTrue(metadata_path.exists())
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            self.assertEqual(metadata["entity_type"], "enemy")

    def test_validator_accepts_rendered_sheet(self) -> None:
        spec = load_spec(EXAMPLE_SPEC)
        style_pack = load_style_pack(spec.style_pack, spec.palette, STYLE_PACKS)
        sheet = render_sheet(spec, style_pack)

        validate_sheet(sheet, spec, style_pack)


if __name__ == "__main__":
    unittest.main()
