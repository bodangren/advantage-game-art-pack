"""Tests for deterministic rendering behavior."""

from __future__ import annotations

import hashlib
from pathlib import Path
import unittest

from asf.renderer import render_png_bytes, render_sheet
from asf.specs import load_spec
from asf.style_packs import load_style_pack


ROOT = Path(__file__).resolve().parents[1]
EXAMPLE_SPEC = ROOT / "examples" / "swamp_slime.json"
STYLE_PACKS = ROOT / "style_packs"


class RendererTest(unittest.TestCase):
    """Ensures rendering remains deterministic and sized correctly."""

    def test_rendered_sheet_is_deterministic(self) -> None:
        spec = load_spec(EXAMPLE_SPEC)
        style_pack = load_style_pack(spec.style_pack, spec.palette, STYLE_PACKS)

        first = render_png_bytes(spec, style_pack)
        second = render_png_bytes(spec, style_pack)

        self.assertEqual(
            hashlib.sha256(first).hexdigest(),
            hashlib.sha256(second).hexdigest(),
        )

    def test_rendered_sheet_size_is_3x3_grid(self) -> None:
        spec = load_spec(EXAMPLE_SPEC)
        style_pack = load_style_pack(spec.style_pack, spec.palette, STYLE_PACKS)

        sheet = render_sheet(spec, style_pack)

        self.assertEqual(sheet.size, (192, 192))

    def test_renders_visual_output_for_human_review(self) -> None:
        spec = load_spec(EXAMPLE_SPEC)
        style_pack = load_style_pack(spec.style_pack, spec.palette, STYLE_PACKS)

        sheet = render_sheet(spec, style_pack)
        output_path = ROOT / "outputs" / "test_render_swamp_slime.png"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(output_path)

        self.assertTrue(output_path.exists())


if __name__ == "__main__":
    unittest.main()
