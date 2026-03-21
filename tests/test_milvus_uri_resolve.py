"""Milvus endpoint resolution (env parity across scripts, embeddings, preflight)."""
from __future__ import annotations

import os

import pytest

from backend.milvus_uri_resolve import (
    milvus_http_uri_from_env,
    milvus_named_database_from_env,
    milvus_tcp_host_port_from_env,
)


@pytest.fixture(autouse=True)
def _clean_milvus_env(monkeypatch):
    for k in (
        "MILVUS_URI",
        "MILVUS_HOST",
        "MIVLUS_PORT",
        "MILVUS_PORT",
        "MILVUS_LITE_PATH",
        "MILVUS_DATABASE",
        "MILVUS_DBNAME",
    ):
        monkeypatch.delenv(k, raising=False)


def test_milvus_http_uri_explicit():
    os.environ["MILVUS_URI"] = "https://z.example:19530"
    assert milvus_http_uri_from_env() == "https://z.example:19530"


def test_milvus_http_uri_host_mivlus_typo():
    os.environ["MILVUS_HOST"] = "milvus.internal"
    os.environ["MIVLUS_PORT"] = "19531"
    assert milvus_http_uri_from_env() == "http://milvus.internal:19531"


def test_milvus_http_uri_milvus_port_fallback():
    os.environ["MILVUS_HOST"] = "127.0.0.1"
    os.environ["MILVUS_PORT"] = "55015"
    os.environ.pop("MIVLUS_PORT", None)
    assert milvus_http_uri_from_env() == "http://127.0.0.1:55015"


def test_milvus_tcp_host_port_parses_uri():
    os.environ["MILVUS_URI"] = "http://svc:19530"
    assert milvus_tcp_host_port_from_env() == ("svc", 19530)


def test_milvus_tcp_none_for_lite():
    os.environ["MILVUS_LITE_PATH"] = "/tmp/x.db"
    assert milvus_tcp_host_port_from_env() is None


def test_milvus_named_database_precedence():
    os.environ["MILVUS_DATABASE"] = "custom"
    os.environ["MILVUS_DBNAME"] = "ignored"
    assert milvus_named_database_from_env() == "custom"


def test_milvus_named_database_dbname_fallback():
    os.environ["MILVUS_DBNAME"] = "appdb"
    assert milvus_named_database_from_env() == "appdb"
