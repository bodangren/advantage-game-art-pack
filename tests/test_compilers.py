"""Tests for compiler registry behavior and family program validation."""

from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest
import shutil
import hashlib

from PIL import Image

from asf.compilers import (
    CHARACTER_LAYOUT_MODE,
    CompilerValidationError,
    DEFAULT_COMPILER_REGISTRY,
    PropOrFxSheetProgram,
    TilesetProgram,
    build_output_manifest,
    compile_program,
    load_compiler_program,
)


ROOT = Path(__file__).resolve().parents[1]
CHARACTER_SAMPLE = ROOT / "programs" / "character_sheet" / "knight_guard.json"
PROP_SAMPLE = ROOT / "programs" / "prop_or_fx_sheet" / "book_stack.json"
TILESET_SAMPLE = ROOT / "programs" / "tileset" / "library_floor.json"
STYLE_PACK = ROOT / "style_packs" / "cute_chibi_v1.json"


class CompilerRegistryTest(unittest.TestCase):
    """Validates compiler registry dispatch and program loading."""

    def test_registry_exposes_expected_families(self) -> None:
        self.assertEqual(
            DEFAULT_COMPILER_REGISTRY.families(),
            ("character_sheet", "prop_or_fx_sheet", "tileset"),
        )
        self.assertEqual(
            DEFAULT_COMPILER_REGISTRY.get("character_sheet").family,
            "character_sheet",
        )

    def test_loads_character_program_and_render_spec(self) -> None:
        program = load_compiler_program(CHARACTER_SAMPLE)

        self.assertEqual(program.family, "character_sheet")
        self.assertEqual(program.layout.mode, CHARACTER_LAYOUT_MODE)
        self.assertEqual(program.layout.grid, (3, 3))
        self.assertEqual(program.layout.dimensions, (192, 192))
        self.assertEqual(program.variant_controls.variant_id, "knight_guard_v1")
        self.assertEqual(program.row_semantics, ("idle", "walk", "action"))
        self.assertEqual(program.render_spec.body.archetype, "armored_chibi")
        self.assertEqual(program.render_spec.fx.type, None)

    def test_loads_prop_and_tileset_programs(self) -> None:
        prop_program = load_compiler_program(PROP_SAMPLE)
        tileset_program = load_compiler_program(TILESET_SAMPLE)

        self.assertIsInstance(prop_program, PropOrFxSheetProgram)
        self.assertEqual(prop_program.layout.mode, "strip_3x1")
        self.assertEqual(prop_program.layout.grid, (3, 1))
        self.assertEqual(prop_program.asset_kind, "book")
        self.assertEqual(prop_program.effects.type, "sparkle")

        self.assertIsInstance(tileset_program, TilesetProgram)
        self.assertEqual(tileset_program.layout.mode, "tile_atlas")
        self.assertEqual(tileset_program.layout.grid, (8, 8))
        self.assertEqual(tileset_program.tile_kind, "floor")
        self.assertEqual(tileset_program.variation_rules.bounded, True)

    def test_rejects_unknown_family(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            payload_path = Path(tmp_dir) / "unknown.json"
            payload_path.write_text(
                json.dumps({"family": "missing_family"}), encoding="utf-8"
            )

            with self.assertRaisesRegex(
                ValueError, "unknown compiler family 'missing_family'"
            ):
                load_compiler_program(payload_path)

    def test_rejects_unexpected_top_level_field(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            payload_path = Path(tmp_dir) / "invalid.json"
            payload = json.loads(CHARACTER_SAMPLE.read_text(encoding="utf-8"))
            payload["unexpected"] = True
            payload_path.write_text(json.dumps(payload), encoding="utf-8")

            with self.assertRaisesRegex(
                ValueError, "contains unexpected key\\(s\\): unexpected"
            ):
                load_compiler_program(payload_path)

    def test_manifest_hash_changes_with_variant_id(self) -> None:
        program = load_compiler_program(CHARACTER_SAMPLE)
        manifest_a = build_output_manifest(
            program,
            input_program_path=CHARACTER_SAMPLE,
            output_file_paths=(Path("sheet.png"), Path("manifest.json")),
            repo_root=ROOT,
        )
        changed_payload = json.loads(CHARACTER_SAMPLE.read_text(encoding="utf-8"))
        changed_payload["variant_controls"]["variant_id"] = "knight_guard_v2"
        with tempfile.TemporaryDirectory() as tmp_dir:
            alternate_path = Path(tmp_dir) / "alternate.json"
            alternate_path.write_text(json.dumps(changed_payload), encoding="utf-8")
            alternate_program = load_compiler_program(alternate_path)
            manifest_b = build_output_manifest(
                alternate_program,
                input_program_path=alternate_path,
                output_file_paths=(Path("sheet.png"), Path("manifest.json")),
                repo_root=Path(tmp_dir),
            )

        self.assertNotEqual(manifest_a.input_program_hash, manifest_b.input_program_hash)

    def test_character_compiler_writes_outputs_and_manifest(self) -> None:
        program = load_compiler_program(CHARACTER_SAMPLE)

        with tempfile.TemporaryDirectory() as tmp_dir:
            output_dir = Path(tmp_dir) / "character"
            manifest = compile_program(
                program,
                output_dir,
                repo_root=ROOT,
                program_path=CHARACTER_SAMPLE,
            )

            self.assertTrue((output_dir / "sheet.png").exists())
            self.assertTrue((output_dir / "metadata.json").exists())
            self.assertTrue((output_dir / "program.json").exists())
            self.assertTrue((output_dir / "manifest.json").exists())
            self.assertEqual(manifest.compiler_family, "character_sheet")
            self.assertEqual(manifest.primitive_ids, ("wizard_core",))
            self.assertTrue(manifest.output_file_paths[0].endswith("character/sheet.png"))

            persisted = json.loads((output_dir / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(persisted["program_id"], "knight_guard")
            self.assertEqual(persisted["dimensions"], [192, 192])
            self.assertEqual(persisted["grid"], [3, 3])

    def test_compilers_are_deterministic_for_same_variant(self) -> None:
        program = load_compiler_program(CHARACTER_SAMPLE)

        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _copy_style_pack(repo_root)
            first_dir = repo_root / "first"
            second_dir = repo_root / "second"
            first_manifest = compile_program(
                program,
                first_dir,
                repo_root=ROOT,
                program_path=CHARACTER_SAMPLE,
            )
            second_manifest = compile_program(
                program,
                second_dir,
                repo_root=ROOT,
                program_path=CHARACTER_SAMPLE,
            )

            self.assertEqual(first_manifest.input_program_hash, second_manifest.input_program_hash)
            self.assertEqual(
                hashlib.sha256((first_dir / "sheet.png").read_bytes()).hexdigest(),
                hashlib.sha256((second_dir / "sheet.png").read_bytes()).hexdigest(),
            )

    def test_variant_id_changes_sheet_bytes_with_bounded_difference(self) -> None:
        program = load_compiler_program(CHARACTER_SAMPLE)
        alt_payload = json.loads(CHARACTER_SAMPLE.read_text(encoding="utf-8"))
        alt_payload["variant_controls"]["variant_id"] = "knight_guard_v2"

        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _copy_style_pack(repo_root)
            alt_program_path = repo_root / "alt.json"
            alt_program_path.write_text(json.dumps(alt_payload), encoding="utf-8")
            alt_program = load_compiler_program(alt_program_path)

            base_dir = repo_root / "base"
            alt_dir = repo_root / "alt"
            compile_program(program, base_dir, repo_root=ROOT, program_path=CHARACTER_SAMPLE)
            compile_program(alt_program, alt_dir, repo_root=ROOT, program_path=alt_program_path)

            self.assertNotEqual(
                hashlib.sha256((base_dir / "sheet.png").read_bytes()).hexdigest(),
                hashlib.sha256((alt_dir / "sheet.png").read_bytes()).hexdigest(),
            )

    def test_missing_required_primitive_anchor_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _copy_style_pack(repo_root)
            _write_minimal_primitive(repo_root, family="character_sheet", primitive_id="minimal_core", anchors={"head": (8, 2)})
            payload = json.loads(CHARACTER_SAMPLE.read_text(encoding="utf-8"))
            payload["program_id"] = "minimal_character"
            payload["primitive_ids"] = ["minimal_core"]
            program_path = repo_root / "missing_anchor.json"
            program_path.write_text(json.dumps(payload), encoding="utf-8")
            program = load_compiler_program(program_path)

            with self.assertRaisesRegex(CompilerValidationError, "missing required anchor"):
                compile_program(program, repo_root / "out", repo_root=repo_root, program_path=program_path)

    def test_missing_required_primitive_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _copy_style_pack(repo_root)
            payload = json.loads(CHARACTER_SAMPLE.read_text(encoding="utf-8"))
            payload["primitive_ids"] = ["does_not_exist"]
            program_path = repo_root / "missing_primitive.json"
            program_path.write_text(json.dumps(payload), encoding="utf-8")
            program = load_compiler_program(program_path)

            with self.assertRaisesRegex(CompilerValidationError, "unknown approved primitive"):
                compile_program(program, repo_root / "out", repo_root=repo_root, program_path=program_path)

    def test_manifest_and_outputs_write_for_prop_and_tileset(self) -> None:
        prop_program = load_compiler_program(PROP_SAMPLE)
        tileset_program = load_compiler_program(TILESET_SAMPLE)

        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = ROOT
            output_root = Path(tmp_dir)
            prop_dir = output_root / "prop"
            tileset_dir = output_root / "tileset"
            prop_manifest = compile_program(prop_program, prop_dir, repo_root=ROOT, program_path=PROP_SAMPLE)
            tileset_manifest = compile_program(tileset_program, tileset_dir, repo_root=ROOT, program_path=TILESET_SAMPLE)

            self.assertTrue((prop_dir / "sheet.png").exists())
            self.assertTrue((tileset_dir / "sheet.png").exists())
            self.assertEqual(prop_manifest.compiler_family, "prop_or_fx_sheet")
            self.assertEqual(tileset_manifest.compiler_family, "tileset")
            self.assertTrue(prop_manifest.output_file_paths[0].endswith("prop/sheet.png"))
            self.assertTrue(tileset_manifest.output_file_paths[0].endswith("tileset/sheet.png"))

    def test_manifest_metadata_includes_primitive_provenance(self) -> None:
        program = load_compiler_program(CHARACTER_SAMPLE)

        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _copy_style_pack(repo_root)
            out_dir = repo_root / "character"
            compile_program(program, out_dir, repo_root=ROOT, program_path=CHARACTER_SAMPLE)

            metadata = json.loads((out_dir / "metadata.json").read_text(encoding="utf-8"))
            self.assertEqual(metadata["compiler_family"], "character_sheet")
            self.assertEqual(metadata["primitive_ids"], ["wizard_core"])
            self.assertEqual(metadata["primitives"][0]["primitive_id"], "wizard_core")

    def test_prop_and_tileset_outputs_have_expected_size(self) -> None:
        prop_program = load_compiler_program(PROP_SAMPLE)
        tileset_program = load_compiler_program(TILESET_SAMPLE)

        with tempfile.TemporaryDirectory() as tmp_dir:
            repo_root = Path(tmp_dir)
            _copy_style_pack(repo_root)
            prop_dir = repo_root / "prop"
            tileset_dir = repo_root / "tileset"
            compile_program(prop_program, prop_dir, repo_root=ROOT, program_path=PROP_SAMPLE)
            compile_program(tileset_program, tileset_dir, repo_root=ROOT, program_path=TILESET_SAMPLE)

            with Image.open(prop_dir / "sheet.png") as prop_image:
                self.assertEqual(prop_image.size, (192, 64))
            with Image.open(tileset_dir / "sheet.png") as tileset_image:
                self.assertEqual(tileset_image.size, (128, 128))

    def test_manifest_only_compilers_write_manifest_and_program_copy(self) -> None:
        prop_program = load_compiler_program(PROP_SAMPLE)

        with tempfile.TemporaryDirectory() as tmp_dir:
            output_dir = Path(tmp_dir) / "prop"
            manifest = compile_program(
                prop_program,
                output_dir,
                repo_root=ROOT,
                program_path=PROP_SAMPLE,
            )

            self.assertTrue((output_dir / "program.json").exists())
            self.assertTrue((output_dir / "manifest.json").exists())
            self.assertEqual(manifest.compiler_family, "prop_or_fx_sheet")
            self.assertTrue(manifest.output_file_paths[-1].endswith("prop/manifest.json"))


def _copy_style_pack(repo_root: Path) -> None:
    target_dir = repo_root / "style_packs"
    target_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(STYLE_PACK, target_dir / STYLE_PACK.name)


def _write_minimal_primitive(
    repo_root: Path,
    *,
    family: str,
    primitive_id: str,
    anchors: dict[str, tuple[int, int]],
) -> None:
    demo_dir = repo_root / "demo-assets"
    demo_dir.mkdir(parents=True, exist_ok=True)
    Image.new("RGBA", (16, 16), (255, 0, 0, 255)).save(demo_dir / "minimal.png")
    primitive_dir = repo_root / "library" / "primitives" / family / primitive_id
    primitive_dir.mkdir(parents=True, exist_ok=True)
    payload = {
        "primitive_id": primitive_id,
        "family": family,
        "subtype": "body_core" if family == "character_sheet" else "prop_core",
        "source_asset": "minimal",
        "source_path": "demo-assets/minimal.png",
        "source_region": {"x": 0, "y": 0, "width": 16, "height": 16},
        "anchors": {name: {"x": x, "y": y} for name, (x, y) in anchors.items()},
        "compatible_palettes": ["iron"],
        "compatible_themes": ["test"],
        "tags": ["test"],
        "motifs": ["test"],
        "approval_state": "approved",
        "promoted_at": "2026-04-05T00:00:00Z",
        "provenance": {
            "source_kind": "manual_source",
            "source_asset": "minimal",
            "source_path": "demo-assets/minimal.png",
            "source_region": {"x": 0, "y": 0, "width": 16, "height": 16},
            "approved_by": "codex",
            "variant_id": None,
            "critic_summary": None,
            "lineage": [],
        },
        "companion_files": [],
    }
    (primitive_dir / "primitive.json").write_text(json.dumps(payload), encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
