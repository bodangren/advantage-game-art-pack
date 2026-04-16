"""Tests for review API endpoints."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from review_app.db import Database, init_db

ROOT = Path(__file__).resolve().parents[1]


class ReviewAPITest(unittest.TestCase):
    """Validates review API endpoint behavior."""

    def setUp(self) -> None:
        self.db_path = tempfile.mktemp(suffix=".db")
        init_db(self.db_path)
        self.db = Database(self.db_path)
        self._seed_candidates()

    def tearDown(self) -> None:
        self.db.close()
        Path(self.db_path).unlink(missing_ok=True)

    def test_list_candidates_returns_queue(self) -> None:
        results = self.db.list_candidates()
        self.assertEqual(len(results), 4)

    def test_list_candidates_filtered_by_type(self) -> None:
        results = self.db.list_candidates(candidate_type="primitive")
        self.assertEqual(len(results), 3)

    def test_list_candidates_filtered_by_status(self) -> None:
        results = self.db.list_candidates(status="pending")
        self.assertEqual(len(results), 3)

    def test_list_candidates_filtered_by_family(self) -> None:
        results = self.db.list_candidates(family="wizard_robe")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["family"], "wizard_robe")

    def test_list_candidates_with_confidence_filter(self) -> None:
        results = self.db.list_candidates(min_confidence=0.8)
        self.assertEqual(len(results), 2)
        self.assertAlmostEqual(results[0]["confidence"], 0.95, places=2)

    def test_get_candidate_detail(self) -> None:
        candidate_id = self._create_and_return_id()
        detail = self.db.get_candidate_history(candidate_id)

        self.assertEqual(detail["candidate_type"], "primitive")
        self.assertEqual(detail["family"], "test_family")
        self.assertEqual(detail["status"], "pending")
        self.assertEqual(len(detail["decisions"]), 0)

    def test_approve_action(self) -> None:
        candidate_id = self._create_and_return_id()
        decision_id = self.db.record_decision(candidate_id, "approve")

        self.assertIsNotNone(decision_id)
        candidate = self.db.get_candidate(candidate_id)
        self.assertEqual(candidate["status"], "approved")

    def test_reject_action(self) -> None:
        candidate_id = self._create_and_return_id()
        self.db.record_decision(candidate_id, "reject", reason="Bad palette")

        candidate = self.db.get_candidate(candidate_id)
        self.assertEqual(candidate["status"], "rejected")

    def test_request_variant_action(self) -> None:
        candidate_id = self._create_and_return_id()
        self.db.record_decision(
            candidate_id, "request_variant", reason="Needs more detail"
        )

        candidate = self.db.get_candidate(candidate_id)
        self.assertEqual(candidate["status"], "needs_variant")

    def test_promote_action(self) -> None:
        candidate_id = self._create_and_return_id()
        self.db.record_decision(candidate_id, "promote")

        candidate = self.db.get_candidate(candidate_id)
        self.assertEqual(candidate["status"], "promoted")

    def test_decision_creates_audit_entry(self) -> None:
        candidate_id = self._create_and_return_id()
        self.db.record_decision(candidate_id, "approve", reason="Looks great")

        history = self.db.get_candidate_history(candidate_id)
        self.assertEqual(len(history["decisions"]), 1)
        self.assertEqual(history["decisions"][0]["action"], "approve")
        self.assertEqual(history["decisions"][0]["reason"], "Looks great")

    def test_multiple_decisions_form_chronological_history(self) -> None:
        candidate_id = self._create_and_return_id()

        self.db.record_decision(candidate_id, "request_variant")
        self.db.record_decision(candidate_id, "approve")

        history = self.db.get_candidate_history(candidate_id)
        self.assertEqual(len(history["decisions"]), 2)
        self.assertEqual(history["decisions"][0]["action"], "request_variant")
        self.assertEqual(history["decisions"][1]["action"], "approve")

    def test_invalid_candidate_returns_none(self) -> None:
        result = self.db.get_candidate("nonexistent-id")
        self.assertIsNone(result)

    def _create_and_return_id(self) -> str:
        return self.db.create_candidate(
            candidate_type="primitive",
            family="test_family",
            source_program="test_program",
            rendered_files="[]",
            critic_scores="{}",
            confidence=0.5,
        )

    def _seed_candidates(self) -> None:
        self.db.create_candidate(
            candidate_type="primitive",
            family="wizard_robe",
            source_program="primitive_library",
            rendered_files='["/robe.png"]',
            critic_scores='{"palette": 0.9}',
            nearest_references='[]',
            confidence=0.85,
            theme="fantasy",
            status="pending",
        )
        self.db.create_candidate(
            candidate_type="primitive",
            family="zombie_claw",
            source_program="primitive_library",
            rendered_files='["/claw.png"]',
            critic_scores='{"palette": 0.5}',
            nearest_references='[]',
            confidence=0.5,
            theme="fantasy",
            status="pending",
        )
        self.db.create_candidate(
            candidate_type="compiled_asset",
            family="character_sheet",
            source_program="scene_assembler",
            rendered_files='["/sheet.png"]',
            critic_scores='{"structure": 0.95}',
            nearest_references='[]',
            confidence=0.95,
            theme="fantasy",
            status="approved",
        )
        self.db.create_candidate(
            candidate_type="primitive",
            family="robot_arm",
            source_program="primitive_library",
            rendered_files='["/arm.png"]',
            critic_scores='{"palette": 0.7}',
            nearest_references='[]',
            confidence=0.7,
            theme="scifi",
            status="pending",
        )


if __name__ == "__main__":
    unittest.main()