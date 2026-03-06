"""Pytest configuration. Ensure repo root is on sys.path so 'backend' is the app package."""
import sys
from pathlib import Path

# Repo root = parent of tests/
_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))
