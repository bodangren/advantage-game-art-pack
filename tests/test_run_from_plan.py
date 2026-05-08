"""Tests for BatchOrchestrator.run_from_plan method."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

from asf.batch_orchestrator import BatchOrchestrator
from asf.batch import AssetExecutionState, AssetState


class TestRunFromPlan(unittest.TestCase):
    """Test the run_from_plan entry point."""

    def test_run_from_plan_creates_job(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            job_root = Path(tmpdir)
            orchestrator = BatchOrchestrator(
                job_root=job_root,
                repo_root=Path.cwd(),
                max_planner_retries=0,
                max_compile_retries=0,
                max_candidate_loop_retries=0,
            )

            with patch.object(orchestrator, "run_to_completion", return_value=None) as mock_run:
                orchestrator.run_from_plan(
                    brief="test brief",
                    families=("character_sheet",),
                    counts={"character_sheet": 1},
                    programs=[{"family": "character_sheet", "program_id": "test_001"}],
                )
                mock_run.assert_called_once()
                job = mock_run.call_args[0][0]
                self.assertEqual(job.job_id.startswith("job_"), True)
                self.assertEqual(job.brief["request"], "test brief")
                self.assertEqual(job.families, ("character_sheet",))
                self.assertEqual(len(job.asset_states), 1)
                self.assertEqual(job.asset_states[0].family, "character_sheet")
                self.assertEqual(job.asset_states[0].state, AssetState.PLANNED)

    def test_run_from_plan_without_programs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            job_root = Path(tmpdir)
            orchestrator = BatchOrchestrator(
                job_root=job_root,
                repo_root=Path.cwd(),
                max_planner_retries=0,
                max_compile_retries=0,
                max_candidate_loop_retries=0,
            )

            with patch.object(orchestrator, "run_to_completion", return_value=None) as mock_run:
                job = orchestrator.run_from_plan(
                    brief="test brief",
                    families=("character_sheet", "prop_or_fx_sheet"),
                    counts={"character_sheet": 2, "prop_or_fx_sheet": 1},
                    programs=None,
                )
                mock_run.assert_called_once()
                job = mock_run.call_args[0][0]
                self.assertEqual(len(job.asset_states), 3)
                self.assertEqual(job.asset_states[0].state, AssetState.PENDING)

    def test_run_from_plan_sets_up_planner_context_if_provided(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            job_root = Path(tmpdir)
            from asf.planner.planner import PlannerContext
            context = PlannerContext(
                canon={},
                style_packs={},
                primitive_manifest={"primitives": []},
                repo_root=Path.cwd(),
            )
            orchestrator = BatchOrchestrator(
                job_root=job_root,
                repo_root=Path.cwd(),
                planner_context=context,
            )

            with patch.object(orchestrator, "run_to_completion", return_value=None):
                job = orchestrator.run_from_plan(
                    brief="test brief",
                    families=("character_sheet",),
                    counts={"character_sheet": 1},
                    programs=[{"family": "character_sheet"}],
                )
                self.assertEqual(orchestrator.planner_context, context)


if __name__ == "__main__":
    unittest.main()