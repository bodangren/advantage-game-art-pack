"""Project-local Python path bootstrap.

This lets root-level `python3 -m ...` commands resolve the `src/` package
layout without requiring environment-variable setup.
"""

from __future__ import annotations

import sys
from pathlib import Path


SRC_DIR = Path(__file__).resolve().parent / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
