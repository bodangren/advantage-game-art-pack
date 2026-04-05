"""Validation checks for rendered sprite sheets."""

from __future__ import annotations

from collections.abc import Iterable

from PIL import Image

from asf.specs import DEFAULT_PIVOT, SpriteSpec, SpecValidationError
from asf.style_packs import StylePack


def validate_sheet(
    sheet: Image.Image,
    spec: SpriteSpec,
    style_pack: StylePack,
) -> None:
    """Validates structural and palette constraints for a rendered sheet."""

    expected_size = (spec.frame.width * 3, spec.frame.height * 3)
    if sheet.mode != "RGBA":
        raise SpecValidationError("sheet must be RGBA")
    if sheet.size != expected_size:
        raise SpecValidationError(
            f"sheet must be {expected_size[0]}x{expected_size[1]}"
        )
    if spec.frame.pivot != DEFAULT_PIVOT:
        raise SpecValidationError("pivot drift detected")

    used_colors = {rgba for rgba in sheet.getdata() if rgba[3] > 0}
    if len(used_colors) > style_pack.palette_limits:
        raise SpecValidationError("palette exceeds style pack limit")

    _validate_frame_mappings(spec.animations.values())


def _validate_frame_mappings(frame_counts: Iterable[int]) -> None:
    counts = list(frame_counts)
    if len(counts) != 3 or any(count != 3 for count in counts):
        raise SpecValidationError("animation frames must total 9")
