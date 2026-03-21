"""Shared Milvus connection helpers for ``export_milvus_teleoscope`` / ``import_milvus_teleoscope``."""
from __future__ import annotations

import logging
import os
from typing import Any, Tuple

from dotenv import load_dotenv

from backend.embeddings import _milvus_client_timeout
from backend.milvus_auth import (
    assert_milvus_auth_before_network_connect,
    log_milvus_auth_summary,
    milvus_token_for_client,
)
from backend.milvus_preflight import ensure_script_rpc_deadline, tcp_probe_from_env
from backend.milvus_quiet import quiet_pymilvus_rpc_logs

load_dotenv()

_LOG = logging.getLogger("milvus_io")

# After one failed using_database (standalone Milvus / no multi-DB), skip further switches
# for this process so export/import do not spam DescribeDatabase / using_database RPCs.
_named_db_unsupported = False


def _timeout_kw() -> dict[str, float]:
    t = _milvus_client_timeout()
    return {"timeout": t} if t is not None else {}


def _uri_client_kwargs(
    uri: str, *, token: str | None, db_name: str | None = None
) -> dict[str, Any]:
    kw: dict[str, Any] = {"uri": uri, **_timeout_kw()}
    if token:
        kw["token"] = token
    if db_name is not None:
        kw["db_name"] = db_name
    return kw


def token_from_env() -> str | None:
    """Same as ``milvus_token_for_client`` (export scripts import this name)."""
    return milvus_token_for_client()


def connect_milvus_client() -> Tuple[Any, str | None]:
    """
    Return (MilvusClient, db_name_override).

    When the second value is set (URI connect fallback), callers should pass it to
    ``use_milvus_db`` so ``using_database`` runs on the client.
    """
    global _named_db_unsupported
    _named_db_unsupported = False

    default_rpc = float(os.getenv("MILVUS_IO_RPC_TIMEOUT", "120").strip() or "120")
    ensure_script_rpc_deadline(default_rpc)
    _LOG.info(
        "milvus_io: RPC deadline %ss (MILVUS_CLIENT_TIMEOUT / MILVUS_IO_RPC_TIMEOUT); "
        "unbounded: MILVUS_UNBOUNDED_RPC=1",
        os.getenv("MILVUS_CLIENT_TIMEOUT", default_rpc),
    )

    from pymilvus import MilvusClient, MilvusException

    lite = os.getenv("MILVUS_LITE_PATH", "").strip()
    if lite:
        path = lite[7:] if lite.startswith("file://") else lite
        _LOG.info("Connecting to Milvus Lite: %s", path)
        return MilvusClient(uri=path, **_timeout_kw()), None

    tcp_probe_from_env()
    _LOG.info("TCP preflight passed (or skipped for Lite)")

    uri = os.getenv("MILVUS_URI", "").strip()
    token = token_from_env()
    db_name = os.getenv("MILVUS_DBNAME", "teleoscope").strip() or "teleoscope"

    if uri:
        assert_milvus_auth_before_network_connect(uri)
        log_milvus_auth_summary(uri)
        _LOG.info("Connecting via MILVUS_URI")
        prefer_default = (
            uri.lower().startswith("http://")
            and not token
            and os.getenv("MILVUS_FORCE_DB_NAME_ON_CONNECT", "").lower()
            not in ("1", "true", "yes")
        )
        if prefer_default:
            try:
                c = MilvusClient(**_uri_client_kwargs(uri, token=token))
                _LOG.info("list_collections (no db_name on connect)")
                c.list_collections()
                return c, None
            except MilvusException as e:
                _LOG.info("Connect without db_name failed (%s); retrying with db_name.", e)
        try:
            c = MilvusClient(**_uri_client_kwargs(uri, token=token, db_name=db_name))
            _LOG.info("list_collections (db_name on connect)")
            c.list_collections()
            return c, None
        except MilvusException as e:
            _LOG.warning("Connect with db_name failed (%s); retrying without db_name.", e)
            c = MilvusClient(**_uri_client_kwargs(uri, token=token))
            return c, db_name

    from backend import embeddings

    _LOG.info("Connecting via backend.embeddings (MILVUS_HOST / MIVLUS_PORT)")
    return embeddings.connect(), None


def use_milvus_db(client: Any, db_name: str | None) -> None:
    global _named_db_unsupported
    if _named_db_unsupported:
        return
    if db_name is None:
        return
    if not str(db_name).strip():
        from backend import embeddings

        embeddings.use_database_if_supported(client)
        return
    try:
        with quiet_pymilvus_rpc_logs():
            client.using_database(db_name=db_name)
    except Exception as exc:
        _LOG.warning("using_database(%s) skipped: %s", db_name, exc)
        _named_db_unsupported = True
