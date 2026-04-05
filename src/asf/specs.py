"""Typed sprite specification loading and validation."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any


SUPPORTED_ANIMATIONS = ("idle", "walk", "action")
EXPECTED_FRAME_COUNTS = {"idle": 3, "walk": 3, "action": 3}
DEFAULT_PIVOT = (32, 56)


class SpecValidationError(ValueError):
    """Raised when a sprite specification is malformed."""


@dataclass(frozen=True)
class FrameSpec:
    """Defines a single frame contract for the sprite sheet."""

    width: int
    height: int
    pivot: tuple[int, int]


@dataclass(frozen=True)
class BodySpec:
    """Defines the body archetype and proportions."""

    archetype: str
    head_scale: float
    torso_scale: float
    leg_length: int


@dataclass(frozen=True)
class EquipmentSpec:
    """Defines optional equipment slots."""

    main_hand: str | None
    off_hand: str | None


@dataclass(frozen=True)
class PaletteSpec:
    """Defines palette ramp identifiers for the entity."""

    primary: str
    secondary: str
    accent: str


@dataclass(frozen=True)
class SpriteSpec:
    """Full typed sprite specification for deterministic rendering."""

    style_pack: str
    entity_type: str
    frame: FrameSpec
    animations: dict[str, int]
    body: BodySpec
    parts: dict[str, str]
    equipment: EquipmentSpec
    palette: PaletteSpec
    fx_type: str | None


def _require_mapping(payload: dict[str, Any], key: str) -> dict[str, Any]:
    value = payload.get(key)
    if not isinstance(value, dict):
        raise SpecValidationError(f"'{key}' must be an object")
    return value


def _require_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value:
        raise SpecValidationError(f"'{key}' must be a non-empty string")
    return value


def _optional_string(payload: dict[str, Any], key: str) -> str | None:
    value = payload.get(key)
    if value is None:
        return None
    if not isinstance(value, str) or not value:
        raise SpecValidationError(f"'{key}' must be null or a non-empty string")
    return value


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise SpecValidationError("top-level spec must be an object")
    return payload


def load_spec(path: str | Path) -> SpriteSpec:
    """Loads and validates a sprite specification from disk.

    Args:
        path: JSON file path.

    Returns:
        A validated SpriteSpec instance.

    Raises:
        SpecValidationError: If the payload does not match the MVP contract.
    """

    payload = _load_json(Path(path))
    frame_payload = _require_mapping(payload, "frame")
    animations = _require_mapping(payload, "animations")
    body_payload = _require_mapping(payload, "body")
    proportions = _require_mapping(body_payload, "proportions")
    parts = _require_mapping(payload, "parts")
    equipment_payload = _require_mapping(payload, "equipment")
    palette_payload = _require_mapping(payload, "palette")
    fx_payload = _require_mapping(payload, "fx")

    frame = FrameSpec(
        width=int(frame_payload.get("width", 0)),
        height=int(frame_payload.get("height", 0)),
        pivot=tuple(frame_payload.get("pivot", ())),
    )
    if frame.width != 64 or frame.height != 64:
        raise SpecValidationError("frame must be exactly 64x64")
    if frame.pivot != DEFAULT_PIVOT:
        raise SpecValidationError("frame pivot must be [32, 56]")

    for name in SUPPORTED_ANIMATIONS:
        if animations.get(name) != EXPECTED_FRAME_COUNTS[name]:
            raise SpecValidationError(
                f"animation '{name}' must define exactly 3 frames"
            )

    for part_name in ("head", "torso", "legs", "arms"):
        _require_string(parts, part_name)

    body = BodySpec(
        archetype=_require_string(body_payload, "archetype"),
        head_scale=float(proportions.get("head_scale", 0)),
        torso_scale=float(proportions.get("torso_scale", 0)),
        leg_length=int(proportions.get("leg_length", 0)),
    )
    if body.head_scale <= 0 or body.torso_scale <= 0 or body.leg_length <= 0:
        raise SpecValidationError("body proportions must be positive")

    return SpriteSpec(
        style_pack=_require_string(payload, "style_pack"),
        entity_type=_require_string(payload, "entity_type"),
        frame=frame,
        animations=dict(animations),
        body=body,
        parts=dict(parts),
        equipment=EquipmentSpec(
            main_hand=_optional_string(equipment_payload, "main_hand"),
            off_hand=_optional_string(equipment_payload, "off_hand"),
        ),
        palette=PaletteSpec(
            primary=_require_string(palette_payload, "primary"),
            secondary=_require_string(palette_payload, "secondary"),
            accent=_require_string(palette_payload, "accent"),
        ),
        fx_type=_optional_string(fx_payload, "type"),
    )
