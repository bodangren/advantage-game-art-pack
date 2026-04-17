"""Schemas for briefs, programs, and theme packs consumed by the planner."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
import json
from pathlib import Path
from typing import Any


class AssetFamily(str, Enum):
    """Supported asset family types."""

    CHARACTER_SHEET = "character_sheet"
    PROP_OR_FX_SHEET = "prop_or_fx_sheet"
    TILESET = "tileset"
    BACKGROUND_SCENE = "background_scene"


class CharacterDirection(str, Enum):
    """Character direction variants."""

    FACING_UP = "facing_up"
    FACING_DOWN = "facing_down"
    FACING_CAMERA = "facing_camera"


class TilesetLayout(str, Enum):
    """Tileset layout modes."""

    TILE_ATLAS = "tile_atlas"
    TILE_STRIP = "tile_strip"


class PresentationSurfaceType(str, Enum):
    """Per-game presentation surface types."""

    RUNTIME_SHEET = "runtime_sheet"
    PARALLAX_LAYER = "parallax_layer"
    LOADING_SURFACE = "loading_surface"
    COVER = "cover"


@dataclass(frozen=True)
class PaletteRamp:
    """Palette ramp reference."""

    primary: str
    secondary: str
    accent: str


@dataclass(frozen=True)
class PrimitiveReference:
    """Reference to a primitive by family and subtype."""

    family: str
    subtype: str
    primitive_id: str


@dataclass(frozen=True)
class ThemePackReference:
    """Reference to a theme pack."""

    theme_id: str
    motif_ids: tuple[str, ...]


@dataclass(frozen=True)
class CharacterSheetProgram:
    """Planner output for a character sheet asset."""

    family: AssetFamily = AssetFamily.CHARACTER_SHEET
    style_pack: str = ""
    theme_pack: ThemePackReference | None = None
    entity_type: str = ""
    archetype: str = ""
    palette_ramp: PaletteRamp | None = None
    primitive_references: tuple[PrimitiveReference, ...] = field(default_factory=tuple)
    directions: tuple[CharacterDirection, ...] = field(
        default_factory=lambda: (
            CharacterDirection.FACING_DOWN,
            CharacterDirection.FACING_UP,
            CharacterDirection.FACING_CAMERA,
        )
    )
    animations: tuple[str, ...] = ("idle", "walk", "action")
    presentation_surface: PresentationSurfaceType = PresentationSurfaceType.RUNTIME_SHEET
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class PropOrFxSheetProgram:
    """Planner output for a prop or FX sheet asset."""

    family: AssetFamily = AssetFamily.PROP_OR_FX_SHEET
    style_pack: str = ""
    theme_pack: ThemePackReference | None = None
    prop_type: str = ""
    palette_ramp: PaletteRamp | None = None
    primitive_references: tuple[PrimitiveReference, ...] = field(default_factory=tuple)
    layout_mode: str = "strip_3x1"
    presentation_surface: PresentationSurfaceType = PresentationSurfaceType.RUNTIME_SHEET
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class TilesetProgram:
    """Planner output for a tileset asset."""

    family: AssetFamily = AssetFamily.TILESET
    style_pack: str = ""
    theme_pack: ThemePackReference | None = None
    tile_type: str = ""
    palette_ramp: PaletteRamp | None = None
    primitive_references: tuple[PrimitiveReference, ...] = field(default_factory=tuple)
    layout_mode: TilesetLayout = TilesetLayout.TILE_ATLAS
    tile_categories: tuple[str, ...] = ("floor", "wall", "roof", "decoration")
    presentation_surface: PresentationSurfaceType = PresentationSurfaceType.RUNTIME_SHEET
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class BackgroundSceneProgram:
    """Planner output for a background scene asset."""

    family: AssetFamily = AssetFamily.BACKGROUND_SCENE
    style_pack: str = ""
    theme_pack: ThemePackReference | None = None
    scene_type: str = ""
    palette_ramp: PaletteRamp | None = None
    primitive_references: tuple[PrimitiveReference, ...] = field(default_factory=tuple)
    parallax_layers: tuple[str, ...] = ("background", "midground", "foreground")
    presentation_surface: PresentationSurfaceType = PresentationSurfaceType.LOADING_SURFACE
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass
class UserBrief:
    """Single asset brief from a user."""

    request: str
    family: AssetFamily
    style_pack: str | None = None
    theme_pack: ThemePackReference | None = None
    constraints: dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchBrief:
    """Brief for generating multiple related assets."""

    request: str
    families: tuple[AssetFamily, ...]
    style_pack: str | None = None
    theme_pack: ThemePackReference | None = None
    shared_constraints: dict[str, Any] = field(default_factory=dict)
    per_asset_constraints: dict[AssetFamily, dict[str, Any]] = field(default_factory=dict)


@dataclass
class BatchPlannerManifest:
    """Output from a batch planner run."""

    manifest_id: str
    brief: BatchBrief
    programs: tuple[
        CharacterSheetProgram | PropOrFxSheetProgram | TilesetProgram | BackgroundSceneProgram,
        ...
    ]
    trace_path: Path | None = None
    metadata: dict[str, str] = field(default_factory=dict)


class SchemaValidationError(ValueError):
    """Raised when a schema validation check fails."""


def _require_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value:
        raise SchemaValidationError(f"'{key}' must be a non-empty string")
    return value


def _require_enum(
    payload: dict[str, Any], key: str, enum_type: type[str]
) -> str:
    value = _require_string(payload, key)
    try:
        enum_type(value)
        return value
    except ValueError:
        raise SchemaValidationError(
            f"'{key}' must be one of: {', '.join(e.value for e in enum_type)}"
        )


def _require_tuple_of(
    payload: dict[str, Any], key: str, item_type: type[str]
) -> tuple[str, ...]:
    value = payload.get(key)
    if not isinstance(value, list):
        raise SchemaValidationError(f"'{key}' must be a list")
    result = []
    for item in value:
        if not isinstance(item, str) or not item:
            raise SchemaValidationError(f"'{key}' items must be non-empty strings")
        result.append(item)
    return tuple(result)


def serialize_program(
    program: CharacterSheetProgram | PropOrFxSheetProgram | TilesetProgram | BackgroundSceneProgram,
) -> dict[str, Any]:
    """Serialize a program dataclass to a JSON-serializable dict."""
    result = {"family": program.family.value}
    if isinstance(program, CharacterSheetProgram):
        result.update({
            "style_pack": program.style_pack,
            "entity_type": program.entity_type,
            "archetype": program.archetype,
            "directions": [d.value for d in program.directions],
            "animations": list(program.animations),
            "presentation_surface": program.presentation_surface.value,
        })
    elif isinstance(program, PropOrFxSheetProgram):
        result.update({
            "style_pack": program.style_pack,
            "prop_type": program.prop_type,
            "layout_mode": program.layout_mode,
            "presentation_surface": program.presentation_surface.value,
        })
    elif isinstance(program, TilesetProgram):
        result.update({
            "style_pack": program.style_pack,
            "tile_type": program.tile_type,
            "layout_mode": program.layout_mode.value,
            "tile_categories": list(program.tile_categories),
            "presentation_surface": program.presentation_surface.value,
        })
    elif isinstance(program, BackgroundSceneProgram):
        result.update({
            "style_pack": program.style_pack,
            "scene_type": program.scene_type,
            "parallax_layers": list(program.parallax_layers),
            "presentation_surface": program.presentation_surface.value,
        })
    if program.theme_pack:
        result["theme_pack"] = {
            "theme_id": program.theme_pack.theme_id,
            "motif_ids": list(program.theme_pack.motif_ids),
        }
    if program.palette_ramp:
        result["palette_ramp"] = {
            "primary": program.palette_ramp.primary,
            "secondary": program.palette_ramp.secondary,
            "accent": program.palette_ramp.accent,
        }
    result["primitive_references"] = [
        {"family": p.family, "subtype": p.subtype, "primitive_id": p.primitive_id}
        for p in program.primitive_references
    ]
    result["metadata"] = dict(program.metadata)
    return result


def write_program(path: Path, program: CharacterSheetProgram | PropOrFxSheetProgram | TilesetProgram | BackgroundSceneProgram) -> None:
    """Write a program to disk as JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = serialize_program(program)
    serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    path.write_text(serialized, encoding="utf-8")