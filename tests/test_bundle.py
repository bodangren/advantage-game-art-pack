"""Tests for the per-game asset bundle system."""

from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from asf.bundle import (
    BUNDLE_CATEGORIES,
    BundleExportError,
    BundleManifest,
    BundleValidator,
    BundleValidationError,
    create_bundle_directory,
    export_bundle,
    load_bundle_manifest,
    update_bundle_manifest,
)


class TestBundleManifest(unittest.TestCase):
    """Tests for BundleManifest dataclass."""

    def test_valid_manifest(self):
        manifest = BundleManifest(
            name="test_bundle",
            style_pack="cute_chibi_v1",
            categories={"characters": ("hero.json",), "enemies": ()},
        )
        self.assertTrue(manifest.is_valid())

    def test_invalid_empty_name(self):
        manifest = BundleManifest(name="", style_pack="cute_chibi_v1")
        self.assertFalse(manifest.is_valid())

    def test_invalid_empty_style(self):
        manifest = BundleManifest(name="test_bundle", style_pack="")
        self.assertFalse(manifest.is_valid())

    def test_missing_categories(self):
        manifest = BundleManifest(
            name="test_bundle",
            style_pack="cute_chibi_v1",
            categories={"characters": ("hero.json",)},
        )
        missing = manifest.missing_categories()
        self.assertIn("enemies", missing)
        self.assertNotIn("characters", missing)

    def test_to_dict_roundtrip(self):
        manifest = BundleManifest(
            name="test_bundle",
            style_pack="cute_chibi_v1",
            categories={"characters": ("hero.json", "villager.json")},
            generation_timestamp="2026-05-03T00:00:00Z",
            metadata={"version": "1.0"},
        )
        data = manifest.to_dict()
        restored = BundleManifest.from_dict(data)
        self.assertEqual(restored.name, manifest.name)
        self.assertEqual(restored.style_pack, manifest.style_pack)
        self.assertEqual(restored.categories["characters"], manifest.categories["characters"])


class TestBundleValidator(unittest.TestCase):
    """Tests for BundleValidator."""

    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())
        self.bundle_root = self.temp_dir / "bundles"
        self.bundle_root.mkdir()
        self.bundle_name = "test_bundle"
        self.bundle_path = self.bundle_root / self.bundle_name

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_validate_empty_bundle(self):
        create_bundle_directory(self.bundle_root, self.bundle_name, "cute_chibi_v1")
        manifest = load_bundle_manifest(self.bundle_root, self.bundle_name)
        validator = BundleValidator(self.bundle_path)
        missing = validator.validate(manifest)
        self.assertEqual(len(missing), len(BUNDLE_CATEGORIES))

    def test_validate_with_assets(self):
        create_bundle_directory(self.bundle_root, self.bundle_name, "cute_chibi_v1")
        chars_dir = self.bundle_path / "characters"
        (chars_dir / "hero.json").write_text("{}")
        manifest = load_bundle_manifest(self.bundle_root, self.bundle_name)
        manifest = BundleManifest(
            name=manifest.name,
            style_pack=manifest.style_pack,
            categories={"characters": ("hero.json",)},
        )
        validator = BundleValidator(self.bundle_path)
        missing = validator.validate(manifest)
        self.assertIn("enemies", missing)
        self.assertNotIn("characters", missing)

    def test_check_export_ready_invalid_manifest(self):
        manifest = BundleManifest(name="", style_pack="")
        validator = BundleValidator(self.bundle_path)
        is_ready, issues = validator.check_export_ready(manifest)
        self.assertFalse(is_ready)


class TestBundleCreate(unittest.TestCase):
    """Tests for bundle creation and scaffolding."""

    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())
        self.bundle_root = self.temp_dir / "bundles"
        self.bundle_root.mkdir()

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_creates_all_category_dirs(self):
        create_bundle_directory(self.bundle_root, "library_dungeon", "cute_chibi_v1")
        bundle_path = self.bundle_root / "library_dungeon"
        for category in BUNDLE_CATEGORIES:
            self.assertTrue((bundle_path / category).is_dir())

    def test_creates_manifest(self):
        manifest = create_bundle_directory(self.bundle_root, "library_dungeon", "cute_chibi_v1")
        bundle_path = self.bundle_root / "library_dungeon"
        manifest_path = bundle_path / "manifest.json"
        self.assertTrue(manifest_path.exists())
        loaded = load_bundle_manifest(self.bundle_root, "library_dungeon")
        self.assertEqual(loaded.name, "library_dungeon")
        self.assertEqual(loaded.style_pack, "cute_chibi_v1")


class TestBundleExport(unittest.TestCase):
    """Tests for bundle export."""

    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())
        self.bundle_root = self.temp_dir / "bundles"
        self.bundle_root.mkdir()
        self.output_root = self.temp_dir / "exports"

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_export_creates_output_directory(self):
        create_bundle_directory(self.bundle_root, "test_bundle", "cute_chibi_v1")
        chars_dir = self.bundle_root / "test_bundle" / "characters"
        (chars_dir / "hero.json").write_text('{"name": "hero"}')
        export_path = export_bundle(self.bundle_root, "test_bundle", self.output_root)
        self.assertTrue(export_path.exists())
        self.assertTrue((export_path / "metadata.json").exists())

    def test_export_includes_metadata(self):
        create_bundle_directory(self.bundle_root, "test_bundle", "cute_chibi_v1")
        chars_dir = self.bundle_root / "test_bundle" / "characters"
        (chars_dir / "hero.json").write_text('{"name": "hero"}')
        export_path = export_bundle(self.bundle_root, "test_bundle", self.output_root)
        metadata = json.loads((export_path / "metadata.json").read_text())
        self.assertEqual(metadata["bundle_name"], "test_bundle")
        self.assertEqual(metadata["style_pack"], "cute_chibi_v1")


class TestUpdateManifest(unittest.TestCase):
    """Tests for updating bundle manifests."""

    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())
        self.bundle_root = self.temp_dir / "bundles"
        self.bundle_root.mkdir()

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_update_writes_manifest(self):
        create_bundle_directory(self.bundle_root, "test_bundle", "cute_chibi_v1")
        manifest = load_bundle_manifest(self.bundle_root, "test_bundle")
        manifest = BundleManifest(
            name=manifest.name,
            style_pack=manifest.style_pack,
            categories={"characters": ("hero.json",)},
        )
        update_bundle_manifest(self.bundle_root, manifest)
        loaded = load_bundle_manifest(self.bundle_root, "test_bundle")
        self.assertEqual(loaded.categories["characters"], ("hero.json",))


if __name__ == "__main__":
    unittest.main()