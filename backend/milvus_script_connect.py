"""Milvus wiring for repo CLI/data scripts — matches workers (auth, URI, DB) + script RPC deadline."""

from __future__ import annotations

import logging
import os
from typing import Any


def connect_milvus_script_client() -> Any:
    """
    Uses ``embeddings.connect()`` (Lite, Zilliz, compose) then ``use_database_if_supported``.

    Sets ``MILVUS_CLIENT_TIMEOUT`` when unset (via ``ensure_script_rpc_deadline``) so flush/insert
    RPCs do not hang indefinitely. Override with ``MILVUS_CLIENT_TIMEOUT`` or ``MILVUS_UNBOUNDED_RPC=1``.
    """
    from backend.embeddings import connect, use_database_if_supported
    from backend.milvus_preflight import ensure_script_rpc_deadline

    default_rpc = float(os.getenv("MILVUS_IO_RPC_TIMEOUT", "120").strip() or "120")
    ensure_script_rpc_deadline(default_rpc)
    client = connect()
    use_database_if_supported(client)
    return client


def connect_milvus_script_orm(alias: str = "default") -> None:
    """
    ORM ``connections.connect`` for scripts that use ``Collection`` (e.g. ``data/export.py``).

    Not for Milvus Lite (file) — use ``connect_milvus_script_client()`` / MilvusClient flows instead.
    """
    from pymilvus import connections, db

    from backend.milvus_auth import (
        assert_milvus_auth_before_network_connect,
        milvus_connection_auth_kwargs,
    )
    from backend.milvus_preflight import ensure_script_rpc_deadline, tcp_probe_from_env
    from backend.milvus_uri_resolve import (
        milvus_http_uri_from_env,
        milvus_named_database_from_env,
    )

    if (os.getenv("MILVUS_LITE_PATH") or "").strip():
        raise RuntimeError(
            "This script uses the Milvus ORM (Collection), which does not apply to MILVUS_LITE_PATH. "
            "Unset MILVUS_LITE_PATH and point MILVUS_URI (or MILVUS_HOST + port) at a Milvus server."
        )

    default_rpc = float(os.getenv("MILVUS_IO_RPC_TIMEOUT", "120").strip() or "120")
    ensure_script_rpc_deadline(default_rpc)
    tcp_probe_from_env()
    uri = milvus_http_uri_from_env()
    assert_milvus_auth_before_network_connect(uri)
    connections.connect(alias, uri=uri, **milvus_connection_auth_kwargs())
    db_name = milvus_named_database_from_env()
    try:
        db.using_database(db_name)
    except Exception:
        logging.debug("Milvus using_database(%r) skipped.", db_name)
