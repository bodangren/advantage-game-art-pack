"""Shared critic result and policy decision schemas for all asset families."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any


class PolicyDecision(str, Enum):
    """Final routing decision for a candidate."""

    AUTO_APPROVED = "auto_approved"
    NEEDS_REVIEW = "needs_review"
    REGENERATE = "regenerate"


class CriticOutcome(str, Enum):
    """Pass/fail outcome for a single critic."""

    PASS = "pass"
    FAIL = "fail"


@dataclass(frozen=True)
class CriticEvidence:
    """Pointers and notes supporting a critic score."""

    metric_name: str
    candidate_value: float | None = None
    baseline_mean: float | None = None
    baseline_stdev: float | None = None
    closeness: float | None = None
    notes: str | None = None


@dataclass(frozen=True)
class CriticResult:
    """One critic's result envelope — shared across all families."""

    critic_name: str
    outcome: CriticOutcome
    score: float
    confidence: float | None = None
    reasons: tuple[str, ...] = ()
    evidence: tuple[CriticEvidence, ...] = ()
    recommended_next_action: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["outcome"] = self.outcome.value
        return payload


@dataclass(frozen=True)
class PolicyOutcome:
    """Result of the aggregation policy for a candidate."""

    decision: PolicyDecision
    policy_version: int
    deciding_critic: str | None = None
    override: bool = False
    override_reason: str | None = None
    summary: str | None = None

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["decision"] = self.decision.value
        return payload


def build_structural_result(
    *,
    passed: bool,
    score: float,
    details: dict[str, Any],
    reasons: tuple[str, ...] = (),
    confidence: float | None = None,
) -> CriticResult:
    """Builds a structural critic result from raw evaluation data."""

    outcome = CriticOutcome.PASS if passed else CriticOutcome.FAIL
    evidence: list[CriticEvidence] = []
    occupancy = details.get("occupancy")
    edge_density = details.get("edge_density")
    if occupancy is not None:
        evidence.append(CriticEvidence(metric_name="occupancy", candidate_value=occupancy))
    if edge_density is not None:
        evidence.append(CriticEvidence(metric_name="edge_density", candidate_value=edge_density))

    reason_str = details.get("reason")
    all_reasons = tuple(r for r in [reason_str] + list(reasons) if r)
    action = "pass" if passed else "adjust geometry or fill"
    return CriticResult(
        critic_name="structural",
        outcome=outcome,
        score=score,
        confidence=confidence,
        reasons=all_reasons or (),
        evidence=tuple(evidence),
        recommended_next_action=action if not passed else None,
    )


def build_style_result(
    *,
    passed: bool,
    score: float,
    baseline_metrics: dict[str, dict[str, float]],
    metric_evidence: dict[str, Any],
    confidence: float | None = None,
) -> CriticResult:
    """Builds a style critic result from raw evaluation data."""

    outcome = CriticOutcome.PASS if passed else CriticOutcome.FAIL
    evidence: list[CriticEvidence] = []
    for metric_name, ev in sorted(metric_evidence.items()):
        evidence.append(
            CriticEvidence(
                metric_name=metric_name,
                candidate_value=ev.get("candidate"),
                baseline_mean=ev.get("baseline_mean"),
                baseline_stdev=ev.get("baseline_stdev"),
                closeness=ev.get("closeness"),
            )
        )
    action = "pass" if passed else "refine palette or composition"
    return CriticResult(
        critic_name="style",
        outcome=outcome,
        score=score,
        confidence=confidence,
        reasons=(),
        evidence=tuple(evidence),
        recommended_next_action=action if not passed else None,
    )


def build_novelty_result(
    *,
    passed: bool,
    novelty_score: float,
    best_similarity: float,
    near_duplicate: bool,
    nearest_reference: dict[str, Any] | None,
    reference_count: int,
    near_duplicate_similarity: float,
    confidence: float | None = None,
) -> CriticResult:
    """Builds a novelty critic result from raw evaluation data."""

    outcome = CriticOutcome.PASS if passed else CriticOutcome.FAIL
    reasons: list[str] = []
    if near_duplicate:
        reasons.append("near-duplicate reference detected")
    elif not passed:
        reasons.append("novelty score below threshold")

    reference_notes = None
    if nearest_reference is not None:
        ref_id = nearest_reference.get("reference_id", "unknown")
        reference_notes = f"nearest: {ref_id}"

    evidence = [
        CriticEvidence(
            metric_name="novelty_score",
            candidate_value=novelty_score,
            notes=f"best_similarity={best_similarity:.4f}",
        ),
        CriticEvidence(
            metric_name="near_duplicate_similarity",
            candidate_value=best_similarity,
            baseline_mean=near_duplicate_similarity,
            notes=f"threshold={near_duplicate_similarity:.4f}",
        ),
    ]
    if reference_notes:
        evidence.append(CriticEvidence(metric_name="nearest_reference", notes=reference_notes))

    action = "pass" if passed else "introduce novel variation"
    return CriticResult(
        critic_name="novelty",
        outcome=outcome,
        score=novelty_score,
        confidence=confidence,
        reasons=tuple(reasons),
        evidence=tuple(evidence),
        recommended_next_action=action if not passed else None,
    )


def aggregate_policy_decision(
    critic_results: tuple[CriticResult, ...],
    *,
    policy_version: int = 1,
    override_decision: PolicyDecision | None = None,
    override_reason: str | None = None,
) -> PolicyOutcome:
    """Aggregates critic results into a final policy decision."""

    if override_decision is not None:
        return PolicyOutcome(
            decision=override_decision,
            policy_version=policy_version,
            override=True,
            override_reason=override_reason,
            summary=f"Override applied: {override_reason}",
        )

    structural = next((c for c in critic_results if c.critic_name == "structural"), None)
    style = next((c for c in critic_results if c.critic_name == "style"), None)
    novelty = next((c for c in critic_results if c.critic_name == "novelty"), None)

    if structural is None or style is None or novelty is None:
        return PolicyOutcome(
            decision=PolicyDecision.REGENERATE,
            policy_version=policy_version,
            deciding_critic=None,
            summary="Incomplete critic results — regenerate",
        )

    if structural.outcome == CriticOutcome.FAIL:
        deciding_critic = "structural"
        summary = f"Structural failed: {', '.join(structural.reasons) or structural.recommended_next_action or 'unknown'}"
        return PolicyOutcome(
            decision=PolicyDecision.REGENERATE,
            policy_version=policy_version,
            deciding_critic=deciding_critic,
            summary=summary,
        )

    if novelty.outcome == CriticOutcome.FAIL:
        deciding_critic = "novelty"
        summary = f"Novelty failed: {', '.join(novelty.reasons) or novelty.recommended_next_action or 'unknown'}"
        return PolicyOutcome(
            decision=PolicyDecision.REGENERATE,
            policy_version=policy_version,
            deciding_critic=deciding_critic,
            summary=summary,
        )

    avg_score = (style.score + novelty.score) / 2.0
    if avg_score >= 0.75:
        decision = PolicyDecision.AUTO_APPROVED
    elif avg_score >= 0.5:
        decision = PolicyDecision.NEEDS_REVIEW
    else:
        decision = PolicyDecision.REGENERATE

    summary = f"Scores: style={style.score:.3f}, novelty={novelty.score:.3f} → {decision.value}"
    return PolicyOutcome(
        decision=decision,
        policy_version=policy_version,
        deciding_critic="style+novelty",
        summary=summary,
    )
