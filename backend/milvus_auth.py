"""Milvus credentials from env and fail-fast checks before connect (avoid opaque hangs)."""

from __future__ import annotations

import logging
import os

_LOG = logging.getLogger(__name__)
_partial_cred_warned = False


def milvus_token_for_client() -> str | None:
    """
    Token string for pymilvus ``MilvusClient(..., token=...)``, or None for anonymous.

    Uses ``MILVUS_TOKEN``, else ``MILVUS_USERNAME`` + ``MILVUS_PASSWORD`` as ``user:password``.
    Partial user/password alone is ignored (with a one-time warning).
    """
    global _partial_cred_warned
    t = os.getenv("MILVUS_TOKEN", "").strip()
    if t:
        return t
    u = os.getenv("MILVUS_USERNAME", "").strip()
    p = os.getenv("MILVUS_PASSWORD", "").strip()
    if u and p:
        return f"{u}:{p}"
    if (u or p) and not _partial_cred_warned:
        _partial_cred_warned = True
        _LOG.warning(
            "Milvus: MILVUS_USERNAME and MILVUS_PASSWORD must both be set; "
            "got partial credentials — connecting anonymously."
        )
    return None


def milvus_auth_label() -> str:
    """Short label for logs (no secrets)."""
    if os.getenv("MILVUS_TOKEN", "").strip():
        return "MILVUS_TOKEN"
    u = os.getenv("MILVUS_USERNAME", "").strip()
    p = os.getenv("MILVUS_PASSWORD", "").strip()
    if u and p:
        return "MILVUS_USERNAME+MILVUS_PASSWORD"
    if u or p:
        return "anonymous (incomplete user/pass ignored)"
    return "anonymous"


def _uri_suggests_managed_or_tls(uri: str) -> bool:
    u = uri.strip().lower()
    if u.startswith("https://"):
        return True
    if "zillizcloud.com" in u or "cloud.zilliz.com" in u:
        return True
    return False


def assert_milvus_auth_before_network_connect(uri: str) -> None:
    """
    Fail fast when the endpoint almost certainly needs credentials but none are set.

    - HTTPS Milvus / Zilliz-style hosts require ``MILVUS_TOKEN`` or user+password.
    - Set ``MILVUS_ALLOW_ANONYMOUS_HTTPS=1`` only for unusual lab setups.
    - Set ``MILVUS_REQUIRE_AUTH=1`` to require credentials even for ``http://`` (self-hosted auth).
    """
    uri = (uri or "").strip()
    if not uri:
        return
    tok = milvus_token_for_client()
    if tok:
        return
    if os.getenv("MILVUS_ALLOW_ANONYMOUS_HTTPS", "").lower() in ("1", "true", "yes"):
        if _uri_suggests_managed_or_tls(uri):
            _LOG.warning(
                "Milvus: MILVUS_ALLOW_ANONYMOUS_HTTPS=1 — connecting without credentials to %s",
                _uri_host_hint(uri),
            )
        return
    if _uri_suggests_managed_or_tls(uri):
        raise RuntimeError(
            "Milvus: this URI uses HTTPS or a Zilliz host but no credentials are configured. "
            "Set MILVUS_TOKEN (API key or user:password) or MILVUS_USERNAME and MILVUS_PASSWORD. "
            "Anonymous connects to these endpoints usually hang or fail opaquely. "
            "Escape hatch (not for production): MILVUS_ALLOW_ANONYMOUS_HTTPS=1."
        )
    if os.getenv("MILVUS_REQUIRE_AUTH", "").lower() in ("1", "true", "yes"):
        raise RuntimeError(
            "Milvus: MILVUS_REQUIRE_AUTH=1 but no MILVUS_TOKEN or MILVUS_USERNAME+MILVUS_PASSWORD."
        )


def _uri_host_hint(uri: str) -> str:
    try:
        from urllib.parse import urlparse

        return urlparse(uri).netloc or uri[:48]
    except Exception:
        return uri[:48]


def log_milvus_auth_summary(uri: str) -> None:
    """One INFO line: how we authenticate (never prints secrets)."""
    label = milvus_auth_label()
    hint = _uri_host_hint(uri)
    _LOG.info("Milvus connect: auth=%s target=%s", label, hint)
