"""Shared utility functions."""
from __future__ import annotations

from datetime import datetime, timezone


def _utc_now() -> str:
    """Return current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat()