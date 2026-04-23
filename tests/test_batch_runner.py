"""Tests for batch job runner, retry states, and resumability."""

from __future__ import annotations

from dataclasses import replace
import json
import tempfile
import unittest
from pathlib import Path

from asf.batch import (
    AssetExecutionState,
    AssetState,
    BatchJob,
    JobState,
    RetryPolicy,
    job_state_path,
    load_job_state,
    write_job_state,
)
from asf.batch_runner import BatchRunner, create_batch_job


ROOT = Path(__file__).resolve().parents[1]


class CreateBatchJobTest(unittest.TestCase):
    """Validates batch job factory."""

    def test_minimal_job_creation(self) -> None:
        job = create_batch_job(
            job_id="batch-001",
            brief={"request": "test brief"},
            families=("character_sheet",),
            counts={"character_sheet": 2},
            output_root=Path(tempfile.mkdtemp()),
        )
        self.assertEqual(job.job_id, "batch-001")
        self.assertEqual(job.state, JobState.PENDING)
        self.assertEqual(len(job.asset_states), 2)
        self.assertEqual(job.asset_states[0].family, "character_sheet")
        self.assertEqual(job.asset_states[0].program_index, 0)
        self.assertEqual(job.asset_states[1].program_index, 1)

    def test_job_with_multiple_families(self) -> None:
        job = create_batch_job(
            job_id="batch-002",
            brief={"request": "multi-family brief"},
            families=("character_sheet", "prop_or_fx_sheet"),
            counts={"character_sheet": 1, "prop_or_fx_sheet": 2},
            output_root=Path(tempfile.mkdtemp()),
        )
        self.assertEqual(len(job.asset_states), 3)
        self.assertEqual(job.families, ("character_sheet", "prop_or_fx_sheet"))

    def test_job_with_custom_retry_policy(self) -> None:
        policy = RetryPolicy(max_planner_retries=5, max_compile_retries=3)
        job = create_batch_job(
            job_id="batch-003",
            brief={},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=Path(tempfile.mkdtemp()),
            retry_policy=policy,
        )
        self.assertEqual(job.retry_policy.max_planner_retries, 5)


class BatchRunnerTest(unittest.TestCase):
    """Validates batch runner state machine and resumability."""

    def setUp(self) -> None:
        self.job_root = Path(tempfile.mkdtemp())
        self.repo_root = ROOT

    def _create_runner(self) -> BatchRunner:
        return BatchRunner(job_root=self.job_root, repo_root=self.repo_root)

    def test_first_run_new_job(self) -> None:
        job = create_batch_job(
            job_id="batch-run-001",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        runner = self._create_runner()
        result = runner.run(job)
        self.assertEqual(result.state, JobState.PLANNING)
        self.assertEqual(len(result.asset_states), 1)

    def test_resume_from_compiling(self) -> None:
        job = create_batch_job(
            job_id="batch-resume-001",
            brief={"request": "test"},
            families=("character_sheet", "prop_or_fx_sheet"),
            counts={"character_sheet": 1, "prop_or_fx_sheet": 1},
            output_root=self.job_root,
        )
        job = replace(job, state=JobState.COMPILING)
        write_job_state(self.job_root, job)
        runner = self._create_runner()
        result = runner.resume(job.job_id)
        self.assertIn(result.state, (JobState.COMPILING, JobState.CANDIDATE_LOOP))

    def test_resume_skips_completed_assets(self) -> None:
        job_root = Path(tempfile.mkdtemp())
        job = create_batch_job(
            job_id="batch-skip-001",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 2},
            output_root=job_root,
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
                state=AssetState.PENDING,
            ),
        )
        from asf.batch import JobState
        job = replace(job, state=JobState.PLANNING)
        write_job_state(job_root, job)
        runner = BatchRunner(job_root=job_root, repo_root=ROOT)
        result = runner.run(job)
        self.assertEqual(result.state, JobState.COMPILING)
        self.assertEqual(result.asset_states[0].state, AssetState.AUTO_APPROVED)
        self.assertEqual(result.asset_states[1].state, AssetState.PLANNED)

    def test_bounded_retry_for_planner_failure(self) -> None:
        job = create_batch_job(
            job_id="batch-retry-001",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
            retry_policy=RetryPolicy(max_planner_retries=2),
        )
        job.asset_states = (
            AssetExecutionState(
                family="character_sheet",
                program_index=0,
                state=AssetState.PENDING,
                planner_retries=2,
                failure_reason="planner_timeout",
            ),
        )
        write_job_state(self.job_root, job)
        runner = self._create_runner()
        result = runner.run(job)
        self.assertEqual(result.state, JobState.PLANNING)
        self.assertEqual(result.asset_states[0].failure_reason, "planner_timeout")

    def test_asset_states_transition(self) -> None:
        job = create_batch_job(
            job_id="batch-transition-001",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        runner = self._create_runner()
        job = runner.run(job)
        self.assertEqual(job.state, JobState.PLANNING)
        self.assertEqual(job.asset_states[0].state, AssetState.PENDING)
        job = runner.run(job)
        self.assertEqual(job.state, JobState.COMPILING)
        self.assertEqual(job.asset_states[0].state, AssetState.PLANNED)
        job = runner.run(job)
        self.assertEqual(job.state, JobState.CANDIDATE_LOOP)
        self.assertEqual(job.asset_states[0].state, AssetState.COMPILED)


if __name__ == "__main__":
    unittest.main()
