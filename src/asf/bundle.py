"""Per-game asset bundle system for organizing and exporting compiled assets."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


__all__ = [
    "BundleManifest",
    "BundleValidator",
    "BundleExportError",
]


BUNDLE_CATEGORIES = (
    "characters",
    "enemies",
    "npcs",
    "props",
    "fx",
    "tiles",
    "scenes",
    "ui",
    "loading",
)


class BundleValidationError(ValueError):
    """Raised when bundle validation fails."""


class BundleExportError(Exception):
    """Raised when bundle export fails."""


@dataclass(frozen=True)
class BundleManifest:
    """Manifest describing the contents of an asset bundle.

    Attributes:
        name: Bundle name (e.g., "library_dungeon").
        style_pack: Style pack reference used by assets in this bundle.
        categories: Map from category name to list of asset file paths.
        generation_timestamp: ISO-8601 timestamp when bundle was created/exported.
        metadata: Additional bundle-level metadata.
    """

    name: str
    style_pack: str
    categories: dict[str, tuple[str, ...]] = field(default_factory=dict)
    generation_timestamp: str | None = None
    metadata: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "style_pack": self.style_pack,
            "categories": {k: list(v) for k, v in self.categories.items()},
            "generation_timestamp": self.generation_timestamp,
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BundleManifest:
        categories: dict[str, tuple[str, ...]] = {}
        for cat, files in data.get("categories", {}).items():
            if not isinstance(files, (list, tuple)):
                raise BundleValidationError(f"category '{cat}' files must be a list")
            categories[cat] = tuple(str(f) for f in files)
        return cls(
            name=data.get("name", ""),
            style_pack=data.get("style_pack", ""),
            categories=categories,
            generation_timestamp=data.get("generation_timestamp"),
            metadata=dict(data.get("metadata", {})),
        )

    def is_valid(self) -> bool:
        """Return True if manifest has required fields."""
        return bool(self.name and self.style_pack)

    def missing_categories(self) -> list[str]:
        """Return list of required categories that have no assets."""
        return [cat for cat in BUNDLE_CATEGORIES if cat not in self.categories or not self.categories[cat]]


class BundleValidator:
    """Validates bundle completeness against required categories."""

    def __init__(self, bundle_root: Path) -> None:
        self.bundle_root = bundle_root

    def validate(self, manifest: BundleManifest) -> list[str]:
        """Validate manifest against bundle root.

        Returns list of missing categories (empty if complete).
        """
        missing: list[str] = []
        for category in BUNDLE_CATEGORIES:
            category_path = self.bundle_root / category
            if not category_path.exists() or not any(category_path.iterdir()):
                if category not in manifest.categories or not manifest.categories[category]:
                    missing.append(category)
        return missing

    def check_export_ready(self, manifest: BundleManifest) -> tuple[bool, list[str]]:
        """Check if bundle is ready for export.

        Returns (is_ready, list of issues).
        Note: Missing categories are not blocking — bundles support incremental building.
        """
        issues: list[str] = []
        if not manifest.is_valid():
            issues.append("manifest is invalid (missing name or style_pack)")
        if not self.bundle_root.exists():
            issues.append(f"bundle root does not exist: {self.bundle_root}")
        return len(issues) == 0, issues


def create_bundle_directory(
    bundle_root: Path,
    bundle_name: str,
    style_pack: str,
) -> BundleManifest:
    """Scaffold a new bundle directory with manifest and category subdirs."""
    bundle_root = bundle_root / bundle_name
    bundle_root.mkdir(parents=True, exist_ok=True)

    for category in BUNDLE_CATEGORIES:
        (bundle_root / category).mkdir(exist_ok=True)

    manifest = BundleManifest(
        name=bundle_name,
        style_pack=style_pack,
        categories={cat: () for cat in BUNDLE_CATEGORIES},
    )
    manifest_path = bundle_root / "manifest.json"
    manifest_path.write_text(json.dumps(manifest.to_dict(), indent=2), encoding="utf-8")

    return manifest


def load_bundle_manifest(bundle_root: Path, bundle_name: str) -> BundleManifest:
    """Load bundle manifest from disk."""
    manifest_path = bundle_root / bundle_name / "manifest.json"
    if not manifest_path.exists():
        raise BundleValidationError(f"manifest not found: {manifest_path}")
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    return BundleManifest.from_dict(data)


def update_bundle_manifest(bundle_root: Path, manifest: BundleManifest) -> None:
    """Write updated manifest to disk."""
    bundle_name = manifest.name
    manifest_path = bundle_root / bundle_name / "manifest.json"
    manifest_path.write_text(json.dumps(manifest.to_dict(), indent=2), encoding="utf-8")


def export_bundle(
    bundle_root: Path,
    bundle_name: str,
    output_root: Path,
) -> Path:
    """Export bundle as a directory tree with metadata.json."""
    manifest = load_bundle_manifest(bundle_root, bundle_name)
    validator = BundleValidator(bundle_root / bundle_name)
    is_ready, issues = validator.check_export_ready(manifest)
    if not is_ready:
        raise BundleExportError(f"bundle not ready for export: {'; '.join(issues)}")

    bundle_dir = bundle_root / bundle_name
    export_dir = output_root / bundle_name
    export_dir.mkdir(parents=True, exist_ok=True)

    for category in BUNDLE_CATEGORIES:
        src_dir = bundle_dir / category
        dst_dir = export_dir / category
        if src_dir.exists():
            dst_dir.mkdir(exist_ok=True)
            for src_file in src_dir.iterdir():
                if src_file.is_file():
                    shutil.copy2(src_file, dst_dir / src_file.name)

    shutil.copy2(bundle_dir / "manifest.json", export_dir / "manifest.json")

    metadata = {
        "bundle_name": bundle_name,
        "style_pack": manifest.style_pack,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "categories": list(BUNDLE_CATEGORIES),
        "asset_counts": {
            cat: len(list((bundle_dir / cat).glob("*"))) if (bundle_dir / cat).exists() else 0
            for cat in BUNDLE_CATEGORIES
        },
    }
    metadata_path = export_dir / "metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return export_dir