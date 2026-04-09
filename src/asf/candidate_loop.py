"""Candidate generation, critic scoring, and calibration helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, replace
import colorsys
import hashlib
import json
from functools import lru_cache
from pathlib import Path
from shutil import copytree, rmtree
from statistics import fmean, pstdev
import statistics
from typing import Any, Iterable

from PIL import Image, ImageChops, ImageFilter, ImageOps

from asf.canon import (
    CANON_VERSION,
    MANIFEST_FILENAME as CANON_MANIFEST_FILENAME,
    build_style_canon,
)
from asf.compilers import (
    COMPILER_VERSION,
    CompilerValidationError,
    CompilerProgramBase,
    VariantControls,
    compile_program,
    load_compiler_program,
)
from asf.critic import validate_sheet
from asf.specs import SpecValidationError
from asf.style_packs import load_style_pack


DEFAULT_THRESHOLD_PACK_DIRNAME = "critic_thresholds"
DEFAULT_CALIBRATION_REPORT = "calibration_report.md"
DEFAULT_SELECTION_MANIFEST = "selection_manifest.json"
DEFAULT_CANDIDATE_MANIFEST = "candidate_manifest.json"
DEFAULT_SELECTED_DIRNAME = "selected"
DEFAULT_CANDIDATES_DIRNAME = "candidates"
CANDIDATE_LOOP_VERSION = 1
REFERENCE_CANVAS_SIZE = (64, 64)


class CandidateLoopValidationError(SpecValidationError):
    """Raised when a candidate job or threshold pack is malformed."""


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


def _write_text_file(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = text.rstrip() + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == serialized:
        return
    path.write_text(serialized, encoding="utf-8")


def _load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise CandidateLoopValidationError(f"{path}: expected a JSON object")
    return payload


def _require_exact_keys(
    payload: dict[str, Any], expected: set[str], context: str, path: Path
) -> None:
    missing = expected - payload.keys()
    extra = payload.keys() - expected
    if missing:
        joined = ", ".join(sorted(missing))
        raise CandidateLoopValidationError(
            f"{path}: {context} missing required key(s): {joined}"
        )
    if extra:
        joined = ", ".join(sorted(extra))
        raise CandidateLoopValidationError(
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
        raise CandidateLoopValidationError(f"{path}: {context}.{key} must be a string")
    if not allow_empty and not value:
        raise CandidateLoopValidationError(
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
        raise CandidateLoopValidationError(
            f"{path}: {context}.{key} must be null or a non-empty string"
        )
    return value


def _require_int(payload: dict[str, Any], key: str, *, path: Path, context: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise CandidateLoopValidationError(f"{path}: {context}.{key} must be an integer")
    return value


def _require_positive_int(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> int:
    value = _require_int(payload, key, path=path, context=context)
    if value <= 0:
        raise CandidateLoopValidationError(
            f"{path}: {context}.{key} must be a positive integer"
        )
    return value


def _require_non_negative_int(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> int:
    value = _require_int(payload, key, path=path, context=context)
    if value < 0:
        raise CandidateLoopValidationError(
            f"{path}: {context}.{key} must not be negative"
        )
    return value


def _require_float(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> float:
    value = payload.get(key)
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise CandidateLoopValidationError(f"{path}: {context}.{key} must be a number")
    return float(value)


def _require_mapping(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> dict[str, Any]:
    value = payload.get(key)
    if not isinstance(value, dict):
        raise CandidateLoopValidationError(f"{path}: {context}.{key} must be an object")
    return value


def _require_string_list(
    payload: dict[str, Any], key: str, *, path: Path, context: str
) -> tuple[str, ...]:
    value = payload.get(key)
    if not isinstance(value, list) or not value:
        raise CandidateLoopValidationError(
            f"{path}: {context}.{key} must be a non-empty array"
        )
    items: list[str] = []
    for index, entry in enumerate(value):
        if not isinstance(entry, str) or not entry:
            raise CandidateLoopValidationError(
                f"{path}: {context}.{key}[{index}] must be a non-empty string"
            )
        items.append(entry)
    return tuple(items)


def _normalize_path(path: str | Path, repo_root: Path) -> str:
    candidate = Path(path)
    if candidate.is_absolute():
        resolved = candidate
    else:
        resolved = (repo_root / candidate).resolve()
    try:
        return str(resolved.relative_to(repo_root.resolve())).replace("\\", "/")
    except ValueError:
        return str(resolved)


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _metric_baseline(records: Iterable[dict[str, Any]]) -> dict[str, dict[str, float]]:
    metric_names = [
        "color_count",
        "dominant_color_count",
        "non_transparent_occupancy_ratio",
        "edge_density",
        "contact_shadow_area",
        "highlight_density",
        "frame_to_frame_drift",
    ]
    collected: dict[str, list[float]] = {name: [] for name in metric_names}
    for record in records:
        metrics = record["metrics"]
        for name in metric_names:
            value = metrics.get(name)
            if value is not None:
                collected[name].append(float(value))
    return {
        name: {
            "min": min(values),
            "max": max(values),
            "mean": fmean(values),
            "median": statistics.median(values),
            "stdev": pstdev(values) if len(values) > 1 else 0.0,
        }
        for name, values in collected.items()
        if values
    }


def _canonicalize_image(image: Image.Image, size: tuple[int, int] = REFERENCE_CANVAS_SIZE) -> Image.Image:
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    contained = ImageOps.contain(image.convert("RGBA"), size, Image.Resampling.NEAREST)
    offset = (
        (size[0] - contained.size[0]) // 2,
        (size[1] - contained.size[1]) // 2,
    )
    canvas.alpha_composite(contained, offset)
    return canvas


@lru_cache(maxsize=64)
def _cached_reference_canvas(repo_root: str, source_path: str) -> Image.Image:
    repo_root_path = Path(repo_root)
    reference_path = repo_root_path / Path(source_path)
    with Image.open(reference_path) as image:
        return _canonicalize_image(image)


def _compare_images(left: Image.Image, right: Image.Image) -> float:
    diff = ImageChops.difference(left, right)
    total = 0
    for red, green, blue, alpha in diff.getdata():
        total += red + green + blue + alpha
    max_total = diff.size[0] * diff.size[1] * 255 * 4
    if max_total == 0:
        return 1.0
    similarity = 1.0 - (total / max_total)
    return max(0.0, min(1.0, similarity))


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
    counts: dict[tuple[int, int, int, int], int] = {}
    for px in pixels:
        if px[3] == 0:
            continue
        counts[px] = counts.get(px, 0) + 1
    ordered = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return ["#{:02x}{:02x}{:02x}".format(rgba[0], rgba[1], rgba[2]) for rgba, _count in ordered[:8]]


def _hue_distribution(pixels: list[tuple[int, int, int, int]]) -> dict[str, float]:
    buckets = {"0-60": 0, "60-120": 0, "120-180": 0, "180-240": 0, "240-300": 0, "300-360": 0}
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
    buckets = {"0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0}
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
    if width == 0 or height == 0:
        return 0.0
    threshold_y = int(height * 0.75)
    shadow_pixels = 0
    for index, rgba in enumerate(pixels):
        y = index // width
        if y < threshold_y or rgba[3] == 0:
            continue
        red, green, blue, _alpha = rgba
        if max(red, green, blue) < 96:
            shadow_pixels += 1
    return round(shadow_pixels / (width * height), 6)


def _highlight_density(pixels: list[tuple[int, int, int, int]]) -> float:
    if not pixels:
        return 0.0
    highlight_pixels = 0
    for red, green, blue, alpha in pixels:
        if alpha == 0:
            continue
        if max(red, green, blue) > 220:
            highlight_pixels += 1
    return round(highlight_pixels / len(pixels), 6)


def _split_evenly(start: int, end: int, parts: int) -> list[int]:
    if parts <= 0:
        raise ValueError("parts must be positive")
    span = end - start
    bounds = [start]
    for index in range(1, parts):
        bounds.append(start + round(span * index / parts))
    bounds.append(end)
    return bounds


def _frame_drift(image: Image.Image, layout_type: str) -> float | None:
    if layout_type not in {"pose_sheet_3x3", "strip_3x1"}:
        return None
    rows, columns = (3, 3) if layout_type == "pose_sheet_3x3" else (1, 3)
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        return None
    left, top, right, bottom = bbox
    column_bounds = _split_evenly(left, right, columns)
    row_bounds = _split_evenly(top, bottom, rows)
    frames: list[Image.Image] = []
    for row in range(rows):
        for column in range(columns):
            frames.append(
                image.crop(
                    (
                        column_bounds[column],
                        row_bounds[row],
                        column_bounds[column + 1],
                        row_bounds[row + 1],
                    )
                )
            )
    if len(frames) < 2:
        return None
    target_size = frames[0].size
    if target_size[0] == 0 or target_size[1] == 0:
        return None
    deltas: list[float] = []
    for previous, current in zip(frames, frames[1:]):
        previous = previous.resize(target_size, Image.Resampling.NEAREST)
        current = current.resize(target_size, Image.Resampling.NEAREST)
        diff = ImageChops.difference(previous, current).convert("RGBA")
        total = sum(sum(px[:3]) for px in diff.getdata())
        max_total = diff.size[0] * diff.size[1] * 255 * 3
        deltas.append(total / max_total if max_total else 0.0)
    return round(statistics.fmean(deltas), 6)


def _summarize_reference_metrics(
    references: Iterable["ReferenceAsset"],
) -> dict[str, dict[str, float]]:
    demo_records = [
        {"metrics": reference.metrics}
        for reference in references
        if reference.kind == "demo" and reference.metrics is not None
    ]
    return _metric_baseline(demo_records)


@lru_cache(maxsize=4)
def _cached_style_canon(repo_root: str) -> dict[str, Any]:
    repo_root_path = Path(repo_root)
    style_canon_path = repo_root_path / "canon" / "style_canon.json"
    if style_canon_path.exists():
        payload = json.loads(style_canon_path.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            return payload
    return build_style_canon(repo_root_path)


def _layout_metric_match(
    candidate_value: float,
    summary: dict[str, float],
) -> float:
    scale = max(0.05, summary["stdev"], abs(summary["mean"]) * 0.25)
    if scale == 0:
        return 1.0
    score = 1.0 - abs(candidate_value - summary["mean"]) / scale
    return max(0.0, min(1.0, score))


@dataclass(frozen=True)
class ThresholdPack:
    """Family-specific critic thresholds."""

    version: int
    family: str
    critic_config_version: int
    target_pass_band: tuple[float, float]
    reference_layout_types: tuple[str, ...]
    structural_minimum_occupancy_ratio: float
    structural_minimum_edge_density: float
    style_minimum_score: float
    novelty_minimum_score: float
    near_duplicate_similarity: float
    metric_weights: dict[str, float]

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class CandidateJob:
    """Strict schema for a candidate-generation job."""

    version: int
    family: str
    program_path: str
    program_hash: str
    variant_budget: int
    critic_config_version: int
    canon_version: int
    output_root: str
    retry_budget: int
    threshold_pack_path: str

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class ReferenceAsset:
    """A demo or approved reference used for critic calibration."""

    reference_id: str
    kind: str
    source_path: str
    layout_type: str
    family: str | None
    metrics: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class CandidateEvaluation:
    """A scored candidate variant and its critic evidence."""

    candidate_index: int
    attempt_index: int
    variant_controls: VariantControls
    program_hash: str
    primitive_ids: tuple[str, ...]
    overall_score: float = 0.0
    passed: bool = False
    selected: bool = False
    output_dir: str = ""
    output_file_paths: tuple[str, ...] = ()
    structural: dict[str, Any] = field(default_factory=dict)
    style: dict[str, Any] = field(default_factory=dict)
    novelty: dict[str, Any] = field(default_factory=dict)
    critic_summaries: dict[str, dict[str, Any]] = field(default_factory=dict)
    nearest_reference: dict[str, Any] | None = None
    rejection_reasons: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


@dataclass(frozen=True)
class CandidateSelectionResult:
    """Selection outcome for a candidate-generation job."""

    status: str
    job: CandidateJob
    retry_count: int
    candidates: tuple[CandidateEvaluation, ...]
    selected_candidate: CandidateEvaluation | None
    selection_manifest_path: str
    selected_output_dir: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return _jsonify(asdict(self))


def load_threshold_pack(path: str | Path) -> ThresholdPack:
    """Loads and validates a threshold pack from disk."""

    path = Path(path)
    payload = _load_json(path)
    _require_exact_keys(
        payload,
        {
            "version",
            "family",
            "critic_config_version",
            "target_pass_band",
            "reference_layout_types",
            "structural",
            "style",
            "novelty",
        },
        "threshold pack",
        path,
    )
    version = _require_positive_int(payload, "version", path=path, context="threshold pack")
    if version != CANDIDATE_LOOP_VERSION:
        raise CandidateLoopValidationError(
            f"{path}: threshold pack version must be {CANDIDATE_LOOP_VERSION}"
        )
    family = _require_string(payload, "family", path=path, context="threshold pack")
    critic_config_version = _require_positive_int(
        payload, "critic_config_version", path=path, context="threshold pack"
    )
    target_pass_band = payload.get("target_pass_band")
    if not isinstance(target_pass_band, list) or len(target_pass_band) != 2:
        raise CandidateLoopValidationError(
            f"{path}: threshold pack.target_pass_band must be a two-item array"
        )
    lower, upper = target_pass_band
    if not all(isinstance(value, (int, float)) and not isinstance(value, bool) for value in target_pass_band):
        raise CandidateLoopValidationError(
            f"{path}: threshold pack.target_pass_band must contain numbers"
        )
    lower = float(lower)
    upper = float(upper)
    if lower < 0 or upper > 1 or lower > upper:
        raise CandidateLoopValidationError(
            f"{path}: threshold pack.target_pass_band must stay within 0 and 1"
        )
    reference_layout_types = _require_string_list(
        payload, "reference_layout_types", path=path, context="threshold pack"
    )
    structural = _require_mapping(payload, "structural", path=path, context="threshold pack")
    _require_exact_keys(
        structural,
        {"minimum_occupancy_ratio", "minimum_edge_density"},
        "threshold pack.structural",
        path,
    )
    structural_minimum_occupancy_ratio = _require_float(
        structural, "minimum_occupancy_ratio", path=path, context="threshold pack.structural"
    )
    structural_minimum_edge_density = _require_float(
        structural, "minimum_edge_density", path=path, context="threshold pack.structural"
    )
    if structural_minimum_occupancy_ratio < 0 or structural_minimum_edge_density < 0:
        raise CandidateLoopValidationError(
            f"{path}: structural thresholds must not be negative"
        )

    style = _require_mapping(payload, "style", path=path, context="threshold pack")
    _require_exact_keys(
        style,
        {"minimum_score", "metric_weights"},
        "threshold pack.style",
        path,
    )
    style_minimum_score = _require_float(style, "minimum_score", path=path, context="threshold pack.style")
    if not 0 <= style_minimum_score <= 1:
        raise CandidateLoopValidationError(
            f"{path}: threshold pack.style.minimum_score must be between 0 and 1"
        )
    metric_weights = style.get("metric_weights")
    if not isinstance(metric_weights, dict) or not metric_weights:
        raise CandidateLoopValidationError(
            f"{path}: threshold pack.style.metric_weights must be a non-empty object"
        )
    parsed_weights: dict[str, float] = {}
    for key, value in metric_weights.items():
        if not isinstance(key, str) or not key:
            raise CandidateLoopValidationError(
                f"{path}: threshold pack.style.metric_weights keys must be non-empty strings"
            )
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise CandidateLoopValidationError(
                f"{path}: threshold pack.style.metric_weights['{key}'] must be a number"
            )
        parsed_weights[key] = float(value)
    if sum(parsed_weights.values()) <= 0:
        raise CandidateLoopValidationError(
            f"{path}: threshold pack.style.metric_weights must sum to a positive value"
        )

    novelty = _require_mapping(payload, "novelty", path=path, context="threshold pack")
    _require_exact_keys(
        novelty,
        {"minimum_score", "near_duplicate_similarity"},
        "threshold pack.novelty",
        path,
    )
    novelty_minimum_score = _require_float(
        novelty, "minimum_score", path=path, context="threshold pack.novelty"
    )
    near_duplicate_similarity = _require_float(
        novelty, "near_duplicate_similarity", path=path, context="threshold pack.novelty"
    )
    if not 0 <= novelty_minimum_score <= 1:
        raise CandidateLoopValidationError(
            f"{path}: threshold pack.novelty.minimum_score must be between 0 and 1"
        )
    if not 0 <= near_duplicate_similarity <= 1:
        raise CandidateLoopValidationError(
            f"{path}: threshold pack.novelty.near_duplicate_similarity must be between 0 and 1"
        )

    return ThresholdPack(
        version=version,
        family=family,
        critic_config_version=critic_config_version,
        target_pass_band=(lower, upper),
        reference_layout_types=reference_layout_types,
        structural_minimum_occupancy_ratio=structural_minimum_occupancy_ratio,
        structural_minimum_edge_density=structural_minimum_edge_density,
        style_minimum_score=style_minimum_score,
        novelty_minimum_score=novelty_minimum_score,
        near_duplicate_similarity=near_duplicate_similarity,
        metric_weights=parsed_weights,
    )


def build_candidate_job(
    *,
    program_path: str | Path,
    output_root: str | Path,
    variant_budget: int,
    retry_budget: int,
    threshold_pack_path: str | Path | None = None,
    repo_root: str | Path = Path.cwd(),
    critic_config_version: int = CANDIDATE_LOOP_VERSION,
    canon_version: int = CANON_VERSION,
) -> CandidateJob:
    """Builds a candidate job from a compiler program path."""

    repo_root_path = Path(repo_root)
    program_path = Path(program_path)
    program = load_compiler_program(program_path)
    pack_path = (
        Path(threshold_pack_path)
        if threshold_pack_path is not None
        else repo_root_path / DEFAULT_THRESHOLD_PACK_DIRNAME / f"{program.family}.json"
    )
    return CandidateJob(
        version=CANDIDATE_LOOP_VERSION,
        family=program.family,
        program_path=_normalize_path(program_path, repo_root_path),
        program_hash=_sha256_file(program_path),
        variant_budget=_require_positive_int(
            {"variant_budget": variant_budget},
            "variant_budget",
            path=Path("<memory>"),
            context="candidate job",
        ),
        critic_config_version=_require_positive_int(
            {"critic_config_version": critic_config_version},
            "critic_config_version",
            path=Path("<memory>"),
            context="candidate job",
        ),
        canon_version=_require_positive_int(
            {"canon_version": canon_version},
            "canon_version",
            path=Path("<memory>"),
            context="candidate job",
        ),
        output_root=_normalize_path(output_root, repo_root_path),
        retry_budget=_require_non_negative_int(
            {"retry_budget": retry_budget},
            "retry_budget",
            path=Path("<memory>"),
            context="candidate job",
        ),
        threshold_pack_path=_normalize_path(pack_path, repo_root_path),
    )


def load_candidate_job(path: str | Path) -> CandidateJob:
    """Loads and validates a candidate job from disk."""

    path = Path(path)
    payload = _load_json(path)
    _require_exact_keys(
        payload,
        {
            "version",
            "family",
            "program_path",
            "program_hash",
            "variant_budget",
            "critic_config_version",
            "canon_version",
            "output_root",
            "retry_budget",
            "threshold_pack_path",
        },
        "candidate job",
        path,
    )
    version = _require_positive_int(payload, "version", path=path, context="candidate job")
    if version != CANDIDATE_LOOP_VERSION:
        raise CandidateLoopValidationError(
            f"{path}: candidate job version must be {CANDIDATE_LOOP_VERSION}"
        )
    family = _require_string(payload, "family", path=path, context="candidate job")
    program_path = _require_string(payload, "program_path", path=path, context="candidate job")
    program_hash = _require_string(payload, "program_hash", path=path, context="candidate job")
    if len(program_hash) != 64 or any(ch not in "0123456789abcdef" for ch in program_hash.lower()):
        raise CandidateLoopValidationError(
            f"{path}: candidate job.program_hash must be a 64-character hex string"
        )
    variant_budget = _require_positive_int(
        payload, "variant_budget", path=path, context="candidate job"
    )
    critic_config_version = _require_positive_int(
        payload, "critic_config_version", path=path, context="candidate job"
    )
    canon_version = _require_positive_int(
        payload, "canon_version", path=path, context="candidate job"
    )
    output_root = _require_string(payload, "output_root", path=path, context="candidate job")
    retry_budget = _require_non_negative_int(
        payload, "retry_budget", path=path, context="candidate job"
    )
    threshold_pack_path = _require_string(
        payload, "threshold_pack_path", path=path, context="candidate job"
    )
    return CandidateJob(
        version=version,
        family=family,
        program_path=program_path,
        program_hash=program_hash,
        variant_budget=variant_budget,
        critic_config_version=critic_config_version,
        canon_version=canon_version,
        output_root=output_root,
        retry_budget=retry_budget,
        threshold_pack_path=threshold_pack_path,
    )


def load_reference_assets(
    repo_root: str | Path,
    *,
    layout_types: Iterable[str],
    include_approved_outputs: bool = True,
) -> tuple[ReferenceAsset, ...]:
    """Loads demo references, and optionally approved output references."""

    repo_root = Path(repo_root)
    layout_type_set = {layout_type for layout_type in layout_types}
    canon = _cached_style_canon(str(repo_root.resolve()))
    refs: list[ReferenceAsset] = []
    for asset in canon["assets"]:
        if asset["layout_type"] not in layout_type_set:
            continue
        refs.append(
            ReferenceAsset(
                reference_id=asset["asset_id"],
                kind="demo",
                source_path=asset["source_path"],
                layout_type=asset["layout_type"],
                family=asset["family"],
                metrics=asset["metrics"],
            )
        )
    if include_approved_outputs:
        for sheet_path in sorted((repo_root / "outputs").glob("**/sheet.png")):
            refs.append(
                ReferenceAsset(
                    reference_id=_normalize_path(sheet_path, repo_root),
                    kind="approved",
                    source_path=_normalize_path(sheet_path, repo_root),
                    layout_type="approved_output",
                    family=None,
                    metrics=None,
                )
            )
    return tuple(refs)


def evaluate_against_references(
    image: Image.Image,
    references: Iterable[ReferenceAsset],
    *,
    near_duplicate_similarity: float,
    exclude_source_paths: Iterable[str] = (),
    repo_root: str | Path = Path.cwd(),
) -> dict[str, Any]:
    """Evaluates novelty against a reference set."""

    repo_root = Path(repo_root)
    exclusion = {_normalize_path(path, repo_root) for path in exclude_source_paths}
    references = tuple(references)
    candidate_canvas = _canonicalize_image(image)
    best_similarity = -1.0
    best_reference: ReferenceAsset | None = None
    for reference in references:
        if reference.source_path in exclusion:
            continue
        candidate_reference = _cached_reference_canvas(str(repo_root.resolve()), reference.source_path)
        similarity = _compare_images(candidate_canvas, candidate_reference)
        if similarity > best_similarity:
            best_similarity = similarity
            best_reference = reference
    if best_reference is None:
        return {
            "best_similarity": 0.0,
            "novelty_score": 1.0,
            "near_duplicate": False,
            "reference_count": 0,
            "nearest_reference": None,
        }
    novelty_score = max(0.0, 1.0 - best_similarity)
    return {
        "best_similarity": round(best_similarity, 6),
        "novelty_score": round(novelty_score, 6),
        "near_duplicate": best_similarity >= near_duplicate_similarity,
        "reference_count": len(references),
        "nearest_reference": best_reference.to_dict(),
    }


def _evaluate_structural_critic(
    image: Image.Image,
    *,
    program: CompilerProgramBase,
    style_pack_name: str,
    repo_root: Path,
    threshold_pack: ThresholdPack,
) -> dict[str, Any]:
    structural_details: dict[str, Any] = {
        "mode": image.mode,
        "size": [image.size[0], image.size[1]],
        "expected_size": [program.layout.dimensions[0], program.layout.dimensions[1]],
    }
    if image.mode != "RGBA":
        structural_details["reason"] = "sheet must be RGBA"
        return {"passed": False, "score": 0.0, "details": structural_details}
    if image.size != program.layout.dimensions:
        structural_details["reason"] = "sheet size mismatch"
        return {"passed": False, "score": 0.0, "details": structural_details}

    render_spec = getattr(program, "render_spec", None)
    if program.family == "character_sheet" and render_spec is not None:
        style_pack = load_style_pack(style_pack_name, render_spec.palette, repo_root / "style_packs")
        try:
            validate_sheet(image, render_spec, style_pack)
        except SpecValidationError as exc:
            structural_details["reason"] = str(exc)
            return {"passed": False, "score": 0.0, "details": structural_details}

    candidate_metrics = _candidate_metrics(image, program.layout.mode)
    occupancy = candidate_metrics["non_transparent_occupancy_ratio"]
    edge_density = candidate_metrics["edge_density"]
    if occupancy < threshold_pack.structural_minimum_occupancy_ratio:
        structural_details["reason"] = "occupancy below threshold"
        structural_details["occupancy"] = occupancy
        return {"passed": False, "score": 0.0, "details": structural_details}
    if edge_density < threshold_pack.structural_minimum_edge_density:
        structural_details["reason"] = "edge density below threshold"
        structural_details["edge_density"] = edge_density
        return {"passed": False, "score": 0.0, "details": structural_details}

    structural_details["occupancy"] = occupancy
    structural_details["edge_density"] = edge_density
    structural_details["score"] = 1.0
    return {"passed": True, "score": 1.0, "details": structural_details}


def _candidate_metrics(image: Image.Image, layout_type: str) -> dict[str, Any]:
    rgba = image.convert("RGBA")
    pixels = list(rgba.getdata())
    quantized_pixels = [_bucket_rgba(px) for px in pixels]
    total_pixels = len(pixels)
    opaque_pixels = [px for px in pixels if px[3] > 0]
    non_transparent_count = len(opaque_pixels)

    exact_color_count = len({px for px in quantized_pixels if px[3] > 0})
    dominant_colors = _dominant_colors(quantized_pixels)
    hue_distribution = _hue_distribution(quantized_pixels)
    value_distribution = _value_distribution(quantized_pixels)
    occupancy_ratio = round(non_transparent_count / total_pixels, 6) if total_pixels else 0.0
    edge_density = _edge_density(rgba)
    contact_shadow_area = _contact_shadow_area(pixels, rgba.size)
    highlight_density = _highlight_density(pixels)
    frame_to_frame_drift = _frame_drift(rgba, layout_type)

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


def _evaluate_style_critic(
    metrics: dict[str, Any],
    baseline: dict[str, dict[str, float]],
    threshold_pack: ThresholdPack,
) -> dict[str, Any]:
    score_parts: list[float] = []
    weights_used: list[float] = []
    metric_evidence: dict[str, Any] = {}
    for metric_name, weight in sorted(threshold_pack.metric_weights.items()):
        candidate_value = metrics.get(metric_name)
        summary = baseline.get(metric_name)
        if candidate_value is None or summary is None:
            continue
        closeness = _layout_metric_match(float(candidate_value), summary)
        score_parts.append(closeness * weight)
        weights_used.append(weight)
        metric_evidence[metric_name] = {
            "candidate": candidate_value,
            "baseline_mean": round(summary["mean"], 6),
            "baseline_stdev": round(summary["stdev"], 6),
            "closeness": round(closeness, 6),
        }
    if not weights_used:
        return {
            "passed": False,
            "score": 0.0,
            "details": {"reason": "no shared metrics"},
        }
    score = sum(score_parts) / sum(weights_used)
    return {
        "passed": score >= threshold_pack.style_minimum_score,
        "score": round(score, 6),
        "details": {
            "baseline_metrics": baseline,
            "metric_evidence": metric_evidence,
        },
    }


def _evaluate_candidate(
    *,
    candidate_image: Image.Image,
    candidate_index: int,
    attempt_index: int,
    candidate_dir: Path,
    program: CompilerProgramBase,
    program_hash: str,
    threshold_pack: ThresholdPack,
    style_baseline: dict[str, dict[str, float]],
    references: tuple[ReferenceAsset, ...],
    exclude_source_paths: Iterable[str],
    repo_root: Path,
) -> CandidateEvaluation:
    structural = _evaluate_structural_critic(
        candidate_image,
        program=program,
        style_pack_name=program.style_pack,
        repo_root=repo_root,
        threshold_pack=threshold_pack,
    )
    layout_type = program.layout.mode
    metrics = _candidate_metrics(candidate_image, layout_type)
    style = _evaluate_style_critic(metrics, style_baseline, threshold_pack)
    novelty = evaluate_against_references(
        candidate_image,
        references,
        near_duplicate_similarity=threshold_pack.near_duplicate_similarity,
        exclude_source_paths=exclude_source_paths,
        repo_root=repo_root,
    )
    novelty_passed = (
        novelty["novelty_score"] >= threshold_pack.novelty_minimum_score
        and not novelty["near_duplicate"]
    )
    overall_score = 0.0
    if structural["passed"]:
        overall_score = round((style["score"] * 0.6) + (novelty["novelty_score"] * 0.4), 6)
    passed = structural["passed"] and style["passed"] and novelty_passed
    rejection_reasons: list[str] = []
    if not structural["passed"]:
        rejection_reasons.append(str(structural["details"].get("reason", "structural failure")))
    if not style["passed"]:
        rejection_reasons.append("style score below threshold")
    if not novelty_passed:
        if novelty["near_duplicate"]:
            rejection_reasons.append("near-duplicate reference detected")
        else:
            rejection_reasons.append("novelty score below threshold")

    nearest_reference = novelty.get("nearest_reference")
    critic_summaries = {
        "structural": structural,
        "style": style,
        "novelty": novelty,
    }
    output_files = tuple(
        _normalize_path(path, repo_root)
        for path in sorted(candidate_dir.glob("*"))
        if path.is_file()
    )
    return CandidateEvaluation(
        candidate_index=candidate_index,
        attempt_index=attempt_index,
        variant_controls=program.variant_controls,
        program_hash=program_hash,
        primitive_ids=program.primitive_ids,
        overall_score=overall_score,
        passed=passed,
        selected=False,
        output_dir=_normalize_path(candidate_dir, repo_root),
        output_file_paths=output_files,
        structural=structural,
        style=style,
        novelty=novelty,
        critic_summaries=critic_summaries,
        nearest_reference=nearest_reference,
        rejection_reasons=tuple(rejection_reasons),
    )


def select_best_candidate(
    candidates: Iterable[CandidateEvaluation],
) -> CandidateEvaluation | None:
    """Selects the best passing candidate, if any."""

    survivors = [candidate for candidate in candidates if candidate.passed]
    if not survivors:
        return None
    winner = sorted(
        survivors,
        key=lambda candidate: (
            -candidate.overall_score,
            -candidate.style.get("score", 0.0),
            -candidate.novelty.get("novelty_score", 0.0),
            candidate.candidate_index,
        ),
    )[0]
    return replace(winner, selected=True)


def _candidate_variant_id(program: CompilerProgramBase, candidate_index: int) -> str:
    base = program.variant_controls.variant_id or program.program_id
    return f"{base}__candidate_{candidate_index:03d}"


def _candidate_output_dir(
    output_root: Path,
    attempt_index: int,
    candidate_index: int,
) -> Path:
    return (
        output_root
        / DEFAULT_CANDIDATES_DIRNAME
        / f"attempt_{attempt_index:03d}"
        / f"candidate_{candidate_index:03d}"
    )


def _candidate_manifest_path(candidate_dir: Path) -> Path:
    return candidate_dir / DEFAULT_CANDIDATE_MANIFEST


def _selection_manifest_path(output_root: Path) -> Path:
    return output_root / DEFAULT_SELECTION_MANIFEST


def _selected_output_dir(output_root: Path) -> Path:
    return output_root / DEFAULT_SELECTED_DIRNAME


def run_candidate_job(
    job: CandidateJob | str | Path,
    *,
    repo_root: str | Path = Path.cwd(),
) -> CandidateSelectionResult:
    """Runs a bounded candidate-generation job and persists manifests."""

    repo_root = Path(repo_root)
    if not isinstance(job, CandidateJob):
        job = load_candidate_job(job)
    threshold_pack = load_threshold_pack(repo_root / job.threshold_pack_path)
    if job.family != threshold_pack.family:
        raise CandidateLoopValidationError(
            f"{job.threshold_pack_path}: threshold pack family does not match job family"
        )
    if job.critic_config_version != threshold_pack.critic_config_version:
        raise CandidateLoopValidationError(
            f"{job.threshold_pack_path}: threshold pack critic_config_version does not match job"
        )
    if job.canon_version != CANON_VERSION:
        raise CandidateLoopValidationError(
            f"candidate jobs must target canon version {CANON_VERSION}"
        )
    program_path = repo_root / Path(job.program_path)
    if not program_path.exists():
        raise CandidateLoopValidationError(
            f"{program_path}: candidate job program path does not exist"
        )
    if _sha256_file(program_path) != job.program_hash:
        raise CandidateLoopValidationError(
            f"{program_path}: candidate job program hash does not match file contents"
        )

    program = load_compiler_program(program_path)
    if program.family != job.family:
        raise CandidateLoopValidationError(
            f"{program_path}: candidate job family does not match the program family"
        )

    output_root = repo_root / Path(job.output_root) if not Path(job.output_root).is_absolute() else Path(job.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    style_pack_root = repo_root / "style_packs"
    references = load_reference_assets(
        repo_root,
        layout_types=threshold_pack.reference_layout_types,
        include_approved_outputs=True,
    )
    demo_references = tuple(reference for reference in references if reference.kind == "demo")
    style_baseline = _summarize_reference_metrics(demo_references)

    all_candidates: list[CandidateEvaluation] = []
    selected_candidate: CandidateEvaluation | None = None
    used_retry_count = 0

    for attempt_index in range(job.retry_budget + 1):
        used_retry_count = attempt_index
        attempt_candidates: list[CandidateEvaluation] = []
        for offset in range(job.variant_budget):
            candidate_index = attempt_index * job.variant_budget + offset
            variant_id = _candidate_variant_id(program, candidate_index)
            candidate_program = replace(
                program,
                variant_controls=replace(
                    program.variant_controls,
                    variant_id=variant_id,
                    candidate_index=candidate_index,
                    search_budget=job.variant_budget,
                ),
            )
            candidate_dir = _candidate_output_dir(output_root, attempt_index, candidate_index)
            manifest = compile_program(
                candidate_program,
                candidate_dir,
                repo_root=repo_root,
                program_path=program_path,
            )
            sheet_path = candidate_dir / "sheet.png"
            with Image.open(sheet_path) as image:
                image = image.convert("RGBA")
                evaluation = _evaluate_candidate(
                    candidate_image=image,
                    candidate_index=candidate_index,
                    attempt_index=attempt_index,
                    candidate_dir=candidate_dir,
                    program=candidate_program,
                    program_hash=job.program_hash,
                    threshold_pack=threshold_pack,
                    style_baseline=style_baseline,
                    references=references,
                    exclude_source_paths=(),
                    repo_root=repo_root,
                )
            evaluation = replace(
                evaluation,
                output_dir=_normalize_path(candidate_dir, repo_root),
                output_file_paths=tuple(
                    _normalize_path(path, repo_root) for path in manifest.output_file_paths
                ),
            )
            candidate_manifest = {
                "version": CANDIDATE_LOOP_VERSION,
                "job": job.to_dict(),
                "candidate": evaluation.to_dict(),
                "compiler_manifest_path": _normalize_path(candidate_dir / "manifest.json", repo_root),
            }
            _write_json_file(_candidate_manifest_path(candidate_dir), candidate_manifest)
            attempt_candidates.append(evaluation)
            all_candidates.append(evaluation)
        selected_candidate = select_best_candidate(attempt_candidates)
        if selected_candidate is not None:
            break

    status = "selected" if selected_candidate is not None else ("regenerate" if job.retry_budget > 0 else "failed")
    selected_output_dir: str | None = None
    if selected_candidate is not None:
        all_candidates = [
            replace(
                candidate,
                selected=(
                    candidate.candidate_index == selected_candidate.candidate_index
                    and candidate.attempt_index == selected_candidate.attempt_index
                ),
            )
            for candidate in all_candidates
        ]
        selected_candidate = next(
            candidate
            for candidate in all_candidates
            if candidate.selected and candidate.candidate_index == selected_candidate.candidate_index
            and candidate.attempt_index == selected_candidate.attempt_index
        )
        selected_dir = _selected_output_dir(output_root)
        source_dir = repo_root / Path(selected_candidate.output_dir)
        if selected_dir.exists():
            rmtree(selected_dir)
        selected_dir.mkdir(parents=True, exist_ok=True)
        copytree(source_dir, selected_dir, dirs_exist_ok=True)
        selected_manifest_payload = {
            "version": CANDIDATE_LOOP_VERSION,
            "job": job.to_dict(),
            "candidate": selected_candidate.to_dict(),
            "compiler_manifest_path": _normalize_path(source_dir / "manifest.json", repo_root),
        }
        _write_json_file(_candidate_manifest_path(source_dir), selected_manifest_payload)
        _write_json_file(_candidate_manifest_path(selected_dir), selected_manifest_payload)
        selected_output_dir = _normalize_path(selected_dir, repo_root)

    selection_result = CandidateSelectionResult(
        status=status,
        job=job,
        retry_count=used_retry_count,
        candidates=tuple(all_candidates),
        selected_candidate=selected_candidate,
        selection_manifest_path=_normalize_path(_selection_manifest_path(output_root), repo_root),
        selected_output_dir=selected_output_dir,
    )
    _write_json_file(_selection_manifest_path(output_root), selection_result.to_dict())
    return selection_result


def _calibration_entry(
    *,
    reference: ReferenceAsset,
    score: dict[str, Any],
) -> dict[str, Any]:
    return {
        "reference_id": reference.reference_id,
        "kind": reference.kind,
        "source_path": reference.source_path,
        "layout_type": reference.layout_type,
        "family": reference.family,
        "passed": score["passed"],
        "overall_score": score["overall_score"],
        "structural": score["structural"],
        "style": score["style"],
        "novelty": score["novelty"],
        "rejection_reasons": list(score["rejection_reasons"]),
        "nearest_reference": score["nearest_reference"],
    }


def calibrate_threshold_packs(
    repo_root: str | Path,
    *,
    output_path: str | Path | None = None,
) -> dict[str, Any]:
    """Replays the demo corpus against tracked threshold packs."""

    repo_root = Path(repo_root)
    threshold_dir = repo_root / DEFAULT_THRESHOLD_PACK_DIRNAME
    packs = sorted(threshold_dir.glob("*.json"))
    if not packs:
        raise CandidateLoopValidationError(
            f"{threshold_dir}: no threshold packs were found"
        )
    report: dict[str, Any] = {
        "version": CANDIDATE_LOOP_VERSION,
        "repo_root": str(repo_root),
        "packs": [],
    }
    report_lines = ["# Calibration Report", ""]
    canon = _cached_style_canon(str(repo_root.resolve()))
    for pack_path in packs:
        if pack_path.name == DEFAULT_CALIBRATION_REPORT:
            continue
        threshold_pack = load_threshold_pack(pack_path)
        references = load_reference_assets(
            repo_root,
            layout_types=threshold_pack.reference_layout_types,
            include_approved_outputs=False,
        )
        demo_references = [reference for reference in references if reference.kind == "demo"]
        style_baseline = _summarize_reference_metrics(demo_references)
        canon_records = {
            record["source_path"]: record
            for record in canon.get("assets", [])
            if record.get("layout_type") in threshold_pack.reference_layout_types
        }
        pack_summary: dict[str, Any] = {
            "family": threshold_pack.family,
            "threshold_pack_path": _normalize_path(pack_path, repo_root),
            "target_pass_band": list(threshold_pack.target_pass_band),
            "reference_layout_types": list(threshold_pack.reference_layout_types),
            "assets": [],
        }
        passed = 0
        for reference in demo_references:
            image_path = repo_root / Path(reference.source_path)
            with Image.open(image_path) as image:
                image = image.convert("RGBA")
                reference_record = canon_records.get(reference.source_path)
                candidate_metrics = (
                    reference_record["metrics"] if reference_record is not None else _candidate_metrics(image, reference.layout_type)
                )
                structural = {
                    "passed": True,
                    "score": 1.0,
                    "details": {
                        "mode": image.mode,
                        "size": [image.size[0], image.size[1]],
                        "expected_size": [image.size[0], image.size[1]],
                        "occupancy": candidate_metrics["non_transparent_occupancy_ratio"],
                        "edge_density": candidate_metrics["edge_density"],
                    },
                }
                style = _evaluate_style_critic(candidate_metrics, style_baseline, threshold_pack)
                novelty = evaluate_against_references(
                    image,
                    tuple(demo_references),
                    near_duplicate_similarity=threshold_pack.near_duplicate_similarity,
                    exclude_source_paths={reference.source_path},
                    repo_root=repo_root,
                )
                novelty_passed = (
                    novelty["novelty_score"] >= threshold_pack.novelty_minimum_score
                    and not novelty["near_duplicate"]
                )
                overall_score = round((style["score"] * 0.6) + (novelty["novelty_score"] * 0.4), 6)
                passed_flag = structural["passed"] and style["passed"] and novelty_passed
                rejection_reasons: list[str] = []
                if not style["passed"]:
                    rejection_reasons.append("style score below threshold")
                if not novelty_passed:
                    rejection_reasons.append(
                        "near-duplicate reference detected" if novelty["near_duplicate"] else "novelty score below threshold"
                    )
                evaluation = CandidateEvaluation(
                    candidate_index=0,
                    attempt_index=0,
                    variant_controls=VariantControls(
                        variant_id=f"{reference.reference_id}__calibration",
                        candidate_index=0,
                        search_budget=1,
                    ),
                    program_hash=_sha256_file(image_path),
                    primitive_ids=(reference.reference_id,),
                    overall_score=overall_score,
                    passed=passed_flag,
                    selected=False,
                    output_dir=_normalize_path(image_path.parent, repo_root),
                    output_file_paths=(_normalize_path(image_path, repo_root),),
                    structural=structural,
                    style=style,
                    novelty=novelty,
                    critic_summaries={
                        "structural": structural,
                        "style": style,
                        "novelty": novelty,
                    },
                    nearest_reference=novelty.get("nearest_reference"),
                    rejection_reasons=tuple(rejection_reasons),
                )
            entry = _calibration_entry(reference=reference, score=evaluation.to_dict())
            pack_summary["assets"].append(entry)
            if entry["passed"]:
                passed += 1
        total = len(pack_summary["assets"])
        pass_rate = round(passed / total, 6) if total else 0.0
        pack_summary["passed"] = passed
        pack_summary["failed"] = total - passed
        pack_summary["pass_rate"] = pass_rate
        report["packs"].append(pack_summary)
        report_lines.extend(
            [
                f"## {threshold_pack.family}",
                "",
                f"- threshold pack: `{pack_summary['threshold_pack_path']}`",
                f"- target pass band: {threshold_pack.target_pass_band[0]:.2f} to {threshold_pack.target_pass_band[1]:.2f}",
                f"- evaluated assets: {total}",
                f"- passed: {passed}",
                f"- failed: {total - passed}",
                f"- pass_rate: {pass_rate:.6f}",
                "",
            ]
        )
        for asset_entry in pack_summary["assets"]:
            report_lines.append(
                f"- `{asset_entry['reference_id']}`: {'pass' if asset_entry['passed'] else 'fail'} "
                f"(style {asset_entry['style']['score']:.3f}, novelty {asset_entry['novelty']['novelty_score']:.3f})"
            )
        report_lines.append("")
    report_text = "\n".join(report_lines).rstrip() + "\n"
    report_path = (
        Path(output_path)
        if output_path is not None
        else repo_root / DEFAULT_THRESHOLD_PACK_DIRNAME / DEFAULT_CALIBRATION_REPORT
    )
    _write_text_file(report_path, report_text)
    report["report_path"] = str(report_path)
    return report
