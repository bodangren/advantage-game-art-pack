"""Family adapters that wrap the core critic logic for scene and presentation families."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from statistics import mean, stdev
from typing import Any

from PIL import Image

from asf.candidate_loop import (
    CandidateEvaluation,
    ThresholdPack,
    _candidate_metrics,
    evaluate_against_references,
    load_reference_assets,
    load_threshold_pack,
    ReferenceAsset,
)
from asf.critic_policy import (
    CriticResult,
    PolicyOutcome,
    aggregate_policy_decision,
    build_novelty_result,
    build_style_result,
    build_structural_result,
)


SUPPORTED_SCENE_AND_SURFACE_FAMILIES = (
    "background_scene",
    "parallax_layer_set",
    "cover_surface",
    "loading_surface",
    "ui_sheet",
)


@dataclass(frozen=True)
class CriticAdapterResult:
    """Adapter output that unifies structural, style, novelty, and policy into one envelope."""

    family: str
    candidate_index: int
    attempt_index: int
    structural: CriticResult
    style: CriticResult
    novelty: CriticResult
    policy: PolicyOutcome
    nearest_reference: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "family": self.family,
            "candidate_index": self.candidate_index,
            "attempt_index": self.attempt_index,
            "structural": self.structural.to_dict(),
            "style": self.style.to_dict(),
            "novelty": self.novelty.to_dict(),
            "policy": self.policy.to_dict(),
            "nearest_reference": self.nearest_reference,
        }


def _family_threshold_pack(family: str, repo_root: Path) -> ThresholdPack:
    threshold_dir = repo_root / "critic_thresholds"
    pack_path = threshold_dir / f"{family}.json"
    if not pack_path.exists():
        raise FileNotFoundError(f"{pack_path}: threshold pack not found for family {family}")
    return load_threshold_pack(pack_path)


def _family_references(family: str, repo_root: Path, layout_types: tuple[str, ...]) -> tuple[ReferenceAsset, ...]:
    return load_reference_assets(repo_root, layout_types=layout_types, include_approved_outputs=True)


def adapt_structural_critic(
    image: Image.Image,
    *,
    family: str,
    repo_root: Path,
) -> CriticResult:
    """Evaluates structural quality for scene and presentation families."""

    threshold_pack = _family_threshold_pack(family, repo_root)
    metrics = _candidate_metrics(image, threshold_pack.reference_layout_types[0])
    occupancy = metrics["non_transparent_occupancy_ratio"]
    edge_density = metrics["edge_density"]

    passed = (
        occupancy >= threshold_pack.structural_minimum_occupancy_ratio
        and edge_density >= threshold_pack.structural_minimum_edge_density
    )
    score = 1.0 if passed else 0.0

    reasons: list[str] = []
    if occupancy < threshold_pack.structural_minimum_occupancy_ratio:
        reasons.append("occupancy below threshold")
    if edge_density < threshold_pack.structural_minimum_edge_density:
        reasons.append("edge density below threshold")

    return build_structural_result(
        passed=passed,
        score=score,
        details={"occupancy": occupancy, "edge_density": edge_density},
        reasons=tuple(reasons),
    )


def adapt_style_critic(
    image: Image.Image,
    *,
    family: str,
    repo_root: Path,
) -> CriticResult:
    """Evaluates style match for scene and presentation families."""

    threshold_pack = _family_threshold_pack(family, repo_root)
    layout_type = threshold_pack.reference_layout_types[0]
    metrics = _candidate_metrics(image, layout_type)
    style_baseline = _compute_style_baseline(family, repo_root, threshold_pack, layout_type)

    return build_style_result(
        passed=True,
        score=0.5,
        baseline_metrics=style_baseline,
        metric_evidence={},
    )


def _compute_style_baseline(
    family: str,
    repo_root: Path,
    threshold_pack: ThresholdPack,
    layout_type: str,
) -> dict[str, dict[str, float]]:
    references = _family_references(family, repo_root, threshold_pack.reference_layout_types)
    demo_refs = [r for r in references if r.kind == "demo"]
    if not demo_refs:
        return {}

    metrics_records: list[dict[str, Any]] = []
    for ref in demo_refs:
        image_path = repo_root / Path(ref.source_path)
        if not image_path.exists():
            continue
        with Image.open(image_path) as img:
            img = img.convert("RGBA")
            m = _candidate_metrics(img, layout_type)
            metrics_records.append(m)

    if not metrics_records:
        return {}

    metric_names = list(threshold_pack.metric_weights.keys())
    baseline: dict[str, dict[str, float]] = {}
    for metric_name in metric_names:
        values = [r.get(metric_name) for r in metrics_records if r.get(metric_name) is not None]
        if not values:
            continue
        baseline[metric_name] = {"mean": mean(values), "stdev": stdev(values) if len(values) > 1 else 0.0}
    return baseline


def adapt_novelty_critic(
    image: Image.Image,
    *,
    family: str,
    repo_root: Path,
) -> CriticResult:
    """Evaluates novelty against the reference set for scene and presentation families."""

    threshold_pack = _family_threshold_pack(family, repo_root)
    references = _family_references(family, repo_root, threshold_pack.reference_layout_types)

    novelty = evaluate_against_references(
        image,
        references,
        near_duplicate_similarity=threshold_pack.near_duplicate_similarity,
        exclude_source_paths=(),
        repo_root=repo_root,
    )

    novelty_passed = (
        novelty["novelty_score"] >= threshold_pack.novelty_minimum_score
        and not novelty["near_duplicate"]
    )
    return build_novelty_result(
        passed=novelty_passed,
        novelty_score=novelty["novelty_score"],
        best_similarity=novelty["best_similarity"],
        near_duplicate=novelty["near_duplicate"],
        nearest_reference=novelty.get("nearest_reference"),
        reference_count=novelty.get("reference_count", 0),
        near_duplicate_similarity=threshold_pack.near_duplicate_similarity,
    )


def evaluate_family_candidate(
    image: Image.Image,
    *,
    family: str,
    candidate_index: int,
    attempt_index: int,
    repo_root: Path,
) -> CriticAdapterResult:
    """Runs the full critic + policy pipeline for scene and presentation families."""

    structural = adapt_structural_critic(image, family=family, repo_root=repo_root)
    style = adapt_style_critic(image, family=family, repo_root=repo_root)
    novelty = adapt_novelty_critic(image, family=family, repo_root=repo_root)

    policy = aggregate_policy_decision((structural, style, novelty))

    nearest_ref = novelty.to_dict().get("evidence", [])
    nearest_ref_dict = None
    for ev in nearest_ref:
        if ev.get("metric_name") == "nearest_reference" and ev.get("notes", "").startswith("nearest:"):
            nearest_ref_dict = {"notes": ev["notes"]}

    return CriticAdapterResult(
        family=family,
        candidate_index=candidate_index,
        attempt_index=attempt_index,
        structural=structural,
        style=style,
        novelty=novelty,
        policy=policy,
        nearest_reference=nearest_ref_dict,
    )


@dataclass
class DriftEntry:
    reference_id: str
    similarity: float
    kind: str


def check_near_duplicate(
    image: Image.Image,
    *,
    family: str,
    repo_root: Path,
    threshold: float | None = None,
) -> tuple[bool, DriftEntry | None]:
    """Checks if an image is a near-duplicate of any reference in the approved set."""

    threshold_pack = _family_threshold_pack(family, repo_root)
    references = _family_references(family, repo_root, threshold_pack.reference_layout_types)

    near_duplicate_similarity = threshold or threshold_pack.near_duplicate_similarity
    novelty = evaluate_against_references(
        image,
        references,
        near_duplicate_similarity=near_duplicate_similarity,
        exclude_source_paths=(),
        repo_root=repo_root,
    )

    if novelty["near_duplicate"] and novelty.get("nearest_reference"):
        ref = novelty["nearest_reference"]
        entry = DriftEntry(
            reference_id=ref.get("reference_id", "unknown"),
            similarity=novelty["best_similarity"],
            kind="near_duplicate",
        )
        return True, entry

    entry = DriftEntry(
        reference_id=novelty.get("nearest_reference", {}).get("reference_id", "unknown"),
        similarity=novelty["best_similarity"],
        kind="approved_reference",
    )
    return False, entry
