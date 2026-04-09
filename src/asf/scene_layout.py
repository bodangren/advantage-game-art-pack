"""Scene layout and background assembler schema and program validation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image

from asf.specs import PaletteSpec, SpecValidationError
from asf.style_packs import load_style_pack


SCENE_LAYOUT_MODE = "background_scene"
SUPPORTED_SCENE_TEMPLATES = ("library_room", "ruins_courtyard")
SUPPORTED_LIGHTING_DIRECTIONS = (
    "north",
    "northeast",
    "east",
    "southeast",
    "south",
    "southwest",
    "west",
    "northwest",
)
PROGRAM_ROOT_DIRNAME = "programs"
OUTPUT_ROOT_DIRNAME = "outputs"


class SceneManifestValidationError(SpecValidationError):
    """Raised when a scene manifest is malformed."""


def _jsonify(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _jsonify(entry) for key, entry in value.items()}
    if isinstance(value, tuple):
        return [_jsonify(entry) for entry in value]
    if isinstance(value, list):
        return [_jsonify(entry) for entry in value]
    return value


def _write_json_file(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == serialized:
        return
    path.write_text(serialized, encoding="utf-8")


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise SceneManifestValidationError(f"{path}: expected a JSON object")
    return payload


def _require_exact_keys(
    payload: dict[str, Any], expected: set[str], context: str, path: Path
) -> None:
    missing = expected - payload.keys()
    extra = payload.keys() - expected
    if missing:
        joined = ", ".join(sorted(missing))
        raise SceneManifestValidationError(
            f"{path}: {context} missing required key(s): {joined}"
        )
    if extra:
        joined = ", ".join(sorted(extra))
        raise SceneManifestValidationError(
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
        raise SceneManifestValidationError(f"{path}: {context}.{key} must be a string")
    if not allow_empty and not value:
        raise SceneManifestValidationError(
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
        raise SceneManifestValidationError(
            f"{path}: {context}.{key} must be null or a non-empty string"
        )
    return value


def _require_int(payload: dict[str, Any], key: str, *, path: Path, context: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise SceneManifestValidationError(
            f"{path}: {context}.{key} must be an integer"
        )
    return value


def _require_float(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> float:
    value = payload.get(key)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise SceneManifestValidationError(
            f"{path}: {context}.{key} must be a number"
        )
    return float(value)


def _require_bool(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> bool:
    value = payload.get(key)
    if not isinstance(value, bool):
        raise SceneManifestValidationError(
            f"{path}: {context}.{key} must be a boolean"
        )
    return value


def _require_mapping(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> dict[str, Any]:
    value = payload.get(key)
    if not isinstance(value, dict):
        raise SceneManifestValidationError(
            f"{path}: {context}.{key} must be an object"
        )
    return value


def _require_list(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> list[Any]:
    value = payload.get(key)
    if not isinstance(value, list):
        raise SceneManifestValidationError(
            f"{path}: {context}.{key} must be an array"
        )
    return value


def _parse_canvas_size(
    payload: dict[str, Any], *, path: Path, context: str
) -> tuple[int, int]:
    if not isinstance(payload, dict):
        raise SceneManifestValidationError(
            f"{path}: {context} must be an object"
        )
    _require_exact_keys(payload, {"width", "height"}, context, path)
    width = _require_int(payload, "width", path=path, context=context)
    height = _require_int(payload, "height", path=path, context=context)
    if width <= 0 or height <= 0:
        raise SceneManifestValidationError(
            f"{path}: {context} dimensions must be positive"
        )
    return width, height


def _require_rect(
    payload: list[Any], context: str, path: Path
) -> tuple[int, int, int, int]:
    if not isinstance(payload, list) or len(payload) != 4:
        raise SceneManifestValidationError(
            f"{path}: {context} must be a four-item array"
        )
    if not all(isinstance(v, int) and not isinstance(v, bool) for v in payload):
        raise SceneManifestValidationError(
            f"{path}: {context} must contain integers"
        )
    x, y, w, h = payload
    if w <= 0 or h <= 0:
        raise SceneManifestValidationError(
            f"{path}: {context} width and height must be positive"
        )
    return x, y, w, h


@dataclass(frozen=True)
class CanvasSpec:
    """Defines canvas dimensions for a scene."""

    width: int
    height: int

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class GameplayZone:
    """Defines a reserved gameplay zone within a scene."""

    zone_id: str
    role: str
    bounds: tuple[int, int, int, int]
    reserved: bool = True

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class LightingSpec:
    """Defines lighting configuration for a scene."""

    global_direction: str
    ambient_strength: float
    local_emissive_sources: tuple[dict[str, Any], ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class TileSource:
    """References an approved tile primitive for scene assembly."""

    tile_id: str
    family: str
    primitive_id: str

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class PropPlacementRule:
    """Placement rules for a prop group within a scene."""

    symmetry: str | None = None
    weight: float | None = None
    count: int | None = None


@dataclass(frozen=True)
class PropPlacement:
    """Defines a prop placement group within a scene."""

    group_id: str
    tile_id: str
    placement_rules: PropPlacementRule

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class FocalMotif:
    """Defines a focal motif placement within a scene."""

    motif_id: str
    tile_id: str
    position: tuple[int, int]

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class DecalPass:
    """Defines a decal pass configuration."""

    decal_type: str
    tile_id: str
    coverage: float

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class OutputSpec:
    """Defines output configuration for a scene."""

    variant_id: str | None
    debug_overlay: bool = False

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class SceneProgram:
    """Full typed scene manifest for deterministic background rendering."""

    family: str
    program_id: str
    program_version: int
    template: str
    canvas: CanvasSpec
    theme: str
    subtheme: str
    style_pack: str
    zones: tuple[GameplayZone, ...]
    tile_sources: tuple[TileSource, ...]
    prop_placement: tuple[PropPlacement, ...]
    focal_motifs: tuple[FocalMotif, ...]
    decal_passes: tuple[DecalPass, ...]
    lighting: LightingSpec
    output: OutputSpec

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


def _parse_lighting(
    payload: dict[str, Any], *, path: Path, context: str
) -> LightingSpec:
    _require_exact_keys(payload, {"global_direction", "ambient_strength"}, context, path)
    direction = _require_string(payload, "global_direction", path=path, context=context)
    if direction not in SUPPORTED_LIGHTING_DIRECTIONS:
        raise SceneManifestValidationError(
            f"{path}: {context}.global_direction must be one of {', '.join(SUPPORTED_LIGHTING_DIRECTIONS)}"
        )
    strength = _require_float(payload, "ambient_strength", path=path, context=context)
    if not (0.0 <= strength <= 1.0):
        raise SceneManifestValidationError(
            f"{path}: {context}.ambient_strength must be between 0 and 1"
        )
    local_sources: list[dict[str, Any]] = []
    if "local_emissive_sources" in payload:
        local_sources = _require_list(payload, "local_emissive_sources", path=path, context=context)
    return LightingSpec(
        global_direction=direction,
        ambient_strength=strength,
        local_emissive_sources=tuple(local_sources),
    )


def _parse_zone(
    payload: dict[str, Any], *, path: Path, context: str, index: int
) -> GameplayZone:
    REQUIRED_ZONE_KEYS = {"zone_id", "role", "bounds"}
    ALLOWED_ZONE_KEYS = REQUIRED_ZONE_KEYS | {"reserved"}
    missing = REQUIRED_ZONE_KEYS - payload.keys()
    extra = payload.keys() - ALLOWED_ZONE_KEYS
    if missing:
        joined = ", ".join(sorted(missing))
        raise SceneManifestValidationError(
            f"{path}: {context}[{index}] missing required key(s): {joined}"
        )
    if extra:
        joined = ", ".join(sorted(extra))
        raise SceneManifestValidationError(
            f"{path}: {context}[{index}] contains unexpected key(s): {joined}"
        )
    zone_id = _require_string(payload, "zone_id", path=path, context=context)
    role = _require_string(payload, "role", path=path, context=context)
    bounds = _require_rect(payload["bounds"], f"{context}[{index}].bounds", path)
    reserved = payload.get("reserved", role == "gameplay")
    if not isinstance(reserved, bool):
        raise SceneManifestValidationError(
            f"{path}: {context}[{index}].reserved must be a boolean"
        )
    return GameplayZone(
        zone_id=zone_id,
        role=role,
        bounds=bounds,
        reserved=reserved,
    )


def _parse_tile_source(
    payload: dict[str, Any], *, path: Path, context: str, index: int
) -> TileSource:
    _require_exact_keys(payload, {"tile_id", "family", "primitive_id"}, context, path)
    tile_id = _require_string(payload, "tile_id", path=path, context=context)
    family = _require_string(payload, "family", path=path, context=context)
    primitive_id = _require_string(payload, "primitive_id", path=path, context=context)
    return TileSource(
        tile_id=tile_id,
        family=family,
        primitive_id=primitive_id,
    )


def _parse_prop_placement_rule(
    payload: dict[str, Any], *, path: Path, context: str, index: int
) -> PropPlacementRule:
    symmetry = None
    weight = None
    count = None
    if "symmetry" in payload:
        sym_val = payload["symmetry"]
        if isinstance(sym_val, str):
            symmetry = sym_val
        else:
            raise SceneManifestValidationError(
                f"{path}: {context}[{index}].placement_rules.symmetry must be a string"
            )
    if "weight" in payload:
        weight = _require_float(payload, "weight", path=path, context=f"{context}[{index}].placement_rules")
    if "count" in payload:
        count = _require_int(payload, "count", path=path, context=f"{context}[{index}].placement_rules")
    return PropPlacementRule(symmetry=symmetry, weight=weight, count=count)


def _parse_prop_placement(
    payload: dict[str, Any], *, path: Path, context: str, index: int
) -> PropPlacement:
    _require_exact_keys(payload, {"group_id", "tile_id", "placement_rules"}, context, path)
    group_id = _require_string(payload, "group_id", path=path, context=context)
    tile_id = _require_string(payload, "tile_id", path=path, context=context)
    placement_rules_payload = _require_mapping(
        payload, "placement_rules", path=path, context=f"{context}[{index}].placement_rules"
    )
    placement_rules = _parse_prop_placement_rule(
        placement_rules_payload, path=path, context=context, index=index
    )
    return PropPlacement(
        group_id=group_id,
        tile_id=tile_id,
        placement_rules=placement_rules,
    )


def _parse_focal_motif(
    payload: dict[str, Any], *, path: Path, context: str, index: int
) -> FocalMotif:
    _require_exact_keys(payload, {"motif_id", "tile_id", "position"}, context, path)
    motif_id = _require_string(payload, "motif_id", path=path, context=context)
    tile_id = _require_string(payload, "tile_id", path=path, context=context)
    position = _require_rect(payload["position"], f"{context}[{index}].position", path)
    return FocalMotif(
        motif_id=motif_id,
        tile_id=tile_id,
        position=position,
    )


def _parse_decal_pass(
    payload: dict[str, Any], *, path: Path, context: str, index: int
) -> DecalPass:
    _require_exact_keys(payload, {"decal_type", "tile_id", "coverage"}, context, path)
    decal_type = _require_string(payload, "decal_type", path=path, context=context)
    tile_id = _require_string(payload, "tile_id", path=path, context=context)
    coverage = _require_float(payload, "coverage", path=path, context=context)
    if not (0.0 <= coverage <= 1.0):
        raise SceneManifestValidationError(
            f"{path}: {context}[{index}].coverage must be between 0 and 1"
        )
    return DecalPass(
        decal_type=decal_type,
        tile_id=tile_id,
        coverage=coverage,
    )


def _parse_output(payload: dict[str, Any], *, path: Path, context: str) -> OutputSpec:
    _require_exact_keys(payload, {"variant_id"}, context, path)
    variant_id = _optional_string(payload, "variant_id", path=path, context=context)
    debug_overlay = payload.get("debug_overlay", False)
    if not isinstance(debug_overlay, bool):
        raise SceneManifestValidationError(
            f"{path}: {context}.debug_overlay must be a boolean"
        )
    return OutputSpec(variant_id=variant_id, debug_overlay=debug_overlay)


def _load_scene_program(payload: dict[str, Any], path: Path) -> SceneProgram:
    REQUIRED_KEYS = {
        "family",
        "program_id",
        "program_version",
        "template",
        "canvas",
        "theme",
        "subtheme",
        "style_pack",
        "zones",
        "lighting",
        "output",
    }
    OPTIONAL_KEYS = {
        "tile_sources",
        "prop_placement",
        "focal_motifs",
        "decal_passes",
    }
    ALL_KEYS = REQUIRED_KEYS | OPTIONAL_KEYS
    missing = REQUIRED_KEYS - payload.keys()
    extra = payload.keys() - ALL_KEYS
    if missing:
        joined = ", ".join(sorted(missing))
        raise SceneManifestValidationError(
            f"{path}: background_scene program missing required key(s): {joined}"
        )
    if extra:
        joined = ", ".join(sorted(extra))
        raise SceneManifestValidationError(
            f"{path}: background_scene program contains unexpected key(s): {joined}"
        )
    family = _require_string(payload, "family", path=path, context="background_scene program")
    if family != SCENE_LAYOUT_MODE:
        raise SceneManifestValidationError(
            f"{path}: unknown compiler family '{family}'"
        )
    program_id = _require_string(payload, "program_id", path=path, context="background_scene program")
    program_version = _require_int(payload, "program_version", path=path, context="background_scene program")
    template = _require_string(payload, "template", path=path, context="background_scene program")
    if template not in SUPPORTED_SCENE_TEMPLATES:
        raise SceneManifestValidationError(
            f"{path}: unknown template '{template}'"
        )
    canvas_payload = _require_mapping(payload, "canvas", path=path, context="background_scene program")
    canvas_width, canvas_height = _parse_canvas_size(canvas_payload, path=path, context="background_scene program.canvas")
    canvas = CanvasSpec(width=canvas_width, height=canvas_height)
    theme = _require_string(payload, "theme", path=path, context="background_scene program")
    subtheme = _require_string(payload, "subtheme", path=path, context="background_scene program")
    style_pack = _require_string(payload, "style_pack", path=path, context="background_scene program")

    zones_payload = _require_list(payload, "zones", path=path, context="background_scene program")
    zones = tuple(
        _parse_zone(z, path=path, context="background_scene program.zones", index=i)
        for i, z in enumerate(zones_payload)
    )

    tile_sources_payload = payload.get("tile_sources", [])
    if not isinstance(tile_sources_payload, list):
        tile_sources_payload = []
    tile_sources = tuple(
        _parse_tile_source(t, path=path, context="background_scene program.tile_sources", index=i)
        for i, t in enumerate(tile_sources_payload)
    )

    prop_placement_payload = payload.get("prop_placement", [])
    if not isinstance(prop_placement_payload, list):
        prop_placement_payload = []
    prop_placement = tuple(
        _parse_prop_placement(p, path=path, context="background_scene program.prop_placement", index=i)
        for i, p in enumerate(prop_placement_payload)
    )

    focal_motifs_payload = payload.get("focal_motifs", [])
    if not isinstance(focal_motifs_payload, list):
        focal_motifs_payload = []
    focal_motifs = tuple(
        _parse_focal_motif(m, path=path, context="background_scene program.focal_motifs", index=i)
        for i, m in enumerate(focal_motifs_payload)
    )

    decal_passes_payload = payload.get("decal_passes", [])
    if not isinstance(decal_passes_payload, list):
        decal_passes_payload = []
    decal_passes = tuple(
        _parse_decal_pass(d, path=path, context="background_scene program.decal_passes", index=i)
        for i, d in enumerate(decal_passes_payload)
    )

    lighting_payload = _require_mapping(payload, "lighting", path=path, context="background_scene program")
    lighting = _parse_lighting(lighting_payload, path=path, context="background_scene program.lighting")

    output_payload = _require_mapping(payload, "output", path=path, context="background_scene program")
    output = _parse_output(output_payload, path=path, context="background_scene program.output")

    return SceneProgram(
        family=family,
        program_id=program_id,
        program_version=program_version,
        template=template,
        canvas=canvas,
        theme=theme,
        subtheme=subtheme,
        style_pack=style_pack,
        zones=zones,
        tile_sources=tile_sources,
        prop_placement=prop_placement,
        focal_motifs=focal_motifs,
        decal_passes=decal_passes,
        lighting=lighting,
        output=output,
    )


def load_scene_program(path: str | Path) -> SceneProgram:
    """Loads and validates a background scene program."""
    path = Path(path)
    payload = _load_json(path)
    return _load_scene_program(payload, path)
