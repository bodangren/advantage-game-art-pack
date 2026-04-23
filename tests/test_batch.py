"""Tests for batch job schema, state persistence, and artifact paths."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

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
    job_state_path,
    load_job_state,
    load_review_decisions,
    planner_manifest_path,
    release_bundle_path,
    review_decisions_path,
    write_job_state,
    write_review_decisions,
)


ROOT = Path(__file__).resolve().parents[1]


class BatchJobSchemaTest(unittest.TestCase):
    """Validates BatchJob construction and round-trip."""

    def test_minimal_job(self) -> None:
        job = BatchJob(job_id="test-job-001")
        self.assertEqual(job.job_id, "test-job-001")
        self.assertEqual(job.state, JobState.PENDING)

    def test_job_with_families_and_counts(self) -> None:
        job = BatchJob(
            job_id="test-job-002",
            families=("character_sheet", "prop_or_fx_sheet"),
            counts={"character_sheet": 2, "prop_or_fx_sheet": 1},
        )
        self.assertEqual(job.families, ("character_sheet", "prop_or_fx_sheet"))
        self.assertEqual(job.counts["character_sheet"], 2)

    def test_job_with_retry_policy(self) -> None:
        policy = RetryPolicy(max_planner_retries=3, max_compile_retries=2)
        job = BatchJob(job_id="test-job-003", retry_policy=policy)
        self.assertEqual(job.retry_policy.max_planner_retries, 3)
        self.assertEqual(job.retry_policy.max_compile_retries, 2)

    def test_job_to_dict_round_trip(self) -> None:
        job = BatchJob(
            job_id="test-job-004",
            families=("character_sheet",),
            counts={"character_sheet": 1},
            style_pack="cute_chibi_v1",
        )
        data = job.to_dict()
        restored = BatchJob.from_dict(data)
        self.assertEqual(restored.job_id, job.job_id)
        self.assertEqual(restored.families, job.families)
        self.assertEqual(restored.counts, job.counts)
        self.assertEqual(restored.style_pack, job.style_pack)
        self.assertEqual(restored.state, job.state)

    def test_job_state_enum_serialization(self) -> None:
        job = BatchJob(job_id="test-job-005", state=JobState.COMPLETED)
        data = job.to_dict()
        self.assertEqual(data["state"], "completed")
        restored = BatchJob.from_dict(data)
        self.assertEqual(restored.state, JobState.COMPLETED)


class AssetExecutionStateTest(unittest.TestCase):
    """Validates per-asset execution state."""

    def test_default_state(self) -> None:
        state = AssetExecutionState(family="character_sheet", program_index=0)
        self.assertEqual(state.state, AssetState.PENDING)
        self.assertIsNone(state.program_path)

    def test_state_transitions(self) -> None:
        state = AssetExecutionState(family="character_sheet", program_index=0)
        state.state = AssetState.PLANNED
        self.assertEqual(state.state, AssetState.PLANNED)

    def test_failure_tracking(self) -> None:
        state = AssetExecutionState(family="character_sheet", program_index=0)
        state.failure_reason = "planner_timeout"
        state.planner_retries = 3
        self.assertEqual(state.failure_reason, "planner_timeout")
        self.assertEqual(state.planner_retries, 3)


class VersionInfoTest(unittest.TestCase):
    """Validates version info pinning."""

    def test_version_info(self) -> None:
        v = VersionInfo(name="planner", version=1, path=Path("src/asf/planner"))
        self.assertEqual(v.name, "planner")
        self.assertEqual(v.version, 1)
        data = v.__dict__
        self.assertEqual(data["name"], "planner")


class ArtifactPathTest(unittest.TestCase):
    """Validates artifact path helpers."""

    def setUp(self) -> None:
        self.job_root = Path(tempfile.mkdtemp())
        self.job_id = "batch-001"

    def test_planner_manifest_path(self) -> None:
        path = planner_manifest_path(self.job_root, self.job_id)
        self.assertEqual(path.name, "planner_manifest.json")
        self.assertTrue(str(self.job_id) in str(path))

    def test_asset_program_path(self) -> None:
        path = asset_program_path(self.job_root, self.job_id, "character_sheet", 0)
        self.assertEqual(path.name, "program_000.json")
        self.assertTrue("character_sheet" in str(path))

    def test_asset_candidates_dir(self) -> None:
        path = asset_candidates_dir(self.job_root, self.job_id, "character_sheet", 0)
        self.assertEqual(path.name, "candidates_000")
        self.assertTrue("character_sheet" in str(path))

    def test_asset_selected_dir(self) -> None:
        path = asset_candidates_dir(self.job_root, self.job_id, "character_sheet", 0)

    def test_asset_critic_result_path(self) -> None:
        path = asset_critic_result_path(self.job_root, self.job_id, "character_sheet", 0)
        self.assertEqual(path.name, "critic_result_000.json")

    def test_review_decisions_path(self) -> None:
        path = review_decisions_path(self.job_root, self.job_id)
        self.assertEqual(path.name, "review_decisions.json")

    def test_job_state_path(self) -> None:
        path = job_state_path(self.job_root, self.job_id)
        self.assertEqual(path.name, "job_state.json")

    def test_release_bundle_path(self) -> None:
        path = release_bundle_path(self.job_root, self.job_id)
        self.assertEqual(path.name, "batch-001_bundle")


class JobStatePersistenceTest(unittest.TestCase):
    """Validates job state write/load round-trip."""

    def setUp(self) -> None:
        self.job_root = Path(tempfile.mkdtemp())
        self.job_id = "persist-001"

    def test_write_load_round_trip(self) -> None:
        job = BatchJob(
            job_id=self.job_id,
            families=("character_sheet", "prop_or_fx_sheet"),
            counts={"character_sheet": 2, "prop_or_fx_sheet": 1},
            style_pack="cute_chibi_v1",
        )
        write_job_state(self.job_root, job)
        loaded = load_job_state(self.job_root, self.job_id)
        self.assertEqual(loaded.job_id, job.job_id)
        self.assertEqual(loaded.families, job.families)
        self.assertEqual(loaded.counts, job.counts)
        self.assertEqual(loaded.state, job.state)

    def test_write_load_with_asset_states(self) -> None:
        job = BatchJob(
            job_id=self.job_id,
            families=("character_sheet",),
            counts={"character_sheet": 1},
            asset_states=(
                AssetExecutionState(
                    family="character_sheet",
                    program_index=0,
                    state=AssetState.PLANNED,
                ),
            ),
        )
        write_job_state(self.job_root, job)
        loaded = load_job_state(self.job_root, self.job_id)
        self.assertEqual(len(loaded.asset_states), 1)
        self.assertEqual(loaded.asset_states[0].family, "character_sheet")
        self.assertEqual(loaded.asset_states[0].state, AssetState.PLANNED)


class ReviewDecisionsPersistenceTest(unittest.TestCase):
    """Validates review decisions write/load round-trip."""

    def setUp(self) -> None:
        self.job_root = Path(tempfile.mkdtemp())
        self.job_id = "decisions-001"

    def test_write_load_decisions(self) -> None:
        decisions = [
            {
                "family": "character_sheet",
                "index": 0,
                "decision": "auto_approved",
                "reason": "scores exceed threshold",
            },
            {
                "family": "prop_or_fx_sheet",
                "index": 0,
                "decision": "needs_review",
                "reason": "style score borderline",
            },
        ]
        write_review_decisions(self.job_root, self.job_id, decisions)
        loaded = load_review_decisions(self.job_root, self.job_id)
        self.assertEqual(len(loaded), 2)
        self.assertEqual(loaded[0]["decision"], "auto_approved")


class ReleaseBundleManifestTest(unittest.TestCase):
    """Validates release bundle manifest structure."""

    def test_manifest_defaults(self) -> None:
        manifest = ReleaseBundleManifest(
            job_id="batch-001",
            bundle_id="bundle-001",
            created_at="2026-04-24T00:00:00",
            families=("character_sheet",),
            accepted_count=1,
            review_required_count=0,
            rejected_count=0,
            regenerated_count=0,
        )
        self.assertEqual(manifest.accepted_count, 1)
        self.assertEqual(manifest.review_required_count, 0)

    def test_manifest_to_dict(self) -> None:
        manifest = ReleaseBundleManifest(
            job_id="batch-001",
            bundle_id="bundle-001",
            created_at="2026-04-24T00:00:00",
            families=("character_sheet",),
            accepted_count=1,
            review_required_count=0,
            rejected_count=0,
            regenerated_count=0,
            provenance=({
                "family": "character_sheet",
                "index": 0,
                "program_path": "programs/character_sheet/knight_guard.json",
            },),
        )
        data = manifest.to_dict()
        self.assertEqual(data["job_id"], "batch-001")
        self.assertEqual(len(data["provenance"]), 1)


if __name__ == "__main__":
    unittest.main()
