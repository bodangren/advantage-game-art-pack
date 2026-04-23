"""Tests for planner validation and repair loop."""

from __future__ import annotations

import unittest

from asf.planner.planner import (
    PlannerContext,
    PromptBuilder,
    RepairLoop,
    StructuredOutputParser,
    parse_provider_json,
)
from asf.planner.schemas import (
    AssetFamily,
    CharacterSheetProgram,
    PaletteRamp,
    PrimitiveReference,
    SchemaValidationError,
    UserBrief,
)


class FakePlannerContext(PlannerContext):
    """Fake context for testing."""

    def __init__(self) -> None:
        super().__init__(
            canon={
                "family_baselines": {
                    "character_sheet": {
                        "themes": ["wizard", "guardian", "swamp"],
                        "motifs": ["cloak", "staff", "robe"],
                    },
                    "tileset": {
                        "themes": ["dungeon", "castle"],
                        "motifs": ["stone", "brick"],
                    },
                }
            },
            style_packs={
                "cute_chibi_v1": {"palette_limits": 8, "ramps": {"greens": [], "blues": []}},
                "dungeon_v1": {"palette_limits": 6, "ramps": {"stone": [], "wood": []}},
            },
            primitive_manifest={
                "primitives": [
                    {
                        "primitive_id": "wizard_core",
                        "family": "character_sheet",
                        "subtype": "body_core",
                        "tags": ["wizard", "body"],
                    },
                    {
                        "primitive_id": "slime_body_01",
                        "family": "character_sheet",
                        "subtype": "blob",
                        "tags": ["slime", "body"],
                    },
                    {
                        "primitive_id": "cobblestone_01",
                        "family": "tileset",
                        "subtype": "stone",
                        "tags": ["stone", "floor"],
                    },
                ]
            },
        )


class ParseProviderJsonTest(unittest.TestCase):
    """Tests for JSON parsing from provider responses."""

    def test_parse_clean_json(self) -> None:
        payload = {"key": "value"}
        result = parse_provider_json('{"key": "value"}')
        self.assertEqual(result, payload)

    def test_parse_json_with_code_fence(self) -> None:
        payload = {"key": "value"}
        result = parse_provider_json('```json\n{"key": "value"}\n```')
        self.assertEqual(result, payload)

    def test_parse_json_with_plain_code_fence(self) -> None:
        payload = {"key": "value"}
        result = parse_provider_json('```\n{"key": "value"}\n```')
        self.assertEqual(result, payload)

    def test_parse_json_with_whitespace(self) -> None:
        payload = {"key": "value"}
        result = parse_provider_json('  \n  {"key": "value"}  \n  ')
        self.assertEqual(result, payload)

    def test_parse_invalid_json_raises(self) -> None:
        with self.assertRaises(SchemaValidationError):
            parse_provider_json("not json at all")


class ValidationTest(unittest.TestCase):
    """Tests for program validation against available primitives and style packs."""

    def setUp(self) -> None:
        self.context = FakePlannerContext()
        self.parser = StructuredOutputParser(context=self.context)

    def test_validate_program_with_valid_primitives(self) -> None:
        program = CharacterSheetProgram(
            style_pack="cute_chibi_v1",
            entity_type="slime",
            archetype="blob",
            primitive_references=(
                PrimitiveReference(
                    family="character_sheet",
                    subtype="blob",
                    primitive_id="slime_body_01",
                ),
            ),
        )
        errors = self.parser.validate_program(program)
        self.assertEqual(errors, [])

    def test_validate_program_with_unknown_primitive(self) -> None:
        program = CharacterSheetProgram(
            style_pack="cute_chibi_v1",
            entity_type="slime",
            archetype="blob",
            primitive_references=(
                PrimitiveReference(
                    family="character_sheet",
                    subtype="blob",
                    primitive_id="nonexistent_primitive",
                ),
            ),
        )
        errors = self.parser.validate_program(program)
        self.assertIn("Unknown primitive_id: nonexistent_primitive", errors)

    def test_validate_program_with_unknown_style_pack(self) -> None:
        program = CharacterSheetProgram(
            style_pack="nonexistent_style_pack",
            entity_type="slime",
            archetype="blob",
            primitive_references=(),
        )
        errors = self.parser.validate_program(program)
        self.assertIn("Unknown style_pack: nonexistent_style_pack", errors)


class RepairLoopTest(unittest.TestCase):
    """Tests for the repair loop when planner output is malformed."""

    def setUp(self) -> None:
        self.context = FakePlannerContext()
        self.repair_loop = RepairLoop(context=self.context, max_attempts=3)

    def test_repair_returns_repair_prompt(self) -> None:
        brief = UserBrief(
            request="Generate a slime",
            family=AssetFamily.CHARACTER_SHEET,
        )
        errors = ["Unknown primitive_id: fake_id"]
        result = self.repair_loop.repair(brief, {"family": "character_sheet"}, errors, attempt=1)
        self.assertIsNotNone(result)
        self.assertIn("repair_prompt", result)
        self.assertEqual(result["attempt"], 2)

    def test_repair_exhausted_returns_none(self) -> None:
        brief = UserBrief(
            request="Generate a slime",
            family=AssetFamily.CHARACTER_SHEET,
        )
        errors = ["Unknown primitive_id: fake_id"]
        result = self.repair_loop.repair(brief, {"family": "character_sheet"}, errors, attempt=3)
        self.assertIsNone(result)


class PromptBuilderTest(unittest.TestCase):
    """Tests for prompt builder context assembly."""

    def setUp(self) -> None:
        self.context = FakePlannerContext()
        self.builder = PromptBuilder(context=self.context)

    def test_build_user_brief_prompt_returns_prompt_and_schema(self) -> None:
        brief = UserBrief(
            request="Generate a slime character in swamp style",
            family=AssetFamily.CHARACTER_SHEET,
            style_pack="cute_chibi_v1",
        )
        prompt, schema = self.builder.build_user_brief_prompt(brief)
        self.assertIn("Generate a slime character", prompt)
        self.assertIn("AVAILABLE PRIMITIVES", prompt)
        self.assertEqual(schema["family"], "character_sheet")

    def test_context_assembly_includes_style_packs(self) -> None:
        brief = UserBrief(
            request="Generate a dungeon tileset",
            family=AssetFamily.TILESET,
            style_pack="dungeon_v1",
        )
        prompt, _ = self.builder.build_user_brief_prompt(brief)
        self.assertIn("cute_chibi_v1", prompt)
        self.assertIn("dungeon_v1", prompt)

    def test_context_assembly_includes_primitives(self) -> None:
        brief = UserBrief(
            request="Generate a tileset",
            family=AssetFamily.TILESET,
        )
        prompt, _ = self.builder.build_user_brief_prompt(brief)
        self.assertIn("cobblestone_01", prompt)


if __name__ == "__main__":
    unittest.main()