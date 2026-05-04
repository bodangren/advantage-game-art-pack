"""Presentation surface schemas for cover, loading, parallax, UI, and promo surfaces."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageEnhance

from asf.scene_layout import assemble_scene, load_scene_program, resolve_scene_layout


SURFACE_FAMILY_COVER = "cover_surface"
SURFACE_FAMILY_LOADING = "loading_surface"
SURFACE_FAMILY_PARALLAX = "parallax_layer_set"
SURFACE_FAMILY_UI_SHEET = "ui_sheet"
SURFACE_FAMILY_PROMO = "promo_capture_job"

ALL_SURFACE_FAMILIES = (
    SURFACE_FAMILY_COVER,
    SURFACE_FAMILY_LOADING,
    SURFACE_FAMILY_PARALLAX,
    SURFACE_FAMILY_UI_SHEET,
    SURFACE_FAMILY_PROMO,
)

SUPPORTED_PARALLAX_LAYER_ROLES = ("top", "middle", "bottom")

SUPPORTED_UI_SHEET_TYPES = (
    "icon_sheet",
    "panel_strip",
    "stateful_button",
)

PROGRAM_ROOT_DIRNAME = "programs"
OUTPUT_ROOT_DIRNAME = "outputs"


class PresentationSurfaceValidationError(ValueError):
    """Raised when a presentation surface program is malformed."""


def _jsonify(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _jsonify(v) for key, v in value.items()}
    if isinstance(value, tuple):
        return [_jsonify(v) for v in value]
    if isinstance(value, list):
        return [_jsonify(v) for v in value]
    return value


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise PresentationSurfaceValidationError(f"{path}: expected a JSON object")
    return payload


def _require_exact_keys(
    payload: dict[str, Any], expected: set[str], context: str, path: Path
) -> None:
    missing = expected - payload.keys()
    extra = payload.keys() - expected
    if missing:
        joined = ", ".join(sorted(missing))
        raise PresentationSurfaceValidationError(
            f"{path}: {context} missing required key(s): {joined}"
        )
    if extra:
        joined = ", ".join(sorted(extra))
        raise PresentationSurfaceValidationError(
            f"{path}: {context} contains unexpected key(s): {joined}"
        )


def _require_keys_with_optional(
    payload: dict[str, Any],
    required: set[str],
    optional: set[str],
    context: str,
    path: Path,
) -> None:
    missing = required - payload.keys()
    extra = payload.keys() - (required | optional)
    if missing:
        joined = ", ".join(sorted(missing))
        raise PresentationSurfaceValidationError(
            f"{path}: {context} missing required key(s): {joined}"
        )
    if extra:
        joined = ", ".join(sorted(extra))
        raise PresentationSurfaceValidationError(
            f"{path}: {context} contains unexpected key(s): {joined}"
        )


def _require_string(
    payload: dict[str, Any],
    key: str,
    *,
    path: Path,
    context: str,
    allow_empty: bool = False,
) -> str:
    value = payload.get(key)
    if not isinstance(value, str):
        raise PresentationSurfaceValidationError(
            f"{path}: {context}.{key} must be a string"
        )
    if not allow_empty and not value:
        raise PresentationSurfaceValidationError(
            f"{path}: {context}.{key} must be a non-empty string"
        )
    return value


def _optional_string(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> str | None:
    value = payload.get(key)
    if value is None:
        return None
    if not isinstance(value, str) or not value:
        raise PresentationSurfaceValidationError(
            f"{path}: {context}.{key} must be null or a non-empty string"
        )
    return value


def _require_int(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise PresentationSurfaceValidationError(
            f"{path}: {context}.{key} must be an integer"
        )
    return value


def _require_float(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> float:
    value = payload.get(key)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise PresentationSurfaceValidationError(
            f"{path}: {context}.{key} must be a number"
        )
    return float(value)


def _require_bool(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> bool:
    value = payload.get(key)
    if not isinstance(value, bool):
        raise PresentationSurfaceValidationError(
            f"{path}: {context}.{key} must be a boolean"
        )
    return value


def _require_mapping(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> dict[str, Any]:
    value = payload.get(key)
    if not isinstance(value, dict):
        raise PresentationSurfaceValidationError(
            f"{path}: {context}.{key} must be an object"
        )
    return value


def _require_list(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> list[Any]:
    value = payload.get(key)
    if not isinstance(value, list):
        raise PresentationSurfaceValidationError(
            f"{path}: {context}.{key} must be an array"
        )
    return value


def _require_rect(
    payload: list[Any], context: str, path: Path
) -> tuple[int, int, int, int]:
    if not isinstance(payload, list) or len(payload) != 4:
        raise PresentationSurfaceValidationError(
            f"{path}: {context} must be a four-item array"
        )
    if not all(isinstance(v, int) and not isinstance(v, bool) for v in payload):
        raise PresentationSurfaceValidationError(
            f"{path}: {context} must contain integers"
        )
    x, y, w, h = payload
    if w <= 0 or h <= 0:
        raise PresentationSurfaceValidationError(
            f"{path}: {context} width and height must be positive"
        )
    return x, y, w, h


def _parse_canvas_size(
    payload: dict[str, Any], *, path: Path, context: str
) -> tuple[int, int]:
    if not isinstance(payload, dict):
        raise PresentationSurfaceValidationError(
            f"{path}: {context} must be an object"
        )
    _require_exact_keys(payload, {"width", "height"}, context, path)
    width = _require_int(payload, "width", path=path, context=context)
    height = _require_int(payload, "height", path=path, context=context)
    if width <= 0 or height <= 0:
        raise PresentationSurfaceValidationError(
            f"{path}: {context} dimensions must be positive"
        )
    return width, height


def _parse_output(
    payload: dict[str, Any], *, path: Path, context: str
) -> "OutputSpec":
    _require_keys_with_optional(
        payload,
        required={"variant_id"},
        optional={"debug_overlay"},
        context=context,
        path=path,
    )
    variant_id = _optional_string(payload, "variant_id", path=path, context=context)
    debug_overlay = payload.get("debug_overlay", False)
    if not isinstance(debug_overlay, bool):
        raise PresentationSurfaceValidationError(
            f"{path}: {context}.debug_overlay must be a boolean"
        )
    return OutputSpec(variant_id=variant_id, debug_overlay=debug_overlay)


def _parse_tile_source_item(
    payload: dict[str, Any], *, path: Path, context: str, index: int
) -> "TileSourceRef":
    _require_exact_keys(payload, {"tile_id", "family", "primitive_id"}, context, path)
    tile_id = _require_string(payload, "tile_id", path=path, context=context)
    family = _require_string(payload, "family", path=path, context=context)
    primitive_id = _require_string(payload, "primitive_id", path=path, context=context)
    return TileSourceRef(tile_id=tile_id, family=family, primitive_id=primitive_id)


@dataclass(frozen=True)
class OutputSpec:
    """Shared output configuration for all surface families."""

    variant_id: str | None
    debug_overlay: bool = False

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class CanvasSpec:
    """Canvas dimensions for a surface."""

    width: int
    height: int

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class TileSourceRef:
    """Reference to an approved tile primitive."""

    tile_id: str
    family: str
    primitive_id: str

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class FocalSubject:
    """Focal subject reference for cover surfaces."""

    tile_id: str
    family: str
    primitive_id: str

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class CoverSurfaceProgram:
    """Typed program for generating a cover surface."""

    surface_family: str
    program_id: str
    program_version: int
    style_pack: str
    theme: str
    canvas: CanvasSpec
    focal_subject: FocalSubject
    background_scene_manifest: str
    title_safe_zone: tuple[int, int, int, int]
    negative_space_zones: tuple[tuple[int, int, int, int], ...]
    output: OutputSpec

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class LoadingSurfaceProgram:
    """Typed program for generating a loading/start background surface."""

    surface_family: str
    program_id: str
    program_version: int
    style_pack: str
    theme: str
    canvas: CanvasSpec
    background_scene_manifest: str
    output: OutputSpec

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class ParallaxLayer:
    """A single layer in a parallax layer set."""

    layer_role: str
    tile_sources: tuple[TileSourceRef, ...]
    density: float
    contrast: float

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class ParallaxLayerSetProgram:
    """Typed program for generating a coordinated parallax layer set."""

    surface_family: str
    program_id: str
    program_version: int
    style_pack: str
    theme: str
    canvas: CanvasSpec
    layers: tuple[ParallaxLayer, ...]
    output: OutputSpec

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class UISheetProgram:
    """Typed program for generating a UI sheet or atlas."""

    surface_family: str
    program_id: str
    program_version: int
    style_pack: str
    sheet_type: str
    canvas: CanvasSpec
    tile_sources: tuple[TileSourceRef, ...]
    states: tuple[str, ...]
    output: OutputSpec

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class CaptureConditions:
    """Capture conditions for a promo still derivation job."""

    scene_program: str
    timing: float | None = None
    frame_index: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class PromoCaptureJobProgram:
    """Typed program defining a reproducible gameplay promo still derivation job."""

    surface_family: str
    program_id: str
    program_version: int
    source_bundle: str
    capture_conditions: CaptureConditions
    output: OutputSpec

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


def _parse_focal_subject(
    payload: dict[str, Any], *, path: Path, context: str
) -> FocalSubject:
    _require_exact_keys(payload, {"tile_id", "family", "primitive_id"}, context, path)
    return FocalSubject(
        tile_id=_require_string(payload, "tile_id", path=path, context=context),
        family=_require_string(payload, "family", path=path, context=context),
        primitive_id=_require_string(payload, "primitive_id", path=path, context=context),
    )


def _parse_cover_surface(payload: dict[str, Any], path: Path) -> CoverSurfaceProgram:
    REQUIRED = {
        "surface_family",
        "program_id",
        "program_version",
        "style_pack",
        "theme",
        "canvas",
        "focal_subject",
        "background_scene_manifest",
        "title_safe_zone",
        "output",
    }
    OPTIONAL = {"negative_space_zones"}
    _require_keys_with_optional(payload, REQUIRED, OPTIONAL, "cover_surface program", path)

    program_id = _require_string(payload, "program_id", path=path, context="cover_surface program")
    program_version = _require_int(payload, "program_version", path=path, context="cover_surface program")
    style_pack = _require_string(payload, "style_pack", path=path, context="cover_surface program")
    theme = _require_string(payload, "theme", path=path, context="cover_surface program")

    canvas_payload = _require_mapping(payload, "canvas", path=path, context="cover_surface program")
    canvas_w, canvas_h = _parse_canvas_size(canvas_payload, path=path, context="cover_surface program.canvas")
    canvas = CanvasSpec(width=canvas_w, height=canvas_h)

    focal_payload = _require_mapping(payload, "focal_subject", path=path, context="cover_surface program")
    focal_subject = _parse_focal_subject(focal_payload, path=path, context="cover_surface program.focal_subject")

    background_scene_manifest = _require_string(
        payload, "background_scene_manifest", path=path, context="cover_surface program"
    )

    title_safe_zone = _require_rect(
        payload["title_safe_zone"], "cover_surface program.title_safe_zone", path
    )

    negative_space_raw = payload.get("negative_space_zones", [])
    if not isinstance(negative_space_raw, list):
        raise PresentationSurfaceValidationError(
            f"{path}: cover_surface program.negative_space_zones must be an array"
        )
    negative_space_zones = tuple(
        _require_rect(z, f"cover_surface program.negative_space_zones[{i}]", path)
        for i, z in enumerate(negative_space_raw)
    )

    output_payload = _require_mapping(payload, "output", path=path, context="cover_surface program")
    output = _parse_output(output_payload, path=path, context="cover_surface program.output")

    return CoverSurfaceProgram(
        surface_family=SURFACE_FAMILY_COVER,
        program_id=program_id,
        program_version=program_version,
        style_pack=style_pack,
        theme=theme,
        canvas=canvas,
        focal_subject=focal_subject,
        background_scene_manifest=background_scene_manifest,
        title_safe_zone=title_safe_zone,
        negative_space_zones=negative_space_zones,
        output=output,
    )


def _parse_loading_surface(payload: dict[str, Any], path: Path) -> LoadingSurfaceProgram:
    REQUIRED = {
        "surface_family",
        "program_id",
        "program_version",
        "style_pack",
        "theme",
        "canvas",
        "background_scene_manifest",
        "output",
    }
    _require_exact_keys(payload, REQUIRED, "loading_surface program", path)

    program_id = _require_string(payload, "program_id", path=path, context="loading_surface program")
    program_version = _require_int(payload, "program_version", path=path, context="loading_surface program")
    style_pack = _require_string(payload, "style_pack", path=path, context="loading_surface program")
    theme = _require_string(payload, "theme", path=path, context="loading_surface program")

    canvas_payload = _require_mapping(payload, "canvas", path=path, context="loading_surface program")
    canvas_w, canvas_h = _parse_canvas_size(canvas_payload, path=path, context="loading_surface program.canvas")
    canvas = CanvasSpec(width=canvas_w, height=canvas_h)

    background_scene_manifest = _require_string(
        payload, "background_scene_manifest", path=path, context="loading_surface program"
    )

    output_payload = _require_mapping(payload, "output", path=path, context="loading_surface program")
    output = _parse_output(output_payload, path=path, context="loading_surface program.output")

    return LoadingSurfaceProgram(
        surface_family=SURFACE_FAMILY_LOADING,
        program_id=program_id,
        program_version=program_version,
        style_pack=style_pack,
        theme=theme,
        canvas=canvas,
        background_scene_manifest=background_scene_manifest,
        output=output,
    )


def _parse_parallax_layer(
    payload: dict[str, Any], *, path: Path, context: str, index: int
) -> ParallaxLayer:
    _require_exact_keys(
        payload, {"layer_role", "tile_sources", "density", "contrast"}, f"{context}[{index}]", path
    )
    layer_role = _require_string(payload, "layer_role", path=path, context=f"{context}[{index}]")
    if layer_role not in SUPPORTED_PARALLAX_LAYER_ROLES:
        raise PresentationSurfaceValidationError(
            f"{path}: {context}[{index}].layer_role must be one of {', '.join(SUPPORTED_PARALLAX_LAYER_ROLES)}"
        )
    tile_sources_raw = _require_list(payload, "tile_sources", path=path, context=f"{context}[{index}]")
    tile_sources = tuple(
        _parse_tile_source_item(ts, path=path, context=f"{context}[{index}].tile_sources", index=j)
        for j, ts in enumerate(tile_sources_raw)
    )
    density = _require_float(payload, "density", path=path, context=f"{context}[{index}]")
    if not (0.0 <= density <= 1.0):
        raise PresentationSurfaceValidationError(
            f"{path}: {context}[{index}].density must be between 0 and 1"
        )
    contrast = _require_float(payload, "contrast", path=path, context=f"{context}[{index}]")
    if not (0.0 <= contrast <= 1.0):
        raise PresentationSurfaceValidationError(
            f"{path}: {context}[{index}].contrast must be between 0 and 1"
        )
    return ParallaxLayer(
        layer_role=layer_role,
        tile_sources=tile_sources,
        density=density,
        contrast=contrast,
    )


def _parse_parallax_layer_set(payload: dict[str, Any], path: Path) -> ParallaxLayerSetProgram:
    REQUIRED = {
        "surface_family",
        "program_id",
        "program_version",
        "style_pack",
        "theme",
        "canvas",
        "layers",
        "output",
    }
    _require_exact_keys(payload, REQUIRED, "parallax_layer_set program", path)

    program_id = _require_string(payload, "program_id", path=path, context="parallax_layer_set program")
    program_version = _require_int(payload, "program_version", path=path, context="parallax_layer_set program")
    style_pack = _require_string(payload, "style_pack", path=path, context="parallax_layer_set program")
    theme = _require_string(payload, "theme", path=path, context="parallax_layer_set program")

    canvas_payload = _require_mapping(payload, "canvas", path=path, context="parallax_layer_set program")
    canvas_w, canvas_h = _parse_canvas_size(canvas_payload, path=path, context="parallax_layer_set program.canvas")
    canvas = CanvasSpec(width=canvas_w, height=canvas_h)

    layers_raw = _require_list(payload, "layers", path=path, context="parallax_layer_set program")
    if len(layers_raw) < 1:
        raise PresentationSurfaceValidationError(
            f"{path}: parallax_layer_set program.layers must have at least one layer"
        )

    layer_roles = []
    layers = []
    for i, layer_payload in enumerate(layers_raw):
        if not isinstance(layer_payload, dict):
            raise PresentationSurfaceValidationError(
                f"{path}: parallax_layer_set program.layers[{i}] must be an object"
            )
        layer = _parse_parallax_layer(
            layer_payload, path=path, context="parallax_layer_set program.layers", index=i
        )
        if layer.layer_role in layer_roles:
            raise PresentationSurfaceValidationError(
                f"{path}: parallax_layer_set program.layers contains duplicate layer_role '{layer.layer_role}'"
            )
        layer_roles.append(layer.layer_role)
        layers.append(layer)

    output_payload = _require_mapping(payload, "output", path=path, context="parallax_layer_set program")
    output = _parse_output(output_payload, path=path, context="parallax_layer_set program.output")

    return ParallaxLayerSetProgram(
        surface_family=SURFACE_FAMILY_PARALLAX,
        program_id=program_id,
        program_version=program_version,
        style_pack=style_pack,
        theme=theme,
        canvas=canvas,
        layers=tuple(layers),
        output=output,
    )


def _parse_ui_sheet(payload: dict[str, Any], path: Path) -> UISheetProgram:
    REQUIRED = {
        "surface_family",
        "program_id",
        "program_version",
        "style_pack",
        "sheet_type",
        "canvas",
        "tile_sources",
        "states",
        "output",
    }
    _require_exact_keys(payload, REQUIRED, "ui_sheet program", path)

    program_id = _require_string(payload, "program_id", path=path, context="ui_sheet program")
    program_version = _require_int(payload, "program_version", path=path, context="ui_sheet program")
    style_pack = _require_string(payload, "style_pack", path=path, context="ui_sheet program")
    sheet_type = _require_string(payload, "sheet_type", path=path, context="ui_sheet program")
    if sheet_type not in SUPPORTED_UI_SHEET_TYPES:
        raise PresentationSurfaceValidationError(
            f"{path}: ui_sheet program.sheet_type must be one of {', '.join(SUPPORTED_UI_SHEET_TYPES)}"
        )

    canvas_payload = _require_mapping(payload, "canvas", path=path, context="ui_sheet program")
    canvas_w, canvas_h = _parse_canvas_size(canvas_payload, path=path, context="ui_sheet program.canvas")
    canvas = CanvasSpec(width=canvas_w, height=canvas_h)

    tile_sources_raw = _require_list(payload, "tile_sources", path=path, context="ui_sheet program")
    tile_sources = tuple(
        _parse_tile_source_item(ts, path=path, context="ui_sheet program.tile_sources", index=i)
        for i, ts in enumerate(tile_sources_raw)
    )

    states_raw = _require_list(payload, "states", path=path, context="ui_sheet program")
    states = []
    for i, state in enumerate(states_raw):
        if not isinstance(state, str) or not state:
            raise PresentationSurfaceValidationError(
                f"{path}: ui_sheet program.states[{i}] must be a non-empty string"
            )
        states.append(state)

    output_payload = _require_mapping(payload, "output", path=path, context="ui_sheet program")
    output = _parse_output(output_payload, path=path, context="ui_sheet program.output")

    return UISheetProgram(
        surface_family=SURFACE_FAMILY_UI_SHEET,
        program_id=program_id,
        program_version=program_version,
        style_pack=style_pack,
        sheet_type=sheet_type,
        canvas=canvas,
        tile_sources=tile_sources,
        states=tuple(states),
        output=output,
    )


def _parse_capture_conditions(
    payload: dict[str, Any], *, path: Path, context: str
) -> CaptureConditions:
    REQUIRED = {"scene_program"}
    OPTIONAL = {"timing", "frame_index"}
    _require_keys_with_optional(payload, REQUIRED, OPTIONAL, context, path)

    scene_program = _require_string(payload, "scene_program", path=path, context=context, allow_empty=True)

    timing: float | None = None
    if "timing" in payload:
        timing = _require_float(payload, "timing", path=path, context=context)
        if timing < 0.0:
            raise PresentationSurfaceValidationError(
                f"{path}: {context}.timing must be non-negative"
            )

    frame_index: int | None = None
    if "frame_index" in payload:
        frame_index = _require_int(payload, "frame_index", path=path, context=context)
        if frame_index < 0:
            raise PresentationSurfaceValidationError(
                f"{path}: {context}.frame_index must be non-negative"
            )

    return CaptureConditions(
        scene_program=scene_program,
        timing=timing,
        frame_index=frame_index,
    )


def _parse_promo_capture_job(payload: dict[str, Any], path: Path) -> PromoCaptureJobProgram:
    REQUIRED = {
        "surface_family",
        "program_id",
        "program_version",
        "source_bundle",
        "capture_conditions",
        "output",
    }
    _require_exact_keys(payload, REQUIRED, "promo_capture_job program", path)

    program_id = _require_string(payload, "program_id", path=path, context="promo_capture_job program")
    program_version = _require_int(payload, "program_version", path=path, context="promo_capture_job program")
    source_bundle = _require_string(payload, "source_bundle", path=path, context="promo_capture_job program")

    capture_payload = _require_mapping(
        payload, "capture_conditions", path=path, context="promo_capture_job program"
    )
    capture_conditions = _parse_capture_conditions(
        capture_payload, path=path, context="promo_capture_job program.capture_conditions"
    )

    output_payload = _require_mapping(payload, "output", path=path, context="promo_capture_job program")
    output = _parse_output(output_payload, path=path, context="promo_capture_job program.output")

    return PromoCaptureJobProgram(
        surface_family=SURFACE_FAMILY_PROMO,
        program_id=program_id,
        program_version=program_version,
        source_bundle=source_bundle,
        capture_conditions=capture_conditions,
        output=output,
    )


def load_presentation_surface(path: str | Path) -> (
    CoverSurfaceProgram
    | LoadingSurfaceProgram
    | ParallaxLayerSetProgram
    | UISheetProgram
    | PromoCaptureJobProgram
):
    """Loads and validates a presentation surface program from disk.

    Dispatches to the appropriate parser based on the surface_family field.
    """
    path = Path(path)
    payload = _load_json(path)

    surface_family = payload.get("surface_family")
    if not isinstance(surface_family, str) or not surface_family:
        raise PresentationSurfaceValidationError(
            f"{path}: 'surface_family' must be a non-empty string"
        )
    if surface_family not in ALL_SURFACE_FAMILIES:
        raise PresentationSurfaceValidationError(
            f"{path}: unknown surface_family '{surface_family}'"
        )

    if surface_family == SURFACE_FAMILY_COVER:
        return _parse_cover_surface(payload, path)
    if surface_family == SURFACE_FAMILY_LOADING:
        return _parse_loading_surface(payload, path)
    if surface_family == SURFACE_FAMILY_PARALLAX:
        return _parse_parallax_layer_set(payload, path)
    if surface_family == SURFACE_FAMILY_UI_SHEET:
        return _parse_ui_sheet(payload, path)
    return _parse_promo_capture_job(payload, path)


def load_cover_surface(path: str | Path) -> CoverSurfaceProgram:
    """Loads and validates a cover surface program from disk."""
    result = load_presentation_surface(path)
    if not isinstance(result, CoverSurfaceProgram):
        raise PresentationSurfaceValidationError(
            f"{path}: expected surface_family 'cover_surface'"
        )
    return result


def load_loading_surface(path: str | Path) -> LoadingSurfaceProgram:
    """Loads and validates a loading surface program from disk."""
    result = load_presentation_surface(path)
    if not isinstance(result, LoadingSurfaceProgram):
        raise PresentationSurfaceValidationError(
            f"{path}: expected surface_family 'loading_surface'"
        )
    return result


def load_parallax_layer_set(path: str | Path) -> ParallaxLayerSetProgram:
    """Loads and validates a parallax layer set program from disk."""
    result = load_presentation_surface(path)
    if not isinstance(result, ParallaxLayerSetProgram):
        raise PresentationSurfaceValidationError(
            f"{path}: expected surface_family 'parallax_layer_set'"
        )
    return result


def load_ui_sheet(path: str | Path) -> UISheetProgram:
    """Loads and validates a UI sheet program from disk."""
    result = load_presentation_surface(path)
    if not isinstance(result, UISheetProgram):
        raise PresentationSurfaceValidationError(
            f"{path}: expected surface_family 'ui_sheet'"
        )
    return result


def load_promo_capture_job(path: str | Path) -> PromoCaptureJobProgram:
    """Loads and validates a promo capture job program from disk."""
    result = load_presentation_surface(path)
    if not isinstance(result, PromoCaptureJobProgram):
        raise PresentationSurfaceValidationError(
            f"{path}: expected surface_family 'promo_capture_job'"
        )
    return result


PRESENTATION_PIPELINE_VERSION = "presentation_v1"


class SurfaceAssemblyError(Exception):
    """Raised when surface assembly fails due to missing or invalid assets."""


@dataclass(frozen=True)
class SurfaceManifest:
    """Machine-readable manifest exported with each surface image."""

    program_id: str
    surface_family: str
    variant_id: str | None
    pipeline_version: str
    canvas: tuple[int, int]
    theme: str
    source_assets: tuple[dict[str, Any], ...]

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class SurfaceAssemblyResult:
    """Result of assembling a cover or loading surface."""

    image: Image.Image
    manifest: SurfaceManifest


@dataclass(frozen=True)
class ParallaxLayerResult:
    """A single rendered parallax layer."""

    layer_role: str
    image: Image.Image


@dataclass(frozen=True)
class ParallaxSetManifest:
    """Machine-readable manifest exported with each parallax layer set."""

    program_id: str
    variant_id: str | None
    pipeline_version: str
    canvas: tuple[int, int]
    theme: str
    layer_entries: tuple[dict[str, Any], ...]

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class ParallaxSetAssemblyResult:
    """Result of assembling a parallax layer set."""

    layers: tuple[ParallaxLayerResult, ...]
    manifest: ParallaxSetManifest


def _load_primitive_image(
    tile_id: str,
    family: str,
    primitive_id: str,
    repo_root: Path,
) -> Image.Image:
    path = repo_root / "library" / "primitives" / family / primitive_id / "source.png"
    if not path.exists():
        raise SurfaceAssemblyError(
            f"Primitive source not found for tile_id='{tile_id}' "
            f"family='{family}' primitive_id='{primitive_id}' at {path}"
        )
    return Image.open(path).convert("RGBA")


def assemble_cover_surface(
    program: CoverSurfaceProgram,
    *,
    repo_root: Path | None = None,
) -> SurfaceAssemblyResult:
    """Assembles a cover surface from a validated program.

    Args:
        program: Validated cover surface program.
        repo_root: Root directory for resolving primitive and scene paths.
            Defaults to cwd.

    Returns:
        SurfaceAssemblyResult with the rendered RGBA image and a manifest.

    Raises:
        SurfaceAssemblyError: If the focal subject primitive source image
            is not found.
    """
    if repo_root is None:
        repo_root = Path.cwd()

    canvas_w, canvas_h = program.canvas.width, program.canvas.height
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    bg_rel = program.background_scene_manifest
    bg_path = (
        repo_root / "outputs"
        / Path(bg_rel).with_suffix("").name
        / "base.png"
    )
    if bg_path.exists():
        try:
            bg = Image.open(bg_path).convert("RGBA")
            bg = bg.resize((canvas_w, canvas_h), Image.Resampling.LANCZOS)
            canvas.alpha_composite(bg)
        except Exception:
            pass

    focal_img = _load_primitive_image(
        program.focal_subject.tile_id,
        program.focal_subject.family,
        program.focal_subject.primitive_id,
        repo_root,
    )

    ts_x, ts_y, ts_w, ts_h = program.title_safe_zone
    available_top = ts_y + ts_h
    available_height = canvas_h - available_top

    subject_h = focal_img.height
    subject_w = focal_img.width
    target_h = min(subject_h, available_height - 8)
    target_w = min(subject_w, canvas_w - 16)
    if target_h != subject_h or target_w != subject_w:
        focal_resized = focal_img.resize(
            (target_w, target_h), Image.Resampling.NEAREST
        )
    else:
        focal_resized = focal_img

    sx = max(0, (canvas_w - focal_resized.width) // 2)
    sy = available_top + max(0, (available_height - focal_resized.height) // 2)
    sx = min(sx, canvas_w - focal_resized.width)
    sy = min(sy, canvas_h - focal_resized.height)

    canvas.alpha_composite(focal_resized, (sx, sy))

    source_assets = [
        {
            "tile_id": program.focal_subject.tile_id,
            "family": program.focal_subject.family,
            "primitive_id": program.focal_subject.primitive_id,
            "role": "focal_subject",
            "position": (sx, sy, focal_resized.width, focal_resized.height),
        }
    ]

    manifest = SurfaceManifest(
        program_id=program.program_id,
        surface_family=program.surface_family,
        variant_id=program.output.variant_id,
        pipeline_version=PRESENTATION_PIPELINE_VERSION,
        canvas=(canvas_w, canvas_h),
        theme=program.theme,
        source_assets=tuple(source_assets),
    )

    return SurfaceAssemblyResult(image=canvas, manifest=manifest)


def assemble_loading_surface(
    program: LoadingSurfaceProgram,
    *,
    repo_root: Path | None = None,
) -> SurfaceAssemblyResult:
    """Assembles a loading/start background surface.

    Args:
        program: Validated loading surface program.
        repo_root: Root directory for resolving scene paths.
            Defaults to cwd.

    Returns:
        SurfaceAssemblyResult with the rendered RGBA image and a manifest.
    """
    if repo_root is None:
        repo_root = Path.cwd()

    canvas_w, canvas_h = program.canvas.width, program.canvas.height
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    bg_rel = program.background_scene_manifest
    bg_path = (
        repo_root / "outputs"
        / Path(bg_rel).with_suffix("").name
        / "base.png"
    )
    if bg_path.exists():
        try:
            bg = Image.open(bg_path).convert("RGBA")
            bg = bg.resize((canvas_w, canvas_h), Image.Resampling.LANCZOS)
            canvas.alpha_composite(bg)
        except Exception:
            pass

    manifest = SurfaceManifest(
        program_id=program.program_id,
        surface_family=program.surface_family,
        variant_id=program.output.variant_id,
        pipeline_version=PRESENTATION_PIPELINE_VERSION,
        canvas=(canvas_w, canvas_h),
        theme=program.theme,
        source_assets=(),
    )

    return SurfaceAssemblyResult(image=canvas, manifest=manifest)


def assemble_parallax_layer_set(
    program: ParallaxLayerSetProgram,
    *,
    repo_root: Path | None = None,
) -> ParallaxSetAssemblyResult:
    """Assembles a coordinated parallax layer set.

    Args:
        program: Validated parallax layer set program.
        repo_root: Root directory for resolving primitive paths.
            Defaults to cwd.

    Returns:
        ParallaxSetAssemblyResult with rendered layers and a manifest.
    """
    if repo_root is None:
        repo_root = Path.cwd()

    canvas_w, canvas_h = program.canvas.width, program.canvas.height

    resolved_layers: list[ParallaxLayerResult] = []
    layer_entries: list[dict[str, Any]] = []

    for layer in program.layers:
        layer_img = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

        for ts in layer.tile_sources:
            prim_path = (
                repo_root
                / "library" / "primitives"
                / ts.family / ts.primitive_id
                / "source.png"
            )
            if not prim_path.exists():
                continue
            tile_img = Image.open(prim_path).convert("RGBA")

            tiles: list[Image.Image] = []
            tiles.append(tile_img)

            density = layer.density
            repeat_count = max(1, int(density * 8))
            for _ in range(repeat_count - 1):
                tiles.append(tile_img.copy())

            tw, th = tile_img.size
            layer_seed = hash(f"{program.program_id}{layer.layer_role}") & 0xFFFF
            tile_idx = 0
            for tile in tiles:
                for x_offset in range(0, canvas_w + tw, tw):
                    for y_offset in range(0, canvas_h + th, th):
                        seed = layer_seed + tile_idx
                        px = (x_offset + (seed % tw)) % (canvas_w + tw) - tw // 2
                        py = (y_offset + ((seed // tw) % th)) % (canvas_h + th) - th // 2
                        px = max(0, min(px, canvas_w - tw))
                        py = max(0, min(py, canvas_h - th))
                        if px + tw <= canvas_w and py + th <= canvas_h:
                            layer_img.alpha_composite(tile, (px, py))
                        tile_idx += 1

        contrast = layer.contrast
        if contrast < 1.0:
            enhancer = ImageEnhance.Brightness(layer_img)
            layer_img = enhancer.enhance(0.5 + contrast * 0.5)

        resolved_layers.append(ParallaxLayerResult(
            layer_role=layer.layer_role,
            image=layer_img,
        ))

        layer_tile_ids = [ts.tile_id for ts in layer.tile_sources]
        layer_entries.append({
            "layer_role": layer.layer_role,
            "scroll_order": len(resolved_layers) - 1,
            "tile_ids": layer_tile_ids,
            "density": layer.density,
            "contrast": layer.contrast,
        })

    sorted_layers = sorted(resolved_layers, key=lambda lr: lr.layer_role)
    sorted_entries = sorted(layer_entries, key=lambda e: e["scroll_order"])

    manifest = ParallaxSetManifest(
        program_id=program.program_id,
        variant_id=program.output.variant_id,
        pipeline_version=PRESENTATION_PIPELINE_VERSION,
        canvas=(canvas_w, canvas_h),
        theme=program.theme,
        layer_entries=tuple(sorted_entries),
    )

    return ParallaxSetAssemblyResult(
        layers=tuple(sorted_layers),
        manifest=manifest,
    )


def _bin_pack_layout(
    tiles: list[TileSourceRef],
    sizes: list[tuple[int, int]],
    canvas_w: int,
    canvas_h: int,
) -> list[tuple[int, int, int, int]]:
    """Best-fit decreasing bin packing for UI sheet layout.

    Args:
        tiles: List of tile source references.
        sizes: List of (width, height) for each tile, aligned with `tiles`.
        canvas_w: Canvas width in pixels.
        canvas_h: Canvas height in pixels.

    Returns:
        List of (x, y, w, h) placements aligned with `tiles`.

    Raises:
        SurfaceAssemblyError: If tiles do not fit in the canvas.
    """
    if not tiles:
        return []

    SPACING = 2
    indexed: list[tuple[int, TileSourceRef, tuple[int, int]]] = [
        (i, tile, size) for i, (tile, size) in enumerate(zip(tiles, sizes))
    ]
    indexed.sort(key=lambda x: x[2][0] * x[2][1], reverse=True)

    class _Row:
        __slots__ = ("y", "height", "used", "remaining")
        def __init__(self, y: int, height: int) -> None:
            self.y = y
            self.height = height
            self.used = 0
            self.remaining = canvas_w

    rows: list[_Row] = [_Row(0, 0)]
    placements: list[tuple[int, int, int, int] | None] = [None] * len(tiles)

    for idx, tile, (tw, th) in indexed:
        placed = False
        best_row: _Row | None = None
        best_fit_remaining = canvas_w + 1

        for row in rows:
            if th <= row.height and tw <= row.remaining:
                fit_remaining = row.remaining - tw
                if fit_remaining < best_fit_remaining:
                    best_fit_remaining = fit_remaining
                    best_row = row

        if best_row is not None:
            row = best_row
            x = row.used
            y = row.y
            placements[idx] = (x, y, tw, th)
            row.used += tw + SPACING
            row.remaining -= tw + SPACING
            placed = True
        else:
            for row in rows:
                if row.height == 0:
                    row.y = row.y
                    row.height = th
                    x = row.used
                    y = row.y
                    placements[idx] = (x, y, tw, th)
                    row.used += tw + SPACING
                    row.remaining -= tw + SPACING
                    placed = True
                    break

        if not placed:
            new_y = rows[-1].y + rows[-1].height + SPACING if rows else 0
            new_row = _Row(new_y, th)
            placements[idx] = (0, new_y, tw, th)
            new_row.used = tw + SPACING
            new_row.remaining = canvas_w - (tw + SPACING)
            rows.append(new_row)
            placed = True

    total_h = rows[-1].y + rows[-1].height if rows else 0
    if total_h > canvas_h:
        raise SurfaceAssemblyError(
            f"UI sheet overflow: tiles require {total_h}px height, canvas is {canvas_h}px"
        )

    result: list[tuple[int, int, int, int]] = []
    for p in placements:
        if p is None:
            raise SurfaceAssemblyError("Bin packing failed to place a tile")
        result.append(p)
    return result


def assemble_ui_sheet(
    program: UISheetProgram,
    *,
    repo_root: Path | None = None,
) -> SurfaceAssemblyResult:
    """Assembles a UI sheet atlas from approved primitives.

    Args:
        program: Validated UI sheet program.
        repo_root: Root directory for resolving primitive paths.
            Defaults to cwd.

    Returns:
        SurfaceAssemblyResult with the rendered atlas image and a manifest.

    Raises:
        SurfaceAssemblyError: If a tile source primitive image is not found.
    """
    if repo_root is None:
        repo_root = Path.cwd()

    canvas_w, canvas_h = program.canvas.width, program.canvas.height
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    tile_sources = list(program.tile_sources)
    sizes: list[tuple[int, int]] = []

    for ts in tile_sources:
        prim_path = (
            repo_root
            / "library" / "primitives"
            / ts.family / ts.primitive_id
            / "source.png"
        )
        if not prim_path.exists():
            raise SurfaceAssemblyError(
                f"UI primitive not found: tile_id='{ts.tile_id}' "
                f"family='{ts.family}' primitive_id='{ts.primitive_id}'"
            )
        tile_img = Image.open(prim_path).convert("RGBA")
        sizes.append(tile_img.size)

    placements = _bin_pack_layout(tile_sources, sizes, canvas_w, canvas_h)

    source_assets: list[dict[str, Any]] = []
    for ts, (x, y, tw, th) in zip(tile_sources, placements):
        prim_path = (
            repo_root
            / "library" / "primitives"
            / ts.family / ts.primitive_id
            / "source.png"
        )
        tile_img = Image.open(prim_path).convert("RGBA")
        canvas.alpha_composite(tile_img, (x, y))
        source_assets.append({
            "tile_id": ts.tile_id,
            "family": ts.family,
            "primitive_id": ts.primitive_id,
            "position": (x, y, tw, th),
        })

    manifest = SurfaceManifest(
        program_id=program.program_id,
        surface_family=program.surface_family,
        variant_id=program.output.variant_id,
        pipeline_version=PRESENTATION_PIPELINE_VERSION,
        canvas=(canvas_w, canvas_h),
        theme=program.style_pack,
        source_assets=tuple(source_assets),
    )

    return SurfaceAssemblyResult(image=canvas, manifest=manifest)


def assemble_promo_capture_job(
    program: PromoCaptureJobProgram,
    *,
    repo_root: Path | None = None,
) -> SurfaceAssemblyResult:
    """Derives a promo still from a pre-rendered source bundle or scene renderer.

    Args:
        program: Validated promo capture job program.
        repo_root: Root directory for resolving the source bundle path.
            Defaults to cwd.

    Returns:
        SurfaceAssemblyResult with the promo still image and a manifest.

    Raises:
        SurfaceAssemblyError: If the source bundle image cannot be loaded or
            if scene_program is specified but the file cannot be found/loaded.
    """
    if repo_root is None:
        repo_root = Path.cwd()

    capture_asset: dict[str, Any] = {
        "asset_id": "capture_conditions",
        "source_bundle": program.source_bundle,
        "scene_program": program.capture_conditions.scene_program,
    }
    if program.capture_conditions.timing is not None:
        capture_asset["timing"] = program.capture_conditions.timing
    if program.capture_conditions.frame_index is not None:
        capture_asset["frame_index"] = program.capture_conditions.frame_index

    if program.capture_conditions.scene_program:
        scene_program_path = repo_root / program.capture_conditions.scene_program
        if not scene_program_path.exists():
            raise SurfaceAssemblyError(
                f"Scene program not found at {scene_program_path}"
            )
        scene_program = load_scene_program(scene_program_path)
        resolved_layout = resolve_scene_layout(scene_program)
        scene_result = assemble_scene(scene_program, resolved_layout, repo_root=repo_root)
        image = scene_result.image
        canvas_w, canvas_h = image.size
    else:
        bundle_path = repo_root / program.source_bundle / "promo.png"
        if not bundle_path.exists():
            raise SurfaceAssemblyError(
                f"Source bundle promo image not found at {bundle_path}"
            )
        image = Image.open(bundle_path).convert("RGBA")
        canvas_w, canvas_h = image.size

    manifest = SurfaceManifest(
        program_id=program.program_id,
        surface_family=program.surface_family,
        variant_id=program.output.variant_id,
        pipeline_version=PRESENTATION_PIPELINE_VERSION,
        canvas=(canvas_w, canvas_h),
        theme="",
        source_assets=(capture_asset,),
    )

    return SurfaceAssemblyResult(image=image, manifest=manifest)
