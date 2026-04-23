"""Tests for planner eval fixtures and scoring."""

from __future__ import annotations

import unittest

from asf.planner.eval_fixtures import (
    EVAL_FIXTURES,
    load_eval_fixtures,
    run_eval_suite,
    score_planner_adherence,
)
from asf.planner.schemas import (
    AssetFamily,
    CharacterSheetProgram,
    PrimitiveReference,
)


class EvalFixturesTest(unittest.TestCase):
    """Tests for eval fixture coverage."""

    def test_load_eval_fixtures_returns_list(self) -> None:
        fixtures = load_eval_fixtures()
        self.assertIsInstance(fixtures, list)
        self.assertGreater(len(fixtures), 0)

    def test_all_families_covered(self) -> None:
        fixtures = load_eval_fixtures()
        families_covered = set()
        for f in fixtures:
            brief = f["brief"]
            if "family" in brief:
                families_covered.add(brief["family"])
            elif "families" in brief:
                for fam in brief["families"]:
                    families_covered.add(fam)

        expected = {
            "character_sheet",
            "prop_or_fx_sheet",
            "tileset",
            "background_scene",
        }
        self.assertEqual(families_covered & expected, expected)

    def test_each_fixture_has_valid_structure(self) -> None:
        fixtures = load_eval_fixtures()
        for f in fixtures:
            self.assertIn("id", f)
            self.assertIn("description", f)
            self.assertIn("brief", f)
            self.assertIn("expected_families", f)
            brief = f["brief"]
            self.assertIn("request", brief)
            has_family = "family" in brief or "families" in brief
            self.assertTrue(has_family, f"fixture {f['id']} has no family or families")

    def test_eval_005_is_batch_multi_family(self) -> None:
        fixture = next(f for f in EVAL_FIXTURES if f["id"] == "eval_005")
        brief = fixture["brief"]
        self.assertIn("families", brief)
        self.assertEqual(len(brief["families"]), 3)
        self.assertTrue(all(f == "character_sheet" for f in brief["families"]))

    def test_eval_006_is_full_per_game_pack(self) -> None:
        fixture = next(f for f in EVAL_FIXTURES if f["id"] == "eval_006")
        brief = fixture["brief"]
        self.assertIn("families", brief)
        self.assertEqual(len(brief["families"]), 4)


class EvalScoringTest(unittest.TestCase):
    """Tests for planner adherence scoring."""

    def test_score_with_valid_program(self) -> None:
        fixture = EVAL_FIXTURES[0]
        programs = (
            CharacterSheetProgram(
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
            ),
        )
        result = score_planner_adherence(fixture, programs)
        self.assertTrue(result.passed)
        self.assertTrue(result.schema_adherence)
        self.assertEqual(result.invalid_reference_count, 0)

    def test_score_with_empty_primitive_id(self) -> None:
        fixture = EVAL_FIXTURES[0]
        programs = (
            CharacterSheetProgram(
                style_pack="cute_chibi_v1",
                entity_type="slime",
                archetype="blob",
                primitive_references=(
                    PrimitiveReference(
                        family="character_sheet",
                        subtype="blob",
                        primitive_id="",
                    ),
                ),
            ),
        )
        result = score_planner_adherence(fixture, programs)
        self.assertFalse(result.passed)
        self.assertFalse(result.schema_adherence)

    def test_run_eval_suite_returns_summary(self) -> None:
        fixtures = EVAL_FIXTURES[:3]
        mock_results = [
            type(
                "R",
                (),
                {
                    "passed": True,
                    "schema_adherence": True,
                    "invalid_reference_count": 0,
                    "repair_loop_triggered": False,
                    "errors": [],
                },
            )()
            for _ in fixtures
        ]
        summary = run_eval_suite(fixtures, mock_results)
        self.assertIn("total_fixtures", summary)
        self.assertIn("schema_adherence_rate", summary)
        self.assertIn("avg_invalid_reference_count", summary)
        self.assertEqual(summary["total_fixtures"], 3)


if __name__ == "__main__":
    unittest.main()