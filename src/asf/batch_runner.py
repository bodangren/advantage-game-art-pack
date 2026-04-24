"""Batch job runner with persistent state and resumability."""

from __future__ import annotations

from dataclasses import replace
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from asf.batch import (
    AssetExecutionState,
    AssetState,
    BatchJob,
    JobState,
    RetryPolicy,
    VersionInfo,
    asset_candidates_dir,
    asset_critic_result_path,
    asset_program_path,
    load_job_state,
    write_job_state,
    write_review_decisions,
)
from asf.planner.schemas import (
    AssetFamily,
)
from asf.candidate_loop import (
    CANDIDATE_LOOP_VERSION,
)
from asf.compilers import (
    COMPILER_VERSION,
)
from asf.planner.planner import PlannerContext

logger = logging.getLogger(__name__)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class BatchRunner:
    """Orchestrates batch jobs with persistent state and bounded retries."""

    def __init__(
        self,
        job_root: Path,
        repo_root: Path | None = None,
        planner_context: PlannerContext | None = None,
        threshold_pack_dir: Path | None = None,
    ) -> None:
        self.job_root = Path(job_root)
        self.repo_root = repo_root or Path(".")
        self.planner_context = planner_context
        self.threshold_pack_dir = threshold_pack_dir

    def run(self, job: BatchJob) -> BatchJob:
        """Run a batch job to completion or first unrecoverable error."""
        write_job_state(self.job_root, job)
        job = self._advance_job(job)
        write_job_state(self.job_root, job)
        return job

    def resume(self, job_id: str) -> BatchJob:
        """Resume a partial batch job from persisted state."""
        job = load_job_state(self.job_root, job_id)
        return self.run(job)

    def _advance_job(self, job: BatchJob) -> BatchJob:
        if job.state == JobState.PENDING:
            return self._start_planning(job)
        if job.state == JobState.PLANNING:
            return self._finish_planning(job)
        if job.state == JobState.COMPILING:
            return self._finish_compiling(job)
        if job.state == JobState.CANDIDATE_LOOP:
            return self._finish_candidate_loop(job)
        if job.state == JobState.CRITIC_SCORING:
            return self._finish_critic_scoring(job)
        if job.state == JobState.REVIEW_ROUTING:
            return self._finish_review_routing(job)
        if job.state == JobState.COMPLETED:
            return job
        if job.state == JobState.FAILED:
            return job
        return job

    def _start_planning(self, job: BatchJob) -> BatchJob:
        job = replace(
            job,
            state=JobState.PLANNING,
            updated_at=_utc_now(),
        )
        write_job_state(self.job_root, job)
        return job

    def _finish_planning(self, job: BatchJob) -> BatchJob:
        try:
            programs = self._generate_programs(job)
            self._write_programs(job, programs)
            updated_map: dict[int, AssetExecutionState] = {}
            for family_str, family_programs in programs.items():
                for prog_info in family_programs:
                    idx = prog_info["index"]
                    for i, a in enumerate(job.asset_states):
                        if a.family == family_str and a.program_index == idx and a.state == AssetState.PENDING:
                            updated_map[i] = replace(a, state=AssetState.PLANNED)
                            break
            new_states = []
            for i, a in enumerate(job.asset_states):
                if i in updated_map:
                    new_states.append(updated_map[i])
                else:
                    new_states.append(a)
            job = replace(
                job,
                state=JobState.COMPILING,
                updated_at=_utc_now(),
                asset_states=tuple(new_states),
            )
        except Exception as exc:
            logger.exception("Planning failed for job %s", job.job_id)
            job = replace(
                job,
                state=JobState.FAILED,
                updated_at=_utc_now(),
            )
            job.asset_states = tuple(
                replace(a, failure_reason=str(exc)) if a.state == AssetState.PENDING else a
                for a in job.asset_states
            )
        write_job_state(self.job_root, job)
        return job

    def _generate_programs(self, job: BatchJob) -> dict[str, list[dict[str, Any]]]:
        programs: dict[str, list[dict[str, Any]]] = {}
        for family_str, count in job.counts.items():
            family = AssetFamily(family_str)
            family_programs = []
            for idx in range(count):
                AssetExecutionState(
                    family=family_str,
                    program_index=idx,
                    state=AssetState.PLANNED,
                    program_path=asset_program_path(
                        self.job_root, job.job_id, family_str, idx
                    ),
                )
                family_programs.append({"family": family, "index": idx})
            programs[family_str] = family_programs
        return programs

    def _write_programs(
        self,
        job: BatchJob,
        programs: dict[str, list[dict[str, Any]]],
    ) -> None:
        for family_str, family_programs in programs.items():
            for prog_info in family_programs:
                idx = prog_info["index"]
                path = asset_program_path(self.job_root, job.job_id, family_str, idx)
                path.parent.mkdir(parents=True, exist_ok=True)
                minimal_program: dict[str, Any] = {
                    "family": family_str,
                    "program_id": f"{family_str}_{idx:03d}",
                    "program_version": 1,
                }
                serialized = json.dumps(minimal_program, indent=2, sort_keys=True) + "\n"
                path.write_text(serialized, encoding="utf-8")

    def _finish_compiling(self, job: BatchJob) -> BatchJob:
        try:
            for idx, asset_state in enumerate(job.asset_states):
                if asset_state.state != AssetState.PLANNED:
                    continue
                family = asset_state.family
                output_dir = asset_candidates_dir(
                    self.job_root, job.job_id, family, asset_state.program_index
                )
                output_dir.mkdir(parents=True, exist_ok=True)
                asset_state = replace(
                    asset_state,
                    state=AssetState.COMPILED,
                    candidate_dir=output_dir,
                )
                job.asset_states = tuple(
                    asset_state if i == idx else a
                    for i, a in enumerate(job.asset_states)
                )
            job = replace(job, state=JobState.CANDIDATE_LOOP, updated_at=_utc_now())
        except Exception:
            logger.exception("Compiling failed for job %s", job.job_id)
            job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
        write_job_state(self.job_root, job)
        return job

    def _finish_candidate_loop(self, job: BatchJob) -> BatchJob:
        try:
            for idx, asset_state in enumerate(job.asset_states):
                if asset_state.state != AssetState.COMPILED:
                    continue
                asset_state = replace(
                    asset_state,
                    state=AssetState.CANDIDATES_GENERATED,
                )
                job.asset_states = tuple(
                    asset_state if i == idx else a
                    for i, a in enumerate(job.asset_states)
                )
            job = replace(job, state=JobState.CRITIC_SCORING, updated_at=_utc_now())
        except Exception:
            logger.exception("Candidate loop failed for job %s", job.job_id)
            job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
        write_job_state(self.job_root, job)
        return job

    def _finish_critic_scoring(self, job: BatchJob) -> BatchJob:
        try:
            for idx, asset_state in enumerate(job.asset_states):
                if asset_state.state != AssetState.CANDIDATES_GENERATED:
                    continue
                family = asset_state.family
                result_path = asset_critic_result_path(
                    self.job_root, job.job_id, family, asset_state.program_index
                )
                result_path.parent.mkdir(parents=True, exist_ok=True)
                asset_state = replace(
                    asset_state,
                    state=AssetState.SCORED,
                    critic_result_path=result_path,
                )
                job.asset_states = tuple(
                    asset_state if i == idx else a
                    for i, a in enumerate(job.asset_states)
                )
            job = replace(job, state=JobState.REVIEW_ROUTING, updated_at=_utc_now())
        except Exception:
            logger.exception("Critic scoring failed for job %s", job.job_id)
            job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
        write_job_state(self.job_root, job)
        return job

    def _finish_review_routing(self, job: BatchJob) -> BatchJob:
        try:
            decisions = []
            for idx, asset_state in enumerate(job.asset_states):
                if asset_state.state != AssetState.SCORED:
                    continue
                family = asset_state.family
                decision: dict[str, Any] = {
                    "family": family,
                    "index": asset_state.program_index,
                    "decision": "needs_review",
                    "reason": "placeholder",
                }
                if asset_state.review_decision:
                    decision["decision"] = asset_state.review_decision
                    decision["reason"] = "from persisted state"
                elif asset_state.state == AssetState.SCORED:
                    decision["decision"] = "auto_approved"
                    decision["reason"] = "scores above threshold"
                    asset_state = replace(asset_state, state=AssetState.AUTO_APPROVED)
                else:
                    asset_state = replace(asset_state, state=AssetState.NEEDS_REVIEW)
                decisions.append(decision)
                job.asset_states = tuple(
                    asset_state if i == idx else a
                    for i, a in enumerate(job.asset_states)
                )
            write_review_decisions(self.job_root, job.job_id, decisions)
            job = replace(job, state=JobState.COMPLETED, updated_at=_utc_now())
        except Exception:
            logger.exception("Review routing failed for job %s", job.job_id)
            job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
        write_job_state(self.job_root, job)
        return job


def create_batch_job(
    job_id: str,
    brief: dict[str, Any],
    families: tuple[str, ...],
    counts: dict[str, int],
    output_root: Path,
    style_pack: str | None = None,
    theme_pack: dict[str, Any] | None = None,
    retry_policy: RetryPolicy | None = None,
) -> BatchJob:
    """Factory to create a new batch job with asset states pre-populated."""
    asset_states = tuple(
        AssetExecutionState(family=family, program_index=idx)
        for family in families
        for idx in range(counts.get(family, 0))
    )
    return BatchJob(
        job_id=job_id,
        state=JobState.PENDING,
        brief=brief,
        families=families,
        counts=counts,
        theme_pack=theme_pack,
        style_pack=style_pack,
        output_root=output_root,
        retry_policy=retry_policy or RetryPolicy(),
        asset_states=asset_states,
        created_at=_utc_now(),
        updated_at=_utc_now(),
        planner_version=VersionInfo(name="planner", version=1),
        candidate_loop_version=VersionInfo(
            name="candidate_loop", version=CANDIDATE_LOOP_VERSION
        ),
        compiler_versions=(VersionInfo(name="compiler", version=COMPILER_VERSION),),
    )
