"""Milvus TCP preflight and script RPC deadline helpers."""
from __future__ import annotations

import os
import pytest

from backend.milvus_preflight import (
    ensure_script_rpc_deadline,
    tcp_probe,
    tcp_target_from_env,
)


def test_tcp_probe_refused():
    with pytest.raises(RuntimeError, match="Milvus TCP preflight"):
        tcp_probe("127.0.0.1", 1, timeout_sec=0.5)


def test_tcp_target_from_env_uri():
    os.environ["MILVUS_URI"] = "http://milvus.example:19531"
    os.environ.pop("MILVUS_LITE_PATH", None)
    try:
        assert tcp_target_from_env() == ("milvus.example", 19531)
    finally:
        os.environ.pop("MILVUS_URI", None)


def test_tcp_target_from_env_lite_skips_network():
    os.environ["MILVUS_LITE_PATH"] = "/tmp/x.db"
    os.environ["MILVUS_URI"] = "http://ignored:19530"
    try:
        assert tcp_target_from_env() is None
    finally:
        os.environ.pop("MILVUS_LITE_PATH", None)
        os.environ.pop("MILVUS_URI", None)


def test_tcp_target_from_env_milvus_port_fallback():
    os.environ.pop("MILVUS_URI", None)
    os.environ.pop("MILVUS_LITE_PATH", None)
    os.environ["MILVUS_HOST"] = "localhost"
    os.environ.pop("MIVLUS_PORT", None)
    os.environ["MILVUS_PORT"] = "55015"
    try:
        assert tcp_target_from_env() == ("localhost", 55015)
    finally:
        os.environ.pop("MILVUS_HOST", None)
        os.environ.pop("MILVUS_PORT", None)


def test_ensure_script_rpc_deadline(monkeypatch):
    monkeypatch.delenv("MILVUS_CLIENT_TIMEOUT", raising=False)
    monkeypatch.delenv("MILVUS_UNBOUNDED_RPC", raising=False)
    ensure_script_rpc_deadline(42.0)
    assert os.environ["MILVUS_CLIENT_TIMEOUT"] == "42.0"
    ensure_script_rpc_deadline(99.0)
    assert os.environ["MILVUS_CLIENT_TIMEOUT"] == "42.0"


def test_ensure_script_rpc_deadline_respects_unbounded(monkeypatch):
    monkeypatch.setenv("MILVUS_UNBOUNDED_RPC", "1")
    monkeypatch.delenv("MILVUS_CLIENT_TIMEOUT", raising=False)
    ensure_script_rpc_deadline(42.0)
    assert "MILVUS_CLIENT_TIMEOUT" not in os.environ
