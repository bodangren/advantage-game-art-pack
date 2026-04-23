"""Tests for critic result schemas and policy decision aggregation."""

from __future__ import annotations

import unittest

from asf.critic_policy import (
    CriticEvidence,
    CriticOutcome,
    CriticResult,
    PolicyDecision,
    PolicyOutcome,
    aggregate_policy_decision,
    build_novelty_result,
    build_style_result,
    build_structural_result,
)


class CriticResultSchemaTest(unittest.TestCase):
    """Validates the shared critic result envelope."""

    def test_structural_result_pass(self) -> None:
        result = build_structural_result(
            passed=True,
            score=1.0,
            details={"occupancy": 0.12, "edge_density": 0.18},
        )
        self.assertEqual(result.critic_name, "structural")
        self.assertEqual(result.outcome, CriticOutcome.PASS)
        self.assertEqual(result.score, 1.0)
        self.assertFalse(result.reasons)

    def test_structural_result_fail(self) -> None:
        result = build_structural_result(
            passed=False,
            score=0.0,
            details={"reason": "occupancy below threshold", "occupancy": 0.01},
        )
        self.assertEqual(result.outcome, CriticOutcome.FAIL)
        self.assertIn("occupancy below threshold", result.reasons)
        self.assertEqual(result.recommended_next_action, "adjust geometry or fill")

    def test_style_result_pass(self) -> None:
        baseline = {"color_count": {"mean": 5.0, "stdev": 1.5}}
        evidence = {"color_count": {"candidate": 5, "baseline_mean": 5.0, "baseline_stdev": 1.5, "closeness": 1.0}}
        result = build_style_result(
            passed=True,
            score=0.85,
            baseline_metrics=baseline,
            metric_evidence=evidence,
        )
        self.assertEqual(result.outcome, CriticOutcome.PASS)
        self.assertEqual(len(result.evidence), 1)
        self.assertIsNone(result.recommended_next_action)

    def test_style_result_fail(self) -> None:
        result = build_style_result(
            passed=False,
            score=0.3,
            baseline_metrics={},
            metric_evidence={},
        )
        self.assertEqual(result.outcome, CriticOutcome.FAIL)
        self.assertEqual(result.recommended_next_action, "refine palette or composition")

    def test_novelty_result_pass(self) -> None:
        result = build_novelty_result(
            passed=True,
            novelty_score=0.75,
            best_similarity=0.25,
            near_duplicate=False,
            nearest_reference={"reference_id": "ref_001"},
            reference_count=4,
            near_duplicate_similarity=0.94,
        )
        self.assertEqual(result.outcome, CriticOutcome.PASS)
        self.assertFalse(result.reasons)

    def test_novelty_result_near_duplicate(self) -> None:
        result = build_novelty_result(
            passed=False,
            novelty_score=0.05,
            best_similarity=0.96,
            near_duplicate=True,
            nearest_reference={"reference_id": "demo_knight"},
            reference_count=4,
            near_duplicate_similarity=0.94,
        )
        self.assertEqual(result.outcome, CriticOutcome.FAIL)
        self.assertIn("near-duplicate reference detected", result.reasons)

    def test_to_dict_serialization(self) -> None:
        result = CriticResult(
            critic_name="structural",
            outcome=CriticOutcome.PASS,
            score=1.0,
            confidence=0.95,
            reasons=(),
            evidence=(
                CriticEvidence(metric_name="occupancy", candidate_value=0.12),
            ),
        )
        d = result.to_dict()
        self.assertEqual(d["outcome"], "pass")
        self.assertEqual(d["critic_name"], "structural")


