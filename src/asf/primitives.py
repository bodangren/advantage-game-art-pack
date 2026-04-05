"""Primitive library validation, manifest rebuilding, and queries."""

from __future__ import annotations

from dataclasses import dataclass
import json
import re
import shutil
from pathlib import Path
from typing import Any, Iterable

from PIL import Image

from asf.canon import FAMILY_NAMES
from asf.specs import SpecValidationError


PRIMITIVE_LIBRARY_VERSION = 1
PRIMITIVE_LIBRARY_DIRNAME = "library"
PRIMITIVES_DIRNAME = "primitives"
PRIMITIVE_CANDIDATES_DIRNAME = "candidates"
PRIMITIVE_MANIFEST_FILENAME = "primitive_manifest.json"
PRIMITIVE_METADATA_FILENAME = "primitive.json"
PRIMITIVE_IMAGE_FILENAME = "source.png"
PRIMITIVE_SLUG_RE = re.compile(r"^[a-z0-9]+(?:[._-][a-z0-9]+)*$")

ALLOWED_APPROVAL_STATES = ("draft", "approved", "rejected")
ALLOWED_SOURCE_KINDS = (
    "demo_asset",
    "cropped_demo_asset",
    "reviewed_generated_output",
    "manual_source",
)

REQUIRED_PRIMITIVE_KEYS = {
    "primitive_id",
    "family",
    "subtype",
    "source_asset",
    "source_path",
    "source_region",
    "anchors",
    "compatible_palettes",
    "compatible_themes",
    "tags",
    "motifs",
    "approval_state",
    "promoted_at",
    "provenance",
}
OPTIONAL_PRIMITIVE_KEYS = {"companion_files"}

REQUIRED_REGION_KEYS = {"x", "y", "width", "height"}
REQUIRED_POINT_KEYS = {"x", "y"}
REQUIRED_PROVENANCE_KEYS = {
    "source_kind",
    "source_asset",
    "source_path",
    "source_region",
    "approved_by",
    "variant_id",
    "critic_summary",
    "lineage",
}


class PrimitiveValidationError(SpecValidationError):
    """Raised when a primitive metadata file or manifest is malformed."""


@dataclass(frozen=True)
class PrimitiveRegion:
    """A rectangular crop or source-region reference."""

    x: int
    y: int
    width: int
    height: int

    def to_dict(self) -> dict[str, int]:
        return {
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }


@dataclass(frozen=True)
class PrimitivePoint:
    """A named anchor or attachment point."""

    x: int
    y: int

    def to_dict(self) -> dict[str, int]:
        return {"x": self.x, "y": self.y}


@dataclass(frozen=True)
class PrimitiveProvenance:
    """Immutable provenance for a primitive."""

    source_kind: str
    source_asset: str
    source_path: str
    source_region: PrimitiveRegion
    approved_by: str | None
    variant_id: str | None
    critic_summary: dict[str, Any] | None
    lineage: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "source_kind": self.source_kind,
            "source_asset": self.source_asset,
            "source_path": self.source_path,
            "source_region": self.source_region.to_dict(),
            "approved_by": self.approved_by,
            "variant_id": self.variant_id,
            "critic_summary": self.critic_summary,
            "lineage": list(self.lineage),
        }


@dataclass(frozen=True)
class PrimitiveMetadata:
    """Validated primitive metadata loaded from disk."""

    primitive_id: str
    family: str
    subtype: str
    source_asset: str
    source_path: str
    source_region: PrimitiveRegion
    anchors: dict[str, PrimitivePoint]
    compatible_palettes: tuple[str, ...]
    compatible_themes: tuple[str, ...]
    tags: tuple[str, ...]
    motifs: tuple[str, ...]
    approval_state: str
    promoted_at: str | None
    provenance: PrimitiveProvenance
    companion_files: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "primitive_id": self.primitive_id,
            "family": self.family,
            "subtype": self.subtype,
            "source_asset": self.source_asset,
            "source_path": self.source_path,
            "source_region": self.source_region.to_dict(),
            "anchors": {
                name: point.to_dict() for name, point in sorted(self.anchors.items())
            },
            "compatible_palettes": list(self.compatible_palettes),
            "compatible_themes": list(self.compatible_themes),
            "tags": list(self.tags),
            "motifs": list(self.motifs),
            "approval_state": self.approval_state,
            "promoted_at": self.promoted_at,
            "provenance": self.provenance.to_dict(),
            "companion_files": list(self.companion_files),
        }


