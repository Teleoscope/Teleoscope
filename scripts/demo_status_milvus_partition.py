#!/usr/bin/env python3
"""
demo-status.sh Milvus block: env+policy auth (stdout), then RPC probe, then optional partition.

Stdout (machine-friendly lines for bash):
  milvus_auth: ...
  milvus_auth_check: OK|FAIL ...
  milvus_rpc_probe: OK|FAIL ...
  PARTITION:yes:N | PARTITION:no | PARTITION:skipped_no_demo_workspace_id | ERR:...

Exit 0 on success (RPC probe OK); 1 on policy failure, connect failure, or partition error.
Stderr: extra detail (no secrets).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def _resolve_network_uri() -> str:
    from backend.milvus_uri_resolve import milvus_http_uri_from_env

    return milvus_http_uri_from_env()


def _e(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def main() -> int:
    from backend import embeddings
    from backend.milvus_auth import print_milvus_auth_status_for_shell

    wid = os.environ.get("DEMO_WORKSPACE_ID", "").strip()

    if os.environ.get("MILVUS_LITE_PATH", "").strip():
        print("milvus_auth: Milvus_Lite (file path; no network URI)", flush=True)
        print("milvus_auth_check: OK", flush=True)
        _e("[demo-status] milvus: Milvus_Lite — RPC opens local store")
    else:
        uri = _resolve_network_uri()
        _e(f"[demo-status] milvus: effective_URI={uri}")
        rc = print_milvus_auth_status_for_shell(uri)
        if rc != 0:
            print("milvus_rpc_probe: FAIL (see milvus_auth_check above)", flush=True)
            return rc

    _e("[demo-status] milvus: embeddings.connect() then list_collections() (RPC probe)…")
    try:
        client = embeddings.connect()
        client.list_collections()
        # Same DB context as seed-demo-corpus / workers (MILVUS_DBNAME); else partition checks default DB.
        embeddings.use_database_if_supported(client)
    except Exception as e:
        print(f"milvus_rpc_probe: FAIL {e!s}", flush=True)
        print(f"ERR:{e}", flush=True)
        return 1

    print("milvus_rpc_probe: OK (list_collections succeeded)", flush=True)
    _e("[demo-status] milvus: RPC probe succeeded")

    cn = (
        os.environ.get("MILVUS_COLLECTION", "").strip()
        or os.environ.get("MILVUS_DBNAME", "teleoscope").strip()
        or "teleoscope"
    )
    try:
        if not wid:
            print("PARTITION:skipped_no_demo_workspace_id", flush=True)
        elif not client.has_partition(collection_name=cn, partition_name=wid):
            print("PARTITION:no", flush=True)
        else:
            try:
                st = client.get_partition_stats(collection_name=cn, partition_name=wid)
                n = int(st.get("row_count", 0))
                print(f"PARTITION:yes:{n}", flush=True)
            except Exception:
                print("PARTITION:yes", flush=True)
    except Exception as e:
        print(f"ERR:{e}", flush=True)
        return 1
    finally:
        try:
            client.close()
        except Exception:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
