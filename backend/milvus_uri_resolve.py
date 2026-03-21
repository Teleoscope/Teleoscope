"""
Single place to derive Milvus network endpoint from env.

Matches ``embeddings.connect()`` host/port fallback (``MIVLUS_PORT`` typo + ``MILVUS_PORT``).
Use for scripts under ``data/``, legacy ``backend.utils.connect_milvus``, and docs alignment.
"""

from __future__ import annotations

import os
from urllib.parse import urlparse


def milvus_http_uri_from_env() -> str:
    """
    URI for ``MilvusClient(uri=...)`` / ``connections.connect(uri=...)``.

    1. ``MILVUS_URI`` when set (http/https, e.g. Zilliz).
    2. Else ``http://{MILVUS_HOST}:{port}`` with port from ``MIVLUS_PORT``, then ``MILVUS_PORT``, else ``19530``.
    """
    u = (os.getenv("MILVUS_URI") or "").strip()
    if u:
        return u
    host = (os.getenv("MILVUS_HOST") or "localhost").strip() or "localhost"
    port_raw = (os.getenv("MIVLUS_PORT") or os.getenv("MILVUS_PORT") or "19530").strip() or "19530"
    return f"http://{host}:{port_raw}"


def milvus_named_database_from_env() -> str:
    """Milvus logical DB name; ``MILVUS_DATABASE`` then ``MILVUS_DBNAME``, default ``teleoscope``."""
    d = (os.getenv("MILVUS_DATABASE") or os.getenv("MILVUS_DBNAME") or "teleoscope").strip()
    return d or "teleoscope"


def milvus_tcp_host_port_from_env() -> tuple[str, int] | None:
    """
    (host, port) for socket preflight, or None if ``MILVUS_LITE_PATH`` is set.
    """
    if (os.getenv("MILVUS_LITE_PATH") or "").strip():
        return None
    uri = milvus_http_uri_from_env()
    parsed = urlparse(uri if "://" in uri else f"http://{uri}")
    host = parsed.hostname
    if not host:
        raise RuntimeError(f"Resolved Milvus URI has no host: {uri!r}")
    port = parsed.port or 19530
    return host, int(port)
