"""Shared Milvus connection helpers for ``export_milvus_teleoscope`` / ``import_milvus_teleoscope``."""
from __future__ import annotations

import logging
import os
from typing import Any, Tuple

from dotenv import load_dotenv

from backend.milvus_quiet import quiet_pymilvus_rpc_logs

load_dotenv()

_LOG = logging.getLogger("milvus_io")

# After one failed using_database (standalone Milvus / no multi-DB), skip further switches
# for this process so export/import do not spam DescribeDatabase / using_database RPCs.
_named_db_unsupported = False


def token_from_env() -> str | None:
    t = os.getenv("MILVUS_TOKEN", "").strip()
    if t:
        return t
    u, p = os.getenv("MILVUS_USERNAME", ""), os.getenv("MILVUS_PASSWORD", "")
    if u and p:
        return f"{u}:{p}"
    return None


def connect_milvus_client() -> Tuple[Any, str | None]:
    """
    Return (MilvusClient, db_name_override).

    When the second value is set (URI connect fallback), callers should pass it to
    ``use_milvus_db`` so ``using_database`` runs on the client.
    """
    global _named_db_unsupported
    _named_db_unsupported = False

    from pymilvus import MilvusClient, MilvusException

    lite = os.getenv("MILVUS_LITE_PATH", "").strip()
    if lite:
        path = lite[7:] if lite.startswith("file://") else lite
        _LOG.info("Connecting to Milvus Lite: %s", path)
        return MilvusClient(uri=path), None

    uri = os.getenv("MILVUS_URI", "").strip()
    token = token_from_env()
    db_name = os.getenv("MILVUS_DBNAME", "teleoscope").strip() or "teleoscope"

    if uri:
        _LOG.info("Connecting via MILVUS_URI")
        prefer_default = (
            uri.lower().startswith("http://")
            and not token
            and os.getenv("MILVUS_FORCE_DB_NAME_ON_CONNECT", "").lower()
            not in ("1", "true", "yes")
        )
        if prefer_default:
            try:
                c = MilvusClient(uri=uri, token=token)
                c.list_collections()
                return c, None
            except MilvusException as e:
                _LOG.info("Connect without db_name failed (%s); retrying with db_name.", e)
        try:
            c = MilvusClient(uri=uri, token=token, db_name=db_name)
            c.list_collections()
            return c, None
        except MilvusException as e:
            _LOG.warning("Connect with db_name failed (%s); retrying without db_name.", e)
            c = MilvusClient(uri=uri, token=token)
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
