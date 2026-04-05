"""Root package shim for the src-layout ASF package."""

from __future__ import annotations

from pathlib import Path


_SRC_PACKAGE = Path(__file__).resolve().parent.parent / "src" / "asf"
__path__.append(str(_SRC_PACKAGE))
