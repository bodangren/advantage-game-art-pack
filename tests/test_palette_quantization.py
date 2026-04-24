"""Tests for palette quantization and refinement."""

from __future__ import annotations

from PIL import Image
import unittest

from asf.palette import (
    quantize_image_to_palette,
    PaletteQuantizationError,
)


class PaletteQuantizationTest(unittest.TestCase):
    """Validates palette-aware color quantization."""

    def test_quantize_reduces_color_count_to_limit(self) -> None:
        source = Image.new("RGBA", (32, 32))
        for y in range(32):
            for x in range(32):
                r = (x * 8) % 256
                g = (y * 8) % 256
                b = ((x + y) * 4) % 256
                source.putpixel((x, y), (r, g, b, 255))

        palette_limit = 12
        result = quantize_image_to_palette(source, palette_limit)

        used_colors = {px for px in result.getdata() if px[3] > 0}
        self.assertLessEqual(len(used_colors), palette_limit)

    def test_quantize_is_deterministic(self) -> None:
        source = Image.new("RGBA", (16, 16))
        for y in range(16):
            for x in range(16):
                hue = ((x * 16) + (y * 16)) % 360
                h = hue / 360.0
                s = 0.8
                v = 0.9
                r = int(v * 255)
                g = int((v - s * h + 0.5) * 255)
                b = int((v - s * (1 - h) + 0.5) * 255)
                source.putpixel((x, y), (r, g, b, 255))

        palette_limit = 8
        first = quantize_image_to_palette(source, palette_limit)
        second = quantize_image_to_palette(source, palette_limit)

        self.assertEqual(
            hash(first.tobytes()),
            hash(second.tobytes()),
        )

    def test_quantize_preserves_transparency(self) -> None:
        source = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
        for i in range(8):
            source.putpixel((i, i), (255, 0, 0, 128))
            source.putpixel((7 - i, i), (0, 255, 0, 64))

        result = quantize_image_to_palette(source, palette_limit=4)

        transparent_count = sum(1 for px in result.getdata() if px[3] == 0)
        self.assertEqual(transparent_count, 48)

    def test_quantize_rejects_invalid_limit(self) -> None:
        source = Image.new("RGBA", (8, 8))

        with self.assertRaises(PaletteQuantizationError):
            quantize_image_to_palette(source, palette_limit=0)

        with self.assertRaises(PaletteQuantizationError):
            quantize_image_to_palette(source, palette_limit=-1)

    def test_quantize_handles_empty_canvas(self) -> None:
        source = Image.new("RGBA", (0, 0))
        result = quantize_image_to_palette(source, palette_limit=4)
        self.assertEqual(result.size, (0, 0))

    def test_quantize_on_small_image_under_limit(self) -> None:
        source = Image.new("RGBA", (4, 4), (255, 0, 0, 255))
        result = quantize_image_to_palette(source, palette_limit=12)

        used_colors = {px for px in result.getdata() if px[3] > 0}
        self.assertLessEqual(len(used_colors), 12)


if __name__ == "__main__":
    unittest.main()