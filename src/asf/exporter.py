"""Export helpers for sprite sheets and metadata."""

from __future__ import annotations

import json
from pathlib import Path

from asf.critic import validate_sheet
from asf.renderer import FRAME_ORDER, render_sheet
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
    sheet.save(sheet_path, format="PNG", optimize=False, compress_level=9)
    metadata = build_metadata(spec)
    metadata_path.write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return metadata


def build_metadata(spec: SpriteSpec) -> dict[str, object]:
    """Builds the export metadata contract for a rendered asset."""

    animation_frames = {
        "idle": [0, 1, 2],
        "walk": [3, 4, 5],
        "action": [6, 7, 8],
    }
    return {
        "style_pack": spec.style_pack,
        "entity_type": spec.entity_type,
        "archetype": spec.body.archetype,
        "frame_size": [spec.frame.width, spec.frame.height],
        "sheet_size": [spec.frame.width * 3, spec.frame.height * 3],
        "pivot": [spec.frame.pivot[0], spec.frame.pivot[1]],
        "frame_order": list(FRAME_ORDER),
        "animation_frames": animation_frames,
        "animations": dict(spec.animations),
        "body": {
            "archetype": spec.body.archetype,
            "proportions": {
                "head_scale": spec.body.head_scale,
                "torso_scale": spec.body.torso_scale,
                "leg_length": spec.body.leg_length,
            },
        },
        "parts": dict(spec.parts),
        "equipment": {
            "main_hand": spec.equipment.main_hand,
            "off_hand": spec.equipment.off_hand,
        },
        "palette": {
            "primary": spec.palette.primary,
            "secondary": spec.palette.secondary,
            "accent": spec.palette.accent,
        },
        "pose": {
            "idle": list(spec.pose.idle),
            "walk": list(spec.pose.walk),
            "action": list(spec.pose.action),
        },
        "fx": {"type": spec.fx.type},
    }
