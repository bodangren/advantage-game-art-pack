"""Style pack loading for deterministic rendering rules."""

from __future__ import annotations

from dataclasses import dataclass
import json
import re
from pathlib import Path
from typing import Any

from asf.specs import PaletteSpec, SpecValidationError


HEX_COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


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
    lighting_direction: str
    lighting_levels: int
    shading_type: str
    allowed_parts: tuple[str, ...]
    directional_variants: dict[str, dict[str, str]]
    ramps: dict[str, tuple[str, str, str]]

    def ramp(self, ramp_name: str) -> tuple[str, str, str]:
        """Returns the RGB ramp registered under ``ramp_name``."""

        return self.ramps[ramp_name]

    def variant_for_direction(
        self, direction: str, part_name: str
    ) -> str | None:
        """Returns the variant_id override for a given direction and part, or None."""
        variants = self.directional_variants.get(direction, {})
        return variants.get(part_name)


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise SpecValidationError("style pack must be a JSON object")
    return payload


def _require_mapping(payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = payload.get(key)
    if not isinstance(value, dict):
        raise SpecValidationError(f"'{key}' must be an object")
    return value


def _require_string(
    payload: dict[str, Any], key: str, *, allow_empty: bool = False
) -> str:
    value = payload.get(key)
    if not isinstance(value, str):
        raise SpecValidationError(f"'{key}' must be a string")
    if not allow_empty and not value:
        raise SpecValidationError(f"'{key}' must be a non-empty string")
    return value


def _require_int(payload: dict[str, Any], key: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise SpecValidationError(f"'{key}' must be an integer")
    return value


def _require_bool(payload: dict[str, Any], key: str) -> bool:
    value = payload.get(key)
    if not isinstance(value, bool):
        raise SpecValidationError(f"'{key}' must be a boolean")
    return value


def _require_string_list(payload: dict[str, Any], key: str) -> tuple[str, ...]:
    value = payload.get(key)
    if not isinstance(value, list) or not value:
        raise SpecValidationError(f"'{key}' must be a non-empty array")
    items: list[str] = []
    for entry in value:
        if not isinstance(entry, str) or not entry:
            raise SpecValidationError(f"'{key}' must contain non-empty strings")
        items.append(entry)
    return tuple(items)


def _require_exact_keys(
    payload: dict[str, Any], expected: set[str], context: str
) -> None:
    missing = expected - payload.keys()
    extra = payload.keys() - expected
    if missing:
        joined = ", ".join(sorted(missing))
        raise SpecValidationError(f"{context} missing required key(s): {joined}")
    if extra:
        joined = ", ".join(sorted(extra))
        raise SpecValidationError(f"{context} contains unexpected key(s): {joined}")


def _parse_ramp(name: str, value: Any) -> tuple[str, str, str]:
    if not isinstance(value, list) or len(value) != 3:
        raise SpecValidationError(
            f"style pack ramp '{name}' must contain exactly 3 colors"
        )
    colors: list[str] = []
    for entry in value:
        if not isinstance(entry, str) or not HEX_COLOR_RE.fullmatch(entry):
            raise SpecValidationError(
                f"style pack ramp '{name}' must contain valid hex color values"
            )
        colors.append(entry.lower())
    return tuple(colors)  # type: ignore[return-value]


def _load_ramps(payload: dict[str, Any]) -> dict[str, tuple[str, str, str]]:
    ramps = payload.get("ramps")
    if not isinstance(ramps, dict) or not ramps:
        raise SpecValidationError("'ramps' must be a non-empty object")
    result: dict[str, tuple[str, str, str]] = {}
    for key, value in ramps.items():
        if not isinstance(key, str) or not key:
            raise SpecValidationError("style pack ramp names must be strings")
        result[key] = _parse_ramp(key, value)
    return result


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

    payload = _load_json(path)
    _require_exact_keys(
        payload,
        {
            "name",
            "palette_limits",
            "outline",
            "lighting",
            "shading",
            "allowed_parts",
            "animation_rules",
            "ramps",
            "directional_variants",
        },
        "style pack",
    )

    name = _require_string(payload, "name")
    if name != style_pack_name:
        raise SpecValidationError(
            f"style pack file '{path.name}' declares '{name}' instead of "
            f"'{style_pack_name}'"
        )

    outline_payload = _require_mapping(payload, "outline")
    _require_exact_keys(outline_payload, {"enabled", "color", "thickness"}, "outline")
    outline = OutlineRule(
        enabled=_require_bool(outline_payload, "enabled"),
        color=_require_string(outline_payload, "color"),
        thickness=_require_int(outline_payload, "thickness"),
    )

    lighting_payload = _require_mapping(payload, "lighting")
    _require_exact_keys(lighting_payload, {"direction", "levels"}, "lighting")

    shading_payload = _require_mapping(payload, "shading")
    _require_exact_keys(shading_payload, {"type"}, "shading")

    animation_payload = _require_mapping(payload, "animation_rules")
    _require_exact_keys(
        animation_payload, {"max_offset", "max_rotation_deg"}, "animation_rules"
    )
    animation_rules = AnimationRule(
        max_offset=_require_int(animation_payload, "max_offset"),
        max_rotation_deg=_require_int(animation_payload, "max_rotation_deg"),
    )
    if animation_rules.max_offset < 0 or animation_rules.max_rotation_deg < 0:
        raise SpecValidationError("animation rules must be non-negative")

    palette_limits = _require_int(payload, "palette_limits")
    if palette_limits <= 0:
        raise SpecValidationError("'palette_limits' must be positive")

    allowed_parts = _require_string_list(payload, "allowed_parts")
    raw_variants = payload.get("directional_variants", {})
    directional_variants: dict[str, dict[str, str]] = {}
    for direction, parts in raw_variants.items():
        if not isinstance(direction, str) or not direction:
            raise SpecValidationError("directional_variants keys must be non-empty strings")
        if not isinstance(parts, dict):
            raise SpecValidationError(f"directional_variants['{direction}'] must be an object")
        for part_name, variant_id in parts.items():
            if not isinstance(part_name, str) or not part_name:
                raise SpecValidationError("directional_variants part names must be non-empty strings")
            if not isinstance(variant_id, str) or not variant_id:
                raise SpecValidationError("directional_variants variant_ids must be non-empty strings")
        directional_variants[direction] = parts
    ramps = _load_ramps(payload)

    for ramp_name in (palette.primary, palette.secondary, palette.accent):
        if ramp_name not in ramps:
            raise SpecValidationError(f"unknown palette ramp '{ramp_name}'")

    return StylePack(
        name=name,
        palette_limits=palette_limits,
        outline=outline,
        animation_rules=animation_rules,
        lighting_direction=_require_string(lighting_payload, "direction"),
        lighting_levels=_require_int(lighting_payload, "levels"),
        shading_type=_require_string(shading_payload, "type"),
        allowed_parts=allowed_parts,
        directional_variants=directional_variants,
        ramps=ramps,
    )
