"""Tests for PartLibrary integration with renderer primitives."""

from __future__ import annotations

import tempfile
from pathlib import Path
import unittest

from PIL import Image

from asf.part_library import PartLibrary, PartLibraryRef, parse_part_library_refs


ROOT = Path(__file__).resolve().parents[1]


class PartLibraryTest(unittest.TestCase):
    """Tests for PartLibrary class."""

    def test_loads_manifest(self) -> None:
        lib = PartLibrary(ROOT)
        self.assertGreater(len(lib._manifest.get("primitives", [])), 0)

    def test_stamp_primitive_nonsense_id_noops(self) -> None:
        lib = PartLibrary(ROOT)
        canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        lib.stamp_primitive(canvas, "nonexistent_primitive_id", 0, 0)
        pixels = list(canvas.getdata())
        self.assertEqual(pixels[0], (0, 0, 0, 0))

    def test_stamp_ref_composites_primitive(self) -> None:
        lib = PartLibrary(ROOT)
        canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        ref = PartLibraryRef(primitive_id="bookshelf_01", x=0, y=0, scale=0.25)
        lib.stamp_ref(canvas, ref)
        self.assertFalse(canvas.getbbox() is None)

    def test_stamp_refs_multiple(self) -> None:
        lib = PartLibrary(ROOT)
        canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        refs = [
            PartLibraryRef(primitive_id="bookshelf_01", x=0, y=0, scale=0.25),
            PartLibraryRef(primitive_id="rubble_01", x=16, y=16, scale=0.25),
        ]
        lib.stamp_refs(canvas, refs)
        self.assertFalse(canvas.getbbox() is None)


class ParsePartLibraryRefsTest(unittest.TestCase):
    """Tests for parse_part_library_refs."""

    def test_empty_payload_returns_empty_list(self) -> None:
        result = parse_part_library_refs({})
        self.assertEqual(result, [])

    def test_missing_part_library_refs_returns_empty_list(self) -> None:
        result = parse_part_library_refs({"style_pack": "test"})
        self.assertEqual(result, [])

    def test_null_part_library_refs_returns_empty_list(self) -> None:
        result = parse_part_library_refs({"part_library_refs": None})
        self.assertEqual(result, [])

    def test_valid_ref_parsed_correctly(self) -> None:
        payload = {
            "part_library_refs": [
                {"primitive_id": "bookshelf_01", "x": 10, "y": 20, "scale": 0.5}
            ]
        }
        result = parse_part_library_refs(payload)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].primitive_id, "bookshelf_01")
        self.assertEqual(result[0].x, 10)
        self.assertEqual(result[0].y, 20)
        self.assertEqual(result[0].scale, 0.5)

    def test_multiple_refs_parsed(self) -> None:
        payload = {
            "part_library_refs": [
                {"primitive_id": "bookshelf_01", "x": 0, "y": 0},
                {"primitive_id": "rubble_01", "x": 32, "y": 32, "scale": 0.25},
            ]
        }
        result = parse_part_library_refs(payload)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0].primitive_id, "bookshelf_01")
        self.assertEqual(result[1].primitive_id, "rubble_01")

    def test_invalid_entries_skipped(self) -> None:
        payload = {
            "part_library_refs": [
                {"primitive_id": "bookshelf_01"},
                {"primitive_id": ""},
                {"x": 10},
                {},
            ]
        }
        result = parse_part_library_refs(payload)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].primitive_id, "bookshelf_01")

    def test_defaults_applied(self) -> None:
        payload = {
            "part_library_refs": [
                {"primitive_id": "rubble_01"}
            ]
        }
        result = parse_part_library_refs(payload)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].x, 0)
        self.assertEqual(result[0].y, 0)
        self.assertEqual(result[0].scale, 1.0)


if __name__ == "__main__":
    unittest.main()