"""Palette quantization utilities for renderer-side color reduction."""

from __future__ import annotations

from dataclasses import dataclass
import statistics

from PIL import Image

from asf.specs import SpecValidationError


class PaletteQuantizationError(SpecValidationError):
    """Raised when palette quantization fails."""


@dataclass(frozen=True)
class QuantizedResult:
    image: Image.Image
    original_color_count: int
    quantized_color_count: int


def quantize_image_to_palette(
    image: Image.Image,
    palette_limit: int,
) -> Image.Image:
    """Reduces image colors to fit within palette_limit using median-cut quantization.

    This is deterministic: same input image + palette_limit always produces same output.
    Transparency is preserved - fully transparent pixels are not counted toward the limit.
    """

    if palette_limit <= 0:
        raise PaletteQuantizationError("palette_limit must be positive")

    if image.mode != "RGBA":
        image = image.convert("RGBA")

    if image.size[0] * image.size[1] == 0:
        return image.copy()

    opaque_pixels: list[tuple[int, int, int, int]] = []
    transparent_count = 0
    for px in image.getdata():
        if px[3] > 0:
            opaque_pixels.append(px)
        else:
            transparent_count += 1

    original_color_count = len({px for px in opaque_pixels})

    if original_color_count <= palette_limit:
        return image.copy()

    palette = _median_cut_quantize(opaque_pixels, palette_limit)

    result = Image.new("RGBA", image.size)

    color_to_nearest = _build_nearest_color_lookup(palette)

    for y in range(image.size[1]):
        for x in range(image.size[0]):
            px = image.getpixel((x, y))
            if px[3] > 0:
                nearest = color_to_nearest(px[:3])
                result.putpixel((x, y), nearest + (px[3],))
            else:
                result.putpixel((x, y), (0, 0, 0, 0))

    return result


def _median_cut_quantize(
    pixels: list[tuple[int, int, int, int]],
    max_colors: int,
) -> list[tuple[int, int, int]]:
    """Median-cut quantization producing max_colors or fewer colors."""

    if not pixels:
        return []

    color_buckets: list[list[tuple[int, int, int]]] = [[px[:3] for px in pixels]]

    while len(color_buckets) < max_colors:
        largest_idx = max(
            range(len(color_buckets)),
            key=lambda i: len(color_buckets[i]),
        )
        if len(color_buckets[largest_idx]) <= 1:
            break

        bucket = color_buckets[largest_idx]
        ranges = [
            (max(c) - min(c)) if len(set(c)) > 1 else 0
            for c in zip(*bucket)
        ]
        split_axis = ranges.index(max(ranges))

        bucket.sort(key=lambda c: c[split_axis])
        mid = len(bucket) // 2

        left = bucket[:mid]
        right = bucket[mid:]

        color_buckets[largest_idx] = left
        color_buckets.append(right)

    palette: list[tuple[int, int, int]] = []
    for bucket in color_buckets:
        if bucket:
            avg = (
                round(statistics.mean(c[0] for c in bucket)),
                round(statistics.mean(c[1] for c in bucket)),
                round(statistics.mean(c[2] for c in bucket)),
            )
            palette.append(avg)

    return palette


def _build_nearest_color_lookup(
    palette: list[tuple[int, int, int]],
) -> callable:
    """Build a function that maps RGB colors to nearest palette color."""

    def nearest(rgb: tuple[int, int, int]) -> tuple[int, int, int]:
        r, g, b = rgb
        best_idx = 0
        best_dist = float("inf")
        for idx, (pr, pg, pb) in enumerate(palette):
            dr = r - pr
            dg = g - pg
            db = b - pb
            dist = dr * dr + dg * dg + db * db
            if dist < best_dist:
                best_dist = dist
                best_idx = idx
        return palette[best_idx]

    return nearest