class PolicyDecisionTest(unittest.TestCase):
    """Validates the policy aggregation and routing decisions."""

    def test_auto_approved_high_scores(self) -> None:
        structural = build_structural_result(passed=True, score=1.0, details={})
        style = build_style_result(passed=True, score=0.8, baseline_metrics={}, metric_evidence={})
        novelty = build_novelty_result(passed=True, novelty_score=0.8, best_similarity=0.2, near_duplicate=False, nearest_reference=None, reference_count=1, near_duplicate_similarity=0.94)
        policy = aggregate_policy_decision((structural, style, novelty))
        self.assertEqual(policy.decision, PolicyDecision.AUTO_APPROVED)
        self.assertEqual(policy.deciding_critic, "style+novelty")

    def test_needs_review_mid_scores(self) -> None:
        structural = build_structural_result(passed=True, score=1.0, details={})
        style = build_style_result(passed=True, score=0.6, baseline_metrics={}, metric_evidence={})
        novelty = build_novelty_result(passed=True, novelty_score=0.55, best_similarity=0.45, near_duplicate=False, nearest_reference=None, reference_count=1, near_duplicate_similarity=0.94)
        policy = aggregate_policy_decision((structural, style, novelty))
        self.assertEqual(policy.decision, PolicyDecision.NEEDS_REVIEW)

    def test_regenerate_structural_fail(self) -> None:
        structural = build_structural_result(passed=False, score=0.0, details={"reason": "occupancy below threshold"})
        style = build_style_result(passed=True, score=0.8, baseline_metrics={}, metric_evidence={})
        novelty = build_novelty_result(passed=True, novelty_score=0.8, best_similarity=0.2, near_duplicate=False, nearest_reference=None, reference_count=1, near_duplicate_similarity=0.94)
        policy = aggregate_policy_decision((structural, style, novelty))
        self.assertEqual(policy.decision, PolicyDecision.REGENERATE)
        self.assertEqual(policy.deciding_critic, "structural")

    def test_regenerate_novelty_fail(self) -> None:
        structural = build_structural_result(passed=True, score=1.0, details={})
        style = build_style_result(passed=True, score=0.8, baseline_metrics={}, metric_evidence={})
        novelty = build_novelty_result(passed=False, novelty_score=0.1, best_similarity=0.95, near_duplicate=True, nearest_reference={"reference_id": "demo_knight"}, reference_count=1, near_duplicate_similarity=0.94)
        policy = aggregate_policy_decision((structural, style, novelty))
        self.assertEqual(policy.decision, PolicyDecision.REGENERATE)
        self.assertEqual(policy.deciding_critic, "novelty")

    def test_regenerate_low_scores(self) -> None:
        structural = build_structural_result(passed=True, score=1.0, details={})
        style = build_style_result(passed=True, score=0.3, baseline_metrics={}, metric_evidence={})
        novelty = build_novelty_result(passed=True, novelty_score=0.2, best_similarity=0.8, near_duplicate=False, nearest_reference=None, reference_count=1, near_duplicate_similarity=0.94)
        policy = aggregate_policy_decision((structural, style, novelty))
        self.assertEqual(policy.decision, PolicyDecision.REGENERATE)

    def test_override_decision(self) -> None:
        structural = build_structural_result(passed=False, score=0.0, details={"reason": "fail"})
        style = build_style_result(passed=True, score=0.8, baseline_metrics={}, metric_evidence={})
        novelty = build_novelty_result(passed=True, novelty_score=0.8, best_similarity=0.2, near_duplicate=False, nearest_reference=None, reference_count=1, near_duplicate_similarity=0.94)
        policy = aggregate_policy_decision(
            (structural, style, novelty),
            override_decision=PolicyDecision.NEEDS_REVIEW,
            override_reason="manual override for creative direction",
        )
        self.assertEqual(policy.decision, PolicyDecision.NEEDS_REVIEW)
        self.assertTrue(policy.override)
        self.assertEqual(policy.override_reason, "manual override for creative direction")

    def test_incomplete_critics_regenerate(self) -> None:
        structural = build_structural_result(passed=True, score=1.0, details={})
        policy = aggregate_policy_decision((structural,))
        self.assertEqual(policy.decision, PolicyDecision.REGENERATE)
        self.assertIn("Incomplete", policy.summary)


if __name__ == "__main__":
    unittest.main()
