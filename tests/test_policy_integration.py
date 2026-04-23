"""Tests for policy integration with the review queue."""

from __future__ import annotations

import json
import os
import tempfile
import unittest

from review_app.db import init_db
from review_app.integrations import (
    attach_critic_results,
    create_compiled_asset_candidate,
    create_primitive_candidate,
    record_policy_decision,
)


class PolicyIntegrationTest(unittest.TestCase):
    """Validates that policy decisions and critic results integrate with the review DB."""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tmp.name, "test_review.db")
        init_db(self.db_path)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_record_policy_decision_auto_approved(self) -> None:
        cid = create_primitive_candidate(
            family="character_sheet",
            source_program="knight_guard",
            rendered_files=["output/sheet.png"],
            critic_scores={"palette": 0.9, "style": 0.85},
            db_path=self.db_path,
        )
        record_policy_decision(
            cid,
            policy_decision="auto_approved",
            policy_version=1,
            deciding_critic="style+novelty",
            override=False,
            override_reason=None,
            summary="Scores: style=0.85, novelty=0.80 → auto_approved",
            db_path=self.db_path,
        )
        from review_app.db import Database
        db = Database(self.db_path)
        candidate = db.get_candidate(cid)
        refs = json.loads(candidate["nearest_references"])
        policy_entry = next(r for r in refs if "policy_decision" in r)
        self.assertEqual(policy_entry["policy_decision"], "auto_approved")
        self.assertEqual(policy_entry["deciding_critic"], "style+novelty")

    def test_record_policy_decision_regenerate_with_override(self) -> None:
        cid = create_compiled_asset_candidate(
            family="background_scene",
            source_program="library_room",
            source_manifest={"template": "library_room"},
            rendered_files=["output/scene.png"],
            critic_scores={"structural": 0.0, "style": 0.8},
            db_path=self.db_path,
        )
        record_policy_decision(
            cid,
            policy_decision="regenerate",
            policy_version=1,
            deciding_critic="structural",
            override=True,
            override_reason="creative direction override — acceptable silhouette",
            summary="Structural failed: occupancy below threshold",
            db_path=self.db_path,
        )
        from review_app.db import Database
        db = Database(self.db_path)
        candidate = db.get_candidate(cid)
        refs = json.loads(candidate["nearest_references"])
        policy_entry = next(r for r in refs if "policy_decision" in r)
        self.assertEqual(policy_entry["policy_decision"], "regenerate")
        self.assertTrue(policy_entry["override"])
        self.assertIn("creative direction", policy_entry["override_reason"])

    def test_attach_critic_results_updates_scores(self) -> None:
        cid = create_primitive_candidate(
            family="wizard_robe",
            source_program="robe_variant",
            rendered_files=["output/robe.png"],
            critic_scores={},
            db_path=self.db_path,
        )
        attach_critic_results(
            cid,
            {
                "structural": {"score": 1.0, "passed": True},
                "style": {"score": 0.82, "passed": True},
                "novelty": {"score": 0.75, "passed": True, "nearest_reference": None},
            },
            db_path=self.db_path,
        )
        from review_app.db import Database
        db = Database(self.db_path)
        candidate = db.get_candidate(cid)
        scores = json.loads(candidate["critic_scores"])
        self.assertEqual(scores["structural"], 1.0)
        self.assertEqual(scores["style"], 0.82)
        self.assertEqual(scores["novelty"], 0.75)

    def test_policy_decision_unknown_candidate_raises(self) -> None:
        with self.assertRaises(ValueError):
            record_policy_decision(
                "not-a-real-id",
                policy_decision="auto_approved",
                policy_version=1,
                deciding_critic=None,
                override=False,
                override_reason=None,
                summary="test",
                db_path=self.db_path,
            )


if __name__ == "__main__":
    unittest.main()
