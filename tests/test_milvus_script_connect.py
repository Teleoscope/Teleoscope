"""Wiring for data/ CLI scripts — deadline + embeddings.connect + DB switch."""
from __future__ import annotations

import pytest


def test_connect_milvus_script_client_order(monkeypatch):
    order: list[str] = []

    def fake_ensure(sec: float) -> None:
        order.append(f"ensure:{sec}")

    class _C:
        pass

    def fake_connect():
        order.append("connect")
        return _C()

    def fake_use_db(client):
        order.append(f"use:{type(client).__name__}")

    monkeypatch.setattr(
        "backend.milvus_preflight.ensure_script_rpc_deadline",
        fake_ensure,
    )
    monkeypatch.setattr("backend.embeddings.connect", fake_connect)
    monkeypatch.setattr(
        "backend.embeddings.use_database_if_supported",
        fake_use_db,
    )
    monkeypatch.setenv("MILVUS_IO_RPC_TIMEOUT", "99")

    from backend.milvus_script_connect import connect_milvus_script_client

    c = connect_milvus_script_client()
    assert isinstance(c, _C)
    assert order == ["ensure:99.0", "connect", "use:_C"]


def test_connect_milvus_script_orm_rejects_lite(monkeypatch):
    monkeypatch.setenv("MILVUS_LITE_PATH", "/tmp/x.db")
    monkeypatch.delenv("MILVUS_URI", raising=False)

    from backend.milvus_script_connect import connect_milvus_script_orm

    with pytest.raises(RuntimeError, match="ORM"):
        connect_milvus_script_orm()
