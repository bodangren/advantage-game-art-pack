"""Tests for primitive metadata validation, manifest rebuilding, and queries."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from PIL import Image

from asf.primitives import (
    PrimitiveValidationError,
    build_primitive_manifest,
    import_primitive_candidate,
    load_primitive_metadata,
    promote_primitive_candidate,
    query_primitives,
    validate_primitive_library,
    write_primitive_manifest,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DIR = ROOT / "tests" / "fixtures" / "primitives"


class PrimitiveLibraryTest(unittest.TestCase):
    """Validates primitive metadata and registry behavior."""

    def test_loads_valid_primitive_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            source_path = _write_source_asset(repo_root, "demo-assets/source.png")
            metadata_path = _write_primitive_fixture(
                repo_root,
                family="prop_sheet",
                primitive_id="book_stack_core",
                subtype="book_stack",
                source_path=source_path,
                tags=("library", "knowledge"),
                themes=("library", "artifact"),
                motifs=("book", "pages"),
            )

            metadata = load_primitive_metadata(metadata_path)

            self.assertEqual(metadata.primitive_id, "book_stack_core")
            self.assertEqual(metadata.family, "prop_sheet")
            self.assertEqual(metadata.provenance.source_path, "demo-assets/source.png")
            self.assertEqual(metadata.anchors["center"].x, 8)
            self.assertEqual(metadata.approval_state, "approved")

    def test_rejects_missing_anchors(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            source_path = _write_source_asset(repo_root, "demo-assets/source.png")
            metadata_path = _write_primitive_fixture(
                repo_root,
                family="fx_sheet",
                primitive_id="orb_burst_core",
                subtype="burst",
                source_path=source_path,
                anchors={},
            )

            with self.assertRaisesRegex(
                PrimitiveValidationError, "primitive\\.anchors must not be empty"
            ):
                load_primitive_metadata(metadata_path)

    def test_rejects_missing_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            source_path = _write_source_asset(repo_root, "demo-assets/source.png")
            metadata_path = _write_primitive_fixture(
                repo_root,
                family="character_sheet",
                primitive_id="wizard_core",
                subtype="body_part",
                source_path=source_path,
                include_provenance=False,
            )

            with self.assertRaisesRegex(
                PrimitiveValidationError, "missing required key\\(s\\): provenance"
            ):
                load_primitive_metadata(metadata_path)

    def test_rebuild_manifest_is_deterministic(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _write_source_asset(repo_root, "demo-assets/source.png")
            _write_primitive_fixture(
                repo_root,
                family="background_scene",
                primitive_id="library_plate",
                subtype="scene_motif",
                source_path="demo-assets/source.png",
                source_region={"x": 0, "y": 0, "width": 16, "height": 16},
                anchor_point=(8, 12),
                tags=("library", "scene"),
                themes=("library", "sanctum"),
                motifs=("bookshelves",),
            )
            _write_primitive_fixture(
                repo_root,
                family="character_sheet",
                primitive_id="wizard_core",
                subtype="body_part",
                source_path="demo-assets/source.png",
                anchor_point=(8, 14),
                tags=("wizard", "guardian"),
                themes=("wizard", "guardian"),
                motifs=("cloak",),
            )
            _write_primitive_fixture(
                repo_root,
                family="tileset",
                primitive_id="floor_module",
                subtype="tile_module",
                source_path="demo-assets/source.png",
                anchor_point=(4, 4),
                tags=("stone", "floor"),
                themes=("ruins",),
                motifs=("tile",),
            )

            first = write_primitive_manifest(repo_root)
            second = build_primitive_manifest(repo_root)

            first_hash = hashlib.sha256(
                json.dumps(first, sort_keys=True).encode("utf-8")
            ).hexdigest()
            second_hash = hashlib.sha256(
                json.dumps(second, sort_keys=True).encode("utf-8")
            ).hexdigest()
            self.assertEqual(first_hash, second_hash)

            manifest_path = repo_root / "library" / "primitive_manifest.json"
            self.assertTrue(manifest_path.exists())
            self.assertEqual(json.loads(manifest_path.read_text(encoding="utf-8")), first)

    def test_rejects_duplicate_primitive_ids(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _write_source_asset(repo_root, "demo-assets/source.png")
            _write_primitive_fixture(
                repo_root,
                family="character_sheet",
                primitive_id="shared_core",
                subtype="body_part",
                source_path="demo-assets/source.png",
                tag_suffix="a",
            )
            _write_primitive_fixture(
                repo_root,
                family="prop_sheet",
                primitive_id="shared_core",
                subtype="prop",
                source_path="demo-assets/source.png",
                tag_suffix="b",
            )

            with self.assertRaisesRegex(
                PrimitiveValidationError, "duplicate primitive_id"
            ):
                build_primitive_manifest(repo_root)

    def test_query_filters_by_family_and_tag(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _write_source_asset(repo_root, "demo-assets/source.png")
            _write_primitive_fixture(
                repo_root,
                family="character_sheet",
                primitive_id="wizard_hat_core",
                subtype="body_part",
                source_path="demo-assets/source.png",
                tags=("wizard", "hat"),
                themes=("wizard",),
                motifs=("hat",),
            )
            _write_primitive_fixture(
                repo_root,
                family="prop_sheet",
                primitive_id="book_stack_core",
                subtype="prop",
                source_path="demo-assets/source.png",
                tags=("library", "knowledge"),
                themes=("library",),
                motifs=("book",),
            )

            manifest = build_primitive_manifest(repo_root)
            results = query_primitives(
                manifest, family="prop_sheet", tag="library", approval_state="approved"
            )

            self.assertEqual([row["primitive_id"] for row in results], ["book_stack_core"])

    def test_validates_on_disk_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _write_source_asset(repo_root, "demo-assets/source.png")
            _write_primitive_fixture(
                repo_root,
                family="fx_sheet",
                primitive_id="orb_glow_core",
                subtype="burst",
                source_path="demo-assets/source.png",
                tags=("magic",),
                themes=("energy",),
                motifs=("orb",),
            )
            write_primitive_manifest(repo_root)

            manifest = validate_primitive_library(repo_root)

            self.assertEqual(manifest["primitive_count"], 1)

    def test_imports_and_crops_candidate(self) -> None:
        repo_root, source_image, metadata_path = _prepare_promotion_repo()

        candidate_dir = import_primitive_candidate(
            repo_root,
            source_image,
            metadata_path,
        )

        cropped_path = candidate_dir / "source.png"
        self.assertTrue(cropped_path.exists())
        with Image.open(cropped_path) as cropped:
            self.assertEqual(cropped.size, (128, 120))

        staged_metadata = load_primitive_metadata(candidate_dir / "primitive.json")
        self.assertEqual(staged_metadata.approval_state, "draft")
        self.assertIsNone(staged_metadata.promoted_at)
        self.assertIsNone(staged_metadata.provenance.approved_by)
        self.assertEqual(staged_metadata.provenance.variant_id, "book_stack_core_v1")
        self.assertEqual(
            staged_metadata.provenance.critic_summary,
            {"score": 0.92, "notes": ["clear silhouette"]},
        )

    def test_import_fails_without_source_region(self) -> None:
        repo_root, source_image, metadata_path = _prepare_promotion_repo()
        payload = json.loads(metadata_path.read_text(encoding="utf-8"))
        payload.pop("source_region")
        metadata_path.write_text(json.dumps(payload), encoding="utf-8")

        with self.assertRaisesRegex(
            PrimitiveValidationError, "missing required key\\(s\\): source_region"
        ):
            import_primitive_candidate(repo_root, source_image, metadata_path)

    def test_import_fails_without_anchors(self) -> None:
        repo_root, source_image, metadata_path = _prepare_promotion_repo()
        payload = json.loads(metadata_path.read_text(encoding="utf-8"))
        payload.pop("anchors")
        metadata_path.write_text(json.dumps(payload), encoding="utf-8")

        with self.assertRaisesRegex(
            PrimitiveValidationError, "missing required key\\(s\\): anchors"
        ):
            import_primitive_candidate(repo_root, source_image, metadata_path)

    def test_promotion_is_idempotent(self) -> None:
        repo_root, source_image, metadata_path = _prepare_promotion_repo()
        candidate_dir = import_primitive_candidate(repo_root, source_image, metadata_path)

        promoted_dir = promote_primitive_candidate(
            repo_root,
            candidate_dir,
            approved_by="codex-reviewer",
            promoted_at="2026-04-05T03:00:00Z",
        )
        first_manifest = write_primitive_manifest(repo_root)
        first_digest = _digest_file(promoted_dir / "primitive.json")
        first_image_digest = _digest_file(promoted_dir / "source.png")

        promoted_dir_repeat = promote_primitive_candidate(
            repo_root,
            candidate_dir,
            approved_by="codex-reviewer",
            promoted_at="2026-04-05T03:00:00Z",
        )
        second_manifest = build_primitive_manifest(repo_root)
        second_digest = _digest_file(promoted_dir_repeat / "primitive.json")
        second_image_digest = _digest_file(promoted_dir_repeat / "source.png")

        self.assertEqual(promoted_dir, promoted_dir_repeat)
        self.assertEqual(first_digest, second_digest)
        self.assertEqual(first_image_digest, second_image_digest)
        self.assertEqual(
            hashlib.sha256(json.dumps(first_manifest, sort_keys=True).encode("utf-8")).hexdigest(),
            hashlib.sha256(json.dumps(second_manifest, sort_keys=True).encode("utf-8")).hexdigest(),
        )

        promoted_metadata = load_primitive_metadata(promoted_dir / "primitive.json")
        self.assertEqual(promoted_metadata.approval_state, "approved")
        self.assertEqual(promoted_metadata.promoted_at, "2026-04-05T03:00:00Z")
        self.assertEqual(promoted_metadata.provenance.approved_by, "codex-reviewer")
        self.assertEqual(promoted_metadata.provenance.variant_id, "book_stack_core_v1")
        self.assertEqual(
            promoted_metadata.provenance.critic_summary,
            {"score": 0.92, "notes": ["clear silhouette"]},
        )
        self.assertEqual(first_manifest["primitive_count"], 1)


def _write_source_asset(repo_root: Path, relative_path: str) -> str:
    source_path = repo_root / relative_path
    source_path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", (16, 16), (255, 0, 0, 255)).save(source_path)
    return relative_path


def _digest_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _prepare_promotion_repo() -> tuple[Path, Path, Path]:
    repo_root = Path(tempfile.mkdtemp(prefix="pixel-art-promotion-"))
    source_rel = "demo-assets/book_3x1_sheet.png"
    _copy_repo_file(ROOT / source_rel, repo_root / source_rel)
    fixture_path = repo_root / "fixtures" / "book_stack_draft.json"
    fixture_path.parent.mkdir(parents=True, exist_ok=True)
    fixture_path.write_text(
        (FIXTURE_DIR / "book_stack_draft.json").read_text(encoding="utf-8"),
        encoding="utf-8",
    )
    return repo_root, repo_root / source_rel, fixture_path


def _copy_repo_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)


def _write_primitive_fixture(
    repo_root: Path,
    *,
    family: str,
    primitive_id: str,
    subtype: str,
    source_path: str,
    anchor_point: tuple[int, int] = (8, 8),
    anchors: dict[str, tuple[int, int]] | None = None,
    source_region: dict[str, int] | None = None,
    tags: tuple[str, ...] = ("seed",),
    themes: tuple[str, ...] = ("seed",),
    motifs: tuple[str, ...] = ("seed",),
    include_provenance: bool = True,
    tag_suffix: str = "",
) -> Path:
    primitive_dir = repo_root / "library" / "primitives" / family / primitive_id
    primitive_dir.mkdir(parents=True, exist_ok=True)
    anchor_map = {"center": anchor_point} if anchors is None else anchors
    region = source_region or {"x": 0, "y": 0, "width": 16, "height": 16}
    payload: dict[str, object] = {
        "primitive_id": primitive_id,
        "family": family,
        "subtype": subtype,
        "source_asset": primitive_id,
        "source_path": source_path,
        "source_region": region,
        "anchors": {
            name: {"x": point[0], "y": point[1]} for name, point in anchor_map.items()
        },
        "compatible_palettes": ["default"],
        "compatible_themes": list(themes),
        "tags": list(tags) if not tag_suffix else [f"{tag}{tag_suffix}" for tag in tags],
        "motifs": list(motifs),
        "approval_state": "approved",
        "promoted_at": "2026-04-05T00:00:00Z",
        "companion_files": [],
    }
    if include_provenance:
        payload["provenance"] = {
            "source_kind": "demo_asset",
            "source_asset": primitive_id,
            "source_path": source_path,
            "source_region": region,
            "approved_by": "codex",
            "variant_id": None,
            "critic_summary": None,
            "lineage": [],
        }

    metadata_path = primitive_dir / "primitive.json"
    metadata_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return metadata_path


if __name__ == "__main__":
    unittest.main()
