"""Tests for batch orchestration pipeline."""

from __future__ import annotations

from dataclasses import replace
import json
import tempfile
import unittest
from pathlib import Path

from asf.batch import (
    AssetExecutionState,
    AssetState,
    JobState,
    load_job_state,
    write_job_state,
    write_review_decisions,
)
from asf.batch_orchestrator import (
    BatchOrchestrator,
    generate_release_bundle,
)


ROOT = Path(__file__).resolve().parents[1]


class BatchOrchestratorTest(unittest.TestCase):
    """Validates orchestration pipeline state machine."""

    def setUp(self) -> None:
        self.job_root = Path(tempfile.mkdtemp())

    def _create_orchestrator(self, **kwargs) -> BatchOrchestrator:
        defaults = dict(
            job_root=self.job_root,
            repo_root=ROOT,
            max_planner_retries=2,
            max_compile_retries=2,
            max_candidate_loop_retries=1,
        )
        defaults.update(kwargs)
        return BatchOrchestrator(**defaults)

    def test_end_to_end_single_family_auto_approved(self) -> None:
        from asf.batch_runner import create_batch_job
        job = create_batch_job(
            job_id="e2e-001",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        orchestrator = self._create_orchestrator()
        result = orchestrator.run_to_completion(job)
        self.assertEqual(result.state, JobState.COMPLETED)
        self.assertEqual(result.asset_states[0].state, AssetState.AUTO_APPROVED)

    def test_end_to_end_multi_family(self) -> None:
        from asf.batch_runner import create_batch_job
        job = create_batch_job(
            job_id="e2e-002",
            brief={"request": "test"},
            families=("character_sheet", "prop_or_fx_sheet"),
            counts={"character_sheet": 1, "prop_or_fx_sheet": 1},
            output_root=self.job_root,
        )
        orchestrator = self._create_orchestrator()
        result = orchestrator.run_to_completion(job)
        self.assertEqual(result.state, JobState.COMPLETED)
        self.assertEqual(len(result.asset_states), 2)

    def test_planner_failure_after_max_retries(self) -> None:
        from asf.batch_runner import create_batch_job
        job = create_batch_job(
            job_id="e2e-planner-fail",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        job.asset_states = (
            AssetExecutionState(
                family="character_sheet",
                program_index=0,
                state=AssetState.PENDING,
                planner_retries=2,
                failure_reason="timeout",
            ),
        )
        job = replace(job, state=JobState.PLANNING)
        write_job_state(self.job_root, job)
        orchestrator = self._create_orchestrator(max_planner_retries=2)
        result = orchestrator.run_to_completion(job)
        self.assertEqual(result.state, JobState.FAILED)

    def test_compile_failure_with_retry(self) -> None:
        from asf.batch_runner import create_batch_job
        job = create_batch_job(
            job_id="e2e-compile-fail",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        orchestrator = self._create_orchestrator(max_compile_retries=2)
        result = orchestrator.run_to_completion(job)
        self.assertEqual(result.state, JobState.COMPLETED)

    def test_review_required_outcome(self) -> None:
        from asf.batch_runner import create_batch_job
        job = create_batch_job(
            job_id="e2e-review-req",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        job.asset_states = (
            AssetExecutionState(
                family="character_sheet",
                program_index=0,
                state=AssetState.SCORED,
            ),
        )
        orchestrator = self._create_orchestrator()
        job = replace(job, state=JobState.REVIEW_ROUTING)
        write_job_state(self.job_root, job)
        decisions = [{"family": "character_sheet", "index": 0, "decision": "needs_review", "score": 0.4}]
        write_review_decisions(self.job_root, job.job_id, decisions)
        result = orchestrator._run_review_routing(job)
        self.assertEqual(result.asset_states[0].state, AssetState.NEEDS_REVIEW)

    def test_deterministic_state_transitions(self) -> None:
        from asf.batch_runner import create_batch_job
        job1 = create_batch_job(
            job_id="e2e-det-001",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        job2 = create_batch_job(
            job_id="e2e-det-002",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        orchestrator = self._create_orchestrator()
        result1 = orchestrator.run_to_completion(job1)
        result2 = orchestrator.run_to_completion(job2)
        self.assertEqual(result1.state, result2.state)
        self.assertEqual(
            result1.asset_states[0].state.value, result2.asset_states[0].state.value
        )

    def test_resume_interrupted_job(self) -> None:
        from asf.batch_runner import create_batch_job
        job = create_batch_job(
            job_id="e2e-resume-001",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        job.asset_states = (
            AssetExecutionState(
                family="character_sheet",
                program_index=0,
                state=AssetState.COMPILED,
            ),
        )
        job = replace(job, state=JobState.CANDIDATE_LOOP)
        write_job_state(self.job_root, job)
        orchestrator = self._create_orchestrator()
        result = orchestrator.resume("e2e-resume-001")
        self.assertEqual(result.state, JobState.COMPLETED)


class ReleaseBundleTest(unittest.TestCase):
    """Validates release bundle generation."""

    def setUp(self) -> None:
        self.job_root = Path(tempfile.mkdtemp())

    def test_bundle_counts(self) -> None:
        from asf.batch_runner import create_batch_job
        job = create_batch_job(
            job_id="bundle-001",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 2},
            output_root=self.job_root,
        )
        job.asset_states = (
            AssetExecutionState(
                family="character_sheet",
                program_index=0,
                state=AssetState.AUTO_APPROVED,
            ),
            AssetExecutionState(
                family="character_sheet",
                program_index=1,
                state=AssetState.NEEDS_REVIEW,
            ),
        )
        write_job_state(self.job_root, job)
        decisions = [
            {"family": "character_sheet", "index": 0, "decision": "auto_approved", "score": 0.8},
            {"family": "character_sheet", "index": 1, "decision": "needs_review", "score": 0.5},
        ]
        write_review_decisions(self.job_root, job.job_id, decisions)
        manifest = generate_release_bundle(self.job_root, job.job_id)
        self.assertEqual(manifest.accepted_count, 1)
        self.assertEqual(manifest.review_required_count, 1)


if __name__ == "__main__":
    unittest.main()
