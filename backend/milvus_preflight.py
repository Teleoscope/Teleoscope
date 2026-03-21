"""Fast Milvus connectivity checks and RPC deadlines for scripts (avoid silent hangs)."""

from __future__ import annotations

import os
import socket
import time
from urllib.parse import urlparse


def tcp_probe(host: str, port: int, *, timeout_sec: float = 3.0) -> None:
    """
    Block until TCP connect succeeds or deadline passes.
    Raises RuntimeError with a short, actionable message on failure.
    """
    t0 = time.perf_counter()
    try:
        sock = socket.create_connection((host, port), timeout=timeout_sec)
    except OSError as e:
        dt = time.perf_counter() - t0
        raise RuntimeError(
            f"Milvus TCP preflight failed after {dt:.1f}s: cannot reach {host!s}:{port} ({e!s}). "
            f"Check MILVUS_URI / docker compose port / security groups. "
            f"Override: MILVUS_SKIP_TCP_PREFLIGHT=1 (not recommended)."
        ) from e
    else:
        sock.close()


def tcp_target_from_env() -> tuple[str, int] | None:
    """
    Return (host, port) for a network Milvus endpoint, or None if using Milvus Lite only.
    """
    if (os.getenv("MILVUS_LITE_PATH") or "").strip():
        return None
    uri = (os.getenv("MILVUS_URI") or "").strip()
    if uri:
        parsed = urlparse(uri if "://" in uri else f"http://{uri}")
        host = parsed.hostname
        if not host:
            raise RuntimeError(f"MILVUS_URI is set but has no host: {uri!r}")
        port = parsed.port or 19530
        return host, int(port)
    host = (os.getenv("MILVUS_HOST") or "localhost").strip() or "localhost"
    port_raw = (os.getenv("MIVLUS_PORT") or "19530").strip() or "19530"
    try:
        port = int(port_raw)
    except ValueError as e:
        raise RuntimeError(f"Invalid MIVLUS_PORT={port_raw!r}") from e
    return host, port


def tcp_probe_from_env(*, timeout_sec: float | None = None) -> None:
    """Run TCP preflight when targeting a network Milvus (skipped for Milvus Lite)."""
    if (os.getenv("MILVUS_SKIP_TCP_PREFLIGHT", "").lower() in ("1", "true", "yes")):
        return
    target = tcp_target_from_env()
    if target is None:
        return
    host, port = target
    sec = timeout_sec
    if sec is None:
        try:
            sec = float(os.getenv("MILVUS_TCP_PREFLIGHT_TIMEOUT", "4").strip() or "4")
        except ValueError:
            sec = 4.0
    tcp_probe(host, port, timeout_sec=sec)


def ensure_script_rpc_deadline(default_seconds: float) -> None:
    """
    Set MILVUS_CLIENT_TIMEOUT for this process if unset, so pymilvus RPCs do not hang forever.

    Workers should set MILVUS_UNBOUNDED_RPC=1 or an explicit MILVUS_CLIENT_TIMEOUT.
    """
    if (os.getenv("MILVUS_UNBOUNDED_RPC", "").lower() in ("1", "true", "yes")):
        return
    if (os.getenv("MILVUS_CLIENT_TIMEOUT") or "").strip():
        return
    os.environ["MILVUS_CLIENT_TIMEOUT"] = str(default_seconds)
