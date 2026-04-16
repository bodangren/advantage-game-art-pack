"""Integration hooks for creating reviewable candidates.

This module provides integration points for other tracks (candidate generation,
planner, batch generation) to create reviewable candidates without bypassing
the review queue.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from review_app.db import Database


def get_database(db_path: Optional[str] = None) -> Database:
    """Get a Database instance, initializing if needed."""
    path = db_path or os.environ.get("REVIEW_DB", "review_queue.db")
    from review_app.db import init_db

    if not os.path.exists(path):
        init_db(path)
    return Database(path)


def create_primitive_candidate(
    family: str,
    source_program: str,
    rendered_files: list[str],
    critic_scores: dict[str, float],
    source_brief: Optional[dict[str, Any]] = None,
    nearest_references: Optional[list[str]] = None,
    confidence: float = 0.5,
    theme: Optional[str] = None,
    db_path: Optional[str] = None,
) -> str:
    """Create a reviewable primitive candidate.

    Args:
        family: Asset family name (e.g., "wizard_robe", "robot_arm")
        source_program: Name of the program that generated this candidate
        rendered_files: List of paths to rendered PNG files
        critic_scores: Dict of critic metric names to scores (0-1)
        source_brief: Original prompt/parameters used to generate
        nearest_references: List of reference IDs from canon
        confidence: Overall confidence score (0-1)
        theme: Theme tag (e.g., "fantasy", "scifi")
        db_path: Optional path to database file

    Returns:
        Candidate ID
    """
    db = get_database(db_path)

    return db.create_candidate(
        candidate_type="primitive",
        family=family,
        source_brief=json.dumps(source_brief) if source_brief else None,
        source_program=source_program,
        rendered_files=json.dumps(rendered_files),
        critic_scores=json.dumps(critic_scores),
        nearest_references=json.dumps(nearest_references or []),
        confidence=confidence,
        theme=theme,
        status="pending",
    )


def create_compiled_asset_candidate(
    family: str,
    source_program: str,
    source_manifest: dict[str, Any],
    rendered_files: list[str],
    critic_scores: dict[str, float],
    candidate_group_id: Optional[str] = None,
    variant_id: Optional[str] = None,
    attempt_count: int = 1,
    nearest_references: Optional[list[str]] = None,
    source_brief: Optional[dict[str, Any]] = None,
    confidence: float = 0.5,
    theme: Optional[str] = None,
    db_path: Optional[str] = None,
) -> str:
    """Create a reviewable compiled asset candidate.

    Args:
        family: Asset family name (e.g., "character_sheet", "background_scene")
        source_program: Name of the program that generated this candidate
        source_manifest: Assembly manifest describing composition
        rendered_files: List of paths to rendered files
        critic_scores: Dict of critic metric names to scores (0-1)
        candidate_group_id: Group ID for tracking variants
        variant_id: Variant identifier within the group
        attempt_count: Generation attempt number
        nearest_references: List of reference IDs from canon
        source_brief: Original prompt/parameters used to generate
        confidence: Overall confidence score (0-1)
        theme: Theme tag
        db_path: Optional path to database file

    Returns:
        Candidate ID
    """
    db = get_database(db_path)

    return db.create_candidate(
        candidate_type="compiled_asset",
        family=family,
        source_brief=json.dumps(source_brief) if source_brief else None,
        source_manifest=json.dumps(source_manifest),
        source_program=source_program,
        candidate_group_id=candidate_group_id,
        variant_id=variant_id,
        attempt_count=attempt_count,
        rendered_files=json.dumps(rendered_files),
        critic_scores=json.dumps(critic_scores),
        nearest_references=json.dumps(nearest_references or []),
        confidence=confidence,
        theme=theme,
        status="pending",
    )


def get_variant_requests(
    db_path: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Get all candidates that need variants.

    Returns a list of candidate details with variant request reasons
    for consumption by the candidate generation loop or planner.

    Args:
        db_path: Optional path to database file

    Returns:
        List of candidate dicts with decisions
    """
    db = get_database(db_path)
    needs_variant = db.list_candidates(status="needs_variant")

    result = []
    for candidate in needs_variant:
        history = db.get_candidate_history(candidate["id"])
        decisions = history.get("decisions", [])
        if decisions:
            latest = decisions[-1]
            if latest["action"] == "request_variant":
                candidate["variant_reason"] = latest["reason"]
        result.append(candidate)

    return result


def get_approved_primitives(
    db_path: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Get all approved primitive candidates.

    Returns primitives that have been approved and are ready for
    promotion to the primitive library.

    Args:
        db_path: Optional path to database file

    Returns:
        List of approved primitive candidates
    """
    db = get_database(db_path)
    return db.list_candidates(candidate_type="primitive", status="approved")


def update_candidate_status(
    candidate_id: str,
    status: str,
    db_path: Optional[str] = None,
) -> None:
    """Update a candidate's status directly.

    Use with caution - prefer using record_decision() for proper audit trail.

    Args:
        candidate_id: The candidate to update
        status: New status
        db_path: Optional path to database file
    """
    db = get_database(db_path)
    conn = db._get_conn()
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "UPDATE candidates SET status = ?, updated_at = ? WHERE id = ?",
        (status, now, candidate_id),
    )
    conn.commit()