@dataclass(frozen=True)
class PrimitiveManifestRow:
    """A primitive entry augmented with on-disk layout paths."""

    primitive_dir: str
    metadata_path: str
    metadata: PrimitiveMetadata

    def to_dict(self) -> dict[str, Any]:
        data = self.metadata.to_dict()
        data.update(
            {
                "primitive_dir": self.primitive_dir,
                "metadata_path": self.metadata_path,
            }
        )
        return data


def _load_json_object(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise PrimitiveValidationError(f"{path}: expected a JSON object")
    return payload


def _write_json_file(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    if path.exists() and path.read_text(encoding="utf-8") == serialized:
        return
    path.write_text(serialized, encoding="utf-8")


def _copy_file_if_changed(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.read_bytes() == source.read_bytes():
        return
    shutil.copyfile(source, destination)


def _require_exact_keys(
    payload: dict[str, Any],
    expected: set[str],
    context: str,
    path: Path,
) -> None:
    missing = expected - payload.keys()
    extra = payload.keys() - expected
    if missing:
        joined = ", ".join(sorted(missing))
        raise PrimitiveValidationError(
            f"{path}: {context} missing required key(s): {joined}"
        )
    if extra:
        joined = ", ".join(sorted(extra))
        raise PrimitiveValidationError(
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
        raise PrimitiveValidationError(f"{path}: {context}.{key} must be a string")
    if not allow_empty and not value:
        raise PrimitiveValidationError(
            f"{path}: {context}.{key} must be a non-empty string"
        )
    return value


def _require_int(payload: dict[str, Any], key: str, *, path: Path, context: str) -> int:
    value = payload.get(key)
    if not isinstance(value, int) or isinstance(value, bool):
        raise PrimitiveValidationError(f"{path}: {context}.{key} must be an integer")
    return value


def _require_string_list(
    payload: dict[str, Any],
    key: str,
    *,
    path: Path,
    context: str,
    allow_empty: bool = False,
) -> tuple[str, ...]:
    value = payload.get(key)
    if not isinstance(value, list):
        raise PrimitiveValidationError(f"{path}: {context}.{key} must be an array")
    if not value and not allow_empty:
        raise PrimitiveValidationError(
            f"{path}: {context}.{key} must be a non-empty array"
        )
    items: list[str] = []
    for index, entry in enumerate(value):
        if not isinstance(entry, str) or not entry:
            raise PrimitiveValidationError(
                f"{path}: {context}.{key}[{index}] must be a non-empty string"
            )
        items.append(entry)
    return tuple(items)


def _require_mapping(
    payload: dict[str, Any],
    key: str,
    *,
    path: Path,
    context: str,
) -> dict[str, Any]:
    value = payload.get(key)
    if not isinstance(value, dict):
        raise PrimitiveValidationError(f"{path}: {context}.{key} must be an object")
    return value


def _is_relative_path(value: str) -> bool:
    return not Path(value).is_absolute()


def _resolve_repo_relative_path(repo_root: Path, path: str | Path) -> Path:
    candidate = Path(path)
    if candidate.is_absolute():
        resolved = candidate.resolve()
    else:
        resolved = (repo_root / candidate).resolve()
    try:
        resolved.relative_to(repo_root.resolve())
    except ValueError as exc:
        raise PrimitiveValidationError(
            f"{path}: path must be inside the repository root"
        ) from exc
    return resolved


def _parse_region(payload: dict[str, Any], *, path: Path, context: str) -> PrimitiveRegion:
    _require_exact_keys(payload, REQUIRED_REGION_KEYS, context, path)
    region = PrimitiveRegion(
        x=_require_int(payload, "x", path=path, context=context),
        y=_require_int(payload, "y", path=path, context=context),
        width=_require_int(payload, "width", path=path, context=context),
        height=_require_int(payload, "height", path=path, context=context),
    )
    if region.x < 0 or region.y < 0:
        raise PrimitiveValidationError(
            f"{path}: {context}.x and {context}.y must be non-negative"
        )
    if region.width <= 0 or region.height <= 0:
        raise PrimitiveValidationError(
            f"{path}: {context}.width and {context}.height must be positive"
        )
    return region


def _parse_point(payload: dict[str, Any], *, path: Path, context: str) -> PrimitivePoint:
    _require_exact_keys(payload, REQUIRED_POINT_KEYS, context, path)
    point = PrimitivePoint(
        x=_require_int(payload, "x", path=path, context=context),
        y=_require_int(payload, "y", path=path, context=context),
    )
    if point.x < 0 or point.y < 0:
        raise PrimitiveValidationError(
            f"{path}: {context}.x and {context}.y must be non-negative"
        )
    return point


def _parse_anchors(
    payload: dict[str, Any], *, path: Path, context: str
) -> dict[str, PrimitivePoint]:
    if not payload:
        raise PrimitiveValidationError(f"{path}: {context} must not be empty")
    anchors: dict[str, PrimitivePoint] = {}
    for anchor_name in sorted(payload):
        if not isinstance(anchor_name, str) or not anchor_name:
            raise PrimitiveValidationError(
                f"{path}: {context} names must be non-empty strings"
            )
        anchor_payload = payload[anchor_name]
        if not isinstance(anchor_payload, dict):
            raise PrimitiveValidationError(
                f"{path}: {context}.{anchor_name} must be an object"
            )
        anchors[anchor_name] = _parse_point(
            anchor_payload, path=path, context=f"{context}.{anchor_name}"
        )
    return anchors


def _parse_provenance(
    payload: dict[str, Any], *, path: Path
) -> PrimitiveProvenance:
    _require_exact_keys(payload, REQUIRED_PROVENANCE_KEYS, "provenance", path)
    source_kind = _require_string(
        payload, "source_kind", path=path, context="provenance"
    )
    if source_kind not in ALLOWED_SOURCE_KINDS:
        raise PrimitiveValidationError(
            f"{path}: provenance.source_kind must be one of "
            f"{', '.join(ALLOWED_SOURCE_KINDS)}"
        )
    source_asset = _require_string(
        payload, "source_asset", path=path, context="provenance"
    )
    source_path = _require_string(
        payload, "source_path", path=path, context="provenance"
    )
    if not _is_relative_path(source_path):
        raise PrimitiveValidationError(
            f"{path}: provenance.source_path must be a relative path"
        )
    source_region = _parse_region(
        _require_mapping(
            payload, "source_region", path=path, context="provenance"
        ),
        path=path,
        context="provenance.source_region",
    )
    approved_by = payload.get("approved_by")
    if approved_by is not None and (
        not isinstance(approved_by, str) or not approved_by
    ):
        raise PrimitiveValidationError(
            f"{path}: provenance.approved_by must be null or a non-empty string"
        )
    variant_id = payload.get("variant_id")
    if variant_id is not None and (not isinstance(variant_id, str) or not variant_id):
        raise PrimitiveValidationError(
            f"{path}: provenance.variant_id must be null or a non-empty string"
        )
    critic_summary = payload.get("critic_summary")
    if critic_summary is not None and not isinstance(critic_summary, dict):
        raise PrimitiveValidationError(
            f"{path}: provenance.critic_summary must be null or an object"
        )
    lineage = _require_string_list(
        payload, "lineage", path=path, context="provenance", allow_empty=True
    )
    return PrimitiveProvenance(
        source_kind=source_kind,
        source_asset=source_asset,
        source_path=source_path,
        source_region=source_region,
        approved_by=approved_by,
        variant_id=variant_id,
        critic_summary=critic_summary,
        lineage=lineage,
    )


def _validate_metadata_contract(
    payload: dict[str, Any], *, path: Path
) -> PrimitiveMetadata:
    _require_exact_keys(
        payload, REQUIRED_PRIMITIVE_KEYS | OPTIONAL_PRIMITIVE_KEYS, "primitive", path
    )

    primitive_id = _require_string(
        payload, "primitive_id", path=path, context="primitive"
    )
    if not PRIMITIVE_SLUG_RE.fullmatch(primitive_id):
        raise PrimitiveValidationError(
            f"{path}: primitive.primitive_id must be a lowercase slug"
        )

    family = _require_string(payload, "family", path=path, context="primitive")
    if family not in FAMILY_NAMES:
        raise PrimitiveValidationError(
            f"{path}: primitive.family must be one of the approved family names"
        )

    subtype = _require_string(payload, "subtype", path=path, context="primitive")
    source_asset = _require_string(
        payload, "source_asset", path=path, context="primitive"
    )
    source_path = _require_string(payload, "source_path", path=path, context="primitive")
    if not _is_relative_path(source_path):
        raise PrimitiveValidationError(
            f"{path}: primitive.source_path must be a relative path"
        )
    source_region = _parse_region(
        _require_mapping(payload, "source_region", path=path, context="primitive"),
        path=path,
        context="primitive.source_region",
    )
    anchors = _parse_anchors(
        _require_mapping(payload, "anchors", path=path, context="primitive"),
        path=path,
        context="primitive.anchors",
    )
    compatible_palettes = _require_string_list(
        payload, "compatible_palettes", path=path, context="primitive"
    )
    compatible_themes = _require_string_list(
        payload, "compatible_themes", path=path, context="primitive"
    )
    tags = _require_string_list(payload, "tags", path=path, context="primitive")
    motifs = _require_string_list(payload, "motifs", path=path, context="primitive")
    approval_state = _require_string(
        payload, "approval_state", path=path, context="primitive"
    )
    if approval_state not in ALLOWED_APPROVAL_STATES:
        raise PrimitiveValidationError(
            f"{path}: primitive.approval_state must be one of "
            f"{', '.join(ALLOWED_APPROVAL_STATES)}"
        )
    promoted_at = payload.get("promoted_at")
    if promoted_at is not None and (not isinstance(promoted_at, str) or not promoted_at):
        raise PrimitiveValidationError(
            f"{path}: primitive.promoted_at must be null or a non-empty string"
        )
    provenance = _parse_provenance(
        _require_mapping(payload, "provenance", path=path, context="primitive"),
        path=path,
    )
    companion_files = _require_string_list(
        payload, "companion_files", path=path, context="primitive", allow_empty=True
    )

    if source_asset != provenance.source_asset:
        raise PrimitiveValidationError(
            f"{path}: primitive.source_asset must match provenance.source_asset"
        )
    if source_path != provenance.source_path:
        raise PrimitiveValidationError(
            f"{path}: primitive.source_path must match provenance.source_path"
        )
    if source_region != provenance.source_region:
        raise PrimitiveValidationError(
            f"{path}: primitive.source_region must match provenance.source_region"
        )
    if approval_state == "approved" and not promoted_at:
        raise PrimitiveValidationError(
            f"{path}: approved primitives must include promoted_at"
        )
    if approval_state != "approved" and promoted_at is not None:
        raise PrimitiveValidationError(
            f"{path}: only approved primitives may include promoted_at"
        )
    if approval_state == "approved" and provenance.approved_by is None:
        raise PrimitiveValidationError(
            f"{path}: approved primitives must record provenance.approved_by"
        )
    if approval_state != "approved" and provenance.approved_by is not None:
        raise PrimitiveValidationError(
            f"{path}: only approved primitives may include provenance.approved_by"
        )

    return PrimitiveMetadata(
        primitive_id=primitive_id,
        family=family,
        subtype=subtype,
        source_asset=source_asset,
        source_path=source_path,
        source_region=source_region,
        anchors=anchors,
        compatible_palettes=compatible_palettes,
        compatible_themes=compatible_themes,
        tags=tags,
        motifs=motifs,
        approval_state=approval_state,
        promoted_at=promoted_at,
        provenance=provenance,
        companion_files=companion_files,
    )


def load_primitive_metadata(path: str | Path) -> PrimitiveMetadata:
    """Loads and validates a primitive metadata file."""

    metadata_path = Path(path)
    payload = _load_json_object(metadata_path)
    return _validate_metadata_contract(payload, path=metadata_path)


def _library_root(repo_root: Path) -> Path:
    return repo_root / PRIMITIVE_LIBRARY_DIRNAME / PRIMITIVES_DIRNAME


def _primitive_metadata_paths(repo_root: Path) -> list[Path]:
    library_root = _library_root(repo_root)
    if not library_root.exists():
        return []
    return sorted(
        path
        for path in library_root.rglob(PRIMITIVE_METADATA_FILENAME)
        if path.is_file()
    )


def _validate_primitive_layout(
    metadata_path: Path, metadata: PrimitiveMetadata, repo_root: Path
) -> PrimitiveManifestRow:
    primitive_dir = metadata_path.parent
    try:
        primitive_dir.relative_to(_library_root(repo_root))
    except ValueError as exc:  # pragma: no cover - defensive path guard
        raise PrimitiveValidationError(
            f"{metadata_path}: primitive metadata must live under library/primitives"
        ) from exc

    expected_dir = (
        repo_root
        / PRIMITIVE_LIBRARY_DIRNAME
        / PRIMITIVES_DIRNAME
        / metadata.family
        / metadata.primitive_id
    )
    if primitive_dir != expected_dir:
        raise PrimitiveValidationError(
            f"{metadata_path}: primitive files must live in "
            f"library/primitives/{metadata.family}/{metadata.primitive_id}"
        )

    source_path = repo_root / metadata.source_path
    if not source_path.exists():
        raise PrimitiveValidationError(
            f"{metadata_path}: primitive.source_path does not exist: {metadata.source_path}"
        )

    for companion_name in metadata.companion_files:
        companion_path = primitive_dir / companion_name
        if not companion_path.exists():
            raise PrimitiveValidationError(
                f"{metadata_path}: primitive companion file does not exist: {companion_name}"
            )

    return PrimitiveManifestRow(
        primitive_dir=str(primitive_dir.relative_to(repo_root)).replace("\\", "/"),
        metadata_path=str(metadata_path.relative_to(repo_root)).replace("\\", "/"),
        metadata=metadata,
    )


def _candidate_dir(repo_root: Path, metadata: PrimitiveMetadata) -> Path:
    return (
        repo_root
        / PRIMITIVE_LIBRARY_DIRNAME
        / PRIMITIVE_CANDIDATES_DIRNAME
        / metadata.family
        / metadata.primitive_id
    )


def _promoted_dir(repo_root: Path, metadata: PrimitiveMetadata) -> Path:
    return (
        repo_root
        / PRIMITIVE_LIBRARY_DIRNAME
        / PRIMITIVES_DIRNAME
        / metadata.family
        / metadata.primitive_id
    )


def _write_candidate_metadata(metadata: PrimitiveMetadata) -> dict[str, Any]:
    payload = metadata.to_dict()
    payload["approval_state"] = "draft"
    payload["promoted_at"] = None
    provenance = dict(payload["provenance"])
    provenance["approved_by"] = None
    payload["provenance"] = provenance
    companion_files = list(payload.get("companion_files", []))
    if PRIMITIVE_IMAGE_FILENAME not in companion_files:
        companion_files.insert(0, PRIMITIVE_IMAGE_FILENAME)
    payload["companion_files"] = companion_files
    return payload


def import_primitive_candidate(
    repo_root: str | Path,
    source_path: str | Path,
    metadata_path: str | Path,
    candidate_dir: str | Path | None = None,
) -> Path:
    """Imports a candidate by cropping a source asset and staging metadata."""

    root = Path(repo_root)
    metadata = load_primitive_metadata(metadata_path)
    source_image_path = _resolve_repo_relative_path(root, source_path)
    expected_source_path = _resolve_repo_relative_path(root, metadata.source_path)
    if source_image_path != expected_source_path:
        raise PrimitiveValidationError(
            f"{metadata_path}: source path does not match the candidate metadata"
        )

    try:
        with Image.open(source_image_path) as image:
            source_image = image.convert("RGBA")
    except FileNotFoundError as exc:
        raise PrimitiveValidationError(
            f"{metadata_path}: source image does not exist: {metadata.source_path}"
        ) from exc

    region = metadata.source_region
    crop = source_image.crop(
        (region.x, region.y, region.x + region.width, region.y + region.height)
    )
    target_dir = Path(candidate_dir) if candidate_dir else _candidate_dir(root, metadata)
    if candidate_dir is not None:
        expected_candidate_dir = _candidate_dir(root, metadata)
        if target_dir.resolve() != expected_candidate_dir.resolve():
            raise PrimitiveValidationError(
                f"{metadata_path}: candidate_dir must be {expected_candidate_dir}"
            )
    target_dir.mkdir(parents=True, exist_ok=True)

    image_path = target_dir / PRIMITIVE_IMAGE_FILENAME
    crop.save(image_path, format="PNG", optimize=False, compress_level=9)
    _write_json_file(target_dir / PRIMITIVE_METADATA_FILENAME, _write_candidate_metadata(metadata))
    return target_dir


def _promoted_metadata(
    metadata: PrimitiveMetadata, approved_by: str, promoted_at: str
) -> dict[str, Any]:
    payload = metadata.to_dict()
    payload["approval_state"] = "approved"
    payload["promoted_at"] = promoted_at
    provenance = dict(payload["provenance"])
    provenance["approved_by"] = approved_by
    payload["provenance"] = provenance
    return payload


def promote_primitive_candidate(
    repo_root: str | Path,
    candidate_dir: str | Path,
    *,
    approved_by: str,
    promoted_at: str,
) -> Path:
    """Promotes a staged candidate into the approved primitive library."""

    root = Path(repo_root)
    staged_dir = Path(candidate_dir)
    metadata_path = staged_dir / PRIMITIVE_METADATA_FILENAME
    metadata = load_primitive_metadata(metadata_path)
    if metadata.approval_state == "approved" and metadata.promoted_at == promoted_at:
        approved_metadata = _promoted_metadata(metadata, approved_by, promoted_at)
    else:
        approved_metadata = _promoted_metadata(metadata, approved_by, promoted_at)

    expected_candidate_dir = _candidate_dir(root, metadata)
    if staged_dir.resolve() != expected_candidate_dir.resolve():
        raise PrimitiveValidationError(
            f"{metadata_path}: candidate_dir must be {expected_candidate_dir}"
        )

    destination_dir = _promoted_dir(root, metadata)
    destination_dir.mkdir(parents=True, exist_ok=True)

    existing_metadata_path = destination_dir / PRIMITIVE_METADATA_FILENAME
    if existing_metadata_path.exists():
        existing_payload = _load_json_object(existing_metadata_path)
        if existing_payload != approved_metadata:
            raise PrimitiveValidationError(
                f"{existing_metadata_path}: promoted primitive already exists with different metadata"
            )
    _write_json_file(existing_metadata_path, approved_metadata)

    for companion_name in metadata.companion_files:
        source_file = staged_dir / companion_name
        if not source_file.exists():
            raise PrimitiveValidationError(
                f"{metadata_path}: missing companion file '{companion_name}'"
            )
        _copy_file_if_changed(source_file, destination_dir / companion_name)

    return destination_dir


def build_primitive_manifest(repo_root: str | Path) -> dict[str, Any]:
    """Builds a deterministic primitive manifest from the on-disk library."""

    root = Path(repo_root)
    rows: list[PrimitiveManifestRow] = []
    primitive_ids: dict[str, Path] = {}

    for metadata_path in _primitive_metadata_paths(root):
        metadata = load_primitive_metadata(metadata_path)
        if metadata.primitive_id in primitive_ids:
            previous = primitive_ids[metadata.primitive_id]
            raise PrimitiveValidationError(
                f"{metadata_path}: duplicate primitive_id '{metadata.primitive_id}' "
                f"also defined at {previous}"
            )
        primitive_ids[metadata.primitive_id] = metadata_path
        rows.append(_validate_primitive_layout(metadata_path, metadata, root))

    rows.sort(key=lambda row: (row.metadata.family, row.metadata.subtype, row.metadata.primitive_id))
    return {
        "version": PRIMITIVE_LIBRARY_VERSION,
        "library_root": f"{PRIMITIVE_LIBRARY_DIRNAME}/{PRIMITIVES_DIRNAME}",
        "primitive_count": len(rows),
        "families": list(FAMILY_NAMES),
        "primitives": [row.to_dict() for row in rows],
    }


def write_primitive_manifest(repo_root: str | Path) -> dict[str, Any]:
    """Rebuilds and writes the primitive manifest to disk."""

    root = Path(repo_root)
    manifest = build_primitive_manifest(root)
    manifest_path = root / PRIMITIVE_LIBRARY_DIRNAME / PRIMITIVE_MANIFEST_FILENAME
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return manifest


def load_primitive_manifest(path: str | Path) -> dict[str, Any]:
    """Loads a primitive manifest without rescanning the library."""

    manifest_path = Path(path)
    payload = _load_json_object(manifest_path)
    _require_exact_keys(
        payload, {"version", "library_root", "primitive_count", "families", "primitives"}, "primitive manifest", manifest_path
    )
    version = _require_int(payload, "version", path=manifest_path, context="manifest")
    if version != PRIMITIVE_LIBRARY_VERSION:
        raise PrimitiveValidationError(
            f"{manifest_path}: primitive manifest version must be {PRIMITIVE_LIBRARY_VERSION}"
        )
    _require_string(payload, "library_root", path=manifest_path, context="manifest")
    _require_int(payload, "primitive_count", path=manifest_path, context="manifest")
    families = _require_string_list(
        payload, "families", path=manifest_path, context="manifest"
    )
    if tuple(families) != FAMILY_NAMES:
        raise PrimitiveValidationError(
            f"{manifest_path}: manifest families do not match the approved family list"
        )
    primitives = payload.get("primitives")
    if not isinstance(primitives, list):
        raise PrimitiveValidationError(
            f"{manifest_path}: manifest.primitives must be an array"
        )
    return payload


def validate_primitive_library(repo_root: str | Path) -> dict[str, Any]:
    """Validates the primitive library against the checked-in manifest."""

    root = Path(repo_root)
    manifest = build_primitive_manifest(root)
    manifest_path = root / PRIMITIVE_LIBRARY_DIRNAME / PRIMITIVE_MANIFEST_FILENAME
    if not manifest_path.exists():
        raise PrimitiveValidationError(
            f"{manifest_path}: primitive manifest does not exist"
        )
    on_disk = load_primitive_manifest(manifest_path)
    if on_disk != manifest:
        raise PrimitiveValidationError(
            f"{manifest_path}: primitive manifest does not match the library contents"
        )
    return manifest


def query_primitives(
    manifest: dict[str, Any] | Iterable[dict[str, Any]],
    *,
    family: str | None = None,
    subtype: str | None = None,
    tag: str | None = None,
    theme: str | None = None,
    approval_state: str | None = None,
) -> list[dict[str, Any]]:
    """Filters primitives from a manifest in a deterministic order."""

    if isinstance(manifest, dict):
        rows = manifest.get("primitives", [])
    else:
        rows = list(manifest)
    if not isinstance(rows, list):
        raise PrimitiveValidationError("manifest.primitives must be an array")

    filtered: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            raise PrimitiveValidationError("primitive rows must be objects")
        if family is not None and row.get("family") != family:
            continue
        if subtype is not None and row.get("subtype") != subtype:
            continue
        if approval_state is not None and row.get("approval_state") != approval_state:
            continue
        if tag is not None and tag not in row.get("tags", []):
            continue
        if theme is not None and theme not in row.get("compatible_themes", []):
            continue
        filtered.append(row)

    filtered.sort(
        key=lambda row: (
            row.get("family", ""),
            row.get("subtype", ""),
            row.get("primitive_id", ""),
            row.get("primitive_dir", ""),
        )
    )
    return filtered
