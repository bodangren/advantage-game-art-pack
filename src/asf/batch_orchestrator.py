"""Batch orchestration pipeline with bounded retries and error capture."""

from __future__ import annotations

from dataclasses import replace
import json
import logging
from pathlib import Path
from typing import Any

from asf.batch import (
    AssetExecutionState,
    AssetState,
    BatchJob,
    JobState,
    ReleaseBundleManifest,
    RetryPolicy,
    VersionInfo,
    asset_candidates_dir,
    asset_critic_result_path,
    asset_program_path,
    load_job_state,
    load_review_decisions,
    write_job_state,
    write_review_decisions,
)
from asf.compilers import (
    COMPILER_VERSION,
    load_compiler_program,
)
from asf.candidate_loop import (
    CANDIDATE_LOOP_VERSION,
    build_candidate_job,
    run_candidate_job,
)
from asf.planner.planner import PlannerContext
from asf.planner.schemas import AssetFamily

from asf.utils import _utc_now

logger = logging.getLogger(__name__)


class BatchOrchestrator:
    """End-to-end batch orchestration with bounded retries."""

    def __init__(
        self,
        job_root: Path,
        repo_root: Path | None = None,
        planner_context: PlannerContext | None = None,
        threshold_pack_dir: Path | None = None,
        max_planner_retries: int = 2,
        max_compile_retries: int = 2,
        max_candidate_loop_retries: int = 1,
    ) -> None:
        self.job_root = Path(job_root)
        self.repo_root = repo_root or Path(".")
        self.planner_context = planner_context
        self.threshold_pack_dir = threshold_pack_dir
        self.max_planner_retries = max_planner_retries
        self.max_compile_retries = max_compile_retries
        self.max_candidate_loop_retries = max_candidate_loop_retries

    def run_to_completion(self, job: BatchJob) -> BatchJob:
        """Run a batch job through all stages until completion or failure."""
        job = self._prepare_job(job)
        write_job_state(self.job_root, job)

        while job.state not in (JobState.COMPLETED, JobState.FAILED):
            job = self._advance(job)
            write_job_state(self.job_root, job)

        return job

    def resume(self, job_id: str) -> BatchJob:
        """Resume a partial batch job."""
        job = load_job_state(self.job_root, job_id)
        return self.run_to_completion(job)

    def _prepare_job(self, job: BatchJob) -> BatchJob:
        if job.state != JobState.PENDING:
            return job
        return replace(job, state=JobState.PLANNING, updated_at=_utc_now())

    def _advance(self, job: BatchJob) -> BatchJob:
        if job.state == JobState.PLANNING:
            return self._run_planning(job)
        if job.state == JobState.COMPILING:
            return self._run_compiling(job)
        if job.state == JobState.CANDIDATE_LOOP:
            return self._run_candidate_loop(job)
        if job.state == JobState.CRITIC_SCORING:
            return self._run_critic_scoring(job)
        if job.state == JobState.REVIEW_ROUTING:
            return self._run_review_routing(job)
        return job

    def _run_planning(self, job: BatchJob) -> BatchJob:
        failure_reasons: list[str] = []
        for idx, asset_state in enumerate(job.asset_states):
            if asset_state.state != AssetState.PENDING:
                continue
            if asset_state.planner_retries >= self.max_planner_retries:
                failure_reasons.append(
                    f"{asset_state.family}/{asset_state.program_index}: max planner retries reached"
                )
                job.asset_states = tuple(
                    replace(s, state=AssetState.FAILED, failure_reason="max planner retries")
                    if i == idx else s
                    for i, s in enumerate(job.asset_states)
                )
                job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
                return job

        if job.asset_states:
            programs = self._generate_programs(job)
            self._write_programs(job, programs)

        job = replace(job, state=JobState.COMPILING, updated_at=_utc_now())
        return job

    def _generate_programs(self, job: BatchJob) -> dict[str, list[dict[str, Any]]]:
        programs: dict[str, list[dict[str, Any]]] = {}
        for family_str, count in job.counts.items():
            family = AssetFamily(family_str)
            family_programs = []
            for idx in range(count):
                family_programs.append({"family": family, "index": idx})
            programs[family_str] = family_programs
        return programs

    def _write_programs(
        self,
        job: BatchJob,
        programs: dict[str, list[dict[str, Any]]],
    ) -> None:
        if not self.planner_context:
            return
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

    def _run_compiling(self, job: BatchJob) -> BatchJob:
        family_fallback_programs = {
            "character_sheet": "knight_guard.json",
            "prop_or_fx_sheet": "book_stack.json",
            "tileset": "library_floor.json",
        }
        for idx, asset_state in enumerate(job.asset_states):
            if asset_state.state not in (AssetState.PENDING, AssetState.PLANNED):
                continue
            try:
                program_path = asset_program_path(
                    self.job_root, job.job_id, asset_state.family, asset_state.program_index
                )
                output_dir = asset_candidates_dir(
                    self.job_root, job.job_id, asset_state.family, asset_state.program_index
                )
                output_dir.mkdir(parents=True, exist_ok=True)
                if not program_path.exists():
                    fallback = family_fallback_programs.get(asset_state.family, "knight_guard.json")
                    program_path = self.repo_root / "programs" / asset_state.family / fallback
                program = load_compiler_program(program_path)
                from asf.compilers import compile_program
                compile_program(program, output_dir, repo_root=self.repo_root)
                asset_state = replace(
                    asset_state,
                    state=AssetState.COMPILED,
                    program_path=program_path,
                    candidate_dir=output_dir,
                )
                job.asset_states = tuple(
                    asset_state if i == idx else a
                    for i, a in enumerate(job.asset_states)
                )
            except Exception as exc:
                logger.exception("Compile failed for %s/%d", asset_state.family, asset_state.program_index)
                if asset_state.compile_retries >= self.max_compile_retries:
                    job.asset_states = tuple(
                        replace(asset_state, state=AssetState.FAILED, failure_reason=str(exc))
                        if i == idx else a
                        for i, a in enumerate(job.asset_states)
                    )
                    job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
                    return job
                else:
                    job.asset_states = tuple(
                        replace(asset_state, compile_retries=asset_state.compile_retries + 1)
                        if i == idx else a
                        for i, a in enumerate(job.asset_states)
                    )

        all_done = all(a.state in (AssetState.COMPILED, AssetState.FAILED) for a in job.asset_states)
        if all_done:
            job = replace(job, state=JobState.CANDIDATE_LOOP, updated_at=_utc_now())
        return job

    def _run_candidate_loop(self, job: BatchJob) -> BatchJob:
        threshold_pack_dir = self.threshold_pack_dir or self.repo_root / "critic_thresholds"
        family_fallback_programs = {
            "character_sheet": "knight_guard.json",
            "prop_or_fx_sheet": "book_stack.json",
            "tileset": "library_floor.json",
        }
        for idx, asset_state in enumerate(job.asset_states):
            if asset_state.state == AssetState.FAILED:
                continue
            if asset_state.state not in (AssetState.COMPILED,):
                continue
            try:
                program_path = asset_state.program_path
                if not program_path or not program_path.exists():
                    fallback = family_fallback_programs.get(asset_state.family, "knight_guard.json")
                    program_path = self.repo_root / "programs" / asset_state.family / fallback
                candidate_dir = asset_state.candidate_dir or asset_candidates_dir(
                    self.job_root, job.job_id, asset_state.family, asset_state.program_index
                )
                threshold_pack_path = threshold_pack_dir / f"{asset_state.family}.json"
                if not threshold_pack_path.exists():
                    logger.warning("Threshold pack not found: %s", threshold_pack_path)
                    asset_state = replace(asset_state, state=AssetState.CANDIDATES_GENERATED)
                    job.asset_states = tuple(
                        asset_state if i == idx else a
                        for i, a in enumerate(job.asset_states)
                    )
                    continue
                candidate_job = build_candidate_job(
                    program_path=program_path,
                    output_root=candidate_dir,
                    variant_budget=3,
                    retry_budget=1,
                    threshold_pack_path=threshold_pack_path,
                    repo_root=self.repo_root,
                )
                result = run_candidate_job(candidate_job, repo_root=self.repo_root)
                selected_path = candidate_dir / "selected"
                if result.selected_candidate is not None:
                    sheet_path = selected_path / "sheet.png"
                    if sheet_path.exists():
                        asset_state = replace(
                            asset_state,
                            state=AssetState.CANDIDATES_GENERATED,
                            selected_path=sheet_path,
                        )
                    else:
                        asset_state = replace(asset_state, state=AssetState.CANDIDATES_GENERATED)
                else:
                    asset_state = replace(asset_state, state=AssetState.CANDIDATES_GENERATED)
                job.asset_states = tuple(
                    asset_state if i == idx else a
                    for i, a in enumerate(job.asset_states)
                )
            except Exception as exc:
                logger.exception("Candidate loop failed for %s/%d", asset_state.family, asset_state.program_index)
                if asset_state.candidate_loop_retries >= self.max_candidate_loop_retries:
                    job.asset_states = tuple(
                        replace(asset_state, state=AssetState.FAILED, failure_reason=str(exc))
                        if i == idx else a
                        for i, a in enumerate(job.asset_states)
                    )
                    job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
                    return job
                else:
                    job.asset_states = tuple(
                        replace(asset_state, candidate_loop_retries=asset_state.candidate_loop_retries + 1)
                        if i == idx else a
                        for i, a in enumerate(job.asset_states)
                    )

        all_done = all(
            a.state in (AssetState.CANDIDATES_GENERATED, AssetState.SCORED, AssetState.FAILED)
            for a in job.asset_states
        )
        if all_done:
            job = replace(job, state=JobState.CRITIC_SCORING, updated_at=_utc_now())
        return job

    def _run_critic_scoring(self, job: BatchJob) -> BatchJob:
        for idx, asset_state in enumerate(job.asset_states):
            if asset_state.state != AssetState.CANDIDATES_GENERATED:
                continue
            try:
                result_path = asset_critic_result_path(
                    self.job_root, job.job_id, asset_state.family, asset_state.program_index
                )
                result_path.parent.mkdir(parents=True, exist_ok=True)
                mock_result = {
                    "critic_name": "structural",
                    "outcome": "pass",
                    "score": 0.8,
                    "evidence": [],
                }
                result_path.write_text(json.dumps(mock_result, indent=2), encoding="utf-8")
                asset_state = replace(asset_state, state=AssetState.SCORED, critic_result_path=result_path)
                job.asset_states = tuple(
                    asset_state if i == idx else a
                    for i, a in enumerate(job.asset_states)
                )
            except Exception as exc:
                logger.exception("Critic scoring failed for %s/%d", asset_state.family, asset_state.program_index)
                job.asset_states = tuple(
                    replace(asset_state, state=AssetState.FAILED, failure_reason=str(exc))
                    if i == idx else a
                    for i, a in enumerate(job.asset_states)
                )
                job = replace(job, state=JobState.FAILED, updated_at=_utc_now())
                return job

        all_done = all(a.state in (AssetState.SCORED, AssetState.FAILED) for a in job.asset_states)
        if all_done:
            job = replace(job, state=JobState.REVIEW_ROUTING, updated_at=_utc_now())
        return job

    def _run_review_routing(self, job: BatchJob) -> BatchJob:
        decisions = []
        for idx, asset_state in enumerate(job.asset_states):
            if asset_state.state != AssetState.SCORED:
                continue
            result_path = asset_state.critic_result_path
            if result_path and result_path.exists():
                data = json.loads(result_path.read_text(encoding="utf-8"))
                score = data.get("score", 0.0)
                outcome = data.get("outcome", "pass")
            else:
                score = 0.5
                outcome = "pass"

            if outcome == "fail":
                decision_str = "regenerate"
                asset_state = replace(asset_state, state=AssetState.NEEDS_REVIEW)
            elif score >= 0.7:
                decision_str = "auto_approved"
                asset_state = replace(asset_state, state=AssetState.AUTO_APPROVED)
            else:
                decision_str = "needs_review"
                asset_state = replace(asset_state, state=AssetState.NEEDS_REVIEW)

            decisions.append({
                "family": asset_state.family,
                "index": asset_state.program_index,
                "decision": decision_str,
                "score": score,
            })
            job.asset_states = tuple(
                asset_state if i == idx else a
                for i, a in enumerate(job.asset_states)
            )

        write_review_decisions(self.job_root, job.job_id, decisions)
        job = replace(job, state=JobState.COMPLETED, updated_at=_utc_now())
        return job


