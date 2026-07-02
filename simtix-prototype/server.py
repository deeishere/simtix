#!/usr/bin/env python3
"""Launch the Simtix backend (API + frontend on port 5000)."""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

if __name__ == "__main__":
    runpy.run_module("backend.server", run_name="__main__")
