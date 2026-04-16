"""Review app database schema and repository."""

from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

SCHEMA = """
CREATE TABLE IF NOT EXISTS candidates (
    id TEXT PRIMARY KEY,
    candidate_type TEXT NOT NULL CHECK(candidate_type IN ('primitive', 'compiled_asset')),
    family TEXT NOT NULL,
    source_brief TEXT,
    source_manifest TEXT,
    source_program TEXT,
    candidate_group_id TEXT,
    variant_id TEXT,
    attempt_count INTEGER DEFAULT 0,
    rendered_files TEXT DEFAULT '[]',
    critic_scores TEXT DEFAULT '{}',
    nearest_references TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'needs_variant', 'promoted')),
    confidence REAL DEFAULT 0.5,
    theme TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    candidate_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('approve', 'reject', 'request_variant', 'promote', 'mark_gold')),
    reason TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_type_status ON candidates(candidate_type, status);
CREATE INDEX IF NOT EXISTS idx_candidate_family ON candidates(family);
CREATE INDEX IF NOT EXISTS idx_candidate_confidence ON candidates(confidence);
CREATE INDEX IF NOT EXISTS idx_decision_candidate ON decisions(candidate_id);
"""


def init_db(db_path: str) -> None:
    """Initialize the database with the schema."""
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()


class Database:
    """Repository for review candidates and decisions."""

    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self._conn: Optional[sqlite3.Connection] = None

    def _get_conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path)
            self._conn.row_factory = sqlite3.Row
        return self._conn

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None

    def create_candidate(
        self,
        candidate_type: str,
        family: str,
        source_program: str,
        rendered_files: str = "[]",
        critic_scores: str = "{}",
        nearest_references: str = "[]",
        confidence: float = 0.5,
        theme: Optional[str] = None,
        status: str = "pending",
        source_brief: Optional[str] = None,
        source_manifest: Optional[str] = None,
        candidate_group_id: Optional[str] = None,
        variant_id: Optional[str] = None,
        attempt_count: int = 0,
    ) -> str:
        """Create a new candidate and return its ID."""
        now = datetime.now(timezone.utc).isoformat()
        candidate_id = str(uuid.uuid4())

        conn = self._get_conn()
        conn.execute(
            """
            INSERT INTO candidates (
                id, candidate_type, family, source_brief, source_manifest,
                source_program, candidate_group_id, variant_id, attempt_count,
                rendered_files, critic_scores, nearest_references, status,
                confidence, theme, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                candidate_id,
                candidate_type,
                family,
                source_brief,
                source_manifest,
                source_program,
                candidate_group_id,
                variant_id,
                attempt_count,
                rendered_files,
                critic_scores,
                nearest_references,
                status,
                confidence,
                theme,
                now,
                now,
            ),
        )
        conn.commit()
        return candidate_id

    def get_candidate(self, candidate_id: str) -> Optional[dict[str, Any]]:
        """Get a candidate by ID."""
        conn = self._get_conn()
        row = conn.execute(
            "SELECT * FROM candidates WHERE id = ?", (candidate_id,)
        ).fetchone()
        return dict(row) if row else None

    def list_candidates(
        self,
        candidate_type: Optional[str] = None,
        family: Optional[str] = None,
        status: Optional[str] = None,
        theme: Optional[str] = None,
        min_confidence: Optional[float] = None,
        max_confidence: Optional[float] = None,
        sort_by: str = "created_at",
        sort_order: str = "DESC",
    ) -> list[dict[str, Any]]:
        """List candidates with optional filtering."""
        conn = self._get_conn()
        conditions = []
        params: list[Any] = []

        if candidate_type is not None:
            conditions.append("candidate_type = ?")
            params.append(candidate_type)
        if family is not None:
            conditions.append("family = ?")
            params.append(family)
        if status is not None:
            conditions.append("status = ?")
            params.append(status)
        if theme is not None:
            conditions.append("theme = ?")
            params.append(theme)
        if min_confidence is not None:
            conditions.append("confidence >= ?")
            params.append(min_confidence)
        if max_confidence is not None:
            conditions.append("confidence <= ?")
            params.append(max_confidence)

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        valid_sorts = {"created_at", "confidence", "updated_at"}
        if sort_by not in valid_sorts:
            sort_by = "created_at"
        sort_order = "DESC" if sort_order == "DESC" else "ASC"

        query = f"""
            SELECT * FROM candidates
            WHERE {where_clause}
            ORDER BY {sort_by} {sort_order}
        """
        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    def record_decision(
        self,
        candidate_id: str,
        action: str,
        reason: Optional[str] = None,
    ) -> str:
        """Record a review decision and update candidate status."""
        now = datetime.now(timezone.utc).isoformat()
        decision_id = str(uuid.uuid4())

        conn = self._get_conn()
        conn.execute(
            """
            INSERT INTO decisions (id, candidate_id, action, reason, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (decision_id, candidate_id, action, reason, now),
        )

        status_map = {
            "approve": "approved",
            "reject": "rejected",
            "request_variant": "needs_variant",
            "promote": "promoted",
            "mark_gold": "approved",
        }
        new_status = status_map.get(action, "pending")
        conn.execute(
            "UPDATE candidates SET status = ?, updated_at = ? WHERE id = ?",
            (new_status, now, candidate_id),
        )
        conn.commit()
        return decision_id

    def get_decisions(self, candidate_id: str) -> list[dict[str, Any]]:
        """Get all decisions for a candidate (audit trail)."""
        conn = self._get_conn()
        rows = conn.execute(
            "SELECT * FROM decisions WHERE candidate_id = ? ORDER BY created_at ASC",
            (candidate_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def get_candidate_history(self, candidate_id: str) -> dict[str, Any]:
        """Get candidate with full decision history."""
        candidate = self.get_candidate(candidate_id)
        if candidate is None:
            return {}
        candidate["decisions"] = self.get_decisions(candidate_id)
        return candidate