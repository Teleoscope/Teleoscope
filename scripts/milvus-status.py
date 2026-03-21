#!/usr/bin/env python3
"""Print Milvus status for debugging: collections, partitions, row counts.

Uses the same environment as workers and export/import:

- ``MILVUS_URI`` + optional ``MILVUS_TOKEN`` (Zilliz / remote)
- or ``MILVUS_HOST`` + ``MIVLUS_PORT`` (Docker / local)
- or ``MILVUS_LITE_PATH`` (Milvus Lite file)
- ``MILVUS_DATABASE`` / ``MILVUS_DBNAME`` for named-database selection when supported
- ``MILVUS_COLLECTION`` or ``MILVUS_DBNAME`` for the default collection to inspect (default: teleoscope)

For demo corpus vs Mongo alignment, prefer ``./scripts/demo-status.sh`` (includes Mongo + app).

Env (hang avoidance): ``MILVUS_CLIENT_TIMEOUT`` (default 90s for this script if unset),
``MILVUS_UNBOUNDED_RPC=1`` to remove deadline, ``MILVUS_DIAG=1`` stderr timeline from
``embeddings.connect``, ``MILVUS_SKIP_TCP_PREFLIGHT=1`` to skip port check.

Usage::

  mamba activate teleoscope
  PYTHONPATH=. python scripts/milvus-status.py
  PYTHONPATH=. python scripts/milvus-status.py -v
  PYTHONPATH=. python scripts/milvus-status.py --collection teleoscope
  PYTHONPATH=. python scripts/milvus-status.py --json
  PYTHONPATH=. python scripts/milvus-status.py --workspace 674a2f...  # highlight one partition
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(message)s")

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = Path(__file__).resolve().parent
for _p in (REPO_ROOT, SCRIPTS_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from backend.milvus_preflight import ensure_script_rpc_deadline  # noqa: E402
from milvus_io_utils import connect_milvus_client, use_milvus_db  # noqa: E402


def _phase(msg: str) -> None:
    print(f"[milvus-status {time.strftime('%H:%M:%S')}] {msg}", file=sys.stderr, flush=True)


def _resolve_db_name(db_override: str | None) -> str:
    if db_override is not None:
        return db_override
    raw = os.getenv("MILVUS_DATABASE") or os.getenv("MILVUS_DBNAME", "teleoscope")
    return str(raw).strip() or "teleoscope"


def _collection_default() -> str:
    return (
        os.getenv("MILVUS_COLLECTION") or os.getenv("MILVUS_DBNAME") or "teleoscope"
    ).strip()


def _norm_collection_names(raw: Any) -> list[str]:
    if not raw:
        return []
    if isinstance(raw[0], dict):
        out = []
        for x in raw:
            n = x.get("collection_name") or x.get("name")
            if n:
                out.append(str(n))
        return out
    return [str(x) for x in raw]


def _partition_stats(client: Any, collection: str, partition: str) -> dict[str, Any] | None:
    try:
        st = client.get_partition_stats(
            collection_name=collection, partition_name=partition
        )
        return dict(st) if isinstance(st, dict) else {"raw": st}
    except Exception as e:
        return {"error": str(e)}


def _describe(client: Any, collection: str) -> Any:
    if not hasattr(client, "describe_collection"):
        return None
    try:
        return client.describe_collection(collection_name=collection)
    except Exception as e:
        return {"error": str(e)}


def _load_state(client: Any, collection: str) -> Any:
    if not hasattr(client, "get_load_state"):
        return None
    try:
        return client.get_load_state(collection_name=collection)
    except Exception:
        try:
            return client.get_load_state(collection)
        except Exception as e:
            return {"error": str(e)}


def build_report(
    client: Any,
    db_name: str,
    focus_collection: str | None,
    all_collections: bool,
) -> dict[str, Any]:
    use_milvus_db(client, db_name)
    raw_cols = client.list_collections()
    names = _norm_collection_names(raw_cols)

    if all_collections:
        target_names = names
    else:
        fc = focus_collection or "teleoscope"
        target_names = [n for n in names if n == fc]
        if not target_names:
            try:
                if client.has_collection(collection_name=fc):
                    target_names = [fc]
            except TypeError:
                if client.has_collection(fc):
                    target_names = [fc]

    report: dict[str, Any] = {
        "connection": {
            "milvus_uri_set": bool(os.getenv("MILVUS_URI", "").strip()),
            "milvus_lite_path": os.getenv("MILVUS_LITE_PATH", "").strip() or None,
            "host": os.getenv("MILVUS_HOST"),
            "port": os.getenv("MIVLUS_PORT"),
            "logical_db_name_used": db_name,
        },
        "collections": [],
    }

    for cname in target_names:
        entry: dict[str, Any] = {"name": cname}
        try:
            parts = client.list_partitions(collection_name=cname)
        except Exception as e:
            entry["partitions_error"] = str(e)
            report["collections"].append(entry)
            continue

        entry["partitions"] = []
        for p in parts:
            row: dict[str, Any] = {"name": p}
            stats = _partition_stats(client, cname, p)
            if stats is not None:
                row["stats"] = stats
            entry["partitions"].append(row)

        entry["describe_collection"] = _describe(client, cname)
        entry["load_state"] = _load_state(client, cname)
        report["collections"].append(entry)

    return report


def _print_workspace_summary(report: dict[str, Any], workspace: str) -> None:
    for c in report.get("collections", []):
        for p in c.get("partitions", []):
            if str(p.get("name")) != workspace:
                continue
            st = p.get("stats") or {}
            if "error" in st:
                print(f"\n  workspace partition {workspace!r}: stats error: {st['error']}")
            else:
                print(
                    f"\n  workspace partition {workspace!r}: row_count={st.get('row_count', '?')}"
                )
            return
    print(f"\n  workspace partition {workspace!r}: not found in listed collections.", file=sys.stderr)


def print_text(report: dict[str, Any]) -> None:
    conn = report["connection"]
    print("Milvus status")
    print("  connection:")
    if conn.get("milvus_lite_path"):
        print(f"    mode: Milvus Lite ({conn['milvus_lite_path']})")
    elif conn["milvus_uri_set"]:
        print("    mode: MILVUS_URI")
    else:
        print(f"    mode: MILVUS_HOST={conn['host']!r} MIVLUS_PORT={conn['port']!r}")
    print(f"    logical_db (for using_database): {conn['logical_db_name_used']!r}")

    cols = report["collections"]
    if not cols:
        print("  collections: (none matched — check MILVUS_COLLECTION / run with --all-collections)")
        return

    for c in cols:
        print(f"\n  collection: {c['name']}")
        if "partitions_error" in c:
            print(f"    error listing partitions: {c['partitions_error']}")
            continue
        ls = c.get("load_state")
        if ls is not None:
            print(f"    load_state: {ls}")
        for p in c.get("partitions", []):
            pname = p["name"]
            st = p.get("stats") or {}
            if "error" in st:
                print(f"    partition {pname!r}: stats error: {st['error']}")
            else:
                rc = st.get("row_count", "?")
                extra = {k: v for k, v in st.items() if k != "row_count"}
                extra_s = f" {extra}" if extra else ""
                print(f"    partition {pname!r}: row_count={rc}{extra_s}")
        desc = c.get("describe_collection")
        if desc is not None:
            print(f"    describe_collection: {desc}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--collection",
        default=None,
        help=f"Inspect this collection only (default: env MILVUS_COLLECTION / MILVUS_DBNAME / teleoscope, currently {_collection_default()!r})",
    )
    parser.add_argument(
        "--all-collections",
        action="store_true",
        help="List every collection (default: focus on --collection only when set)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Machine-readable JSON on stdout",
    )
    parser.add_argument(
        "--workspace",
        default=None,
        metavar="PARTITION",
        help="Highlight this partition name (e.g. demo workspace ObjectId hex)",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="INFO logs + stderr phases (connect can still use MILVUS_DIAG=1 for embeddings trace)",
    )
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.INFO)
        logging.getLogger("milvus_io").setLevel(logging.INFO)

    status_deadline = float(os.getenv("MILVUS_STATUS_TIMEOUT", "90").strip() or "90")
    ensure_script_rpc_deadline(status_deadline)
    _phase(
        f"RPC deadline {os.environ.get('MILVUS_CLIENT_TIMEOUT')}s "
        f"(override MILVUS_CLIENT_TIMEOUT / MILVUS_STATUS_TIMEOUT)"
    )

    focus = args.collection if args.collection is not None else _collection_default()
    _phase("connect_milvus_client() …")
    t0 = time.perf_counter()
    client, db_override = connect_milvus_client()
    _phase(f"connected in {time.perf_counter() - t0:.2f}s")
    db_name = _resolve_db_name(db_override)

    try:
        report = build_report(
            client,
            db_name,
            focus_collection=focus,
            all_collections=args.all_collections,
        )
        if args.json:
            if args.workspace:
                report["workspace_highlight"] = str(args.workspace)
            print(json.dumps(report, indent=2, default=str))
        else:
            if args.all_collections:
                print("(all collections)\n")
            else:
                print(
                    f"(collection focus={focus!r}; use --all-collections for every collection)\n"
                )
            print_text(report)
            if args.workspace:
                _print_workspace_summary(report, str(args.workspace))
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    finally:
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
