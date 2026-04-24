"""Release bundle exporter and audit report generator."""

from __future__ import annotations

import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from asf.batch import (
    AssetState,
    BatchJob,
    ReleaseBundleManifest,
    asset_candidates_dir,
    asset_selected_dir,
    load_job_state,
    release_bundle_path,
)
from asf.batch_orchestrator import generate_release_bundle

logger = logging.getLogger(__name__)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ReleaseBundleExporter:
    """Export approved assets into a structured release bundle."""

    def __init__(self, job_root: Path, repo_root: Path | None = None) -> None:
        self.job_root = Path(job_root)
        self.repo_root = repo_root or Path(".")

    def export(self, job_id: str) -> ReleaseBundleManifest:
        """Export a completed job's approved assets into a release bundle."""
        job = load_job_state(self.job_root, job_id)
        manifest = generate_release_bundle(self.job_root, job_id)
        bundle_dir = release_bundle_path(self.job_root, job_id)
        bundle_dir.mkdir(parents=True, exist_ok=True)
        self._write_manifest(bundle_dir, manifest)
        self._write_audit_report(bundle_dir, job, manifest)
        self._copy_assets(bundle_dir, job)
        return manifest

    def _write_manifest(self, bundle_dir: Path, manifest: ReleaseBundleManifest) -> None:
        manifest_path = bundle_dir / "bundle_manifest.json"
        payload = manifest.to_dict()
        serialized = json.dumps(payload, indent=2, sort_keys=True) + "\n"
        manifest_path.write_text(serialized, encoding="utf-8")

    def _write_audit_report(
        self, bundle_dir: Path, job: BatchJob, manifest: ReleaseBundleManifest
    ) -> None:
        lines = [
            "# Release Audit Report",
            "",
            f"**Job ID**: {job.job_id}",
            f"**Bundle ID**: {manifest.bundle_id}",
            f"**Generated**: {manifest.created_at}",
            "",
            "## Summary",
            "",
            "| Metric | Count |",
            "|--------|-------|",
            f"| Accepted (auto-approved) | {manifest.accepted_count} |",
            f"| Needs review | {manifest.review_required_count} |",
            f"| Rejected | {manifest.rejected_count} |",
            f"| Regenerated | {manifest.regenerated_count} |",
            "",
            "## Families",
            "",
        ]
        for family in manifest.families:
            lines.append(f"- {family}")
        lines.append("")
        lines.append("## Provenance")
        lines.append("")
        for entry in manifest.provenance:
            lines.append(f"- {entry['family']}/{entry['index']}: {entry['state']}")
        lines.append("")
        lines.append("## Version Info")
        lines.append("")
        if manifest.planner_version:
            lines.append(f"- Planner: {manifest.planner_version}")
        for cv in manifest.compiler_versions:
            lines.append(f"- Compiler: {cv}")
        if manifest.candidate_loop_version:
            lines.append(f"- Candidate Loop: {manifest.candidate_loop_version}")
        if manifest.critic_policy_version:
            lines.append(f"- Critic Policy: {manifest.critic_policy_version}")
        report = "\n".join(lines)
        bundle_dir.joinpath("audit_report.md").write_text(report, encoding="utf-8")

    def _copy_assets(self, bundle_dir: Path, job: BatchJob) -> None:
        for asset_state in job.asset_states:
            if asset_state.state != AssetState.AUTO_APPROVED:
                continue
            family = asset_state.family
            idx = asset_state.program_index
            candidate_dir = asset_candidates_dir(
                self.job_root, job.job_id, family, idx
            )
            if candidate_dir.exists():
                selected = asset_selected_dir(
                    self.job_root, job.job_id, family, idx
                )
                selected.mkdir(parents=True, exist_ok=True)
                for src_file in candidate_dir.glob("*.png"):
                    shutil.copy2(src_file, selected / src_file.name)


def create_seeded_batch_brief(
    theme: str,
    theme_id: str,
    motif_ids: tuple[str, ...],
    families: tuple[str, ...],
    counts: dict[str, int],
    style_pack: str = "cute_chibi_v1",
    request: str | None = None,
) -> dict[str, Any]:
    """Factory to create a seeded batch brief for a mini-game theme."""
    if request is None:
        request = f"{theme.title()} mini-game asset pack"
    return {
        "request": request,
        "families": families,
        "style_pack": style_pack,
        "theme_pack": {
            "theme_id": theme_id,
            "motif_ids": list(motif_ids),
        },
        "shared_constraints": {
            "canvas_size": [64, 64],
            "palette_limit": 12,
        },
        "per_asset_constraints": {
            "character_sheet": {
                "directions": ["facing_up", "facing_down", "facing_camera"],
                "animations": ["idle", "walk", "action"],
            },
            "background_scene": {
                "template": f"{theme_id}_courtyard",
                "canvas": [256, 192],
            },
        },
        "counts": counts,
        "seeded": True,
        "seed_theme": theme,
    }


def load_seeded_brief(path: Path) -> dict[str, Any]:
    """Load a seeded batch brief from disk."""
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)
