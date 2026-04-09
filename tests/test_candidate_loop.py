"""Tests for candidate generation, critic scoring, and calibration."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from PIL import Image

from asf.candidate_loop import (
    CandidateEvaluation,
    CandidateJob,
    CandidateLoopValidationError,
    build_candidate_job,
    calibrate_threshold_packs,
    evaluate_against_references,
    load_candidate_job,
    load_reference_assets,
    load_threshold_pack,
    run_candidate_job,
    select_best_candidate,
)
from asf.compilers import VariantControls


ROOT = Path(__file__).resolve().parents[1]
PROGRAM = ROOT / "programs" / "character_sheet" / "knight_guard.json"
THRESHOLD_PACK = ROOT / "critic_thresholds" / "character_sheet.json"


class CandidateJobSchemaTest(unittest.TestCase):
    """Validates the strict candidate-job schema."""

    def test_rejects_invalid_variant_budget(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            payload = {
                "version": 1,
                "family": "character_sheet",
                "program_path": str(PROGRAM),
                "program_hash": _sha256(PROGRAM),
                "variant_budget": 0,
                "critic_config_version": 1,
                "canon_version": 1,
                "output_root": str(Path(tmp_dir) / "candidate-output"),
                "retry_budget": 1,
                "threshold_pack_path": str(THRESHOLD_PACK),
            }
            job_path = Path(tmp_dir) / "job.json"
            job_path.write_text(json.dumps(payload), encoding="utf-8")

            with self.assertRaisesRegex(
                CandidateLoopValidationError, "variant_budget must be a positive integer"
            ):
                load_candidate_job(job_path)

    def test_loads_valid_job_payload(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            job = build_candidate_job(
                program_path=PROGRAM,
                output_root=Path(tmp_dir) / "candidate-output",
                variant_budget=3,
                retry_budget=1,
                threshold_pack_path=THRESHOLD_PACK,
                repo_root=ROOT,
            )
            job_path = Path(tmp_dir) / "job.json"
            job_path.write_text(
                json.dumps(job.to_dict(), indent=2, sort_keys=True), encoding="utf-8"
            )

            loaded = load_candidate_job(job_path)

            self.assertEqual(loaded.family, "character_sheet")
            self.assertEqual(loaded.variant_budget, 3)
            self.assertEqual(loaded.retry_budget, 1)
            self.assertEqual(loaded.program_hash, _sha256(PROGRAM))


class CandidateLoopDeterminismTest(unittest.TestCase):
    """Validates deterministic search and manifest output."""

    def test_job_rerun_is_deterministic(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_root = Path(tmp_dir) / "candidate-output"
            job = build_candidate_job(
                program_path=PROGRAM,
                output_root=output_root,
                variant_budget=3,
                retry_budget=1,
                threshold_pack_path=THRESHOLD_PACK,
                repo_root=ROOT,
            )

            first = run_candidate_job(job, repo_root=ROOT)
            first_manifest = json.loads((output_root / "selection_manifest.json").read_text(encoding="utf-8"))
            first_hash = hashlib.sha256(
                json.dumps(first_manifest, sort_keys=True).encode("utf-8")
            ).hexdigest()
            first_sheet = None
            if first.selected_candidate is not None:
                first_sheet = hashlib.sha256(
                    (output_root / "selected" / "sheet.png").read_bytes()
                ).hexdigest()

            second = run_candidate_job(job, repo_root=ROOT)
            second_manifest = json.loads((output_root / "selection_manifest.json").read_text(encoding="utf-8"))
            second_hash = hashlib.sha256(
                json.dumps(second_manifest, sort_keys=True).encode("utf-8")
            ).hexdigest()
            second_sheet = None
            if second.selected_candidate is not None:
                second_sheet = hashlib.sha256(
                    (output_root / "selected" / "sheet.png").read_bytes()
                ).hexdigest()

            self.assertEqual(first.status, second.status)
            self.assertEqual(first.to_dict(), second.to_dict())
            self.assertEqual(first_hash, second_hash)
            if first.selected_candidate is not None:
                self.assertEqual(first.status, "selected")
                self.assertEqual(first_sheet, second_sheet)
            else:
                self.assertIn(first.status, {"regenerate", "failed"})
                self.assertFalse((output_root / "selected").exists())


class CandidateCriticTest(unittest.TestCase):
    """Validates novelty rejection and selection ranking."""

    def test_flags_near_duplicate_demo_asset(self) -> None:
        pack = load_threshold_pack(THRESHOLD_PACK)
        references = load_reference_assets(
            ROOT,
            layout_types=pack.reference_layout_types,
        )
        image = Image.open(ROOT / "demo-assets" / "player-sheet.png").convert("RGBA")

        novelty = evaluate_against_references(
            image,
            references,
            near_duplicate_similarity=pack.near_duplicate_similarity,
            exclude_source_paths=(),
        )

        self.assertTrue(novelty["near_duplicate"])
        self.assertGreaterEqual(novelty["best_similarity"], pack.near_duplicate_similarity)
        self.assertTrue(novelty["nearest_reference"]["source_path"].endswith("player-sheet.png"))

    def test_selects_best_passing_candidate(self) -> None:
        first = CandidateEvaluation(
            candidate_index=0,
            attempt_index=0,
            variant_controls=VariantControls(
                variant_id="knight_guard_candidate_0",
                candidate_index=0,
                search_budget=3,
            ),
            program_hash="a" * 64,
            primitive_ids=("wizard_core",),
            overall_score=0.62,
            passed=True,
            selected=False,
        )
        second = CandidateEvaluation(
            candidate_index=1,
            attempt_index=0,
            variant_controls=VariantControls(
                variant_id="knight_guard_candidate_1",
                candidate_index=1,
                search_budget=3,
            ),
            program_hash="a" * 64,
            primitive_ids=("wizard_core",),
            overall_score=0.84,
            passed=True,
            selected=False,
        )
        rejected = CandidateEvaluation(
            candidate_index=2,
            attempt_index=0,
            variant_controls=VariantControls(
                variant_id="knight_guard_candidate_2",
                candidate_index=2,
                search_budget=3,
            ),
            program_hash="a" * 64,
            primitive_ids=("wizard_core",),
            overall_score=0.95,
            passed=False,
            selected=False,
        )

        selected = select_best_candidate((first, second, rejected))

        self.assertIsNotNone(selected)
        self.assertEqual(selected.candidate_index, 1)
        self.assertTrue(selected.selected)


class CandidateCalibrationTest(unittest.TestCase):
    """Validates the calibration report output."""

    def test_writes_pass_rate_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            report_path = Path(tmp_dir) / "calibration_report.md"
            summary = calibrate_threshold_packs(ROOT, output_path=report_path)

            self.assertTrue(report_path.exists())
            report = report_path.read_text(encoding="utf-8")
            self.assertIn("Calibration Report", report)
            self.assertIn("character_sheet", report)
            self.assertIn("pass_rate", report)
            self.assertGreater(len(summary["packs"]), 0)


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


if __name__ == "__main__":
    unittest.main()
