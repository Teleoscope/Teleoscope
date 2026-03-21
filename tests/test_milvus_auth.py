"""Milvus credential checks before connect."""
from __future__ import annotations

import pytest

from backend.milvus_auth import (
    assert_milvus_auth_before_network_connect,
    milvus_token_for_client,
)


def test_https_without_credentials_raises(monkeypatch):
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.delenv("MILVUS_USERNAME", raising=False)
    monkeypatch.delenv("MILVUS_PASSWORD", raising=False)
    monkeypatch.delenv("MILVUS_ALLOW_ANONYMOUS_HTTPS", raising=False)
    with pytest.raises(RuntimeError, match="credentials"):
        assert_milvus_auth_before_network_connect("https://in01-xxx.zillizcloud.com:19530")


def test_https_allowed_when_anonymous_flag(monkeypatch):
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.setenv("MILVUS_ALLOW_ANONYMOUS_HTTPS", "1")
    assert_milvus_auth_before_network_connect("https://example.com:19530")


def test_http_localhost_ok_without_token(monkeypatch):
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.delenv("MILVUS_USERNAME", raising=False)
    monkeypatch.delenv("MILVUS_PASSWORD", raising=False)
    assert_milvus_auth_before_network_connect("http://localhost:19530")


def test_require_auth_env(monkeypatch):
    monkeypatch.setenv("MILVUS_REQUIRE_AUTH", "1")
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.delenv("MILVUS_USERNAME", raising=False)
    monkeypatch.delenv("MILVUS_PASSWORD", raising=False)
    with pytest.raises(RuntimeError, match="MILVUS_REQUIRE_AUTH"):
        assert_milvus_auth_before_network_connect("http://milvus:19530")


def test_token_from_milvus_token(monkeypatch):
    monkeypatch.setenv("MILVUS_TOKEN", "secret")
    assert milvus_token_for_client() == "secret"


def test_token_from_user_pass(monkeypatch):
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.setenv("MILVUS_USERNAME", "u")
    monkeypatch.setenv("MILVUS_PASSWORD", "p")
    assert milvus_token_for_client() == "u:p"