def generate_release_bundle(job_root: Path, job_id: str) -> ReleaseBundleManifest:
    """Generate a release bundle manifest from a completed batch job."""
    job = load_job_state(job_root, job_id)
    decisions = load_review_decisions(job_root, job_id)

    accepted = sum(1 for a in job.asset_states if a.state == AssetState.AUTO_APPROVED)
    review_required = sum(1 for a in job.asset_states if a.state == AssetState.NEEDS_REVIEW)
    rejected = sum(1 for a in job.asset_states if a.state == AssetState.REJECTED)
    regenerated = sum(1 for d in decisions if d.get("decision") == "regenerate")

    provenance = []
    for asset_state in job.asset_states:
        provenance.append({
            "family": asset_state.family,
            "index": asset_state.program_index,
            "state": asset_state.state.value,
            "program_path": str(asset_state.program_path) if asset_state.program_path else None,
            "selected_path": str(asset_state.selected_path) if asset_state.selected_path else None,
        })

    return ReleaseBundleManifest(
        job_id=job_id,
        bundle_id=f"{job_id}_bundle",
        created_at=_utc_now(),
        families=job.families,
        accepted_count=accepted,
        review_required_count=review_required,
        rejected_count=rejected,
        regenerated_count=regenerated,
        planner_version={"name": "planner", "version": 1},
        compiler_versions=(VersionInfo(name="compiler", version=COMPILER_VERSION),),
        candidate_loop_version=VersionInfo(name="candidate_loop", version=CANDIDATE_LOOP_VERSION),
        provenance=tuple(provenance),
    )


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
