#!/usr/bin/env python3
"""Extract *.jsonl from a .7z using py7zr.

py7zr 1.x removed ``SevenZipFile.read`` / ``readall``. Use
``extract(path=..., targets=...)`` into a temporary directory, then read lines
from disk. Verified against py7zr 1.1.0 and the ``>=0.22`` API.

Used by ``seed-demo-corpus.py``; tested by ``tests/test_demo_7z_jsonl.py``.
"""
from __future__ import annotations

import json
import tempfile
import time
from pathlib import Path
from typing import Callable


def extract_jsonl_rows_from_7z(
    archive_path: Path,
    *,
    log: Callable[[str, str], None] | None = None,
) -> list[dict]:
    """Return parsed JSON objects, one per non-empty line, for all ``*.jsonl`` members."""
    try:
        import py7zr
    except ImportError as e:
        raise RuntimeError("py7zr is required. pip install 'py7zr>=0.22'") from e

    SevenZipFile = getattr(py7zr, "SevenZipFile", None)
    if SevenZipFile is None:
        raise RuntimeError("py7zr.SevenZipFile missing; pip install -U 'py7zr>=0.22'")

    if not archive_path.is_file():
        raise FileNotFoundError(str(archive_path))

    def _log(msg: str, level: str = "INFO") -> None:
        if log:
            log(msg, level)

    rows: list[dict] = []
    _log(f"Opening 7z archive: {archive_path}", "INFO")
    with SevenZipFile(archive_path, mode="r") as arc:
        names = arc.getnames() if hasattr(arc, "getnames") else arc.namelist()
        targets = [n for n in names if str(n).endswith(".jsonl")]
        _log(f"JSONL members ({len(targets)}): {targets}", "INFO")
        if not targets:
            _log("No .jsonl files in archive.", "WARN")
            return rows

        t0 = time.perf_counter()
        with tempfile.TemporaryDirectory() as tmpd:
            tmp = Path(tmpd)
            arc.extract(path=tmp, targets=targets)
            for jsonl_path in sorted(tmp.rglob("*.jsonl")):
                rel = jsonl_path.relative_to(tmp)
                for raw_line in jsonl_path.read_text(encoding="utf-8").splitlines():
                    line = raw_line.strip()
                    if not line:
                        continue
                    try:
                        rows.append(json.loads(line))
                    except json.JSONDecodeError as e:
                        _log(f"Skip bad JSON line in {rel}: {e}", "WARN")

        def _fmt_elapsed(seconds: float) -> str:
            return f"{seconds / 60:.1f}m" if seconds >= 120 else f"{seconds:.1f}s"

        _log(
            f"Parsed {len(rows):,} lines from 7z JSONL in {_fmt_elapsed(time.perf_counter() - t0)}.",
            "OK",
        )

    return rows
