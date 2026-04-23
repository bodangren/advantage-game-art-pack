"""Tests for release bundle generation and manifest integrity."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from asf.batch import (
    AssetExecutionState,
    AssetState,
    JobState,
    ReleaseBundleManifest,
    VersionInfo,
    write_job_state,
    write_review_decisions,
)
from asf.batch_exporter import (
    ReleaseBundleExporter,
    create_seeded_batch_brief,
    load_seeded_brief,
)


ROOT = Path(__file__).resolve().parents[1]


class ReleaseBundleExporterTest(unittest.TestCase):
    """Validates release bundle export workflow."""

    def setUp(self) -> None:
        self.job_root = Path(tempfile.mkdtemp())

    def test_export_includes_approved_assets(self) -> None:
        from asf.batch_runner import create_batch_job
        job = create_batch_job(
            job_id="export-001",
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
            {"family": "character_sheet", "index": 0, "decision": "auto_approved", "score": 0.9},
            {"family": "character_sheet", "index": 1, "decision": "needs_review", "score": 0.5},
        ]
        write_review_decisions(self.job_root, job.job_id, decisions)
        exporter = ReleaseBundleExporter(job_root=self.job_root, repo_root=ROOT)
        manifest = exporter.export(job.job_id)
        self.assertEqual(manifest.accepted_count, 1)
        self.assertEqual(manifest.review_required_count, 1)
        self.assertEqual(len(manifest.provenance), 2)

    def test_exclude_rejected_from_bundle(self) -> None:
        from asf.batch_runner import create_batch_job
        job = create_batch_job(
            job_id="export-002",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        job.asset_states = (
            AssetExecutionState(
                family="character_sheet",
                program_index=0,
                state=AssetState.REJECTED,
            ),
        )
        write_job_state(self.job_root, job)
        decisions = [
            {"family": "character_sheet", "index": 0, "decision": "rejected", "score": 0.2},
        ]
        write_review_decisions(self.job_root, job.job_id, decisions)
        exporter = ReleaseBundleExporter(job_root=self.job_root, repo_root=ROOT)
        manifest = exporter.export(job.job_id)
        self.assertEqual(manifest.accepted_count, 0)
        self.assertEqual(manifest.rejected_count, 1)

    def test_deterministic_rebuild_from_batch_state(self) -> None:
        from asf.batch_runner import create_batch_job
        job1 = create_batch_job(
            job_id="export-det-001",
            brief={"request": "test"},
            families=("character_sheet",),
            counts={"character_sheet": 1},
            output_root=self.job_root,
        )
        job1.asset_states = (
            AssetExecutionState(
                family="character_sheet",
                program_index=0,
                state=AssetState.AUTO_APPROVED,
            ),
        )
        write_job_state(self.job_root, job1)
        decisions = [
            {"family": "character_sheet", "index": 0, "decision": "auto_approved", "score": 0.85},
        ]
        write_review_decisions(self.job_root, job1.job_id, decisions)
        exporter = ReleaseBundleExporter(job_root=self.job_root, repo_root=ROOT)
        manifest1 = exporter.export(job1.job_id)
        bundle_dir = self.job_root / f"{job1.job_id}_bundle"
        manifest1_copy = ReleaseBundleManifest.from_dict(
            json.loads((bundle_dir / "bundle_manifest.json").read_text())
        )
        self.assertEqual(manifest1.accepted_count, manifest1_copy.accepted_count)


class SeededBriefTest(unittest.TestCase):
    """Validates seeded batch brief creation and loading."""

    def test_create_library_seeded_brief(self) -> None:
        brief = create_seeded_batch_brief(
            theme="library",
            theme_id="library",
            motif_ids=("ancient", "arcane"),
            families=("character_sheet", "background_scene", "cover_surface"),
            counts={"character_sheet": 3, "background_scene": 1, "cover_surface": 1},
        )
        self.assertIn("library", brief["request"].lower())
        self.assertEqual(brief["theme_pack"]["theme_id"], "library")
        self.assertIn("ancient", brief["theme_pack"]["motif_ids"])
        self.assertTrue(brief["seeded"])

    def test_create_ruins_seeded_brief(self) -> None:
        brief = create_seeded_batch_brief(
            theme="ruins",
            theme_id="ruins",
            motif_ids=("ancient", "undead"),
            families=("character_sheet", "background_scene", "cover_surface", "loading_surface"),
            counts={
                "character_sheet": 2,
                "background_scene": 1,
                "cover_surface": 1,
                "loading_surface": 1,
            },
        )
        self.assertIn("ruins", brief["request"].lower())
        self.assertEqual(brief["theme_pack"]["theme_id"], "ruins")
        self.assertIn("undead", brief["theme_pack"]["motif_ids"])

    def test_load_seeded_brief_from_disk(self) -> None:
        from asf.batch_runner import create_batch_job
        batch_root = ROOT / "programs" / "batch"
        path = batch_root / "library_minigame_batch.json"
        if path.exists():
            brief = load_seeded_brief(path)
            self.assertIn("character_sheet", brief["families"])
            self.assertTrue(brief.get("seeded", False))


if __name__ == "__main__":
    unittest.main()
