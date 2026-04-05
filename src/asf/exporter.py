"""Export helpers for sprite sheets and metadata."""

from __future__ import annotations

import json
from pathlib import Path

from asf.critic import validate_sheet
from asf.renderer import render_sheet
from asf.specs import SpriteSpec
from asf.style_packs import StylePack


def export_asset(
    spec: SpriteSpec,
    style_pack: StylePack,
    output_dir: str | Path,
) -> dict[str, object]:
    """Renders, validates, and exports a sprite sheet and metadata."""

    target_dir = Path(output_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    sheet = render_sheet(spec, style_pack)
    validate_sheet(sheet, spec, style_pack)

    sheet_path = target_dir / "sheet.png"
    metadata_path = target_dir / "metadata.json"
    sheet.save(sheet_path, format="PNG")
    metadata = build_metadata(spec)
    metadata_path.write_text(
        json.dumps(metadata, indent=2) + "\n", encoding="utf-8"
    )
    return metadata


def build_metadata(spec: SpriteSpec) -> dict[str, object]:
    """Builds the export metadata contract for a rendered asset."""

    return {
        "frames": {
            "idle": [0, 1, 2],
            "walk": [3, 4, 5],
            "action": [6, 7, 8],
        },
        "pivot": [spec.frame.pivot[0], spec.frame.pivot[1]],
        "style_pack": spec.style_pack,
        "entity_type": spec.entity_type,
        "palette": {
            "primary": spec.palette.primary,
            "secondary": spec.palette.secondary,
            "accent": spec.palette.accent,
        },
        "fx": spec.fx_type,
    }
