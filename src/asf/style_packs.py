"""Style pack loading for deterministic rendering rules."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any

from asf.specs import PaletteSpec, SpecValidationError


@dataclass(frozen=True)
class OutlineRule:
    """Defines the outline settings for a style pack."""

    enabled: bool
    color: str
    thickness: int


@dataclass(frozen=True)
class AnimationRule:
    """Defines animation motion limits for a style pack."""

    max_offset: int
    max_rotation_deg: int


@dataclass(frozen=True)
class StylePack:
    """Typed style pack configuration used by the renderer."""

    name: str
    palette_limits: int
    outline: OutlineRule
    animation_rules: AnimationRule
    ramps: dict[str, list[str]]


def load_style_pack(
    style_pack_name: str,
    palette: PaletteSpec,
    base_dir: str | Path | None = None,
) -> StylePack:
    """Loads a style pack and validates palette ramp availability."""

    root = Path(base_dir or Path.cwd() / "style_packs")
    path = root / f"{style_pack_name}.json"
    if not path.exists():
        raise SpecValidationError(f"unsupported style pack '{style_pack_name}'")
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise SpecValidationError("style pack must be a JSON object")
    pack = StylePack(
        name=str(payload["name"]),
        palette_limits=int(payload["palette_limits"]),
        outline=OutlineRule(
            enabled=bool(payload["outline"]["enabled"]),
            color=str(payload["outline"]["color"]),
            thickness=int(payload["outline"]["thickness"]),
        ),
        animation_rules=AnimationRule(
            max_offset=int(payload["animation_rules"]["max_offset"]),
            max_rotation_deg=int(
                payload["animation_rules"]["max_rotation_deg"]
            ),
        ),
        ramps=_load_ramps(payload),
    )
    for ramp_name in (palette.primary, palette.secondary, palette.accent):
        if ramp_name not in pack.ramps:
            raise SpecValidationError(f"unknown palette ramp '{ramp_name}'")
    return pack


def _load_ramps(payload: dict[str, Any]) -> dict[str, list[str]]:
    ramps = payload.get("ramps")
    if not isinstance(ramps, dict):
        raise SpecValidationError("style pack ramps must be an object")
    result: dict[str, list[str]] = {}
    for key, value in ramps.items():
        if not isinstance(key, str) or not isinstance(value, list):
            raise SpecValidationError("style pack ramps must be string arrays")
        result[key] = [str(entry) for entry in value]
    return result
