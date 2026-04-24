"""Asset compiler registry, program schemas, and manifest helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import json
from pathlib import Path
from typing import Any, Callable

from PIL import Image, ImageChops, ImageEnhance, ImageOps

from asf.primitives import (
    PrimitiveMetadata,
    build_primitive_manifest,
    load_primitive_metadata,
    query_primitives,
)
from asf.specs import (
    BodySpec,
    EquipmentSpec,
    FxSpec,
    PaletteSpec,
    PoseSpec,
    SpriteSpec,
    SpecValidationError,
    load_spec_payload,
)
from asf.style_packs import load_style_pack

from asf.palette import quantize_image_to_palette


COMPILER_VERSION = 1
SUPPORTED_COMPILER_FAMILIES = (
    "character_sheet",
    "prop_or_fx_sheet",
    "tileset",
)
PROGRAM_ROOT_DIRNAME = "programs"
OUTPUT_ROOT_DIRNAME = "outputs"

CHARACTER_LAYOUT_MODE = "pose_sheet_3x3"
PROP_LAYOUT_MODE = "strip_3x1"
TILESET_LAYOUT_MODE = "tile_atlas"

CHARACTER_DIRECTION_NAMES = (
    "facing_up",
    "facing_down",
    "facing_camera",
)


class CompilerValidationError(SpecValidationError):
    """Raised when a compiler program or manifest is malformed."""


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
        raise CompilerValidationError(f"{path}: expected a JSON object")
    return payload


def _require_exact_keys(
    payload: dict[str, Any], expected: set[str], context: str, path: Path
) -> None:
    missing = expected - payload.keys()
    extra = payload.keys() - expected
    if missing:
        joined = ", ".join(sorted(missing))
        raise CompilerValidationError(
            f"{path}: {context} missing required key(s): {joined}"
        )
    if extra:
        joined = ", ".join(sorted(extra))
        raise CompilerValidationError(
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
        raise CompilerValidationError(f"{path}: {context}.{key} must be a string")
    if not allow_empty and not value:
        raise CompilerValidationError(
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
        raise CompilerValidationError(
            f"{path}: {context}.{key} must be null or a non-empty string"
        )
    return value


def _require_int(payload: dict[str, Any], key: str, *, path: Path, context: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise CompilerValidationError(f"{path}: {context}.{key} must be an integer")
    return value


def _require_bool(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> bool:
    value = payload.get(key)
    if not isinstance(value, bool):
        raise CompilerValidationError(f"{path}: {context}.{key} must be a boolean")
    return value


def _require_mapping(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> dict[str, Any]:
    value = payload.get(key)
    if not isinstance(value, dict):
        raise CompilerValidationError(f"{path}: {context}.{key} must be an object")
    return value


def _require_string_list(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> tuple[str, ...]:
    value = payload.get(key)
    if not isinstance(value, list) or not value:
        raise CompilerValidationError(f"{path}: {context}.{key} must be a non-empty array")
    items: list[str] = []
    for index, entry in enumerate(value):
        if not isinstance(entry, str) or not entry:
            raise CompilerValidationError(
                f"{path}: {context}.{key}[{index}] must be a non-empty string"
            )
        items.append(entry)
    return tuple(items)


def _require_optional_int(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> int | None:
    value = payload.get(key)
    if value is None:
        return None
    if not isinstance(value, int) or isinstance(value, bool):
        raise CompilerValidationError(
            f"{path}: {context}.{key} must be null or an integer"
        )
    if value < 0:
        raise CompilerValidationError(
            f"{path}: {context}.{key} must not be negative"
        )
    return value


def _require_size(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> tuple[int, int]:
    value = payload.get(key)
    if not isinstance(value, list) or len(value) != 2:
        raise CompilerValidationError(
            f"{path}: {context}.{key} must be a two-item array"
        )
    if not all(isinstance(entry, int) and not isinstance(entry, bool) for entry in value):
        raise CompilerValidationError(f"{path}: {context}.{key} must contain integers")
    if value[0] <= 0 or value[1] <= 0:
        raise CompilerValidationError(
            f"{path}: {context}.{key} dimensions must be positive"
        )
    return value[0], value[1]


def _normalize_program_path(path: str | Path, repo_root: Path) -> str:
    candidate = Path(path)
    if candidate.is_absolute():
        resolved = candidate
    else:
        resolved = (repo_root / candidate).resolve()
    repo_root_resolved = repo_root.resolve()
    try:
        return str(resolved.relative_to(repo_root_resolved)).replace("\\", "/")
    except ValueError:
        return str(resolved)


@dataclass(frozen=True)
class PrimitiveAsset:
    """Resolved approved primitive metadata and source image."""

    metadata: PrimitiveMetadata
    metadata_path: Path
    image_path: Path


@dataclass(frozen=True)
class VariantControls:
    """Bounded search controls used by later candidate loops."""

    variant_id: str | None
    candidate_index: int | None = None
    search_budget: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class ProgramLayout:
    """Sheet layout contract shared by compiler families."""

    mode: str
    dimensions: tuple[int, int]
    grid: tuple[int, int]
    frame_size: tuple[int, int] | None = None
    tile_size: tuple[int, int] | None = None
    directions: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class MotionPlan:
    """Bounded motion controls for prop/FX sheets."""

    max_offset: int
    max_rotation_deg: int
    glow_layers: int

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class VariationRules:
    """Bounded variation rules for tile compilers."""

    damage_passes: int
    clutter_tiles: int
    bounded: bool

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class CompilerProgramBase:
    """Common compiler-program fields shared across families."""

    family: str
    program_id: str
    program_version: int
    style_pack: str
    primitive_ids: tuple[str, ...]
    variant_controls: VariantControls
    layout: ProgramLayout

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class CharacterSheetProgram(CompilerProgramBase):
    """Strict character-sheet compiler program."""

    render_spec: SpriteSpec
    row_semantics: tuple[str, ...]


@dataclass(frozen=True)
class PropOrFxSheetProgram(CompilerProgramBase):
    """Strict prop/FX compiler program."""

    asset_kind: str
    state_rows: tuple[str, ...]
    motion: MotionPlan
    effects: FxSpec
    palette: PaletteSpec


@dataclass(frozen=True)
class TilesetProgram(CompilerProgramBase):
    """Strict tileset compiler program."""

    tile_kind: str
    theme: str
    modules: tuple[str, ...]
    variation_rules: VariationRules
    palette: PaletteSpec


@dataclass(frozen=True)
class CompilerOutputManifest:
    """Auditable output envelope shared by all compiler families."""

    input_program_path: str
    input_program_hash: str
    compiler_family: str
    compiler_version: int
    program_id: str
    program_version: int
    variant_id: str | None
    variant_controls: VariantControls
    primitive_ids: tuple[str, ...]
    output_file_paths: tuple[str, ...]
    dimensions: tuple[int, int]
    grid: tuple[int, int]

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class CompilerDefinition:
    """Registry record describing a compiler family."""

    family: str
    version: int
    program_type: type[CompilerProgramBase]
    compile: Callable[[CompilerProgramBase, Path, Path, str | Path | None], CompilerOutputManifest]


@dataclass(frozen=True)
class CompilerRegistry:
    """A deterministic compiler registry keyed by family name."""

    definitions: dict[str, CompilerDefinition]

    def get(self, family: str) -> CompilerDefinition:
        try:
            return self.definitions[family]
        except KeyError as exc:
            raise CompilerValidationError(f"unknown compiler family '{family}'") from exc

    def families(self) -> tuple[str, ...]:
        return tuple(sorted(self.definitions))

    def compile(
        self,
        program: CompilerProgramBase,
        output_dir: str | Path,
        repo_root: str | Path = Path.cwd(),
        *,
        program_path: str | Path | None = None,
    ) -> CompilerOutputManifest:
        definition = self.get(program.family)
        if not isinstance(program, definition.program_type):
            raise TypeError(
                f"compiler family '{program.family}' expected {definition.program_type.__name__}"
            )
        return definition.compile(program, Path(output_dir), Path(repo_root), program_path)


def _parse_variant_controls(
    payload: dict[str, Any], *, path: Path, context: str
) -> VariantControls:
    _require_exact_keys(
        payload, {"variant_id", "candidate_index", "search_budget"}, context, path
    )
    return VariantControls(
        variant_id=_optional_string(payload, "variant_id", path=path, context=context),
        candidate_index=_require_optional_int(
            payload, "candidate_index", path=path, context=context
        ),
        search_budget=_require_optional_int(
            payload, "search_budget", path=path, context=context
        ),
    )


def _parse_layout(
    payload: dict[str, Any],
    *,
    path: Path,
    context: str,
    expected_mode: str,
    require_frame_size: bool = False,
    require_tile_size: bool = False,
    require_directions: bool = False,
) -> ProgramLayout:
    expected_keys = {"mode", "dimensions", "grid"}
    if require_frame_size:
        expected_keys.add("frame_size")
    if require_tile_size:
        expected_keys.add("tile_size")
    if require_directions:
        expected_keys.add("directions")
    _require_exact_keys(payload, expected_keys, context, path)
    mode = _require_string(payload, "mode", path=path, context=context)
    if mode != expected_mode:
        raise CompilerValidationError(
            f"{path}: {context}.mode must be '{expected_mode}'"
        )
    dimensions = _require_size(payload, "dimensions", path=path, context=context)
    grid = _require_size(payload, "grid", path=path, context=context)
    frame_size = None
    tile_size = None
    directions: tuple[str, ...] = ()
    if require_frame_size:
        frame_size = _require_size(payload, "frame_size", path=path, context=context)
    if require_tile_size:
        tile_size = _require_size(payload, "tile_size", path=path, context=context)
    if require_directions:
        directions = _require_string_list(payload, "directions", path=path, context=context)
    return ProgramLayout(
        mode=mode,
        dimensions=dimensions,
        grid=grid,
        frame_size=frame_size,
        tile_size=tile_size,
        directions=directions,
    )


def _parse_common_program_fields(
    payload: dict[str, Any], path: Path, *, context: str
) -> tuple[str, str, int, tuple[str, ...], VariantControls, ProgramLayout]:
    family = _require_string(payload, "family", path=path, context=context)
    if family not in SUPPORTED_COMPILER_FAMILIES:
        raise CompilerValidationError(f"{path}: unknown compiler family '{family}'")
    program_id = _require_string(payload, "program_id", path=path, context=context)
    program_version = _require_int(payload, "program_version", path=path, context=context)
    style_pack = _require_string(payload, "style_pack", path=path, context=context)
    primitive_ids = _require_string_list(payload, "primitive_ids", path=path, context=context)
    if len(set(primitive_ids)) != len(primitive_ids):
        raise CompilerValidationError(
            f"{path}: {context}.primitive_ids must not contain duplicates"
        )
    variant_controls_payload = _require_mapping(
        payload, "variant_controls", path=path, context=context
    )
    variant_controls = _parse_variant_controls(
        variant_controls_payload, path=path, context=f"{context}.variant_controls"
    )
    layout_payload = _require_mapping(payload, "layout", path=path, context=context)
    return (
        family,
        program_id,
        program_version,
        primitive_ids,
        variant_controls,
        style_pack,
        layout_payload,
    )


def _load_character_sheet_program(payload: dict[str, Any], path: Path) -> CharacterSheetProgram:
    _require_exact_keys(
        payload,
        {
            "family",
            "program_id",
            "program_version",
            "style_pack",
            "primitive_ids",
            "variant_controls",
            "layout",
            "render_spec",
            "row_semantics",
        },
        "character_sheet program",
        path,
    )
    (
        family,
        program_id,
        program_version,
        primitive_ids,
        variant_controls,
        style_pack,
        layout_payload,
    ) = _parse_common_program_fields(payload, path, context="character_sheet program")
    layout = _parse_layout(
        layout_payload,
        path=path,
        context="character_sheet program.layout",
        expected_mode=CHARACTER_LAYOUT_MODE,
        require_frame_size=True,
        require_directions=True,
    )
    row_semantics = _require_string_list(
        payload, "row_semantics", path=path, context="character_sheet program"
    )
    if tuple(row_semantics) != ("idle", "walk", "action"):
        raise CompilerValidationError(
            f"{path}: character_sheet program.row_semantics must be idle, walk, action"
        )
    render_spec_payload = _require_mapping(
        payload, "render_spec", path=path, context="character_sheet program"
    )
    render_spec = load_spec_payload(render_spec_payload)
    return CharacterSheetProgram(
        family=family,
        program_id=program_id,
        program_version=program_version,
        style_pack=style_pack,
        primitive_ids=primitive_ids,
        variant_controls=variant_controls,
        layout=layout,
        render_spec=render_spec,
        row_semantics=row_semantics,
    )


def _load_prop_or_fx_program(payload: dict[str, Any], path: Path) -> PropOrFxSheetProgram:
    _require_exact_keys(
        payload,
        {
            "family",
            "program_id",
            "program_version",
            "style_pack",
            "primitive_ids",
            "variant_controls",
            "layout",
            "asset_kind",
            "state_rows",
            "motion",
            "effects",
            "palette",
        },
        "prop_or_fx_sheet program",
        path,
    )
    (
        family,
        program_id,
        program_version,
        primitive_ids,
        variant_controls,
        style_pack,
        layout_payload,
    ) = _parse_common_program_fields(payload, path, context="prop_or_fx_sheet program")
    layout = _parse_layout(
        layout_payload,
        path=path,
        context="prop_or_fx_sheet program.layout",
        expected_mode=PROP_LAYOUT_MODE,
        require_frame_size=True,
    )
    asset_kind = _require_string(payload, "asset_kind", path=path, context="prop_or_fx_sheet program")
    state_rows = _require_string_list(
        payload, "state_rows", path=path, context="prop_or_fx_sheet program"
    )
    motion_payload = _require_mapping(payload, "motion", path=path, context="prop_or_fx_sheet program")
    _require_exact_keys(
        motion_payload, {"max_offset", "max_rotation_deg", "glow_layers"}, "motion", path
    )
    motion = MotionPlan(
        max_offset=_require_int(motion_payload, "max_offset", path=path, context="motion"),
        max_rotation_deg=_require_int(
            motion_payload, "max_rotation_deg", path=path, context="motion"
        ),
        glow_layers=_require_int(motion_payload, "glow_layers", path=path, context="motion"),
    )
    if motion.max_offset < 0 or motion.max_rotation_deg < 0 or motion.glow_layers < 0:
        raise CompilerValidationError(f"{path}: motion values must be non-negative")
    effects_payload = _require_mapping(
        payload, "effects", path=path, context="prop_or_fx_sheet program"
    )
    _require_exact_keys(effects_payload, {"type"}, "effects", path)
    effects = FxSpec(type=_optional_string(effects_payload, "type", path=path, context="effects"))
    palette_payload = _require_mapping(
        payload, "palette", path=path, context="prop_or_fx_sheet program"
    )
    _require_exact_keys(palette_payload, {"primary", "secondary", "accent"}, "palette", path)
    palette = PaletteSpec(
        primary=_require_string(palette_payload, "primary", path=path, context="palette"),
        secondary=_require_string(
            palette_payload, "secondary", path=path, context="palette"
        ),
        accent=_require_string(palette_payload, "accent", path=path, context="palette"),
    )
    return PropOrFxSheetProgram(
        family=family,
        program_id=program_id,
        program_version=program_version,
        style_pack=style_pack,
        primitive_ids=primitive_ids,
        variant_controls=variant_controls,
        layout=layout,
        asset_kind=asset_kind,
        state_rows=state_rows,
        motion=motion,
        effects=effects,
        palette=palette,
    )


def _load_tileset_program(payload: dict[str, Any], path: Path) -> TilesetProgram:
    _require_exact_keys(
        payload,
        {
            "family",
            "program_id",
            "program_version",
            "style_pack",
            "primitive_ids",
            "variant_controls",
            "layout",
            "tile_kind",
            "theme",
            "modules",
            "variation_rules",
            "palette",
        },
        "tileset program",
        path,
    )
    (
        family,
        program_id,
        program_version,
        primitive_ids,
        variant_controls,
        style_pack,
        layout_payload,
    ) = _parse_common_program_fields(payload, path, context="tileset program")
    layout = _parse_layout(
        layout_payload,
        path=path,
        context="tileset program.layout",
        expected_mode=TILESET_LAYOUT_MODE,
        require_tile_size=True,
    )
    tile_kind = _require_string(payload, "tile_kind", path=path, context="tileset program")
    theme = _require_string(payload, "theme", path=path, context="tileset program")
    modules = _require_string_list(payload, "modules", path=path, context="tileset program")
    variation_rules_payload = _require_mapping(
        payload, "variation_rules", path=path, context="tileset program"
    )
    _require_exact_keys(
        variation_rules_payload, {"damage_passes", "clutter_tiles", "bounded"}, "variation_rules", path
    )
    variation_rules = VariationRules(
        damage_passes=_require_int(
            variation_rules_payload, "damage_passes", path=path, context="variation_rules"
        ),
        clutter_tiles=_require_int(
            variation_rules_payload, "clutter_tiles", path=path, context="variation_rules"
        ),
        bounded=_require_bool(
            variation_rules_payload, "bounded", path=path, context="variation_rules"
        ),
    )
    if variation_rules.damage_passes < 0 or variation_rules.clutter_tiles < 0:
        raise CompilerValidationError(
            f"{path}: variation_rules values must be non-negative"
        )
    palette_payload = _require_mapping(
        payload, "palette", path=path, context="tileset program"
    )
    _require_exact_keys(palette_payload, {"primary", "secondary", "accent"}, "palette", path)
    palette = PaletteSpec(
        primary=_require_string(palette_payload, "primary", path=path, context="palette"),
        secondary=_require_string(
            palette_payload, "secondary", path=path, context="palette"
        ),
        accent=_require_string(palette_payload, "accent", path=path, context="palette"),
    )
    return TilesetProgram(
        family=family,
        program_id=program_id,
        program_version=program_version,
        style_pack=style_pack,
        primitive_ids=primitive_ids,
        variant_controls=variant_controls,
        layout=layout,
        tile_kind=tile_kind,
        theme=theme,
        modules=modules,
        variation_rules=variation_rules,
        palette=palette,
    )


def load_compiler_program(path: str | Path) -> CompilerProgramBase:
    """Loads and validates a family-specific compiler program."""

    path = Path(path)
    payload = _load_json(path)
    family = payload.get("family")
    if not isinstance(family, str) or not family:
        raise CompilerValidationError(f"{path}: 'family' must be a non-empty string")
    if family == "character_sheet":
        return _load_character_sheet_program(payload, path)
    if family == "prop_or_fx_sheet":
        return _load_prop_or_fx_program(payload, path)
    if family == "tileset":
        return _load_tileset_program(payload, path)
    raise CompilerValidationError(f"{path}: unknown compiler family '{family}'")


def _approved_primitive_assets(repo_root: Path, family: str) -> list[dict[str, Any]]:
    manifest = build_primitive_manifest(repo_root)
    return query_primitives(manifest, family=family, approval_state="approved")


def _resolve_primitive_asset(
    repo_root: Path, family: str, primitive_id: str
) -> PrimitiveAsset:
    candidates = _approved_primitive_assets(repo_root, family)
    for row in candidates:
        if row.get("primitive_id") != primitive_id:
            continue
        metadata_path = repo_root / Path(str(row["metadata_path"]))
        metadata = load_primitive_metadata(metadata_path)
        image_path = repo_root / Path(metadata.source_path)
        if not image_path.exists():
            raise CompilerValidationError(
                f"{metadata_path}: primitive source image does not exist: {metadata.source_path}"
            )
        return PrimitiveAsset(
            metadata=metadata,
            metadata_path=metadata_path,
            image_path=image_path,
        )
    raise CompilerValidationError(
        f"unknown approved primitive '{primitive_id}' for family '{family}'"
    )


def _load_primitive_image(asset: PrimitiveAsset) -> Image.Image:
    with Image.open(asset.image_path) as image:
        image = image.convert("RGBA")
    region = asset.metadata.source_region
    return image.crop((region.x, region.y, region.x + region.width, region.y + region.height))


def _require_primitive_anchors(
    asset: PrimitiveAsset, required: tuple[str, ...], context: str
) -> None:
    missing = [name for name in required if name not in asset.metadata.anchors]
    if missing:
        joined = ", ".join(missing)
        raise CompilerValidationError(
            f"{asset.metadata_path}: {context} missing required anchor(s): {joined}"
        )


def _variant_seed(program: CompilerProgramBase) -> int:
    variant_key = program.variant_controls.variant_id or "default"
    digest = hashlib.sha256(
        f"{program.family}|{program.program_id}|{program.program_version}|{variant_key}".encode(
            "utf-8"
        )
    ).digest()
    return int.from_bytes(digest[:8], "big", signed=False)


def _variant_parameters(seed: int) -> tuple[int, int, int, int]:
    shift_x = (seed % 3) - 1
    shift_y = ((seed // 3) % 3) - 1
    tint_index = (seed // 9) % 3
    alpha = 18 + ((seed // 27) % 12)
    return shift_x, shift_y, tint_index, alpha


def _apply_variant_adjustments(
    image: Image.Image,
    *,
    seed: int,
    palette: PaletteSpec,
    style_pack_name: str,
) -> Image.Image:
    shift_x, shift_y, tint_index, alpha = _variant_parameters(seed)
    if shift_x or shift_y:
        image = ImageChops.offset(image, shift_x, shift_y)
    palette_hint = {
        0: palette.primary,
        1: palette.secondary,
        2: palette.accent,
    }[tint_index]
    overlay = Image.new(
        "RGBA",
        image.size,
        (
            (seed >> 8) % 80 + 80,
            (seed >> 16) % 80 + 80,
            (seed >> 24) % 80 + 80,
            alpha,
        ),
    )
    blended = Image.alpha_composite(image, overlay)
    if style_pack_name:
        enhancer = ImageEnhance.Color(blended)
        blended = enhancer.enhance(1.0)
    # Keep the adjustment bounded while still giving variant IDs a visible effect.
    if palette_hint:
        return ImageEnhance.Brightness(blended).enhance(1.0 + ((seed % 5) - 2) * 0.01)
    return blended


def _render_resized_primitive(
    asset: PrimitiveAsset,
    target_size: tuple[int, int],
    *,
    seed: int,
    palette: PaletteSpec,
    style_pack_name: str,
) -> Image.Image:
    image = _load_primitive_image(asset)
    image = ImageOps.contain(image, target_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    offset = (
        (target_size[0] - image.size[0]) // 2,
        (target_size[1] - image.size[1]) // 2,
    )
    canvas.alpha_composite(image, offset)
    return _apply_variant_adjustments(
        canvas, seed=seed, palette=palette, style_pack_name=style_pack_name
    )


def _render_tileset_atlas(
    asset: PrimitiveAsset,
    layout: ProgramLayout,
    *,
    seed: int,
    palette: PaletteSpec,
    style_pack_name: str,
) -> Image.Image:
    image = _load_primitive_image(asset)
    tile_width, tile_height = layout.tile_size or (16, 16)
    columns, rows = layout.grid
    target = Image.new("RGBA", (tile_width * columns, tile_height * rows), (0, 0, 0, 0))
    source_width, source_height = image.size
    block_width = max(1, source_width // columns)
    block_height = max(1, source_height // rows)
    for row in range(rows):
        for col in range(columns):
            left = min(source_width - block_width, col * block_width)
            top = min(source_height - block_height, row * block_height)
            crop = image.crop((left, top, left + block_width, top + block_height))
            tile = crop.resize((tile_width, tile_height), Image.Resampling.LANCZOS)
            target.alpha_composite(tile, (col * tile_width, row * tile_height))
    return _apply_variant_adjustments(
        target, seed=seed, palette=palette, style_pack_name=style_pack_name
    )


def _compiler_metadata(
    program: CompilerProgramBase,
    *,
    manifest: CompilerOutputManifest,
    primitive_assets: list[PrimitiveAsset],
    output_dir: Path,
) -> dict[str, Any]:
    return {
        "compiler_family": program.family,
        "compiler_version": COMPILER_VERSION,
        "program": program.to_dict(),
        "primitive_ids": list(program.primitive_ids),
        "primitives": [
            {
                "primitive_id": asset.metadata.primitive_id,
                "family": asset.metadata.family,
                "subtype": asset.metadata.subtype,
                "metadata_path": str(asset.metadata_path).replace("\\", "/"),
                "source_path": asset.metadata.source_path,
                "source_region": asset.metadata.source_region.to_dict(),
                "anchors": {
                    name: point.to_dict()
                    for name, point in sorted(asset.metadata.anchors.items())
                },
            }
            for asset in primitive_assets
        ],
        "variant_controls": program.variant_controls.to_dict(),
        "output_dir": str(output_dir).replace("\\", "/"),
        "sheet_path": manifest.output_file_paths[0] if manifest.output_file_paths else None,
        "program_path": manifest.input_program_path,
        "manifest_path": manifest.output_file_paths[-1] if manifest.output_file_paths else None,
        "manifest": manifest.to_dict(),
    }


def build_output_manifest(
    program: CompilerProgramBase,
    *,
    input_program_path: str | Path,
    output_file_paths: tuple[str | Path, ...],
    repo_root: str | Path = Path.cwd(),
    compiler_version: int = COMPILER_VERSION,
) -> CompilerOutputManifest:
    """Builds the shared output envelope for a compiled asset."""

    repo_root_path = Path(repo_root)
    normalized_program_path = _normalize_program_path(input_program_path, repo_root_path)
    normalized_output_paths = tuple(
        _normalize_program_path(path, repo_root_path) for path in output_file_paths
    )
    program_bytes = json.dumps(
        program.to_dict(), indent=2, sort_keys=True
    ).encode("utf-8")
    return CompilerOutputManifest(
        input_program_path=normalized_program_path,
        input_program_hash=hashlib.sha256(program_bytes).hexdigest(),
        compiler_family=program.family,
        compiler_version=compiler_version,
        program_id=program.program_id,
        program_version=program.program_version,
        variant_id=program.variant_controls.variant_id,
        variant_controls=program.variant_controls,
        primitive_ids=program.primitive_ids,
        output_file_paths=normalized_output_paths,
        dimensions=program.layout.dimensions,
        grid=program.layout.grid,
    )


def _compile_character_sheet(
    program: CharacterSheetProgram,
    output_dir: Path,
    repo_root: Path,
    program_path: str | Path | None,
) -> CompilerOutputManifest:
    output_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = output_dir / "sheet.png"
    metadata_path = output_dir / "metadata.json"
    program_copy_path = output_dir / "program.json"
    manifest_path = output_dir / "manifest.json"
    primitive_id = program.primitive_ids[0]
    asset = _resolve_primitive_asset(repo_root, "character_sheet", primitive_id)
    _require_primitive_anchors(asset, ("root", "head"), "character sheet primitive")
    style_pack = load_style_pack(
        program.style_pack, program.render_spec.palette, repo_root / "style_packs"
    )
    rendered = _render_resized_primitive(
        asset,
        program.layout.dimensions,
        seed=_variant_seed(program),
        palette=program.render_spec.palette,
        style_pack_name=style_pack.name,
    )
    if style_pack.palette_limits > 0:
        rendered = quantize_image_to_palette(rendered, style_pack.palette_limits)
    rendered.save(sheet_path, format="PNG", optimize=False, compress_level=9)
    manifest = build_output_manifest(
        program,
        input_program_path=program_path or "<memory>",
        output_file_paths=(sheet_path, metadata_path, program_copy_path, manifest_path),
        repo_root=repo_root,
    )
    metadata = _compiler_metadata(
        program,
        manifest=manifest,
        primitive_assets=[asset],
        output_dir=output_dir,
    )
    _write_json_file(metadata_path, metadata)
    _write_json_file(program_copy_path, program.to_dict())
    _write_json_file(manifest_path, manifest.to_dict())
    return manifest


def _compile_prop_or_fx_sheet(
    program: PropOrFxSheetProgram,
    output_dir: Path,
    repo_root: Path,
    program_path: str | Path | None,
) -> CompilerOutputManifest:
    output_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = output_dir / "sheet.png"
    metadata_path = output_dir / "metadata.json"
    program_copy_path = output_dir / "program.json"
    manifest_path = output_dir / "manifest.json"
    primitive_id = program.primitive_ids[0]
    asset = _resolve_primitive_asset(repo_root, "prop_sheet", primitive_id)
    _require_primitive_anchors(asset, ("center",), "prop/FX primitive")
    style_pack = load_style_pack(
        program.style_pack, program.palette, repo_root / "style_packs"
    )
    rendered = _render_resized_primitive(
        asset,
        program.layout.dimensions,
        seed=_variant_seed(program),
        palette=program.palette,
        style_pack_name=style_pack.name,
    )
    if style_pack.palette_limits > 0:
        rendered = quantize_image_to_palette(rendered, style_pack.palette_limits)
    rendered.save(sheet_path, format="PNG", optimize=False, compress_level=9)
    manifest = build_output_manifest(
        program,
        input_program_path=program_path or "<memory>",
        output_file_paths=(sheet_path, metadata_path, program_copy_path, manifest_path),
        repo_root=repo_root,
    )
    metadata = _compiler_metadata(
        program,
        manifest=manifest,
        primitive_assets=[asset],
        output_dir=output_dir,
    )
    _write_json_file(metadata_path, metadata)
    _write_json_file(program_copy_path, program.to_dict())
    _write_json_file(manifest_path, manifest.to_dict())
    return manifest


def _compile_tileset(
    program: TilesetProgram,
    output_dir: Path,
    repo_root: Path,
    program_path: str | Path | None,
) -> CompilerOutputManifest:
    output_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = output_dir / "sheet.png"
    metadata_path = output_dir / "metadata.json"
    program_copy_path = output_dir / "program.json"
    manifest_path = output_dir / "manifest.json"
    primitive_id = program.primitive_ids[0]
    asset = _resolve_primitive_asset(repo_root, "tileset", primitive_id)
    _require_primitive_anchors(asset, ("center", "north_edge"), "tileset primitive")
    style_pack = load_style_pack(
        program.style_pack, program.palette, repo_root / "style_packs"
    )
    rendered = _render_tileset_atlas(
        asset,
        program.layout,
        seed=_variant_seed(program),
        palette=program.palette,
        style_pack_name=style_pack.name,
    )
    if style_pack.palette_limits > 0:
        rendered = quantize_image_to_palette(rendered, style_pack.palette_limits)
    rendered.save(sheet_path, format="PNG", optimize=False, compress_level=9)
    manifest = build_output_manifest(
        program,
        input_program_path=program_path or "<memory>",
        output_file_paths=(sheet_path, metadata_path, program_copy_path, manifest_path),
        repo_root=repo_root,
    )
    metadata = _compiler_metadata(
        program,
        manifest=manifest,
        primitive_assets=[asset],
        output_dir=output_dir,
    )
    _write_json_file(metadata_path, metadata)
    _write_json_file(program_copy_path, program.to_dict())
    _write_json_file(manifest_path, manifest.to_dict())
    return manifest


DEFAULT_COMPILER_REGISTRY = CompilerRegistry(
    definitions={
        "character_sheet": CompilerDefinition(
            family="character_sheet",
            version=COMPILER_VERSION,
            program_type=CharacterSheetProgram,
            compile=_compile_character_sheet,
        ),
        "prop_or_fx_sheet": CompilerDefinition(
            family="prop_or_fx_sheet",
            version=COMPILER_VERSION,
            program_type=PropOrFxSheetProgram,
            compile=_compile_prop_or_fx_sheet,
        ),
        "tileset": CompilerDefinition(
            family="tileset",
            version=COMPILER_VERSION,
            program_type=TilesetProgram,
            compile=_compile_tileset,
        ),
    }
)


def compile_program(
    program: CompilerProgramBase,
    output_dir: str | Path,
    *,
    repo_root: str | Path = Path.cwd(),
    registry: CompilerRegistry = DEFAULT_COMPILER_REGISTRY,
    program_path: str | Path | None = None,
) -> CompilerOutputManifest:
    """Compiles a validated program using the default registry."""

    return registry.compile(
        program,
        output_dir,
        repo_root=repo_root,
        program_path=program_path,
    )
