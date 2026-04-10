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
from typing import Callable, Generator


def extract_jsonl_rows_from_7z(
    archive_path: Path,
    *,
    log: Callable[[str, str], None] | None = None,
) -> list[dict]:
    """Return parsed JSON objects, one per non-empty line, for all ``*.jsonl`` members."""
    return list(iter_jsonl_rows_from_7z(archive_path, log=log))


def iter_jsonl_rows_from_7z(
    archive_path: Path,
    *,
    log: Callable[[str, str], None] | None = None,
) -> Generator[dict, None, None]:
    """Yield parsed JSON objects one at a time from all ``*.jsonl`` members of a ``.7z``.

    Extracts to a temporary directory on disk then streams line-by-line so
    only one batch's worth of rows needs to be in memory at a time.  The
    temporary directory is cleaned up when the generator is closed or
    garbage-collected.
    """
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

    _log(f"Opening 7z archive: {archive_path}", "INFO")
    tmpdir = tempfile.TemporaryDirectory()
    try:
        tmp = Path(tmpdir.name)
        with SevenZipFile(archive_path, mode="r") as arc:
            names = arc.getnames() if hasattr(arc, "getnames") else arc.namelist()
            targets = [n for n in names if str(n).endswith(".jsonl")]
            _log(f"JSONL members ({len(targets)}): {targets}", "INFO")
            if not targets:
                _log("No .jsonl files in archive.", "WARN")
                return
            t0 = time.perf_counter()
            arc.extract(path=tmp, targets=targets)

        n_rows = 0
        n_bad = 0
        for jsonl_path in sorted(tmp.rglob("*.jsonl")):
            rel = jsonl_path.relative_to(tmp)
            with open(jsonl_path, encoding="utf-8") as f:
                for raw_line in f:
                    line = raw_line.strip()
                    if not line:
                        continue
                    try:
                        yield json.loads(line)
                        n_rows += 1
                    except json.JSONDecodeError as e:
                        _log(f"Skip bad JSON line in {rel}: {e}", "WARN")
                        n_bad += 1

        def _fmt(s: float) -> str:
            return f"{s / 60:.1f}m" if s >= 120 else f"{s:.1f}s"

        _log(
            f"Streamed {n_rows:,} rows from 7z JSONL in {_fmt(time.perf_counter() - t0)}"
            + (f" ({n_bad} bad lines skipped)" if n_bad else "") + ".",
            "OK",
        )
    finally:
        tmpdir.cleanup()
