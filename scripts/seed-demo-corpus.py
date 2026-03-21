#!/usr/bin/env python3
"""Seed the demo corpus from teleoscope-demo-data (7z + parquet) into Mongo and optionally Milvus.

**Scope:** This script is only for **building the anonymous `/demo` stack** (local, CI, staging,
or a dedicated demo host). It is **not** a production maintenance tool: **do not run it against
production MongoDB** after real customer data exists—it drops the `documents` collection by default
and bulk-writes the demo workspace.

Uses **pre-vectorized** materials only: documents from the 7z and vectors from parquet.
Does not run the vectorization pipeline (no embedding model, no vectorizer worker).

**Demo files** come from [Teleoscope/teleoscope-demo-data](https://github.com/Teleoscope/teleoscope-demo-data).
If `documents.jsonl.7z` or `documents.jsonl` is missing under `TELEOSCOPE_DATA_DIR`, this script runs
`scripts/download-demo-data.sh` (shallow git clone + copy) automatically. When **`MILVUS_URI`** or
**`MILVUS_LITE_PATH`** is set, it also requires **`parquet_export/part-*.parquet`** and will fetch
demo data if that is missing too. Use **`--download`** to refresh from GitHub even when files
already exist, or **`--no-download`** / **`SEED_NO_DOWNLOAD=1`** to fail fast when data is absent
(air-gapped / pre-staged trees).

Creates or reuses a demo-corpus workspace and:
  1. Extracts documents.jsonl.7z, loads documents into MongoDB (state.vectorized=True).
     By default the entire `documents` collection is dropped and recreated (see
     `--workspace-documents-only` to keep other workspaces' documents). You will see
     two long tqdm phases over ~all rows (build Python payloads, then insert_many batches)
     plus a separate **text-index build** (create_index scans documents once for $text)—
     that is **not** a second document import.
  2. If Milvus is configured (MILVUS_URI or MILVUS_LITE_PATH), loads vectors from
     parquet into Milvus for the same workspace so ranking/similarity work.

The app auto-discovers this corpus by the workspace label "Demo corpus" in Mongo,
so DEMO_CORPUS_WORKSPACE_ID is optional; set it to avoid a one-time DB lookup.

Usage:
  # Mongo only (no Docker; document list/search work; ranking needs Milvus)
  PYTHONPATH=. python scripts/seed-demo-corpus.py

  # Mongo + Milvus (full demo with vector search; requires Milvus)
  MILVUS_URI=http://localhost:19530 PYTHONPATH=. python scripts/seed-demo-corpus.py

  # Custom data dir
  TELEOSCOPE_DATA_DIR=/path/to/data PYTHONPATH=. python scripts/seed-demo-corpus.py

  # Refresh Milvus vectors only (Mongo unchanged). Fetches teleoscope-demo-data if parquet
  # is missing (same rules as full seed). Requires existing demo workspace + same document
  # count as parquet rows; documents are matched in Mongo _id insertion order.
  MILVUS_URI=http://localhost:19530 PYTHONPATH=. python scripts/seed-demo-corpus.py --milvus-only

  # Multi-workspace DB: only delete/replace documents in the demo workspace (slower on large
  # re-seeds; drops the text index during bulk load unless --keep-text-index). Env:
  # SEED_WORKSPACE_DOCUMENTS_ONLY=1
  PYTHONPATH=. python scripts/seed-demo-corpus.py --workspace-documents-only

  # Re-clone teleoscope-demo-data into data/ before seed (same as download-demo-data.sh)
  PYTHONPATH=. python scripts/seed-demo-corpus.py --download

  # Disable tqdm progress bars (plain logs only): --no-progress or SEED_NO_PROGRESS=1
  PYTHONPATH=. python scripts/seed-demo-corpus.py --no-progress

  # Milvus upserts: tqdm shows batch count; during each blocking upsert() the bar postfix shows
  # vector range + "upsert…", then timing when the RPC returns (Milvus does not stream in-RPC progress).
  # Smaller batches → more frequent updates: SEED_MILVUS_UPSERT_BATCH=250
  # Per-batch [OK] lines even with tqdm: SEED_MILVUS_BATCH_LOG=1
  # Hang avoidance: SEED_MILVUS_RPC_TIMEOUT (default 300) sets MILVUS_CLIENT_TIMEOUT for pymilvus;
  # MILVUS_UNBOUNDED_RPC=1 removes cap; MILVUS_DIAG=1 stderr timeline in embeddings.connect;
  # MILVUS_SKIP_TCP_PREFLIGHT=1 skips port check before RPC.
  # After bulk upsert, client.flush() can fail with RootCoord "channel not found" (stale gRPC).
  # The seed closes the client, reconnects, and retries flush once; SEED_MILVUS_SKIP_FLUSH=1 skips
  # flush entirely (Milvus auto-seals); SEED_MILVUS_FLUSH_STRICT=1 exits non-zero if flush still fails.
  # Large loads (~250k+ vectors): periodic flush every N upsert batches (default N=35 when unset)
  # so RootCoord seals smaller chunks — SEED_MILVUS_FLUSH_EVERY_N_BATCHES=0 disables, or set N explicitly.

Requires: pymongo, pyarrow, py7zr, tqdm (optional progress bars), git, bash. Use the project mamba env: `mamba activate teleoscope` (see environments/environment.yml).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Optional deps for 7z and parquet
try:
    import py7zr
except ImportError:
    py7zr = None
try:
    import pyarrow.parquet as pq
except ImportError:
    pq = None
try:
    from tqdm import tqdm
except ImportError:
    tqdm = None  # type: ignore[misc, assignment]

from bson.objectid import ObjectId
from pymongo import MongoClient

# Repo root and data dir
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("TELEOSCOPE_DATA_DIR", REPO_ROOT / "data"))

DOCUMENTS_7Z = DATA_DIR / "documents.jsonl.7z"
PARQUET_DIRS = [
    DATA_DIR / "parquet_export" / "full",
    DATA_DIR / "parquet_export",
]
MONGODB_URI = os.environ.get(
    "MONGODB_URI",
    "mongodb://teleoscope:teleoscope_dev_password@localhost:27017/teleoscope"
    "?directConnection=true&serverSelectionTimeoutMS=5000&authSource=admin",
)
MONGODB_DATABASE = os.environ.get("MONGODB_DATABASE", "teleoscope")

DEMO_TEAM_LABEL = "Demo corpus (shared)"
DEMO_WORKSPACE_LABEL = "Demo corpus"
DEMO_WORKFLOW_LABEL = "Default"
BATCH_INSERT = 500
DOCUMENTS_TEXT_INDEX = "text"
DOCUMENTS_TEXT_INDEX_KEYS = [("title", "text"), ("text", "text")]

# Set True in _configure_seed_ui when tqdm bars are active (log() uses tqdm.write).
_seed_use_progress: bool = False


def _configure_seed_ui(*, no_progress: bool) -> None:
    """Enable tqdm on stderr for long loops when tty + tqdm installed; optional --no-progress / SEED_NO_PROGRESS."""
    global _seed_use_progress
    env_off = os.environ.get("SEED_NO_PROGRESS", "").lower() in ("1", "true", "yes")
    _seed_use_progress = (
        (not no_progress)
        and (not env_off)
        and (tqdm is not None)
        and sys.stderr.isatty()
    )


def _pbar(iterable, **kwargs):
    if not _seed_use_progress:
        return iterable
    kwargs.setdefault("file", sys.stderr)
    kwargs.setdefault("dynamic_ncols", True)
    kwargs.setdefault("smoothing", 0.05)
    return tqdm(iterable, **kwargs)


def log_section(title: str) -> None:
    """Visual phase break (always plain ASCII for dumb terminals)."""
    width = max(48, min(76, len(title) + 12))
    line = "=" * width
    print(f"\n{line}\n  {title}\n{line}", flush=True)


def log(msg: str, level: str = "INFO") -> None:
    prefix = {"OK": "[OK]", "INFO": "[INFO]", "WARN": "[WARN]", "FAIL": "[FAIL]"}.get(level, "[INFO]")
    line = f"{prefix} {msg}"
    if tqdm is not None and _seed_use_progress:
        tqdm.write(line)
    else:
        print(line, flush=True)


def log_demo_seed_scope_warning() -> None:
    log(
        "Demo corpus seed — for local/staging/demo DBs only. Do not use on production.",
        "WARN",
    )


def _fmt_elapsed(seconds: float) -> str:
    if seconds >= 120:
        return f"{seconds / 60:.1f}m"
    return f"{seconds:.1f}s"


def demo_document_sources_present() -> bool:
    jsonl_path = DATA_DIR / "documents.jsonl"
    return DOCUMENTS_7Z.exists() or jsonl_path.is_file()


def find_parquet_dir() -> Path | None:
    for d in PARQUET_DIRS:
        if d.is_dir() and list(d.glob("part-*.parquet")):
            return d
    return None


def demo_parquet_present() -> bool:
    return find_parquet_dir() is not None


def milvus_env_configured() -> bool:
    return bool(
        (os.environ.get("MILVUS_URI") or "").strip()
        or (os.environ.get("MILVUS_LITE_PATH") or "").strip()
    )


def _milvus_upsert_batch_size() -> int:
    """Vectors per Milvus upsert(); override with SEED_MILVUS_UPSERT_BATCH (smaller = more tqdm updates)."""
    raw = os.environ.get("SEED_MILVUS_UPSERT_BATCH", "").strip()
    if raw:
        try:
            n = int(raw)
            return max(1, min(n, 10_000))
        except ValueError:
            pass
    return 1000


def _milvus_batch_log_enabled() -> bool:
    return os.environ.get("SEED_MILVUS_BATCH_LOG", "").lower() in ("1", "true", "yes")


def _milvus_periodic_flush_interval_batches(vector_count: int) -> int:
    """
    Flush after every N upsert batches mid-load so Milvus seals smaller segments instead of one
    huge final flush (~350k vectors). SEED_MILVUS_FLUSH_EVERY_N_BATCHES: 0 = off; positive = N;
    unset and vector_count >= 250_000 → default 35.
    """
    raw = os.environ.get("SEED_MILVUS_FLUSH_EVERY_N_BATCHES", "").strip()
    if raw:
        try:
            return max(0, int(raw))
        except ValueError:
            log(f"Invalid SEED_MILVUS_FLUSH_EVERY_N_BATCHES={raw!r}; using default rule.", "WARN")
    if vector_count >= 250_000:
        return 35
    return 0


def run_download_demo_data_script() -> None:
    """Clone Teleoscope/teleoscope-demo-data via scripts/download-demo-data.sh (same as one-click)."""
    bash = shutil.which("bash")
    if not bash:
        raise RuntimeError(
            "bash not found on PATH; cannot run scripts/download-demo-data.sh. "
            "Fetch https://github.com/Teleoscope/teleoscope-demo-data manually into TELEOSCOPE_DATA_DIR."
        )
    script = REPO_ROOT / "scripts" / "download-demo-data.sh"
    if not script.is_file():
        raise FileNotFoundError(
            f"Missing {script}; clone https://github.com/Teleoscope/teleoscope-demo-data into {DATA_DIR} manually."
        )
    log(
        f"Running {script.name} → {DATA_DIR} (repo overridable with TELEOSCOPE_DEMO_DATA_REPO / "
        "TELEOSCOPE_DEMO_DATA_BRANCH, same as the shell script).",
        "INFO",
    )
    t0 = time.perf_counter()
    subprocess.run([bash, str(script), str(DATA_DIR)], cwd=str(REPO_ROOT), check=True)
    log(f"download-demo-data.sh finished in {_fmt_elapsed(time.perf_counter() - t0)}.", "OK")


def apply_download_env_overrides(download: bool, no_download: bool) -> tuple[bool, bool]:
    env_no_dl = os.environ.get("SEED_NO_DOWNLOAD", "").lower() in ("1", "true", "yes")
    env_force_dl = os.environ.get("SEED_DOWNLOAD_DEMO_DATA", "").lower() in ("1", "true", "yes")
    if env_no_dl:
        no_download = True
    if env_force_dl:
        download = True
    if no_download and download:
        log("Both download and no-download requested; honoring no-download.", "WARN")
        download = False
    return download, no_download


def ensure_demo_data_files(
    *,
    force_download: bool,
    no_download: bool,
    need_documents: bool,
    need_parquet: bool,
) -> None:
    """Ensure JSONL/7z and/or parquet exist under TELEOSCOPE_DATA_DIR; clone demo-data if allowed."""
    if not need_documents and not need_parquet:
        return

    if no_download:
        if need_documents and not demo_document_sources_present():
            raise FileNotFoundError(
                f"No demo documents under {DATA_DIR}: need documents.jsonl.7z or documents.jsonl. "
                "Run ./scripts/download-demo-data.sh, or omit --no-download / SEED_NO_DOWNLOAD."
            )
        if need_parquet and not demo_parquet_present():
            raise FileNotFoundError(
                f"No parquet_export/part-*.parquet under {DATA_DIR}. "
                "Run ./scripts/download-demo-data.sh, or omit --no-download / SEED_NO_DOWNLOAD."
            )
        log("Skipping demo data fetch (--no-download / SEED_NO_DOWNLOAD).", "INFO")
        return

    if force_download:
        log("Refreshing demo corpus files from GitHub (download-demo-data.sh)…", "INFO")
        run_download_demo_data_script()
    else:
        missing: list[str] = []
        if need_documents and not demo_document_sources_present():
            missing.append("documents (documents.jsonl.7z or documents.jsonl)")
        if need_parquet and not demo_parquet_present():
            missing.append("vectors (parquet_export/part-*.parquet)")
        if missing:
            log(
                f"Missing {', '.join(missing)} under {DATA_DIR}; "
                "fetching Teleoscope/teleoscope-demo-data…",
                "INFO",
            )
            run_download_demo_data_script()

    if need_documents and not demo_document_sources_present():
        raise FileNotFoundError(
            f"Demo document sources still missing under {DATA_DIR} after download-demo-data.sh."
        )
    if need_parquet and not demo_parquet_present():
        raise FileNotFoundError(
            f"Demo parquet still missing under {DATA_DIR} after download-demo-data.sh "
            "(expected parquet_export/part-*.parquet)."
        )


def ensure_collections(db):
    needed = ["documents", "workspaces", "teams", "workflows"]
    existing = set(db.list_collection_names())
    created = [n for n in needed if n not in existing]
    for name in created:
        db.create_collection(name)
        log(f"Created collection: {name}", "OK")
    if not created:
        log(f"Core collections already present: {', '.join(needed)}", "INFO")
    # Text index is created once after bulk load (see ensure_documents_text_index) so we do
    # not maintain it on every insert during seed — avoids Mongo looking like it is
    # "constantly re-indexing" during large delete_many + insert_many batches.


def wipe_documents_collection(db) -> None:
    """Drop and recreate empty `documents` (all indexes and rows removed in one step)."""
    if "documents" in db.list_collection_names():
        try:
            est = db.documents.estimated_document_count()
            log(f"`documents` pre-drop estimated row count: {est:,}", "INFO")
        except Exception as e:
            log(f"Could not estimate document count before drop: {e}", "INFO")
        t0 = time.perf_counter()
        db.drop_collection("documents")
        log(
            f"Dropped entire MongoDB `documents` collection in {_fmt_elapsed(time.perf_counter() - t0)} "
            "(all workspaces). graph/storage/groups may still hold stale document ObjectIds.",
            "WARN",
        )
    t0 = time.perf_counter()
    db.create_collection("documents")
    log(f"Recreated empty `documents` collection in {_fmt_elapsed(time.perf_counter() - t0)}.", "OK")


def drop_documents_text_index_if_exists(db) -> None:
    """Drop the shared documents text index before bulk re-seed (optional, faster bulk load)."""
    try:
        db.documents.drop_index(DOCUMENTS_TEXT_INDEX)
        log(
            f"Dropped index {DOCUMENTS_TEXT_INDEX!r} on documents — $text search is offline "
            "until the seed finishes.",
            "WARN",
        )
    except Exception as e:
        if "index not found" in str(e).lower() or "can't find index" in str(e).lower():
            log(f"No existing {DOCUMENTS_TEXT_INDEX!r} index to drop.", "INFO")
        else:
            log(f"Could not drop text index: {e}", "WARN")


def ensure_documents_text_index(db) -> None:
    """Single text index definition (same options everywhere) after bulk insert."""
    try:
        n = db.documents.estimated_document_count()
        log(
            f"Building text index {DOCUMENTS_TEXT_INDEX!r} on ~{n:,} documents "
            "(title + text, english); this can take several minutes on large corpora…",
            "INFO",
        )
        t0 = time.perf_counter()
        db.documents.create_index(
            DOCUMENTS_TEXT_INDEX_KEYS,
            name=DOCUMENTS_TEXT_INDEX,
            default_language="english",
        )
        log(
            f"Text index {DOCUMENTS_TEXT_INDEX!r} ready in {_fmt_elapsed(time.perf_counter() - t0)}.",
            "OK",
        )
    except Exception as e:
        msg = str(e).lower()
        if "already exists" in msg or "duplicate" in msg or "same name" in msg:
            log("Documents text index already present with compatible definition.", "INFO")
        else:
            log(f"Could not ensure text index: {e}", "WARN")


def extract_jsonl_from_7z(archive_path: Path) -> list[dict]:
    if not py7zr:
        raise RuntimeError("py7zr is required to read documents.jsonl.7z. pip install 'py7zr>=0.22'")
    if not archive_path.exists():
        raise FileNotFoundError(
            f"Archive not found: {archive_path}. Re-run with network access or run ./scripts/download-demo-data.sh."
        )
    # py7zr 1.x has no SevenZipFile.read/readall; implementation lives in demo_7z_jsonl.py (pytest-verified).
    _scripts = str(Path(__file__).resolve().parent)
    if _scripts not in sys.path:
        sys.path.insert(0, _scripts)
    from demo_7z_jsonl import extract_jsonl_rows_from_7z

    return extract_jsonl_rows_from_7z(archive_path, log=log)


def load_jsonl_uncompressed(path: Path) -> list[dict]:
    """If someone extracted the 7z manually."""
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                log(f"Skip bad JSON line: {e}", "WARN")
    return rows


def load_documents_jsonl() -> list[dict]:
    jsonl_path = DATA_DIR / "documents.jsonl"
    if DOCUMENTS_7Z.exists():
        log(f"Document source: compressed archive {DOCUMENTS_7Z}", "INFO")
        return extract_jsonl_from_7z(DOCUMENTS_7Z)
    if jsonl_path.exists():
        log(f"Reading uncompressed JSONL: {jsonl_path}", "INFO")
        t0 = time.perf_counter()
        rows = load_jsonl_uncompressed(jsonl_path)
        log(
            f"Loaded {len(rows):,} rows from JSONL in {_fmt_elapsed(time.perf_counter() - t0)}.",
            "OK",
        )
        return rows
    raise FileNotFoundError(
        f"Neither {DOCUMENTS_7Z} nor {jsonl_path} found after fetch step. "
        "Check TELEOSCOPE_DATA_DIR or run ./scripts/download-demo-data.sh."
    )


def mongo_docs_from_rows(rows: list[dict], workspace_id: ObjectId) -> list[dict]:
    docs = []
    row_iter = rows
    if _seed_use_progress and len(rows) >= 8000:
        row_iter = _pbar(rows, total=len(rows), desc="Build Mongo payloads", unit="row")
    for row in row_iter:
        title = (row.get("title") or "").strip() or "Untitled"
        text = (row.get("text") or "").strip()
        if not text and not title:
            continue
        meta = {}
        for k, v in row.items():
            if k in ("title", "text", "id"):
                continue
            if v is None:
                continue
            if isinstance(v, (str, int, float, bool)):
                meta[k] = v
            elif isinstance(v, (list, dict)):
                try:
                    json.dumps(v)
                    meta[k] = v
                except (TypeError, ValueError):
                    pass
        source_id = row.get("id")
        if source_id is not None:
            meta["source_id"] = str(source_id)
        docs.append({
            "text": text[:1_000_000],
            "title": title[:2048],
            "relationships": {},
            "metadata": meta,
            "workspace": workspace_id,
            "state": {"vectorized": True},
        })
    return docs


def insert_documents_batched(db, docs: list[dict], batch_size: int = BATCH_INSERT) -> list[ObjectId]:
    total = len(docs)
    n_batches = (total + batch_size - 1) // batch_size
    inserted: list[ObjectId] = []
    t_all = time.perf_counter()
    per_batch_logs = not _seed_use_progress
    log(
        f"Mongo insert_many: {total:,} documents → {n_batches} batch(es) × ≤{batch_size} (ordered=False).",
        "INFO",
    )
    batch_iter = _pbar(
        range(0, total, batch_size),
        total=n_batches,
        desc="Mongo insert_many",
        unit="batch",
    )
    for bi, i in enumerate(batch_iter):
        chunk = docs[i : i + batch_size]
        t0 = time.perf_counter()
        # unordered: server may parallelize; order of inserted_ids still matches chunk order
        result = db.documents.insert_many(chunk, ordered=False)
        inserted.extend(result.inserted_ids)
        if per_batch_logs:
            dt = time.perf_counter() - t0
            rate = len(chunk) / dt if dt > 0 else 0.0
            lo, hi = len(inserted) - len(chunk) + 1, len(inserted)
            log(
                f"Mongo batch {bi + 1}/{n_batches}: documents {lo:,}–{hi:,} "
                f"({len(chunk):,} inserted, {dt:.2f}s, {rate:,.0f} docs/s)",
                "OK",
            )
    log(
        f"Mongo insert_many complete: {len(inserted):,} documents in {_fmt_elapsed(time.perf_counter() - t_all)}.",
        "OK",
    )
    return inserted


def load_parquet_rows(parquet_dirs: list[Path]) -> list[dict]:
    if not pq:
        raise RuntimeError("pyarrow is required to read parquet. pip install pyarrow")
    file_jobs: list[Path] = []
    for d in parquet_dirs:
        if not d.is_dir():
            continue
        file_jobs.extend(sorted(d.glob("part-*.parquet")))
    all_rows: list[dict] = []
    file_iter = _pbar(file_jobs, desc="Read parquet parts", unit="file") if file_jobs else file_jobs
    for f in file_iter:
        tbl = pq.read_table(f)
        n = tbl.num_rows
        row_indices = range(n)
        if _seed_use_progress and n > 4000:
            row_indices = _pbar(
                row_indices,
                total=n,
                desc=f"  ↳ {f.name[:36]}",
                unit="row",
                leave=False,
            )
        for i in row_indices:
            row = {}
            for name in tbl.column_names:
                col = tbl.column(name)
                val = col[i]
                if hasattr(val, "as_py"):
                    val = val.as_py()
                row[name] = val
            all_rows.append(row)
    return all_rows


def resolve_demo_workspace_id(db) -> ObjectId:
    raw = os.environ.get("DEMO_CORPUS_WORKSPACE_ID", "").strip()
    if raw:
        try:
            return ObjectId(raw)
        except Exception as e:
            raise SystemExit(f"Invalid DEMO_CORPUS_WORKSPACE_ID: {raw!r}") from e
    ws = db.workspaces.find_one({"label": DEMO_WORKSPACE_LABEL})
    if not ws:
        raise SystemExit(
            'No demo workspace found (label "Demo corpus"). '
            "Run full seed-demo-corpus.py once, or set DEMO_CORPUS_WORKSPACE_ID."
        )
    return ws["_id"]


def seed_milvus_only(
    *,
    download: bool = False,
    no_download: bool = False,
    no_progress: bool = False,
) -> None:
    """Load parquet vectors into Milvus for an existing demo workspace; do not modify Mongo."""
    download, no_download = apply_download_env_overrides(download, no_download)
    _configure_seed_ui(no_progress=no_progress)
    log_demo_seed_scope_warning()
    t_run = time.perf_counter()
    log(f"Milvus-only mode: TELEOSCOPE_DATA_DIR={DATA_DIR}", "INFO")
    ensure_demo_data_files(
        force_download=download,
        no_download=no_download,
        need_documents=False,
        need_parquet=True,
    )
    parquet_dir = find_parquet_dir()
    if not parquet_dir:
        raise SystemExit(f"No parquet_export/part-*.parquet under {DATA_DIR}.")
    if not pq:
        raise SystemExit("pyarrow is required for Milvus seed. pip install pyarrow")

    log(f"Loading parquet (validation pass) from {parquet_dir}…", "INFO")
    t_pq = time.perf_counter()
    parquet_rows = load_parquet_rows([parquet_dir])
    n = len(parquet_rows)
    log(f"Parquet validation load: {n:,} rows in {_fmt_elapsed(time.perf_counter() - t_pq)}.", "OK")
    if n == 0:
        raise SystemExit("Parquet export is empty.")

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    log(f"Connected to MongoDB database={MONGODB_DATABASE!r} (Milvus-only; Mongo not modified).", "INFO")
    workspace_id = resolve_demo_workspace_id(db)
    log(f"Loading Mongo documents for workspace {workspace_id} (sort by _id)…", "INFO")
    t_m = time.perf_counter()
    docs = list(db.documents.find({"workspace": workspace_id}).sort("_id", 1))
    log(f"Mongo find returned {len(docs):,} documents in {_fmt_elapsed(time.perf_counter() - t_m)}.", "OK")
    if len(docs) != n:
        raise SystemExit(
            f"Milvus-only seed needs Mongo document count ({len(docs)}) to equal parquet "
            f"rows ({n}). Documents must align in the same order as a full seed (Mongo sort "
            "by _id). If you changed the demo workspace in Mongo, run full "
            "seed-demo-corpus.py without --milvus-only."
        )

    doc_ids = [d["_id"] for d in docs]
    log(
        f"Milvus-only: workspace {workspace_id}, {n} Mongo docs × parquet rows (by _id order).",
        "INFO",
    )
    seed_milvus(workspace_id, doc_ids, parquet_dir)
    client.close()

    id_file = REPO_ROOT / ".demo_corpus_workspace_id"
    id_file.write_text(str(workspace_id), encoding="utf-8")
    log(f"Wrote {id_file}", "OK")
    log(
        f"Milvus-only seed done (Mongo unchanged). Total time: {_fmt_elapsed(time.perf_counter() - t_run)}.",
        "OK",
    )
    print("", flush=True)
    print(f"DEMO_CORPUS_WORKSPACE_ID={workspace_id}", flush=True)


def seed_milvus(workspace_id: ObjectId, doc_ids: list[ObjectId], parquet_dir: Path) -> None:
    try:
        from backend import embeddings
        from backend.milvus_preflight import ensure_script_rpc_deadline
    except ImportError:
        log("Backend not on path; skip Milvus. Set PYTHONPATH=. when running.", "WARN")
        return
    if not os.environ.get("MILVUS_URI") and not os.environ.get("MILVUS_LITE_PATH"):
        log("MILVUS_URI and MILVUS_LITE_PATH unset; skipping Milvus (ranking will be unavailable).", "INFO")
        return
    if not pq:
        log("pyarrow not installed; skipping Milvus load.", "WARN")
        return
    part_files = sorted(parquet_dir.glob("part-*.parquet"))
    log(
        f"Milvus load: parquet dir {parquet_dir} ({len(part_files)} part-*.parquet file(s)), "
        f"{len(doc_ids):,} Mongo document ids to align.",
        "INFO",
    )
    t_load = time.perf_counter()
    rows = load_parquet_rows([parquet_dir])
    log(
        f"Read {len(rows):,} parquet rows in {_fmt_elapsed(time.perf_counter() - t_load)}.",
        "OK",
    )
    if len(rows) != len(doc_ids):
        log(
            f"Parquet row count ({len(rows)}) != Mongo doc count ({len(doc_ids)}). "
            "Vectors may be misaligned; skipping Milvus load.",
            "WARN",
        )
        return
    _seed_mv_rpc = float(os.environ.get("SEED_MILVUS_RPC_TIMEOUT", "300").strip() or "300")
    ensure_script_rpc_deadline(_seed_mv_rpc)
    log(
        f"Milvus RPC deadline: {os.environ.get('MILVUS_CLIENT_TIMEOUT')}s per call "
        f"(SEED_MILVUS_RPC_TIMEOUT / MILVUS_CLIENT_TIMEOUT; MILVUS_UNBOUNDED_RPC=1 disables). "
        f"TCP preflight + MILVUS_DIAG=1 for stderr timeline.",
        "INFO",
    )
    t_conn = time.perf_counter()
    log("Milvus: calling embeddings.connect() (TCP preflight + list_collections probe)…", "INFO")
    try:
        client = embeddings.connect()
    except Exception as e:
        log(
            f"Milvus connect failed: {e!s}. "
            "Try: MILVUS_DIAG=1, correct MILVUS_URI, `docker compose port milvus 19530`, "
            "MILVUS_SKIP_TCP_PREFLIGHT=1 only if you know the port is special.",
            "FAIL",
        )
        raise SystemExit(1) from e
    log(f"Milvus client connected in {_fmt_elapsed(time.perf_counter() - t_conn)}.", "INFO")
    # Collection name (vectors live here). MILVUS_DBNAME is a legacy alias — it is also used as
    # the *Milvus database* name in embeddings.connect(); on standalone Milvus everything still
    # ends up under the default DB. Prefer MILVUS_COLLECTION when DB name != collection name.
    collection_name = os.environ.get("MILVUS_COLLECTION") or os.environ.get(
        "MILVUS_DBNAME", "teleoscope"
    )
    batch = _milvus_upsert_batch_size()
    log(
        f"Milvus collection={collection_name!r}, partition (workspace)={workspace_id!s}, "
        f"upsert batch size={batch} (override: SEED_MILVUS_UPSERT_BATCH).",
        "INFO",
    )
    t_setup = time.perf_counter()
    embeddings.milvus_setup(client, str(workspace_id), collection_name=collection_name)
    embeddings.use_database_if_supported(client)
    log(f"milvus_setup + use_database_if_supported in {_fmt_elapsed(time.perf_counter() - t_setup)}.", "OK")
    # Backend schema: id (varchar), vector (float_vector 1024). Parquet may have "id" (e.g. reddit/source id).
    # Use parquet row "id" when present so Rank can find embeddings keyed by that id; else use Mongo _id.
    n_batches = (len(doc_ids) + batch - 1) // batch
    flush_every_n = _milvus_periodic_flush_interval_batches(len(doc_ids))
    if flush_every_n:
        approx_vecs = flush_every_n * batch
        log(
            f"Milvus: periodic flush every {flush_every_n} upsert batch(es) (~{approx_vecs:,} vectors "
            f"per seal) plus a final flush — reduces one huge seal at the end on large loads. "
            f"Override: SEED_MILVUS_FLUSH_EVERY_N_BATCHES (0=off).",
            "INFO",
        )
    t_upsert = time.perf_counter()
    batch_log = _milvus_batch_log_enabled()
    per_batch_logs = (not _seed_use_progress) or batch_log
    upsert_indices = range(0, len(doc_ids), batch)
    if _seed_use_progress and tqdm is not None:
        milvus_pbar = tqdm(
            upsert_indices,
            total=n_batches,
            desc="Milvus upsert",
            unit="batch",
            file=sys.stderr,
            dynamic_ncols=True,
            smoothing=0.05,
        )
    else:
        milvus_pbar = upsert_indices
    for b_idx, i in enumerate(milvus_pbar):
        chunk_ids = doc_ids[i : i + batch]
        chunk_rows = rows[i : i + batch]
        def to_list(v):
            if hasattr(v, "tolist"):
                return v.tolist()
            return list(v) if not isinstance(v, list) else v

        def vector_id(j, oid):
            row_id = chunk_rows[j].get("id") if chunk_rows[j] else None
            if row_id is not None:
                return str(row_id)
            return str(oid)

        vector_data = [
            {"id": vector_id(j, oid), "vector": to_list(chunk_rows[j]["dense"])}
            for j, oid in enumerate(chunk_ids)
        ]
        hi = i + len(chunk_ids)
        if _seed_use_progress and tqdm is not None:
            milvus_pbar.set_postfix_str(f"{i + 1:,}–{hi:,} vecs · upsert…", refresh=True)
        t0 = time.perf_counter()
        client.upsert(
            collection_name=collection_name,
            data=vector_data,
            partition_name=str(workspace_id),
        )
        dt = time.perf_counter() - t0
        if _seed_use_progress and tqdm is not None:
            milvus_pbar.set_postfix_str(f"{i + 1:,}–{hi:,} vecs · {dt:.1f}s", refresh=True)
        if per_batch_logs:
            log(
                f"Milvus upsert batch {b_idx + 1}/{n_batches}: vectors {i + 1:,}–{hi:,} "
                f"({len(chunk_ids):,} rows, {dt:.2f}s)",
                "OK",
            )
        if flush_every_n and (b_idx + 1) % flush_every_n == 0:
            t_pf = time.perf_counter()
            try:
                client.flush(collection_name=collection_name)
                log(
                    f"Milvus periodic flush after upsert batch {b_idx + 1}/{n_batches} "
                    f"({_fmt_elapsed(time.perf_counter() - t_pf)}).",
                    "OK",
                )
            except Exception as e_pf:
                log(
                    f"Milvus periodic flush after batch {b_idx + 1} failed (continuing upserts): {e_pf!s}",
                    "WARN",
                )
    log(f"All Milvus upserts done in {_fmt_elapsed(time.perf_counter() - t_upsert)}.", "OK")
    t_flush = time.perf_counter()
    flush_strict = os.environ.get("SEED_MILVUS_FLUSH_STRICT", "").lower() in (
        "1",
        "true",
        "yes",
    )
    skip_flush = os.environ.get("SEED_MILVUS_SKIP_FLUSH", "").lower() in (
        "1",
        "true",
        "yes",
    )

    def _close_mv(c) -> None:
        try:
            c.close()
        except Exception:
            pass

    if skip_flush:
        log(
            "SEED_MILVUS_SKIP_FLUSH=1 — skipping flush (Milvus seals segments in the background).",
            "INFO",
        )
        _close_mv(client)
    else:
        log(
            "Milvus: flush() to seal segments (retries once with a fresh connection if RootCoord "
            "reports channel errors after a long upsert)…",
            "INFO",
        )
        flushed = False
        try:
            client.flush(collection_name=collection_name)
            flushed = True
            log(f"Milvus flush in {_fmt_elapsed(time.perf_counter() - t_flush)}.", "OK")
        except Exception as e1:
            log(
                f"Milvus flush failed on current connection (often stale gRPC after bulk upsert): {e1!s}",
                "WARN",
            )
        _close_mv(client)

        if not flushed:
            log("Milvus: reconnecting and retrying flush once…", "INFO")
            t_retry = time.perf_counter()
            try:
                client = embeddings.connect()
                embeddings.use_database_if_supported(client)
                client.flush(collection_name=collection_name)
                log(
                    f"Milvus flush OK after reconnect ({_fmt_elapsed(time.perf_counter() - t_retry)}).",
                    "OK",
                )
                flushed = True
            except Exception as e2:
                detail = (
                    "Milvus flush still failing after reconnect. Upserts are usually persisted; "
                    "segments may seal automatically, or restart Milvus (`docker compose restart milvus`). "
                    "Verify: PYTHONPATH=. python scripts/milvus-status.py — "
                    "or set SEED_MILVUS_SKIP_FLUSH=1 to complete the seed without flush."
                )
                if flush_strict:
                    log(f"{detail} ({e2!s})", "FAIL")
                    _close_mv(client)
                    raise SystemExit(1) from e2
                log(f"{detail} Detail: {e2!s}", "WARN")
            finally:
                _close_mv(client)

    log("Milvus seed done.", "OK")


def seed(
    *,
    workspace_documents_only: bool = False,
    keep_text_index: bool = False,
    download: bool = False,
    no_download: bool = False,
    no_progress: bool = False,
) -> None:
    if os.environ.get("SEED_WORKSPACE_DOCUMENTS_ONLY", "").lower() in ("1", "true", "yes"):
        workspace_documents_only = True
    if os.environ.get("SEED_KEEP_TEXT_INDEX", "").lower() in ("1", "true", "yes"):
        keep_text_index = True
    # Legacy opt-out for dropping the text index during workspace-scoped re-seed
    if os.environ.get("SEED_DROP_TEXT_INDEX", "").lower() in ("0", "false", "no"):
        keep_text_index = True

    download, no_download = apply_download_env_overrides(download, no_download)
    _configure_seed_ui(no_progress=no_progress)

    log_demo_seed_scope_warning()
    t_seed = time.perf_counter()
    log(f"TELEOSCOPE_DATA_DIR={DATA_DIR}", "INFO")
    need_parquet = milvus_env_configured()
    if need_parquet:
        log(
            "MILVUS_URI or MILVUS_LITE_PATH is set — will require parquet_export/part-*.parquet for vector seed.",
            "INFO",
        )
    ensure_demo_data_files(
        force_download=download,
        no_download=no_download,
        need_documents=True,
        need_parquet=need_parquet,
    )
    log_section("Source documents (7z or JSONL)")
    log("Loading documents from 7z/JSONL...", "INFO")
    raw_rows = load_documents_jsonl()
    log(f"Loaded {len(raw_rows):,} raw rows from source.", "OK")

    log_section("MongoDB")
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DATABASE]
    if workspace_documents_only:
        _mode = (
            "Re-seed: workspace-documents-only; text index kept during bulk."
            if keep_text_index
            else "Re-seed: workspace-documents-only; text index dropped during bulk."
        )
    else:
        _mode = "Re-seed: entire `documents` collection replaced (default)."
    log(f"Connected to MongoDB database={MONGODB_DATABASE!r}. {_mode}", "INFO")
    ensure_collections(db)

    # Reuse existing demo corpus workspace if present
    existing = db.workspaces.find_one({"label": DEMO_WORKSPACE_LABEL})
    if existing:
        workspace_id = existing["_id"]
        log(f"Reusing existing demo workspace _id={workspace_id}", "INFO")
    else:
        team_id = ObjectId()
        workspace_id = ObjectId()
        workflow_id = ObjectId()
        db.teams.insert_one({
            "_id": team_id,
            "owner": "demo-corpus-seed",
            "label": DEMO_TEAM_LABEL,
            "workspaces": [workspace_id],
            "users": [],
        })
        db.workspaces.insert_one({
            "_id": workspace_id,
            "label": DEMO_WORKSPACE_LABEL,
            "team": team_id,
            "workflows": [workflow_id],
            "settings": {"document_height": 35, "document_width": 100, "expanded": False},
            "storage": [],
            "selected_workflow": workflow_id,
        })
        db.workflows.insert_one({
            "_id": workflow_id,
            "workspace": workspace_id,
            "label": DEMO_WORKFLOW_LABEL,
            "nodes": [],
            "edges": [],
            "bookmarks": [],
            "selection": {"nodes": [], "edges": []},
            "settings": {"color": "#94a3b8", "title_length": 50},
            "last_update": "2024-01-01T00:00:00.000Z",
            "logical_clock": 100,
        })
        log(f"Created team={team_id}, workspace={workspace_id}, workflow={workflow_id}", "OK")

    t_build = time.perf_counter()
    docs = mongo_docs_from_rows(raw_rows, workspace_id)
    log(
        f"Built {len(docs):,} Mongo document payloads from {len(raw_rows):,} raw rows "
        f"in {_fmt_elapsed(time.perf_counter() - t_build)}.",
        "INFO",
    )
    if not docs:
        log("No documents to insert.", "WARN")
        client.close()
        return

    if workspace_documents_only:
        if not keep_text_index:
            log(
                "Dropping shared documents text index before bulk delete/insert "
                "($text offline for all workspaces until rebuild).",
                "WARN",
            )
            drop_documents_text_index_if_exists(db)
        pre_del = db.documents.count_documents({"workspace": workspace_id})
        log(f"Workspace-scoped delete: removing up to {pre_del:,} documents for workspace {workspace_id}…", "INFO")
        t_del = time.perf_counter()
        deleted = db.documents.delete_many({"workspace": workspace_id})
        log(
            f"delete_many acknowledged: removed {deleted.deleted_count:,} document(s) "
            f"in {_fmt_elapsed(time.perf_counter() - t_del)}.",
            "INFO",
        )
    else:
        log(
            "Replacing Mongo `documents` by dropping the collection (default for demo re-seed). "
            "Use --workspace-documents-only if other workspaces must keep their documents.",
            "INFO",
        )
        wipe_documents_collection(db)

    inserted_ids = insert_documents_batched(db, docs)
    log(f"Inserted {len(inserted_ids):,} documents into workspace {workspace_id}.", "OK")

    # Not a second bulk insert: create_index scans existing rows once for $text search.
    log(
        "Next: build the shared MongoDB $text index on `documents` (one index build, not re-loading JSONL).",
        "INFO",
    )
    log_section("MongoDB text index ($text search)")
    ensure_documents_text_index(db)

    count = db.documents.count_documents({"workspace": workspace_id})
    log(f"Verified count_documents(workspace=demo): {count:,} (expected {len(inserted_ids):,}).", "OK")

    parquet_dir = find_parquet_dir()
    if parquet_dir:
        log_section("Milvus vectors (from parquet)")
        log(f"Parquet vectors: using {parquet_dir}", "INFO")
        seed_milvus(workspace_id, inserted_ids, parquet_dir)
    elif need_parquet:
        raise RuntimeError(
            "MILVUS_URI/MILVUS_LITE_PATH set and parquet was required at startup, "
            "but find_parquet_dir() is now None — unexpected; check TELEOSCOPE_DATA_DIR."
        )
    else:
        log(
            "No parquet_export/part-*.parquet found under data paths; skipping Milvus (ranking unavailable). "
            "Unset MILVUS_URI/MILVUS_LITE_PATH if you want Mongo-only demo without vectors.",
            "INFO",
        )

    client.close()
    # Write ID to file so one-click-demo.sh / refresh-demo-corpus.sh can read it (avoids parsing stdout)
    id_file = REPO_ROOT / ".demo_corpus_workspace_id"
    id_file.write_text(str(workspace_id), encoding="utf-8")
    log(f"Wrote {id_file}", "OK")
    log_section("Done")
    log(f"Total seed time: {_fmt_elapsed(time.perf_counter() - t_seed)}.", "OK")
    print("", flush=True)
    print("[OK] Demo corpus seeded. Set in your environment:", flush=True)
    print(f"  export DEMO_CORPUS_WORKSPACE_ID={workspace_id}", flush=True)
    print("", flush=True)
    # Parseable line for scripts (match with grep 'DEMO_CORPUS_WORKSPACE_ID=')
    print(f"DEMO_CORPUS_WORKSPACE_ID={workspace_id}", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--milvus-only",
        action="store_true",
        help=(
            "Only upsert vectors from parquet into Milvus for the demo workspace. "
            "Does not read the 7z or change Mongo. Requires MILVUS_URI or MILVUS_LITE_PATH, "
            "and Mongo document count must match parquet row count (sorted by _id)."
        ),
    )
    parser.add_argument(
        "--workspace-documents-only",
        action="store_true",
        help=(
            "Only delete documents in the demo workspace instead of dropping the entire "
            "`documents` collection. Slower for large corpora; by default the text index is "
            "dropped during bulk load (use --keep-text-index to skip). "
            "Same as env SEED_WORKSPACE_DOCUMENTS_ONLY=1."
        ),
    )
    parser.add_argument(
        "--keep-text-index",
        action="store_true",
        help=(
            "With --workspace-documents-only: do not drop the shared text index before bulk "
            "writes (slower). Ignored when the full collection is dropped (default seed path). "
            "Same as env SEED_KEEP_TEXT_INDEX=1."
        ),
    )
    dl = parser.add_mutually_exclusive_group()
    dl.add_argument(
        "--download",
        action="store_true",
        help=(
            "Always run scripts/download-demo-data.sh first (shallow clone "
            "Teleoscope/teleoscope-demo-data into TELEOSCOPE_DATA_DIR). Same as SEED_DOWNLOAD_DEMO_DATA=1."
        ),
    )
    dl.add_argument(
        "--no-download",
        action="store_true",
        help=(
            "Never fetch demo data; fail if documents.jsonl.7z and documents.jsonl are missing. "
            "Same as SEED_NO_DOWNLOAD=1."
        ),
    )
    parser.add_argument(
        "--no-progress",
        action="store_true",
        help=(
            "Disable tqdm progress bars; use plain per-batch logs only. "
            "Same as SEED_NO_PROGRESS=1 (also implied when stderr is not a TTY)."
        ),
    )
    args = parser.parse_args()
    try:
        if args.milvus_only:
            seed_milvus_only(
                download=args.download,
                no_download=args.no_download,
                no_progress=args.no_progress,
            )
        else:
            seed(
                workspace_documents_only=args.workspace_documents_only,
                keep_text_index=args.keep_text_index,
                download=args.download,
                no_download=args.no_download,
                no_progress=args.no_progress,
            )
    except FileNotFoundError as e:
        log(str(e), "FAIL")
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        log(
            "download-demo-data.sh failed. Check git, network, and "
            "TELEOSCOPE_DEMO_DATA_REPO / TELEOSCOPE_DEMO_DATA_BRANCH. "
            f"({e})",
            "FAIL",
        )
        sys.exit(1)
    except Exception as e:
        log(f"Error: {e}", "FAIL")
        sys.exit(1)
