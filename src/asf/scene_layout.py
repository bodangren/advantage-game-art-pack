"""Scene layout and background assembler schema and program validation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw

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
    REQUIRED_LIGHTING_KEYS = {"global_direction", "ambient_strength"}
    OPTIONAL_LIGHTING_KEYS = {"local_emissive_sources"}
    ALLOWED_LIGHTING_KEYS = REQUIRED_LIGHTING_KEYS | OPTIONAL_LIGHTING_KEYS
    missing = REQUIRED_LIGHTING_KEYS - payload.keys()
    extra = payload.keys() - ALLOWED_LIGHTING_KEYS
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
    REQUIRED_OUTPUT_KEYS = {"variant_id"}
    OPTIONAL_OUTPUT_KEYS = {"debug_overlay"}
    ALLOWED_OUTPUT_KEYS = REQUIRED_OUTPUT_KEYS | OPTIONAL_OUTPUT_KEYS
    missing = REQUIRED_OUTPUT_KEYS - payload.keys()
    extra = payload.keys() - ALLOWED_OUTPUT_KEYS
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


class LayoutResolutionError(Exception):
    """Raised when layout resolution fails."""


@dataclass(frozen=True)
class ResolvedZone:
    """A resolved zone with validated bounds."""
    zone_id: str
    role: str
    bounds: tuple[int, int, int, int]
    reserved: bool


@dataclass(frozen=True)
class ResolvedPropPlacement:
    """A resolved prop placement with concrete bounds."""
    group_id: str
    tile_id: str
    bounds: tuple[int, int, int, int]
    symmetry: str | None
    weight: float | None


@dataclass(frozen=True)
class ResolvedLayout:
    """A deterministically resolved scene layout."""
    program_id: str
    template: str
    canvas: CanvasSpec
    resolved_zones: tuple[ResolvedZone, ...]
    resolved_placements: tuple[ResolvedPropPlacement, ...]
    lighting: LightingSpec
    output: OutputSpec

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class PlacementManifestEntry:
    """A single entry in the placement manifest."""
    entry_type: str
    tile_id: str | None
    primitive_id: str | None
    bounds: tuple[int, int, int, int]
    role: str | None = None


@dataclass(frozen=True)
class PlacementManifest:
    """Machine-readable placement manifest exported with the scene."""
    program_id: str
    template: str
    canvas: tuple[int, int]
    zones: tuple[PlacementManifestEntry, ...]
    placements: tuple[PlacementManifestEntry, ...]
    focal_motifs: tuple[PlacementManifestEntry, ...]
    decal_passes: tuple[PlacementManifestEntry, ...]

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class SceneAssemblyResult:
    """Result of assembling a scene program into an image and manifest."""
    image: Image.Image
    placement_manifest: PlacementManifest
    debug_overlay: Image.Image | None


def _boxes_overlap(ax: int, ay: int, aw: int, ah: int, bx: int, by: int, bw: int, bh: int) -> bool:
    a_right, a_bottom = ax + aw, ay + ah
    b_right, b_bottom = bx + bw, by + bh
    return ax < b_right and a_right > bx and ay < b_bottom and a_bottom > by


def resolve_scene_layout(program: SceneProgram) -> ResolvedLayout:
    """Resolves a scene program into a deterministic layout with validated zones and placements."""
    canvas_width = program.canvas.width
    canvas_height = program.canvas.height

    resolved_zones: list[ResolvedZone] = []
    reserved_zones: list[tuple[int, int, int, int]] = []

    for zone in sorted(program.zones, key=lambda z: z.zone_id):
        x, y, w, h = zone.bounds

        if x < 0 or y < 0 or x + w > canvas_width or y + h > canvas_height:
            raise LayoutResolutionError(
                f"Zone '{zone.zone_id}' bounds {zone.bounds} exceed canvas ({canvas_width}x{canvas_height})"
            )

        if zone.reserved:
            for rx, ry, rw, rh in reserved_zones:
                if _boxes_overlap(x, y, w, h, rx, ry, rw, rh):
                    raise LayoutResolutionError(
                        f"Reserved zone '{zone.zone_id}' overlaps with existing reserved zone at ({rx},{ry},{rw},{rh})"
                    )
            reserved_zones.append((x, y, w, h))

        resolved_zones.append(ResolvedZone(
            zone_id=zone.zone_id,
            role=zone.role,
            bounds=zone.bounds,
            reserved=zone.reserved,
        ))

    resolved_placements: list[ResolvedPropPlacement] = []
    for prop in sorted(program.prop_placement, key=lambda p: p.group_id):
        tile_source = None
        for ts in program.tile_sources:
            if ts.tile_id == prop.tile_id:
                tile_source = ts
                break

        default_tile_size = 32
        prop_bounds = (0, 0, default_tile_size, default_tile_size)

        if tile_source is None:
            prop_bounds = (0, 0, default_tile_size, default_tile_size)
        else:
            prop_bounds = (0, 0, default_tile_size, default_tile_size)

        px, py, pw, ph = prop_bounds
        for rz_x, rz_y, rz_w, rz_h in reserved_zones:
            if _boxes_overlap(px, py, pw, ph, rz_x, rz_y, rz_w, rz_h):
                raise LayoutResolutionError(
                    f"Prop placement '{prop.group_id}' intrudes into reserved zone"
                )

        resolved_placements.append(ResolvedPropPlacement(
            group_id=prop.group_id,
            tile_id=prop.tile_id,
            bounds=prop_bounds,
            symmetry=prop.placement_rules.symmetry,
            weight=prop.placement_rules.weight,
        ))

    return ResolvedLayout(
        program_id=program.program_id,
        template=program.template,
        canvas=program.canvas,
        resolved_zones=tuple(resolved_zones),
        resolved_placements=tuple(resolved_placements),
        lighting=program.lighting,
        output=program.output,
    )


LIGHTING_DIRECTION_OFFSETS: dict[str, tuple[int, int]] = {
    "north": (0, -1),
    "northeast": (1, -1),
    "east": (1, 0),
    "southeast": (1, 1),
    "south": (0, 1),
    "southwest": (-1, 1),
    "west": (-1, 0),
    "northwest": (-1, -1),
}


def _resolve_tile_image(
    tile_id: str,
    tile_sources: tuple[TileSource, ...],
    repo_root: Path,
) -> Image.Image | None:
    for ts in tile_sources:
        if ts.tile_id == tile_id:
            primitive_path = repo_root / "library" / "primitives" / ts.family / ts.primitive_id / "source.png"
            if primitive_path.exists():
                return Image.open(primitive_path).convert("RGBA")
            primitive_json_path = repo_root / "library" / "primitives" / ts.family / ts.primitive_id / "primitive.json"
            if primitive_json_path.exists():
                return None
    return None


def _apply_lighting_pass(
    image: Image.Image,
    lighting: LightingSpec,
) -> Image.Image:
    result = image.copy()
    directional = LIGHTING_DIRECTION_OFFSETS.get(lighting.global_direction, (0, -1))
    dx, dy = directional

    darken_amount = int((1.0 - lighting.ambient_strength) * 100)
    width, height = result.size

    if dx != 0 or dy != 0 or darken_amount > 0 or lighting.local_emissive_sources:
        pixels = result.load()

        if dx != 0 or dy != 0:
            shadow_intensity = darken_amount // 2 if darken_amount > 0 else 15
            if dx > 0:
                for y in range(height):
                    for x in range(width // 2):
                        r, g, b, a = pixels[x, y]
                        if a > 0 and shadow_intensity > 0:
                            pixels[x, y] = (max(0, r - shadow_intensity), max(0, g - shadow_intensity), max(0, b - shadow_intensity), a)
            elif dx < 0:
                for y in range(height):
                    for x in range(width - 1, width // 2 - 1, -1):
                        r, g, b, a = pixels[x, y]
                        if a > 0 and shadow_intensity > 0:
                            pixels[x, y] = (max(0, r - shadow_intensity), max(0, g - shadow_intensity), max(0, b - shadow_intensity), a)
            if dy > 0:
                for y in range(height // 2):
                    for x in range(width):
                        r, g, b, a = pixels[x, y]
                        if a > 0 and shadow_intensity > 0:
                            pixels[x, y] = (max(0, r - shadow_intensity), max(0, g - shadow_intensity), max(0, b - shadow_intensity), a)
            elif dy < 0:
                for y in range(height - 1, height // 2 - 1, -1):
                    for x in range(width):
                        r, g, b, a = pixels[x, y]
                        if a > 0 and shadow_intensity > 0:
                            pixels[x, y] = (max(0, r - shadow_intensity), max(0, g - shadow_intensity), max(0, b - shadow_intensity), a)

        for emissive in lighting.local_emissive_sources:
            em_x = emissive.get("position", [0, 0])[0]
            em_y = emissive.get("position", [0, 0])[1]
            em_radius = emissive.get("radius", 16)
            em_strength = emissive.get("strength", 0.5)

            for y in range(max(0, em_y - em_radius), min(height, em_y + em_radius)):
                for x in range(max(0, em_x - em_radius), min(width, em_x + em_radius)):
                    dist = ((x - em_x) ** 2 + (y - em_y) ** 2) ** 0.5
                    if dist <= em_radius:
                        r, g, b, a = pixels[x, y]
                        if a > 0:
                            brighten = int(em_strength * 60 * (1 - dist / em_radius))
                            if brighten > 0:
                                pixels[x, y] = (min(255, r + brighten), min(255, g + brighten), min(255, b + brighten), a)

        if darken_amount > 0:
            dark_pixels = int(darken_amount * 0.6)
            if dx > 0:
                for y in range(height):
                    for x in range(width // 2):
                        r, g, b, a = pixels[x, y]
                        pixels[x, y] = (max(0, r - dark_pixels), max(0, g - dark_pixels), max(0, b - dark_pixels), a)
            elif dx < 0:
                for y in range(height):
                    for x in range(width - 1, width // 2 - 1, -1):
                        r, g, b, a = pixels[x, y]
                        pixels[x, y] = (max(0, r - dark_pixels), max(0, g - dark_pixels), max(0, b - dark_pixels), a)
            if dy > 0:
                for y in range(height // 2):
                    for x in range(width):
                        r, g, b, a = pixels[x, y]
                        pixels[x, y] = (max(0, r - dark_pixels), max(0, g - dark_pixels), max(0, b - dark_pixels), a)
            elif dy < 0:
                for y in range(height - 1, height // 2 - 1, -1):
                    for x in range(width):
                        r, g, b, a = pixels[x, y]
                        pixels[x, y] = (max(0, r - dark_pixels), max(0, g - dark_pixels), max(0, b - dark_pixels), a)

    return result


def _render_debug_overlay(
    canvas_width: int,
    canvas_height: int,
    resolved_layout: ResolvedLayout,
) -> Image.Image:
    debug_img = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(debug_img)
    for zone in resolved_layout.resolved_zones:
        x, y, w, h = zone.bounds
        color = (255, 100, 100, 120) if zone.reserved else (100, 255, 100, 120)
        draw.rectangle([x, y, x + w, y + h], outline=color, width=2)
        draw.text((x + 2, y + 2), zone.zone_id, fill=(255, 255, 255, 200))
    for prop in resolved_layout.resolved_placements:
        x, y, w, h = prop.bounds
        draw.rectangle([x, y, x + w, y + h], outline=(100, 100, 255, 150), width=1)
        draw.text((x + 1, y + 1), prop.group_id, fill=(200, 200, 255, 180))
    return debug_img


def assemble_scene(
    program: SceneProgram,
    resolved_layout: ResolvedLayout,
    *,
    repo_root: Path | None = None,
) -> SceneAssemblyResult:
    """Assembles a scene program into a rendered image and placement manifest.

    Args:
        program: The validated scene program.
        resolved_layout: The deterministically resolved layout.
        repo_root: Root directory for resolving primitive paths. Defaults to cwd.

    Returns:
        SceneAssemblyResult containing the rendered image, placement manifest,
        and optional debug overlay.
    """
    if repo_root is None:
        repo_root = Path.cwd()

    canvas_width = program.canvas.width
    canvas_height = program.canvas.height
    scene_image = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))

    zone_entries: list[PlacementManifestEntry] = []
    for zone in resolved_layout.resolved_zones:
        zone_entries.append(PlacementManifestEntry(
            entry_type="zone",
            tile_id=None,
            primitive_id=None,
            bounds=zone.bounds,
            role=zone.role,
        ))

    placement_entries: list[PlacementManifestEntry] = []
    for prop in resolved_layout.resolved_placements:
        tile_source = None
        for ts in program.tile_sources:
            if ts.tile_id == prop.tile_id:
                tile_source = ts
                break
        primitive_id = tile_source.primitive_id if tile_source else None
        tile_img = _resolve_tile_image(prop.tile_id, program.tile_sources, repo_root)
        if tile_img is not None:
            prop_x, prop_y, prop_w, prop_h = prop.bounds
            resized = tile_img.resize((prop_w, prop_h), Image.Resampling.NEAREST)
            scene_image.alpha_composite(resized, (prop_x, prop_y))
        placement_entries.append(PlacementManifestEntry(
            entry_type="prop_placement",
            tile_id=prop.tile_id,
            primitive_id=primitive_id,
            bounds=prop.bounds,
            role=None,
        ))

    motif_entries: list[PlacementManifestEntry] = []
    for motif in program.focal_motifs:
        motif_x, motif_y = motif.position
        tile_img = _resolve_tile_image(motif.tile_id, program.tile_sources, repo_root)
        if tile_img is not None:
            mw, mh = tile_img.size
            scene_image.alpha_composite(tile_img, (motif_x, motif_y))
        motif_entries.append(PlacementManifestEntry(
            entry_type="focal_motif",
            tile_id=motif.tile_id,
            primitive_id=None,
            bounds=(motif_x, motif_y, motif_x + 32, motif_y + 32),
            role=motif.motif_id,
        ))

    decal_entries: list[PlacementManifestEntry] = []
    for decal in program.decal_passes:
        tile_img = _resolve_tile_image(decal.tile_id, program.tile_sources, repo_root)
        if tile_img is not None:
            dw, dh = tile_img.size
            coverage_count = max(1, int(decal.coverage * 4))
            for i in range(coverage_count):
                dx = (i * 73) % (canvas_width - dw)
                dy = (i * 47) % (canvas_height - dh)
                scene_image.alpha_composite(tile_img, (dx, dy))
        decal_entries.append(PlacementManifestEntry(
            entry_type="decal_pass",
            tile_id=decal.tile_id,
            primitive_id=None,
            bounds=(0, 0, dw if tile_img else 32, dh if tile_img else 32),
            role=decal.decal_type,
        ))

    scene_image = _apply_lighting_pass(scene_image, program.lighting)

    placement_manifest = PlacementManifest(
        program_id=program.program_id,
        template=program.template,
        canvas=(canvas_width, canvas_height),
        zones=tuple(zone_entries),
        placements=tuple(placement_entries),
        focal_motifs=tuple(motif_entries),
        decal_passes=tuple(decal_entries),
    )

    debug_overlay = None
    if program.output.debug_overlay:
        debug_overlay = _render_debug_overlay(canvas_width, canvas_height, resolved_layout)
        scene_image = Image.alpha_composite(scene_image, debug_overlay)

    return SceneAssemblyResult(
        image=scene_image,
        placement_manifest=placement_manifest,
        debug_overlay=debug_overlay,
    )
