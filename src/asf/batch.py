"""Batch generation job schema, state, and artifact layout."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
import json
from pathlib import Path
from typing import Any


class JobState(str, Enum):
    """Lifecycle state of a batch job."""

    PENDING = "pending"
    PLANNING = "planning"
    COMPILING = "compiling"
    CANDIDATE_LOOP = "candidate_loop"
    CRITIC_SCORING = "critic_scoring"
    REVIEW_ROUTING = "review_routing"
    COMPLETED = "completed"
    FAILED = "failed"


class AssetState(str, Enum):
    """Per-asset execution state."""

    PENDING = "pending"
    PLANNED = "planned"
    COMPILED = "compiled"
    CANDIDATES_GENERATED = "candidates_generated"
    SCORED = "scored"
    AUTO_APPROVED = "auto_approved"
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"
    FAILED = "failed"


@dataclass(frozen=True)
class VersionInfo:
    """Version pin for a subsystem."""

    name: str
    version: int | str
    path: Path | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "path": str(self.path) if self.path else None,
        }


@dataclass(frozen=True)
class RetryPolicy:
    """Bounded retry configuration."""

    max_planner_retries: int = 2
    max_compile_retries: int = 2
    max_candidate_loop_retries: int = 1

    def to_dict(self) -> dict[str, Any]:
        return {
            "max_planner_retries": self.max_planner_retries,
            "max_compile_retries": self.max_compile_retries,
            "max_candidate_loop_retries": self.max_candidate_loop_retries,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> RetryPolicy:
        return cls(
            max_planner_retries=data.get("max_planner_retries", 2),
            max_compile_retries=data.get("max_compile_retries", 2),
            max_candidate_loop_retries=data.get("max_candidate_loop_retries", 1),
        )


@dataclass
class AssetExecutionState:
    """Persisted per-asset execution state."""

    family: str
    program_index: int
    state: AssetState = AssetState.PENDING
    program_path: Path | None = None
    candidate_dir: Path | None = None
    critic_result_path: Path | None = None
    selected_path: Path | None = None
    review_decision: str | None = None
    failure_reason: str | None = None
    planner_retries: int = 0
    compile_retries: int = 0
    candidate_loop_retries: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "family": self.family,
            "program_index": self.program_index,
            "state": self.state.value,
            "program_path": str(self.program_path) if self.program_path else None,
            "candidate_dir": str(self.candidate_dir) if self.candidate_dir else None,
            "critic_result_path": str(self.critic_result_path) if self.critic_result_path else None,
            "selected_path": str(self.selected_path) if self.selected_path else None,
            "review_decision": self.review_decision,
            "failure_reason": self.failure_reason,
            "planner_retries": self.planner_retries,
            "compile_retries": self.compile_retries,
            "candidate_loop_retries": self.candidate_loop_retries,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> AssetExecutionState:
        return cls(
            family=data["family"],
            program_index=data["program_index"],
            state=AssetState(data.get("state", AssetState.PENDING.value)),
            program_path=Path(data["program_path"]) if data.get("program_path") else None,
            candidate_dir=Path(data["candidate_dir"]) if data.get("candidate_dir") else None,
            critic_result_path=Path(data["critic_result_path"]) if data.get("critic_result_path") else None,
            selected_path=Path(data["selected_path"]) if data.get("selected_path") else None,
            review_decision=data.get("review_decision"),
            failure_reason=data.get("failure_reason"),
            planner_retries=data.get("planner_retries", 0),
            compile_retries=data.get("compile_retries", 0),
            candidate_loop_retries=data.get("candidate_loop_retries", 0),
        )


@dataclass
class BatchJob:
    """Batch generation job record."""

    job_id: str
    state: JobState = JobState.PENDING
    brief: dict[str, Any] = field(default_factory=dict)
    families: tuple[str, ...] = ()
    counts: dict[str, int] = field(default_factory=dict)
    theme_pack: dict[str, Any] | None = None
    style_pack: str | None = None
    planner_version: VersionInfo | None = None
    compiler_versions: tuple[VersionInfo, ...] = ()
    candidate_loop_version: VersionInfo | None = None
    critic_policy_version: VersionInfo | None = None
    output_root: Path | None = None
    retry_policy: RetryPolicy = field(default_factory=RetryPolicy)
    asset_states: tuple[AssetExecutionState, ...] = ()
    created_at: str | None = None
    updated_at: str | None = None

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {
            "job_id": self.job_id,
            "state": self.state.value,
            "brief": self.brief,
            "families": self.families,
            "counts": self.counts,
            "theme_pack": self.theme_pack,
            "style_pack": self.style_pack,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if self.planner_version:
            result["planner_version"] = self.planner_version.to_dict()
        result["compiler_versions"] = [v.to_dict() for v in self.compiler_versions]
        if self.candidate_loop_version:
            result["candidate_loop_version"] = self.candidate_loop_version.to_dict()
        if self.critic_policy_version:
            result["critic_policy_version"] = self.critic_policy_version.to_dict()
        result["retry_policy"] = self.retry_policy.to_dict()
        result["asset_states"] = [a.to_dict() for a in self.asset_states]
        result["output_root"] = str(self.output_root) if self.output_root else None
        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> BatchJob:
        pv = data.get("planner_version")
        planner_version = VersionInfo(**pv) if pv else None
        cv = tuple(VersionInfo(**v) for v in data.get("compiler_versions", ()))
        clv = data.get("candidate_loop_version")
        candidate_loop_version = VersionInfo(**clv) if clv else None
        cpv = data.get("critic_policy_version")
        critic_policy_version = VersionInfo(**cpv) if cpv else None
        rp = RetryPolicy(**data.get("retry_policy", {}))
        asset_states = tuple(
            AssetExecutionState.from_dict(a) for a in data.get("asset_states", ())
        )
        return cls(
            job_id=data["job_id"],
            state=JobState(data.get("state", JobState.PENDING.value)),
            brief=data.get("brief", {}),
            families=tuple(data.get("families", ())),
            counts=data.get("counts", {}),
            theme_pack=data.get("theme_pack"),
            style_pack=data.get("style_pack"),
            planner_version=planner_version,
            compiler_versions=cv,
            candidate_loop_version=candidate_loop_version,
            critic_policy_version=critic_policy_version,
            output_root=Path(data["output_root"]) if data.get("output_root") else None,
            retry_policy=rp,
            asset_states=asset_states,
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )


def _artifact_root(job_root: Path, job_id: str) -> Path:
    return job_root / job_id


def planner_manifest_path(job_root: Path, job_id: str) -> Path:
    return _artifact_root(job_root, job_id) / "planner_manifest.json"


def asset_program_path(job_root: Path, job_id: str, family: str, index: int) -> Path:
    return _artifact_root(job_root, job_id) / family / f"program_{index:03d}.json"


def asset_candidates_dir(job_root: Path, job_id: str, family: str, index: int) -> Path:
    return _artifact_root(job_root, job_id) / family / f"candidates_{index:03d}"


def asset_selected_dir(job_root: Path, job_id: str, family: str, index: int) -> Path:
    return _artifact_root(job_root, job_id) / family / f"selected_{index:03d}"


def asset_critic_result_path(
    job_root: Path, job_id: str, family: str, index: int
) -> Path:
    return _artifact_root(job_root, job_id) / family / f"critic_result_{index:03d}.json"


def review_decisions_path(job_root: Path, job_id: str) -> Path:
    return _artifact_root(job_root, job_id) / "review_decisions.json"


def job_state_path(job_root: Path, job_id: str) -> Path:
    return _artifact_root(job_root, job_id) / "job_state.json"


def release_bundle_path(job_root: Path, job_id: str) -> Path:
    return job_root / f"{job_id}_bundle"


@dataclass
class ReleaseBundleManifest:
    """Release bundle manifest with provenance and audit data."""

    job_id: str
    bundle_id: str
    created_at: str
    families: tuple[str, ...]
    accepted_count: int
    review_required_count: int
    rejected_count: int
    regenerated_count: int
    planner_version: dict[str, Any] | None = None
    compiler_versions: tuple[dict[str, Any], ...] = ()
    candidate_loop_version: dict[str, Any] | None = None
    critic_policy_version: dict[str, Any] | None = None
    provenance: tuple[dict[str, Any], ...] = ()
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {
            "job_id": self.job_id,
            "bundle_id": self.bundle_id,
            "created_at": self.created_at,
            "families": self.families,
            "accepted_count": self.accepted_count,
            "review_required_count": self.review_required_count,
            "rejected_count": self.rejected_count,
            "regenerated_count": self.regenerated_count,
            "provenance": list(self.provenance),
            "metadata": dict(self.metadata),
        }
        if self.planner_version:
            result["planner_version"] = (
                asdict(self.planner_version) if isinstance(self.planner_version, VersionInfo) else self.planner_version
            )
        result["compiler_versions"] = [
            asdict(v) if isinstance(v, VersionInfo) else v for v in self.compiler_versions
        ]
        if self.candidate_loop_version:
            result["candidate_loop_version"] = (
                asdict(self.candidate_loop_version) if isinstance(self.candidate_loop_version, VersionInfo) else self.candidate_loop_version
            )
        if self.critic_policy_version:
            result["critic_policy_version"] = (
                asdict(self.critic_policy_version) if isinstance(self.critic_policy_version, VersionInfo) else self.critic_policy_version
            )
        return result

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ReleaseBundleManifest:
        pv = data.get("planner_version")
        cv = tuple(data.get("compiler_versions", ()))
        clv = data.get("candidate_loop_version")
        cpv = data.get("critic_policy_version")
        provenance = tuple(data.get("provenance", ()))
        return cls(
            job_id=data["job_id"],
            bundle_id=data["bundle_id"],
            created_at=data["created_at"],
            families=tuple(data.get("families", ())),
            accepted_count=data.get("accepted_count", 0),
            review_required_count=data.get("review_required_count", 0),
            rejected_count=data.get("rejected_count", 0),
            regenerated_count=data.get("regenerated_count", 0),
            planner_version=pv,
            compiler_versions=cv,
            candidate_loop_version=clv,
            critic_policy_version=cpv,
            provenance=provenance,
            metadata=data.get("metadata", {}),
        )


def write_job_state(job_root: Path, job: BatchJob) -> None:
    path = job_state_path(job_root, job.job_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = job.to_dict()
    serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    path.write_text(serialized, encoding="utf-8")


def load_job_state(job_root: Path, job_id: str) -> BatchJob:
    path = job_state_path(job_root, job_id)
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return BatchJob.from_dict(data)


def write_review_decisions(
    job_root: Path, job_id: str, decisions: list[dict[str, Any]]
) -> None:
    path = review_decisions_path(job_root, job_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps({"decisions": decisions}, indent=2, sort_keys=True) + "\n"
    path.write_text(serialized, encoding="utf-8")


def load_review_decisions(job_root: Path, job_id: str) -> list[dict[str, Any]]:
    path = review_decisions_path(job_root, job_id)
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data.get("decisions", [])
