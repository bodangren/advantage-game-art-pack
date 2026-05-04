"""Typed sprite specification loading and validation."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class PartLibraryRef:
    """Reference to a primitive with positioning and scale."""

    primitive_id: str
    x: int
    y: int
    scale: float = 1.0


SUPPORTED_ANIMATIONS = ("idle", "walk", "action")
EXPECTED_FRAME_COUNTS = {"idle": 3, "walk": 3, "action": 3}
DEFAULT_PIVOT = (32, 56)
ALLOWED_TOP_LEVEL_KEYS = {
    "style_pack",
    "entity_type",
    "frame",
    "animations",
    "body",
    "parts",
    "equipment",
    "palette",
    "pose",
    "fx",
}


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
class PoseSpec:
    """Optional per-animation pose overrides."""

    idle: tuple[int, ...]
    walk: tuple[int, ...]
    action: tuple[int, ...]


@dataclass(frozen=True)
class FxSpec:
    """Defines optional effect overlays."""

    type: str | None


@dataclass(frozen=True)
class EffectSpec:
    """Defines standalone effect overlay parameters."""

    effect_type: str
    duration_frames: int
    blend_mode: str
    intensity: float
    color_tint: tuple[int, int, int] | None = None

    def __post_init__(self) -> None:
        valid_types = ("glow", "pulse", "aura", "burst")
        if self.effect_type not in valid_types:
            raise SpecValidationError(
                f"'effect_type' must be one of {valid_types}, got '{self.effect_type}'"
            )
        if self.duration_frames < 1 or self.duration_frames > 64:
            raise SpecValidationError(
                f"'duration_frames' must be between 1 and 64, got {self.duration_frames}"
            )
        valid_blends = ("additive", "screen", "multiply")
        if self.blend_mode not in valid_blends:
            raise SpecValidationError(
                f"'blend_mode' must be one of {valid_blends}, got '{self.blend_mode}'"
            )
        if not (0.0 <= self.intensity <= 1.0):
            raise SpecValidationError(
                f"'intensity' must be between 0.0 and 1.0, got {self.intensity}"
            )
        if self.color_tint is not None:
            if not isinstance(self.color_tint, tuple) or len(self.color_tint) != 3:
                raise SpecValidationError("'color_tint' must be null or a 3-element RGB tuple")
            if not all(0 <= c <= 255 for c in self.color_tint):
                raise SpecValidationError("'color_tint' RGB values must be between 0 and 255")


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
    pose: PoseSpec
    fx: FxSpec
    part_library_refs: tuple[PartLibraryRef, ...] = ()


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise SpecValidationError("top-level spec must be an object")
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


def _optional_string(payload: dict[str, Any], key: str) -> str | None:
    value = payload.get(key)
    if value is None:
        return None
    if not isinstance(value, str) or not value:
        raise SpecValidationError(f"'{key}' must be null or a non-empty string")
    return value


def _require_int(payload: dict[str, Any], key: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise SpecValidationError(f"'{key}' must be an integer")
    return value


def _require_float(payload: dict[str, Any], key: str) -> float:
    value = payload.get(key)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise SpecValidationError(f"'{key}' must be a number")
    return float(value)


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
        label = "unexpected top-level key(s)" if context == "top-level spec" else "unexpected key(s)"
        raise SpecValidationError(f"{context} contains {label}: {joined}")


def _parse_pivot(payload: dict[str, Any]) -> tuple[int, int]:
    pivot = payload.get("pivot")
    if not isinstance(pivot, list) or len(pivot) != 2:
        raise SpecValidationError("'pivot' must be a two-item array")
    if not all(isinstance(value, int) and not isinstance(value, bool) for value in pivot):
        raise SpecValidationError("'pivot' must contain integers")
    return pivot[0], pivot[1]


def _parse_pose_animation(payload: dict[str, Any], key: str) -> tuple[int, ...]:
    value = payload.get(key)
    if not isinstance(value, list):
        raise SpecValidationError(f"'pose.{key}' must be an array")
    if value and len(value) != 3:
        raise SpecValidationError(
            f"'pose.{key}' must be empty or contain exactly 3 offsets"
        )
    if not all(isinstance(entry, int) and not isinstance(entry, bool) for entry in value):
        raise SpecValidationError(f"'pose.{key}' must contain integers")
    return tuple(value)


def load_spec_payload(payload: dict[str, Any]) -> SpriteSpec:
    """Loads and validates a sprite specification from an object payload."""

    _require_exact_keys(payload, ALLOWED_TOP_LEVEL_KEYS, "top-level spec")

    frame_payload = _require_mapping(payload, "frame")
    _require_exact_keys(frame_payload, {"width", "height", "pivot"}, "frame")
    frame = FrameSpec(
        width=_require_int(frame_payload, "width"),
        height=_require_int(frame_payload, "height"),
        pivot=_parse_pivot(frame_payload),
    )
    if frame.width != 64 or frame.height != 64:
        raise SpecValidationError("frame must be exactly 64x64")
    if frame.pivot != DEFAULT_PIVOT:
        raise SpecValidationError("frame pivot must be [32, 56]")

    animations = _require_mapping(payload, "animations")
    _require_exact_keys(animations, set(SUPPORTED_ANIMATIONS), "animations")
    animation_counts = {
        name: _require_int(animations, name) for name in SUPPORTED_ANIMATIONS
    }
    for name, count in animation_counts.items():
        if count != EXPECTED_FRAME_COUNTS[name]:
            raise SpecValidationError(
                f"animation '{name}' must define exactly 3 frames"
            )

    body_payload = _require_mapping(payload, "body")
    _require_exact_keys(body_payload, {"archetype", "proportions"}, "body")
    proportions = _require_mapping(body_payload, "proportions")
    _require_exact_keys(
        proportions, {"head_scale", "torso_scale", "leg_length"}, "body.proportions"
    )
    body = BodySpec(
        archetype=_require_string(body_payload, "archetype"),
        head_scale=_require_float(proportions, "head_scale"),
        torso_scale=_require_float(proportions, "torso_scale"),
        leg_length=_require_int(proportions, "leg_length"),
    )
    if body.head_scale <= 0 or body.torso_scale <= 0 or body.leg_length <= 0:
        raise SpecValidationError("body proportions must be positive")

    parts = _require_mapping(payload, "parts")
    _require_exact_keys(parts, {"head", "torso", "legs", "arms"}, "parts")
    parts_spec = {
        key: _require_string(parts, key) for key in ("head", "torso", "legs", "arms")
    }

    equipment_payload = _require_mapping(payload, "equipment")
    _require_exact_keys(
        equipment_payload, {"main_hand", "off_hand"}, "equipment"
    )
    equipment = EquipmentSpec(
        main_hand=_optional_string(equipment_payload, "main_hand"),
        off_hand=_optional_string(equipment_payload, "off_hand"),
    )

    palette_payload = _require_mapping(payload, "palette")
    _require_exact_keys(
        palette_payload, {"primary", "secondary", "accent"}, "palette"
    )
    palette = PaletteSpec(
        primary=_require_string(palette_payload, "primary"),
        secondary=_require_string(palette_payload, "secondary"),
        accent=_require_string(palette_payload, "accent"),
    )

    pose_payload = _require_mapping(payload, "pose")
    _require_exact_keys(pose_payload, set(SUPPORTED_ANIMATIONS), "pose")
    pose = PoseSpec(
        idle=_parse_pose_animation(pose_payload, "idle"),
        walk=_parse_pose_animation(pose_payload, "walk"),
        action=_parse_pose_animation(pose_payload, "action"),
    )

    fx_payload = _require_mapping(payload, "fx")
    _require_exact_keys(fx_payload, {"type"}, "fx")
    fx = FxSpec(type=_optional_string(fx_payload, "type"))

    from asf.part_library import parse_part_library_refs
    part_library_refs = parse_part_library_refs(payload)

    return SpriteSpec(
        style_pack=_require_string(payload, "style_pack"),
        entity_type=_require_string(payload, "entity_type"),
        frame=frame,
        animations=animation_counts,
        body=body,
        parts=parts_spec,
        equipment=equipment,
        palette=palette,
        pose=pose,
        fx=fx,
        part_library_refs=part_library_refs,
    )


def load_spec(path: str | Path) -> SpriteSpec:
    """Loads and validates a sprite specification from disk."""

    payload = _load_json(Path(path))
    return load_spec_payload(payload)
