"""Regression: py7zr 1.x removed SevenZipFile.read/readall; extract must use extract(targets=)."""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import pytest

py7zr = pytest.importorskip("py7zr")
from py7zr import SevenZipFile  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = REPO_ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from demo_7z_jsonl import extract_jsonl_rows_from_7z  # noqa: E402


def test_extract_jsonl_via_temp_extract_matches_py7zr_1_x_api() -> None:
    """Build a 7z, extract with the same API seed uses; assert rows."""
    td = Path(tempfile.mkdtemp())
    zp = td / "documents.jsonl.7z"
    raw = Path(td / "documents.jsonl")
    raw.write_text(
        '{"title":"a","text":"hello"}\n'
        '{"title":"b","text":"world"}\n',
        encoding="utf-8",
    )
    with SevenZipFile(zp, "w") as z:
        z.write(raw, arcname="documents.jsonl")

    rows = extract_jsonl_rows_from_7z(zp, log=None)
    assert len(rows) == 2
    assert rows[0]["title"] == "a" and rows[1]["title"] == "b"


def test_nested_jsonl_member() -> None:
    td = Path(tempfile.mkdtemp())
    zp = td / "nested.7z"
    inner = Path(td / "documents.jsonl")
    inner.write_text('{"x":1}\n', encoding="utf-8")
    with SevenZipFile(zp, "w") as z:
        z.write(inner, arcname="export/documents.jsonl")

    rows = extract_jsonl_rows_from_7z(zp)
    assert rows == [{"x": 1}]
