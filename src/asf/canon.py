"""Canon loading, validation, and generation for the demo asset corpus."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
import colorsys
import json
from pathlib import Path
import statistics
from typing import Any

from PIL import Image, ImageChops, ImageFilter

from asf.specs import SpecValidationError


CANON_VERSION = 1
FAMILY_NAMES = (
    "character_sheet",
    "prop_sheet",
    "fx_sheet",
    "tileset",
    "background_scene",
    "parallax_layer",
    "ui_sheet",
    "presentation_surface",
)
LAYOUT_TYPES = (
    "pose_sheet_3x3",
    "strip_3x1",
    "scene_full_frame",
    "atlas_square",
)
TRANSPARENCY_MODES = (
    "opaque",
    "alpha_cutout",
    "soft_alpha",
)

CANON_DIRNAME = "canon"
MANIFEST_FILENAME = "corpus_manifest.json"
STYLE_CANON_FILENAME = "style_canon.json"
ANNOTATION_DIRNAME = "annotations"
GUIDE_DIRNAME = "family_guides"

REQUIRED_MANIFEST_KEYS = {
    "version",
    "source_root",
    "annotation_root",
    "taxonomy",
    "assets",
}
REQUIRED_ASSET_KEYS = {
    "asset_id",
    "source_path",
    "annotation_path",
    "family",
    "layout_type",
    "dimensions",
    "transparency",
    "structure_notes",
}
REQUIRED_ANNOTATION_KEYS = {
    "version",
    "asset_id",
    "source_path",
    "family",
    "layout_type",
    "gold_reference",
    "theme_tags",
    "motif_tags",
    "material_tags",
    "animation_tags",
    "palette",
    "outline",
    "lighting",
    "silhouette",
    "reserved_gameplay_space",
}
OPTIONAL_ANNOTATION_KEYS = {"frame_grid", "notes"}


class CanonValidationError(SpecValidationError):
    """Raised when corpus or canon data is malformed."""


@dataclass(frozen=True)
class ManifestAsset:
    """A validated corpus-manifest row."""

    asset_id: str
    source_path: str
    annotation_path: str
    family: str
    layout_type: str
    width: int
    height: int
    transparency: str
    structure_notes: tuple[str, ...]


def _load_json_object(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise CanonValidationError(f"{path}: expected a JSON object")
    return payload


def _require_exact_keys(
    payload: dict[str, Any], expected: set[str], context: str, path: Path
) -> None:
    missing = expected - payload.keys()
    extra = payload.keys() - expected
    if missing:
        joined = ", ".join(sorted(missing))
        raise CanonValidationError(f"{path}: {context} missing required key(s): {joined}")
    if extra:
        joined = ", ".join(sorted(extra))
        raise CanonValidationError(
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
        raise CanonValidationError(f"{path}: {context}.{key} must be a string")
    if not allow_empty and not value:
        raise CanonValidationError(
            f"{path}: {context}.{key} must be a non-empty string"
        )
    return value


def _require_bool(payload: dict[str, Any], key: str, *, path: Path, context: str) -> bool:
    value = payload.get(key)
    if not isinstance(value, bool):
        raise CanonValidationError(f"{path}: {context}.{key} must be a boolean")
    return value


def _require_int(payload: dict[str, Any], key: str, *, path: Path, context: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise CanonValidationError(f"{path}: {context}.{key} must be an integer")
    return value


def _require_string_list(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> tuple[str, ...]:
    value = payload.get(key)
    if not isinstance(value, list):
        raise CanonValidationError(f"{path}: {context}.{key} must be an array")
    items: list[str] = []
    for index, entry in enumerate(value):
        if not isinstance(entry, str) or not entry:
            raise CanonValidationError(
                f"{path}: {context}.{key}[{index}] must be a non-empty string"
            )
        items.append(entry)
    return tuple(items)


def _require_mapping(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> dict[str, Any]:
    value = payload.get(key)
    if not isinstance(value, dict):
        raise CanonValidationError(f"{path}: {context}.{key} must be an object")
    return value


def _is_relative_path(value: str) -> bool:
    path = Path(value)
    return not path.is_absolute()


def _relative_to_repo(path: Path, repo_root: Path) -> str:
    return str(path.relative_to(repo_root)).replace("\\", "/")


def load_corpus_manifest(manifest_path: Path) -> dict[str, Any]:
    """Loads and validates the corpus manifest file."""

    payload = _load_json_object(manifest_path)
    _require_exact_keys(payload, REQUIRED_MANIFEST_KEYS, "corpus manifest", manifest_path)
    version = _require_int(payload, "version", path=manifest_path, context="corpus")
    if version != CANON_VERSION:
        raise CanonValidationError(
            f"{manifest_path}: corpus manifest version must be {CANON_VERSION}"
        )

    source_root = _require_string(
        payload, "source_root", path=manifest_path, context="corpus"
    )
    annotation_root = _require_string(
        payload, "annotation_root", path=manifest_path, context="corpus"
    )
    if not _is_relative_path(source_root):
        raise CanonValidationError(
            f"{manifest_path}: corpus.source_root must be a relative path"
        )
    if not _is_relative_path(annotation_root):
        raise CanonValidationError(
            f"{manifest_path}: corpus.annotation_root must be a relative path"
        )

    taxonomy = _require_mapping(payload, "taxonomy", path=manifest_path, context="corpus")
    _require_exact_keys(taxonomy, {"families", "layout_types"}, "taxonomy", manifest_path)
    families = _require_string_list(
        taxonomy, "families", path=manifest_path, context="taxonomy"
    )
    layout_types = _require_string_list(
        taxonomy, "layout_types", path=manifest_path, context="taxonomy"
    )
    if tuple(families) != FAMILY_NAMES:
        raise CanonValidationError(
            f"{manifest_path}: taxonomy.families does not match the approved family list"
        )
    if tuple(layout_types) != LAYOUT_TYPES:
        raise CanonValidationError(
            f"{manifest_path}: taxonomy.layout_types does not match the approved layout list"
        )

    assets_payload = payload.get("assets")
    if not isinstance(assets_payload, list) or not assets_payload:
        raise CanonValidationError(f"{manifest_path}: corpus.assets must be a non-empty array")

    assets = [_load_manifest_asset(entry, manifest_path) for entry in assets_payload]
    return {
        "version": version,
        "source_root": source_root,
        "annotation_root": annotation_root,
        "taxonomy": {"families": families, "layout_types": layout_types},
        "assets": [vars(asset).copy() for asset in assets],
    }


def _load_manifest_asset(entry: Any, manifest_path: Path) -> ManifestAsset:
    if not isinstance(entry, dict):
        raise CanonValidationError(
            f"{manifest_path}: each corpus asset entry must be an object"
        )
    _require_exact_keys(entry, REQUIRED_ASSET_KEYS, "corpus asset", manifest_path)

    asset_id = _require_string(entry, "asset_id", path=manifest_path, context="asset")
    source_path = _require_string(
        entry, "source_path", path=manifest_path, context="asset"
    )
    annotation_path = _require_string(
        entry, "annotation_path", path=manifest_path, context="asset"
    )
    family = _require_string(entry, "family", path=manifest_path, context="asset")
    layout_type = _require_string(
        entry, "layout_type", path=manifest_path, context="asset"
    )
    if family not in FAMILY_NAMES:
        raise CanonValidationError(
            f"{manifest_path}: asset.family must be one of the approved family names"
        )
    if layout_type not in LAYOUT_TYPES:
        raise CanonValidationError(
            f"{manifest_path}: asset.layout_type must be one of the approved layout types"
        )
    dimensions = _require_mapping(
        entry, "dimensions", path=manifest_path, context="asset"
    )
    _require_exact_keys(dimensions, {"width", "height"}, "dimensions", manifest_path)
    width = _require_int(dimensions, "width", path=manifest_path, context="dimensions")
    height = _require_int(dimensions, "height", path=manifest_path, context="dimensions")
    transparency = _require_string(
        entry, "transparency", path=manifest_path, context="asset"
    )
    if transparency not in TRANSPARENCY_MODES:
        raise CanonValidationError(
            f"{manifest_path}: asset.transparency must be one of {', '.join(TRANSPARENCY_MODES)}"
        )
    structure_notes = _require_string_list(
        entry, "structure_notes", path=manifest_path, context="asset"
    )

    return ManifestAsset(
        asset_id=asset_id,
        source_path=source_path,
        annotation_path=annotation_path,
        family=family,
        layout_type=layout_type,
        width=width,
        height=height,
        transparency=transparency,
        structure_notes=structure_notes,
    )


def load_annotation(annotation_path: Path) -> dict[str, Any]:
    """Loads and validates a single annotation file."""

    payload = _load_json_object(annotation_path)
    missing = REQUIRED_ANNOTATION_KEYS - payload.keys()
    if missing:
        joined = ", ".join(sorted(missing))
        raise CanonValidationError(
            f"{annotation_path}: annotation missing required key(s): {joined}"
        )
    extra_keys = payload.keys() - (REQUIRED_ANNOTATION_KEYS | OPTIONAL_ANNOTATION_KEYS)
    if extra_keys:
        joined = ", ".join(sorted(extra_keys))
        raise CanonValidationError(
            f"{annotation_path}: annotation contains unexpected key(s): {joined}"
        )
    version = _require_int(payload, "version", path=annotation_path, context="annotation")
    if version != CANON_VERSION:
        raise CanonValidationError(
            f"{annotation_path}: annotation version must be {CANON_VERSION}"
        )
    _require_string(payload, "asset_id", path=annotation_path, context="annotation")
    _require_string(payload, "source_path", path=annotation_path, context="annotation")
    family = _require_string(payload, "family", path=annotation_path, context="annotation")
    layout_type = _require_string(
        payload, "layout_type", path=annotation_path, context="annotation"
    )
    if family not in FAMILY_NAMES:
        raise CanonValidationError(
            f"{annotation_path}: annotation.family must be one of the approved family names"
        )
    if layout_type not in LAYOUT_TYPES:
        raise CanonValidationError(
            f"{annotation_path}: annotation.layout_type must be one of the approved layout types"
        )
    _require_bool(payload, "gold_reference", path=annotation_path, context="annotation")
    _require_string_list(payload, "theme_tags", path=annotation_path, context="annotation")
    _require_string_list(payload, "motif_tags", path=annotation_path, context="annotation")
    _require_string_list(payload, "material_tags", path=annotation_path, context="annotation")
    _require_string_list(payload, "animation_tags", path=annotation_path, context="annotation")
    _validate_palette_block(payload, annotation_path)
    _validate_outline_block(payload, annotation_path)
    _validate_lighting_block(payload, annotation_path)
    _validate_silhouette_block(payload, annotation_path)
    reserved = payload.get("reserved_gameplay_space")
    if not isinstance(reserved, list):
        raise CanonValidationError(
            f"{annotation_path}: annotation.reserved_gameplay_space must be an array"
        )
    for index, entry in enumerate(reserved):
        if not isinstance(entry, str) or not entry:
            raise CanonValidationError(
                f"{annotation_path}: annotation.reserved_gameplay_space[{index}] must be a non-empty string"
            )
    frame_grid = payload.get("frame_grid")
    if frame_grid is not None:
        _validate_frame_grid(frame_grid, annotation_path)
    notes = payload.get("notes")
    if notes is not None and not isinstance(notes, str):
        raise CanonValidationError(f"{annotation_path}: annotation.notes must be a string")
    return payload


def _validate_palette_block(payload: dict[str, Any], annotation_path: Path) -> None:
    palette = _require_mapping(
        payload, "palette", path=annotation_path, context="annotation"
    )
    _require_exact_keys(palette, {"dominant_colors", "ramps"}, "palette", annotation_path)
    dominant_colors = palette.get("dominant_colors")
    if not isinstance(dominant_colors, list) or not dominant_colors:
        raise CanonValidationError(
            f"{annotation_path}: annotation.palette.dominant_colors must be a non-empty array"
        )
    for index, entry in enumerate(dominant_colors):
        if not isinstance(entry, str) or not entry.startswith("#") or len(entry) != 7:
            raise CanonValidationError(
                f"{annotation_path}: annotation.palette.dominant_colors[{index}] must be a hex color"
            )
    ramps = palette.get("ramps")
    if not isinstance(ramps, list) or not ramps:
        raise CanonValidationError(
            f"{annotation_path}: annotation.palette.ramps must be a non-empty array"
        )
    for index, ramp in enumerate(ramps):
        if not isinstance(ramp, dict):
            raise CanonValidationError(
                f"{annotation_path}: annotation.palette.ramps[{index}] must be an object"
            )
        _require_exact_keys(ramp, {"name", "colors", "role"}, "palette.ramp", annotation_path)
        _require_string(ramp, "name", path=annotation_path, context="annotation.palette.ramp")
        _require_string(ramp, "role", path=annotation_path, context="annotation.palette.ramp")
        colors = ramp.get("colors")
        if not isinstance(colors, list) or len(colors) != 3:
            raise CanonValidationError(
                f"{annotation_path}: annotation.palette.ramps[{index}].colors must contain exactly 3 hex colors"
            )
        for color_index, color in enumerate(colors):
            if not isinstance(color, str) or not color.startswith("#") or len(color) != 7:
                raise CanonValidationError(
                    f"{annotation_path}: annotation.palette.ramps[{index}].colors[{color_index}] must be a hex color"
                )


def _validate_outline_block(payload: dict[str, Any], annotation_path: Path) -> None:
    outline = _require_mapping(
        payload, "outline", path=annotation_path, context="annotation"
    )
    _require_exact_keys(outline, {"thickness_px", "continuity", "presence"}, "outline", annotation_path)
    _require_int(outline, "thickness_px", path=annotation_path, context="annotation.outline")
    _require_string(outline, "continuity", path=annotation_path, context="annotation.outline")
    _require_string(outline, "presence", path=annotation_path, context="annotation.outline")


def _validate_lighting_block(payload: dict[str, Any], annotation_path: Path) -> None:
    lighting = _require_mapping(
        payload, "lighting", path=annotation_path, context="annotation"
    )
    _require_exact_keys(
        lighting, {"direction", "highlight_style", "shadow_style"}, "lighting", annotation_path
    )
    _require_string(lighting, "direction", path=annotation_path, context="annotation.lighting")
    _require_string(
        lighting, "highlight_style", path=annotation_path, context="annotation.lighting"
    )
    _require_string(lighting, "shadow_style", path=annotation_path, context="annotation.lighting")


def _validate_silhouette_block(payload: dict[str, Any], annotation_path: Path) -> None:
    silhouette = _require_mapping(
        payload, "silhouette", path=annotation_path, context="annotation"
    )
    _require_exact_keys(
        silhouette, {"occupancy_band", "bbox_usage"}, "silhouette", annotation_path
    )
    _require_string(
        silhouette, "occupancy_band", path=annotation_path, context="annotation.silhouette"
    )
    _require_string(
        silhouette, "bbox_usage", path=annotation_path, context="annotation.silhouette"
    )


def _validate_frame_grid(frame_grid: Any, annotation_path: Path) -> None:
    if not isinstance(frame_grid, dict):
        raise CanonValidationError(
            f"{annotation_path}: annotation.frame_grid must be an object"
        )
    _require_exact_keys(
        frame_grid, {"rows", "columns", "frame_order", "frame_labels"}, "frame_grid", annotation_path
    )
    rows = _require_int(frame_grid, "rows", path=annotation_path, context="annotation.frame_grid")
    columns = _require_int(
        frame_grid, "columns", path=annotation_path, context="annotation.frame_grid"
    )
    if rows <= 0 or columns <= 0:
        raise CanonValidationError(
            f"{annotation_path}: annotation.frame_grid rows and columns must be positive"
        )
    _require_string_list(
        frame_grid, "frame_order", path=annotation_path, context="annotation.frame_grid"
    )
    _require_string_list(
        frame_grid, "frame_labels", path=annotation_path, context="annotation.frame_grid"
    )


def validate_corpus(manifest_path: Path) -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    """Validates the manifest and every referenced annotation file."""

    manifest = load_corpus_manifest(manifest_path)
    repo_root = manifest_path.parent.parent
    annotations: dict[str, dict[str, Any]] = {}
    for raw_asset in manifest["assets"]:
        asset = ManifestAsset(**raw_asset)
        source_path = repo_root / asset.source_path
        annotation_path = repo_root / asset.annotation_path
        if not source_path.exists():
            raise CanonValidationError(f"{source_path}: referenced source asset is missing")
        if not annotation_path.exists():
            raise CanonValidationError(
                f"{annotation_path}: referenced annotation file is missing"
            )
        annotation = load_annotation(annotation_path)
        _validate_manifest_annotation_pair(asset, annotation, annotation_path)
        annotations[asset.asset_id] = annotation
    return manifest, annotations


def _validate_manifest_annotation_pair(
    asset: ManifestAsset,
    annotation: dict[str, Any],
    annotation_path: Path,
) -> None:
    expected_source = asset.source_path
    if annotation.get("asset_id") != asset.asset_id:
        raise CanonValidationError(
            f"{annotation_path}: annotation.asset_id does not match manifest asset_id '{asset.asset_id}'"
        )
    if annotation.get("source_path") != expected_source:
        raise CanonValidationError(
            f"{annotation_path}: annotation.source_path does not match manifest source_path '{expected_source}'"
        )
    if annotation.get("family") != asset.family:
        raise CanonValidationError(
            f"{annotation_path}: annotation.family does not match manifest family '{asset.family}'"
        )
    if annotation.get("layout_type") != asset.layout_type:
        raise CanonValidationError(
            f"{annotation_path}: annotation.layout_type does not match manifest layout_type '{asset.layout_type}'"
        )


def extract_image_metrics(
    image_path: Path,
    annotation: dict[str, Any],
    *,
    layout_type: str,
) -> dict[str, Any]:
    """Extracts deterministic metrics from a demo asset image."""

    image = Image.open(image_path).convert("RGBA")
    pixels = list(image.getdata())
    quantized_pixels = [_bucket_rgba(px) for px in pixels]
    total_pixels = len(pixels)
    opaque_pixels = [px for px in pixels if px[3] > 0]
    non_transparent_count = len(opaque_pixels)

    exact_color_count = len({px for px in quantized_pixels if px[3] > 0})
    dominant_colors = _dominant_colors(quantized_pixels)
    hue_distribution = _hue_distribution(quantized_pixels)
    value_distribution = _value_distribution(quantized_pixels)
    occupancy_ratio = round(non_transparent_count / total_pixels, 6)
    edge_density = _edge_density(image)
    contact_shadow_area = _contact_shadow_area(pixels, image.size)
    highlight_density = _highlight_density(pixels)
    frame_to_frame_drift = _frame_drift(image, annotation, layout_type)

    return {
        "color_count": exact_color_count,
        "dominant_color_count": len(dominant_colors),
        "dominant_colors": dominant_colors,
        "hue_distribution": hue_distribution,
        "value_distribution": value_distribution,
        "non_transparent_occupancy_ratio": occupancy_ratio,
        "edge_density": edge_density,
        "contact_shadow_area": contact_shadow_area,
        "highlight_density": highlight_density,
        "frame_to_frame_drift": frame_to_frame_drift,
    }


def _bucket_rgba(rgba: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    red, green, blue, alpha = rgba
    if alpha == 0:
        return rgba
    return (
        (red // 32) * 32,
        (green // 32) * 32,
        (blue // 32) * 32,
        alpha,
    )


def _dominant_colors(pixels: list[tuple[int, int, int, int]]) -> list[str]:
    counts: Counter[tuple[int, int, int, int]] = Counter(
        px for px in pixels if px[3] > 0
    )
    colors = []
    for rgba, _count in counts.most_common(8):
        colors.append(_rgba_to_hex(rgba))
    return colors


def _rgba_to_hex(rgba: tuple[int, int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(rgba[0], rgba[1], rgba[2])


def _hue_distribution(pixels: list[tuple[int, int, int, int]]) -> dict[str, float]:
    buckets = Counter({"0-60": 0, "60-120": 0, "120-180": 0, "180-240": 0, "240-300": 0, "300-360": 0})
    total = 0
    for red, green, blue, alpha in pixels:
        if alpha == 0:
            continue
        hue, _sat, _value = colorsys.rgb_to_hsv(red / 255.0, green / 255.0, blue / 255.0)
        degrees = hue * 360.0
        if degrees < 60:
            buckets["0-60"] += 1
        elif degrees < 120:
            buckets["60-120"] += 1
        elif degrees < 180:
            buckets["120-180"] += 1
        elif degrees < 240:
            buckets["180-240"] += 1
        elif degrees < 300:
            buckets["240-300"] += 1
        else:
            buckets["300-360"] += 1
        total += 1
    if total == 0:
        return {bucket: 0.0 for bucket in buckets}
    return {bucket: round(count / total, 6) for bucket, count in buckets.items()}


def _value_distribution(pixels: list[tuple[int, int, int, int]]) -> dict[str, float]:
    buckets = Counter({"0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0})
    total = 0
    for red, green, blue, alpha in pixels:
        if alpha == 0:
            continue
        _hue, _sat, value = colorsys.rgb_to_hsv(red / 255.0, green / 255.0, blue / 255.0)
        value_pct = value * 100.0
        if value_pct < 25:
            buckets["0-25"] += 1
        elif value_pct < 50:
            buckets["25-50"] += 1
        elif value_pct < 75:
            buckets["50-75"] += 1
        else:
            buckets["75-100"] += 1
        total += 1
    if total == 0:
        return {bucket: 0.0 for bucket in buckets}
    return {bucket: round(count / total, 6) for bucket, count in buckets.items()}


def _edge_density(image: Image.Image) -> float:
    grayscale = image.convert("L")
    edges = grayscale.filter(ImageFilter.FIND_EDGES)
    edge_pixels = sum(1 for value in edges.getdata() if value > 32)
    return round(edge_pixels / (image.size[0] * image.size[1]), 6)


def _contact_shadow_area(
    pixels: list[tuple[int, int, int, int]], size: tuple[int, int]
) -> float:
    width, height = size
    threshold_y = int(height * 0.75)
    shadow_pixels = 0
    for index, rgba in enumerate(pixels):
        y = index // width
        if y < threshold_y or rgba[3] == 0:
            continue
        red, green, blue, _alpha = rgba
        value = max(red, green, blue)
        if value < 96:
            shadow_pixels += 1
    return round(shadow_pixels / (width * height), 6)


def _highlight_density(pixels: list[tuple[int, int, int, int]]) -> float:
    highlight_pixels = 0
    for red, green, blue, alpha in pixels:
        if alpha == 0:
            continue
        value = max(red, green, blue)
        if value > 220:
            highlight_pixels += 1
    return round(highlight_pixels / len(pixels), 6)


def _frame_drift(
    image: Image.Image,
    annotation: dict[str, Any],
    layout_type: str,
) -> float | None:
    frame_grid = annotation.get("frame_grid")
    if not isinstance(frame_grid, dict) and layout_type not in {"pose_sheet_3x3", "strip_3x1"}:
        return None
    if not isinstance(frame_grid, dict):
        if layout_type == "pose_sheet_3x3":
            rows, columns = 3, 3
        elif layout_type == "strip_3x1":
            rows, columns = 1, 3
        else:
            return None
    else:
        rows = int(frame_grid["rows"])
        columns = int(frame_grid["columns"])
    frames = _split_frames(image, rows, columns)
    if len(frames) < 2:
        return None
    target_size = frames[0].size
    deltas: list[float] = []
    for previous, current in zip(frames, frames[1:]):
        previous = previous.resize(target_size, Image.Resampling.NEAREST)
        current = current.resize(target_size, Image.Resampling.NEAREST)
        diff = ImageChops.difference(previous, current).convert("RGBA")
        total = sum(sum(px[:3]) for px in diff.getdata())
        max_total = diff.size[0] * diff.size[1] * 255 * 3
        deltas.append(total / max_total if max_total else 0.0)
    return round(statistics.fmean(deltas), 6)


def _split_frames(image: Image.Image, rows: int, columns: int) -> list[Image.Image]:
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return [image.crop((0, 0, image.size[0], image.size[1]))]
    left, top, right, bottom = bbox
    column_bounds = _split_evenly(left, right, columns)
    row_bounds = _split_evenly(top, bottom, rows)
    frames: list[Image.Image] = []
    for row in range(rows):
        top = row_bounds[row]
        bottom = row_bounds[row + 1]
        for column in range(columns):
            left = column_bounds[column]
            right = column_bounds[column + 1]
            frames.append(image.crop((left, top, right, bottom)))
    return frames


def _split_evenly(start: int, end: int, parts: int) -> list[int]:
    if parts <= 0:
        raise ValueError("parts must be positive")
    span = end - start
    bounds = [start]
    for index in range(1, parts):
        bounds.append(start + round(span * index / parts))
    bounds.append(end)
    return bounds


def build_style_canon(repo_root: Path) -> dict[str, Any]:
    """Builds the canon artifact from the checked-in manifest and annotations."""

    manifest_path = repo_root / CANON_DIRNAME / MANIFEST_FILENAME
    manifest, annotations = validate_corpus(manifest_path)
    assets: list[dict[str, Any]] = []
    family_assets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    gold_cluster_inputs: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for raw_asset in manifest["assets"]:
        asset = ManifestAsset(**raw_asset)
        source_path = repo_root / asset.source_path
        annotation = annotations[asset.asset_id]
        metrics = extract_image_metrics(
            source_path,
            annotation,
            layout_type=asset.layout_type,
        )
        record = {
            "asset_id": asset.asset_id,
            "source_path": asset.source_path,
            "annotation_path": asset.annotation_path,
            "family": asset.family,
            "layout_type": asset.layout_type,
            "gold_reference": bool(annotation["gold_reference"]),
            "metrics": metrics,
            "annotation_summary": {
                "theme_tags": list(annotation["theme_tags"]),
                "motif_tags": list(annotation["motif_tags"]),
                "material_tags": list(annotation["material_tags"]),
                "animation_tags": list(annotation["animation_tags"]),
            },
        }
        assets.append(record)
        family_assets[asset.family].append(record)
        if annotation["gold_reference"]:
            gold_cluster_inputs[asset.family].append(
                {
                    "asset_id": asset.asset_id,
                    "theme_tags": list(annotation["theme_tags"]),
                    "motif_tags": list(annotation["motif_tags"]),
                    "material_tags": list(annotation["material_tags"]),
                    "metrics": metrics,
                }
            )

    family_baselines = {
        family: _summarize_family(records) for family, records in sorted(family_assets.items())
    }
    gold_reference_clusters = {
        family: _summarize_gold_cluster(records)
        for family, records in sorted(gold_cluster_inputs.items())
    }
    return {
        "version": CANON_VERSION,
        "source_root": manifest["source_root"],
        "annotation_root": manifest["annotation_root"],
        "taxonomy": manifest["taxonomy"],
        "assets": sorted(assets, key=lambda item: (item["family"], item["asset_id"])),
        "family_baselines": family_baselines,
        "gold_reference_clusters": gold_reference_clusters,
    }


def _summarize_family(records: list[dict[str, Any]]) -> dict[str, Any]:
    metric_names = [
        "color_count",
        "dominant_color_count",
        "non_transparent_occupancy_ratio",
        "edge_density",
        "contact_shadow_area",
        "highlight_density",
        "frame_to_frame_drift",
    ]
    metrics = {
        name: [record["metrics"][name] for record in records if record["metrics"][name] is not None]
        for name in metric_names
    }
    summary = {
        "asset_count": len(records),
        "layout_types": sorted({record["layout_type"] for record in records}),
        "gold_assets": sorted(
            record["asset_id"] for record in records if record["gold_reference"]
        ),
        "metrics": {
            name: _metric_summary(values) for name, values in metrics.items() if values
        },
        "dominant_colors": _dominant_color_summary(records),
        "themes": sorted(
            {tag for record in records for tag in record["annotation_summary"]["theme_tags"]}
        ),
        "motifs": sorted(
            {tag for record in records for tag in record["annotation_summary"]["motif_tags"]}
        ),
    }
    return summary


def _dominant_color_summary(records: list[dict[str, Any]]) -> list[str]:
    colors: Counter[str] = Counter()
    for record in records:
        colors.update(record["metrics"]["dominant_colors"])
    return [color for color, _count in colors.most_common(8)]


def _metric_summary(values: list[float | int]) -> dict[str, float]:
    numeric = [float(value) for value in values]
    return {
        "min": round(min(numeric), 6),
        "max": round(max(numeric), 6),
        "mean": round(statistics.fmean(numeric), 6),
        "median": round(statistics.median(numeric), 6),
        "stdev": round(statistics.pstdev(numeric), 6) if len(numeric) > 1 else 0.0,
    }


def _summarize_gold_cluster(records: list[dict[str, Any]]) -> dict[str, Any]:
    theme_tags = sorted({tag for record in records for tag in record["theme_tags"]})
    motif_tags = sorted({tag for record in records for tag in record["motif_tags"]})
    material_tags = sorted({tag for record in records for tag in record["material_tags"]})
    metric_values = defaultdict(list)
    for record in records:
        for key in ("color_count", "non_transparent_occupancy_ratio", "edge_density"):
            metric_values[key].append(record["metrics"][key])
    return {
        "gold_assets": sorted(record["asset_id"] for record in records),
        "shared_theme_tags": theme_tags,
        "shared_motif_tags": motif_tags,
        "shared_material_tags": material_tags,
        "metrics": {
            name: _metric_summary(values) for name, values in metric_values.items() if values
        },
    }


def build_family_guides(canon: dict[str, Any]) -> dict[str, str]:
    """Builds markdown guide text for each family."""

    manifest_assets = canon["assets"]
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for asset in manifest_assets:
        grouped[asset["family"]].append(asset)

    guides: dict[str, str] = {}
    for family in FAMILY_NAMES:
        family_assets = grouped.get(family, [])
        guides[family] = _render_family_guide(
            family=family,
            assets=family_assets,
            family_summary=canon["family_baselines"].get(family, {}),
            gold_cluster=canon["gold_reference_clusters"].get(family),
        )
    return guides


def _render_family_guide(
    *,
    family: str,
    assets: list[dict[str, Any]],
    family_summary: dict[str, Any],
    gold_cluster: dict[str, Any] | None,
) -> str:
    title = family.replace("_", " ").title()
    allowed, disallowed, composition = _family_guide_copy(family)
    examples = "\n".join(
        f"- `{asset['asset_id']}` ({asset['layout_type']})"
        + (" [gold]" if asset["gold_reference"] else "")
        for asset in assets
    )
    if not examples:
        examples = "- No demo assets in this family yet."
    metrics = family_summary.get("metrics", {})
    occupancy = metrics.get("non_transparent_occupancy_ratio")
    edge_density = metrics.get("edge_density")
    color_count = metrics.get("color_count")
    gold_assets = ", ".join(gold_cluster["gold_assets"]) if gold_cluster else "None"
    common_motifs = ", ".join(gold_cluster["shared_motif_tags"]) if gold_cluster else "None"
    common_themes = ", ".join(gold_cluster["shared_theme_tags"]) if gold_cluster else "None"
    palette_names = _family_palette_note(family)
    representative_colors = ", ".join(family_summary.get("dominant_colors", [])[:8]) or "None"
    return (
        f"# {title}\n\n"
        f"## Allowed Traits\n\n{allowed}\n\n"
        f"## Disallowed Traits\n\n{disallowed}\n\n"
        f"## Composition Constraints\n\n{composition}\n\n"
        f"## Typical Scale\n\n"
        f"- Asset count in corpus: {family_summary.get('asset_count', 0)}\n"
        f"- Occupancy ratio baseline: {_format_metric_summary(occupancy)}\n"
        f"- Edge density baseline: {_format_metric_summary(edge_density)}\n"
        f"- Color-count baseline: {_format_metric_summary(color_count)}\n\n"
        f"## Common Palette Families\n\n- {palette_names}\n"
        f"- Representative colors: {representative_colors}\n\n"
        f"## Gold References\n\n- {gold_assets}\n"
        f"- Shared themes: {common_themes}\n"
        f"- Shared motifs: {common_motifs}\n\n"
        f"## Demo Examples\n\n{examples}\n"
    )


def _format_metric_summary(summary: dict[str, float] | None) -> str:
    if not summary:
        return "n/a"
    return (
        f"{summary['min']:.3f} to {summary['max']:.3f} "
        f"(mean {summary['mean']:.3f})"
    )


def _family_guide_copy(family: str) -> tuple[str, str, str]:
    if family == "character_sheet":
        return (
            "- Use readable silhouettes, clear limb separation, and combat-ready or idle pose loops.",
            "- Avoid full-frame scenic backgrounds, UI chrome, or single-object props.",
            "- Keep the body mass centered and reserve enough breathing room for frame-to-frame motion.",
        )
    if family == "prop_sheet":
        return (
            "- Use standalone items with simple turntable or pose variations.",
            "- Avoid full characters, scene backgrounds, and large navigational spaces.",
            "- Keep the object anchored near center and leave the edges mostly empty unless the prop demands it.",
        )
    if family == "fx_sheet":
        return (
            "- Use glow, burst, aura, splash, and other transient effects with readable silhouettes.",
            "- Avoid grounded scene composition or fully static props with no motion energy.",
            "- Favor high contrast and a soft or fragmented boundary so the effect reads at small sizes.",
        )
    if family == "tileset":
        return (
            "- Use repeatable terrain, architectural tiles, and modular edge pieces.",
            "- Avoid character framing, fixed cinematic compositions, and one-off prop staging.",
            "- Keep tile boundaries and modular seams explicit so later assemblers can recompose them.",
        )
    if family == "background_scene":
        return (
            "- Use composed environmental scenes, painted backdrops, and set-dressed rooms or vistas.",
            "- Avoid modular tile seams or tiny prop-only studies.",
            "- Reserve clear gameplay-safe zones and keep the focal point consistent across the scene.",
        )
    if family == "parallax_layer":
        return (
            "- Use depth-separated background layers with broad shapes and low-detail silhouettes.",
            "- Avoid foreground clutter that would compete with gameplay actors.",
            "- Keep the layer readable when shifted horizontally for parallax motion.",
        )
    if family == "ui_sheet":
        return (
            "- Use interface chrome, icons, panels, and label-ready shapes.",
            "- Avoid diegetic world scene content or animation-heavy character poses.",
            "- Keep margins and slicing boundaries predictable for runtime atlas extraction.",
        )
    if family == "presentation_surface":
        return (
            "- Use splash screens, cover art, loading screens, and other presentation-first compositions.",
            "- Avoid modular gameplay tiles or interface control chrome.",
            "- Anchor the focal subject so the frame works as a single presentation image.",
        )
    return ("", "", "")


def _family_palette_note(family: str) -> str:
    if family == "character_sheet":
        return (
            "Cold blues, steel greys, cloth neutrals, and bright accent glows for readable heroes and enemies."
        )
    if family == "prop_sheet":
        return "Parchment, wood, brass, and small glow accents that keep the prop readable at icon size."
    if family == "fx_sheet":
        return "Saturated glow colors, white hot highlights, and transparent mist edges."
    if family == "tileset":
        return "Earth stone, moss, timber, and repeatable neutral materials."
    if family == "background_scene":
        return "Warm stone, ambient lamp light, and localized portal or lantern accents."
    if family == "parallax_layer":
        return "Desaturated distant blues, greys, and low-contrast atmospheric tones."
    if family == "ui_sheet":
        return "Flat neutral panels, trim golds, and high-contrast label colors."
    if family == "presentation_surface":
        return "Cinematic hero colors with a single strong accent to pull the eye to the focal subject."
    return "No palette note available."


def write_style_canon(repo_root: Path, canon: dict[str, Any]) -> Path:
    """Writes the canon artifact to disk."""

    canon_dir = repo_root / CANON_DIRNAME
    canon_dir.mkdir(parents=True, exist_ok=True)
    path = canon_dir / STYLE_CANON_FILENAME
    path.write_text(
        json.dumps(canon, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return path


def write_family_guides(repo_root: Path, canon: dict[str, Any]) -> list[Path]:
    """Writes the family-guide markdown files to disk."""

    guide_dir = repo_root / CANON_DIRNAME / GUIDE_DIRNAME
    guide_dir.mkdir(parents=True, exist_ok=True)
    guides = build_family_guides(canon)
    written_paths: list[Path] = []
    for family, text in guides.items():
        path = guide_dir / f"{family}.md"
        path.write_text(text.rstrip() + "\n", encoding="utf-8")
        written_paths.append(path)
    return written_paths


def rebuild_canon(repo_root: Path) -> dict[str, Any]:
    """Rebuilds canon outputs from the checked-in corpus inputs."""

    canon = build_style_canon(repo_root)
    write_style_canon(repo_root, canon)
    write_family_guides(repo_root, canon)
    return canon
