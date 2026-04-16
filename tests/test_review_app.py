"""Tests for review queue persistence and filtering."""

from __future__ import annotations

import json
import tempfile
import unittest
import uuid
from datetime import datetime, timezone
from pathlib import Path

from review_app.db import Database, init_db


ROOT = Path(__file__).resolve().parents[1]


class ReviewPersistenceTest(unittest.TestCase):
    """Validates candidate creation, status updates, and audit trail."""

    def setUp(self) -> None:
        self.db_path = tempfile.mktemp(suffix=".db")
        init_db(self.db_path)
        self.db = Database(self.db_path)

    def tearDown(self) -> None:
        self.db.close()
        Path(self.db_path).unlink(missing_ok=True)

    def test_creates_primitive_candidate(self) -> None:
        candidate_id = self.db.create_candidate(
            candidate_type="primitive",
            family="wizard_robe",
            source_brief='{"prompt": "wizard robe with stars"}',
            source_program="primitive_library",
            rendered_files='["/path/to/robe_001.png"]',
            critic_scores='{"palette_score": 0.9, "style_score": 0.85}',
            nearest_references='["ref_001", "ref_002"]',
            confidence=0.87,
            theme="fantasy",
        )
        self.assertIsNotNone(candidate_id)

        candidate = self.db.get_candidate(candidate_id)
        self.assertIsNotNone(candidate)
        self.assertEqual(candidate["candidate_type"], "primitive")
        self.assertEqual(candidate["family"], "wizard_robe")
        self.assertEqual(candidate["status"], "pending")
        self.assertAlmostEqual(candidate["confidence"], 0.87, places=2)

    def test_creates_compiled_asset_candidate(self) -> None:
        candidate_id = self.db.create_candidate(
            candidate_type="compiled_asset",
            family="character_sheet",
            source_brief='{"character": "wizard", "pose": "idle"}',
            source_manifest='{"layout": "3x3", "frames": 9}',
            source_program="scene_assembler",
            candidate_group_id="grp_001",
            variant_id="var_001",
            attempt_count=1,
            rendered_files='["/path/to/sheet_001.png"]',
            critic_scores='{"structure_score": 0.92}',
            confidence=0.92,
            theme="fantasy",
        )
        self.assertIsNotNone(candidate_id)

        candidate = self.db.get_candidate(candidate_id)
        self.assertEqual(candidate["candidate_type"], "compiled_asset")
        self.assertEqual(candidate["candidate_group_id"], "grp_001")
        self.assertEqual(candidate["variant_id"], "var_001")
        self.assertEqual(candidate["attempt_count"], 1)

    def test_approve_updates_status_and_creates_decision(self) -> None:
        candidate_id = self._create_sample_candidate()

        self.db.record_decision(candidate_id, "approve", reason="Looks good")
        updated = self.db.get_candidate(candidate_id)

        self.assertEqual(updated["status"], "approved")
        decisions = self.db.get_decisions(candidate_id)
        self.assertEqual(len(decisions), 1)
        self.assertEqual(decisions[0]["action"], "approve")
        self.assertEqual(decisions[0]["reason"], "Looks good")

    def test_reject_updates_status_and_creates_decision(self) -> None:
        candidate_id = self._create_sample_candidate()

        self.db.record_decision(candidate_id, "reject", reason="Poor palette")
        updated = self.db.get_candidate(candidate_id)

        self.assertEqual(updated["status"], "rejected")

    def test_request_variant_creates_decision_with_reason(self) -> None:
        candidate_id = self._create_sample_candidate()

        self.db.record_decision(
            candidate_id, "request_variant", reason="Needs more gold trim"
        )
        updated = self.db.get_candidate(candidate_id)

        self.assertEqual(updated["status"], "needs_variant")
        decisions = self.db.get_decisions(candidate_id)
        self.assertEqual(decisions[0]["action"], "request_variant")
        self.assertEqual(decisions[0]["reason"], "Needs more gold trim")

    def test_promote_updates_status(self) -> None:
        candidate_id = self._create_sample_candidate()

        self.db.record_decision(candidate_id, "promote")
        updated = self.db.get_candidate(candidate_id)

        self.assertEqual(updated["status"], "promoted")

    def test_multiple_decisions_form_audit_history(self) -> None:
        candidate_id = self._create_sample_candidate()

        self.db.record_decision(candidate_id, "request_variant", reason="Too dark")
        self.db.record_decision(candidate_id, "approve", reason="Fixed in v2")

        decisions = self.db.get_decisions(candidate_id)
        self.assertEqual(len(decisions), 2)
        self.assertEqual(decisions[0]["action"], "request_variant")
        self.assertEqual(decisions[1]["action"], "approve")

    def test_get_nonexistent_candidate_returns_none(self) -> None:
        result = self.db.get_candidate(str(uuid.uuid4()))
        self.assertIsNone(result)

    def _create_sample_candidate(self) -> str:
        return self.db.create_candidate(
            candidate_type="primitive",
            family="test_family",
            source_program="test_program",
            rendered_files="[]",
            critic_scores="{}",
            confidence=0.5,
        )


