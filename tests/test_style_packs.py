"""Tests for style-pack validation."""

from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from asf.specs import load_spec, SpecValidationError
from asf.style_packs import load_style_pack


ROOT = Path(__file__).resolve().parents[1]
EXAMPLE_SPEC = ROOT / "examples" / "swamp_slime.json"
STYLE_PACKS = ROOT / "style_packs"


class StylePackLoadingTest(unittest.TestCase):
    """Validates style-pack parsing and palette-ramp contracts."""

    def test_rejects_invalid_ramp_colors(self) -> None:
        spec = load_spec(EXAMPLE_SPEC)
        with tempfile.TemporaryDirectory() as tmp_dir:
            pack_dir = Path(tmp_dir)
            pack_path = pack_dir / f"{spec.style_pack}.json"
            payload = json.loads(
                (STYLE_PACKS / f"{spec.style_pack}.json").read_text(
                    encoding="utf-8"
                )
            )
            payload["ramps"]["swamp_green"][1] = "not-a-hex-color"
            pack_path.write_text(json.dumps(payload), encoding="utf-8")

            with self.assertRaisesRegex(
                SpecValidationError, "hex color"
            ):
                load_style_pack(spec.style_pack, spec.palette, pack_dir)


if __name__ == "__main__":
    unittest.main()
