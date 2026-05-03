"""Tests for asf.utils module."""
from __future__ import annotations

import re
from datetime import datetime, timezone

import pytest

from asf.utils import _utc_now


class TestUtcNow:
    def test_returns_iso_format_string(self):
        result = _utc_now()
        assert isinstance(result, str)

    def test_ends_with_z_or_offset(self):
        result = _utc_now()
        assert result.endswith("Z") or result.endswith("+00:00")

    def test_contains_date_components(self):
        result = _utc_now()
        assert re.match(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}", result)

    def test_is_valid_datetime_parsed(self):
        result = _utc_now()
        parsed = datetime.fromisoformat(result.replace("Z", "+00:00"))
        assert parsed.tzinfo == timezone.utc