class ReviewQueueFilterTest(unittest.TestCase):
    """Validates queue filtering by type, family, status, theme, and confidence."""

    def setUp(self) -> None:
        self.db_path = tempfile.mktemp(suffix=".db")
        init_db(self.db_path)
        self.db = Database(self.db_path)
        self._seed_candidates()

    def tearDown(self) -> None:
        self.db.close()
        Path(self.db_path).unlink(missing_ok=True)

    def test_filter_by_candidate_type(self) -> None:
        primitives = self.db.list_candidates(candidate_type="primitive")
        self.assertEqual(len(primitives), 3)

        assets = self.db.list_candidates(candidate_type="compiled_asset")
        self.assertEqual(len(assets), 1)

    def test_filter_by_family(self) -> None:
        results = self.db.list_candidates(family="wizard_robe")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["family"], "wizard_robe")

    def test_filter_by_status(self) -> None:
        pending = self.db.list_candidates(status="pending")
        self.assertEqual(len(pending), 3)

        approved = self.db.list_candidates(status="approved")
        self.assertEqual(len(approved), 1)

    def test_filter_by_theme(self) -> None:
        fantasy = self.db.list_candidates(theme="fantasy")
        self.assertEqual(len(fantasy), 3)

        scifi = self.db.list_candidates(theme="scifi")
        self.assertEqual(len(scifi), 1)

    def test_filter_by_confidence_range(self) -> None:
        high_conf = self.db.list_candidates(min_confidence=0.8)
        self.assertEqual(len(high_conf), 2)
        self.assertAlmostEqual(high_conf[0]["confidence"], 0.95, places=2)

    def test_filter_by_multiple_criteria(self) -> None:
        results = self.db.list_candidates(
            candidate_type="primitive", status="pending"
        )
        self.assertEqual(len(results), 3)

    def test_filter_returns_empty_for_no_matches(self) -> None:
        results = self.db.list_candidates(family="nonexistent")
        self.assertEqual(len(results), 0)

    def test_sort_by_recency(self) -> None:
        results = self.db.list_candidates(sort_by="created_at", sort_order="DESC")
        self.assertEqual(results[0]["family"], "robot_arm")
        self.assertEqual(results[-1]["family"], "wizard_robe")

    def test_sort_by_confidence(self) -> None:
        results = self.db.list_candidates(sort_by="confidence", sort_order="DESC")
        self.assertAlmostEqual(results[0]["confidence"], 0.95, places=2)
        self.assertAlmostEqual(results[-1]["confidence"], 0.5, places=2)

    def test_batch_select_for_approval(self) -> None:
        pending_primitives = self.db.list_candidates(
            candidate_type="primitive", status="pending"
        )
        candidate_ids = [c["id"] for c in pending_primitives]

        for cid in candidate_ids:
            self.db.record_decision(cid, "approve")

        approved = self.db.list_candidates(
            candidate_type="primitive", status="approved"
        )
        self.assertEqual(len(approved), 3)

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