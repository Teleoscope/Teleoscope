"""Milvus credential policy and server-side auth error mapping."""
from __future__ import annotations

import pytest

from backend.milvus_auth import (
    assert_milvus_auth_before_network_connect,
    milvus_connection_auth_kwargs,
    milvus_has_credentials,
    milvus_token_for_client,
    reraise_milvus_connect_error,
)


def test_https_without_credentials_raises(monkeypatch):
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.delenv("MILVUS_USERNAME", raising=False)
    monkeypatch.delenv("MILVUS_PASSWORD", raising=False)
    monkeypatch.delenv("MILVUS_ALLOW_ANONYMOUS_HTTPS", raising=False)
    with pytest.raises(RuntimeError, match="HTTPS / Zilliz"):
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


def test_http_milvus_service_ok_without_token(monkeypatch):
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    assert_milvus_auth_before_network_connect("http://milvus:19530")


def test_http_public_ip_requires_credentials(monkeypatch):
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.delenv("MILVUS_USERNAME", raising=False)
    monkeypatch.delenv("MILVUS_PASSWORD", raising=False)
    monkeypatch.delenv("MILVUS_ALLOW_ANONYMOUS", raising=False)
    with pytest.raises(RuntimeError, match="refusing anonymous"):
        assert_milvus_auth_before_network_connect("http://203.0.113.50:19530")


def test_http_public_ip_ok_with_allow_anonymous(monkeypatch):
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.setenv("MILVUS_ALLOW_ANONYMOUS", "1")
    assert_milvus_auth_before_network_connect("http://203.0.113.50:19530")


def test_require_auth_env(monkeypatch):
    monkeypatch.setenv("MILVUS_REQUIRE_AUTH", "1")
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.setenv("MILVUS_USERNAME", "u")
    monkeypatch.setenv("MILVUS_PASSWORD", "p")
    assert_milvus_auth_before_network_connect("http://localhost:19530")


def test_require_auth_env_missing_creds(monkeypatch):
    monkeypatch.setenv("MILVUS_REQUIRE_AUTH", "1")
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.delenv("MILVUS_USERNAME", raising=False)
    monkeypatch.delenv("MILVUS_PASSWORD", raising=False)
    with pytest.raises(RuntimeError, match="MILVUS_REQUIRE_AUTH"):
        assert_milvus_auth_before_network_connect("http://milvus:19530")


def test_token_kwarg(monkeypatch):
    monkeypatch.setenv("MILVUS_TOKEN", "secret")
    assert milvus_connection_auth_kwargs() == {"token": "secret"}
    assert milvus_has_credentials() is True
    assert milvus_token_for_client() == "secret"


def test_user_password_kwarg(monkeypatch):
    monkeypatch.delenv("MILVUS_TOKEN", raising=False)
    monkeypatch.setenv("MILVUS_USERNAME", "u")
    monkeypatch.setenv("MILVUS_PASSWORD", "p")
    assert milvus_connection_auth_kwargs() == {"user": "u", "password": "p"}
    assert milvus_token_for_client() == "u:p"


def test_reraise_wraps_auth_like_message():
    class E(Exception):
        pass

    with pytest.raises(RuntimeError, match="Milvus authentication failed"):
        reraise_milvus_connect_error("http://x:19530", E("Unauthenticated: bad token"))
