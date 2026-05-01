"""Batch job runner with persistent state and resumability.

DEPRECATED: Use BatchOrchestrator from batch_orchestrator.py instead.
This module is kept for backward compatibility and will be removed in a future release.
"""

from __future__ import annotations

import warnings
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from asf.batch import (
    AssetExecutionState,
    AssetState,
    BatchJob,
    JobState,
    RetryPolicy,
    asset_candidates_dir,
    asset_critic_result_path,
    write_job_state,
    write_review_decisions,
)
from asf.batch_orchestrator import (
    BatchOrchestrator as _BatchOrchestrator,
    create_batch_job as _create_batch_job,
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class BatchRunner:
    """DEPRECATED: Use BatchOrchestrator instead."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        warnings.warn(
            "BatchRunner is deprecated. Use BatchOrchestrator from asf.batch_orchestrator instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        self._delegate = _BatchOrchestrator(*args, **kwargs)

    def run(self, job: Any) -> Any:
        job = self._advance_job(job)
        write_job_state(self._delegate.job_root, job)
        return job

    def resume(self, job_id: str) -> Any:
        from asf.batch import load_job_state
        job = load_job_state(self._delegate.job_root, job_id)
        return self.run(job)

    def _advance_job(self, job: Any) -> Any:
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
        return job

    def _start_planning(self, job: Any) -> Any:
        from dataclasses import replace
        job = replace(job, state=JobState.PLANNING, updated_at=_utc_now())
        return job

    def _finish_planning(self, job: Any) -> Any:
        from dataclasses import replace
        try:
            updated_map: dict[int, AssetExecutionState] = {}
            for i, a in enumerate(job.asset_states):
                if a.state == AssetState.PENDING:
                    updated_map[i] = replace(a, state=AssetState.PLANNED)
            new_states = []
            for i, a in enumerate(job.asset_states):
                if i in updated_map:
                    new_states.append(updated_map[i])
                else:
                    new_states.append(a)
            job = replace(job, state=JobState.COMPILING, updated_at=_utc_now(), asset_states=tuple(new_states))
        except Exception:
            job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
        return job

    def _finish_compiling(self, job: Any) -> Any:
        from dataclasses import replace
        try:
            for idx, asset_state in enumerate(job.asset_states):
                if asset_state.state != AssetState.PLANNED:
                    continue
                output_dir = asset_candidates_dir(self._delegate.job_root, job.job_id, asset_state.family, asset_state.program_index)
                output_dir.mkdir(parents=True, exist_ok=True)
                asset_state = replace(asset_state, state=AssetState.COMPILED, candidate_dir=output_dir)
                job.asset_states = tuple(asset_state if i == idx else a for i, a in enumerate(job.asset_states))
            job = replace(job, state=JobState.CANDIDATE_LOOP, updated_at=_utc_now())
        except Exception:
            job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
        return job

    def _finish_candidate_loop(self, job: Any) -> Any:
        from dataclasses import replace
        try:
            for idx, asset_state in enumerate(job.asset_states):
                if asset_state.state != AssetState.COMPILED:
                    continue
                asset_state = replace(asset_state, state=AssetState.CANDIDATES_GENERATED)
                job.asset_states = tuple(asset_state if i == idx else a for i, a in enumerate(job.asset_states))
            job = replace(job, state=JobState.CRITIC_SCORING, updated_at=_utc_now())
        except Exception:
            job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
        return job

    def _finish_critic_scoring(self, job: Any) -> Any:
        from dataclasses import replace
        try:
            for idx, asset_state in enumerate(job.asset_states):
                if asset_state.state != AssetState.CANDIDATES_GENERATED:
                    continue
                result_path = asset_critic_result_path(self._delegate.job_root, job.job_id, asset_state.family, asset_state.program_index)
                result_path.parent.mkdir(parents=True, exist_ok=True)
                asset_state = replace(asset_state, state=AssetState.SCORED, critic_result_path=result_path)
                job.asset_states = tuple(asset_state if i == idx else a for i, a in enumerate(job.asset_states))
            job = replace(job, state=JobState.REVIEW_ROUTING, updated_at=_utc_now())
        except Exception:
            job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
        return job

    def _finish_review_routing(self, job: Any) -> Any:
        from dataclasses import replace
        try:
            decisions = []
            for idx, asset_state in enumerate(job.asset_states):
                if asset_state.state != AssetState.SCORED:
                    continue
                if asset_state.review_decision:
                    decision_str = asset_state.review_decision
                    if decision_str == "auto_approved":
                        asset_state = replace(asset_state, state=AssetState.AUTO_APPROVED)
                    else:
                        asset_state = replace(asset_state, state=AssetState.NEEDS_REVIEW)
                else:
                    decision_str = "auto_approved"
                    asset_state = replace(asset_state, state=AssetState.AUTO_APPROVED)
                decisions.append({"family": asset_state.family, "index": asset_state.program_index, "decision": decision_str, "reason": "from persisted state"})
                job.asset_states = tuple(asset_state if i == idx else a for i, a in enumerate(job.asset_states))
            write_review_decisions(self._delegate.job_root, job.job_id, decisions)
            job = replace(job, state=JobState.COMPLETED, updated_at=_utc_now())
        except Exception:
            job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
        return job


def create_batch_job(
    job_id: str,
    brief: dict[str, Any],
    families: tuple[str, ...],
    counts: dict[str, int],
    output_root: Path,
    style_pack: str | None = None,
    theme_pack: dict[str, Any] | None = None,
    retry_policy: Any | None = None,
):
    """Factory to create a new batch job with asset states pre-populated."""
    return _create_batch_job(
        job_id=job_id,
        brief=brief,
        families=families,
        counts=counts,
        output_root=output_root,
        style_pack=style_pack,
        theme_pack=theme_pack,
        retry_policy=retry_policy,
    )
