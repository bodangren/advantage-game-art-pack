"""Tests for spec validation and style pack loading."""

from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from asf.specs import SpecValidationError, load_spec
from asf.style_packs import load_style_pack


ROOT = Path(__file__).resolve().parents[1]
EXAMPLE_SPEC = ROOT / "examples" / "swamp_slime.json"
STYLE_PACKS = ROOT / "style_packs"


class SpecLoadingTest(unittest.TestCase):
    """Validates the sprite spec loading contract."""

    def test_loads_valid_spec(self) -> None:
        spec = load_spec(EXAMPLE_SPEC)

        self.assertEqual(spec.style_pack, "cute_chibi_v1")
        self.assertEqual(spec.frame.pivot, (32, 56))
        self.assertEqual(spec.animations["walk"], 3)
        self.assertEqual(spec.pose.idle, ())
        self.assertEqual(spec.fx.type, "poison_aura")

    def test_rejects_unsupported_style_pack(self) -> None:
        spec = load_spec(EXAMPLE_SPEC)
        with self.assertRaisesRegex(
            SpecValidationError, "unsupported style pack"
        ):
            load_style_pack("missing_style", spec.palette, STYLE_PACKS)

    def test_rejects_invalid_frame_size(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            invalid_path = Path(tmp_dir) / "invalid.json"
            payload = json.loads(EXAMPLE_SPEC.read_text(encoding="utf-8"))
            payload["frame"]["width"] = 32
            invalid_path.write_text(
                json.dumps(payload), encoding="utf-8"
            )
            with self.assertRaisesRegex(
                SpecValidationError, "frame must be exactly 64x64"
            ):
                load_spec(invalid_path)

    def test_rejects_missing_pose_block(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            invalid_path = Path(tmp_dir) / "missing_pose.json"
            payload = json.loads(EXAMPLE_SPEC.read_text(encoding="utf-8"))
            payload.pop("pose")
            invalid_path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(SpecValidationError, "pose"):
                load_spec(invalid_path)

    def test_rejects_unknown_top_level_key(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            invalid_path = Path(tmp_dir) / "unknown_key.json"
            payload = json.loads(EXAMPLE_SPEC.read_text(encoding="utf-8"))
            payload["unexpected"] = True
            invalid_path.write_text(json.dumps(payload), encoding="utf-8")
            with self.assertRaisesRegex(
                SpecValidationError, "unexpected top-level key"
            ):
                load_spec(invalid_path)


if __name__ == "__main__":
    unittest.main()
