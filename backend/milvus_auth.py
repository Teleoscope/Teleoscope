"""Milvus credentials, policy, and clear errors when the server rejects auth."""

from __future__ import annotations

import logging
import os
import sys
from urllib.parse import urlparse

_LOG = logging.getLogger(__name__)
_partial_cred_warned = False

# HTTP hosts where anonymous Milvus is expected (local dev / compose service name).
_DEFAULT_ANONYMOUS_HTTP_HOSTS = frozenset(
    {
        "localhost",
        "127.0.0.1",
        "::1",
        "0.0.0.0",
        "milvus",
        "host.docker.internal",
    }
)


def _extra_anonymous_http_hosts() -> frozenset[str]:
    raw = os.getenv("MILVUS_ANONYMOUS_HTTP_HOSTS", "").strip()
    if not raw:
        return frozenset()
    return frozenset(h.strip().lower() for h in raw.split(",") if h.strip())


def milvus_connection_auth_kwargs() -> dict[str, str]:
    """
    Keyword args for ``MilvusClient(uri=..., **kwargs)``.

    Prefer ``MILVUS_TOKEN``; else pass ``user`` + ``password`` (pymilvus builds the token).
    """
    global _partial_cred_warned
    t = os.getenv("MILVUS_TOKEN", "").strip()
    if t:
        return {"token": t}
    u = os.getenv("MILVUS_USERNAME", "").strip()
    p = os.getenv("MILVUS_PASSWORD", "").strip()
    if u and p:
        return {"user": u, "password": p}
    if (u or p) and not _partial_cred_warned:
        _partial_cred_warned = True
        _LOG.warning(
            "Milvus: MILVUS_USERNAME and MILVUS_PASSWORD must both be set; "
            "got partial credentials — treating as anonymous."
        )
    return {}


def milvus_has_credentials() -> bool:
    return bool(milvus_connection_auth_kwargs())


def milvus_token_for_client() -> str | None:
    """
    Legacy: single ``token=`` string for callers that only support that shape.

    Prefer ``milvus_connection_auth_kwargs()`` for new code.
    """
    kw = milvus_connection_auth_kwargs()
    if "token" in kw:
        return kw["token"]
    if "user" in kw and "password" in kw:
        return f"{kw['user']}:{kw['password']}"
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


def _uri_host_hint(uri: str) -> str:
    try:
        return urlparse(uri).netloc or uri[:48]
    except Exception:
        return uri[:48]


def _http_hostname(uri: str) -> str | None:
    try:
        p = urlparse(uri)
        if p.scheme.lower() != "http":
            return None
        h = (p.hostname or "").lower()
        return h or None
    except Exception:
        return None


def _uri_suggests_managed_or_tls(uri: str) -> bool:
    u = uri.strip().lower()
    if u.startswith("https://"):
        return True
    if "zillizcloud.com" in u or "cloud.zilliz.com" in u:
        return True
    return False


def _anonymous_http_host_allowed(host: str) -> bool:
    h = host.lower().strip()
    if h in _DEFAULT_ANONYMOUS_HTTP_HOSTS or h in _extra_anonymous_http_hosts():
        return True
    if os.getenv("MILVUS_ALLOW_ANONYMOUS", "").lower() in ("1", "true", "yes"):
        return True
    return False


def assert_milvus_auth_before_network_connect(uri: str) -> None:
    """
    Enforce that we do not open anonymous connections except on known-local HTTP hosts.

    - **HTTPS / Zilliz**: credentials required unless ``MILVUS_ALLOW_ANONYMOUS_HTTPS=1``.
    - **HTTP**: credentials required unless hostname is in the local/Docker allowlist
      (``localhost``, ``milvus``, …) or ``MILVUS_ALLOW_ANONYMOUS=1`` or
      ``MILVUS_ANONYMOUS_HTTP_HOSTS=extra1,extra2``.
    - **MILVUS_REQUIRE_AUTH=1**: credentials required even for allowlisted HTTP (forces keys on dev).
    """
    uri = (uri or "").strip()
    if not uri:
        return
    if milvus_has_credentials():
        return

    if os.getenv("MILVUS_REQUIRE_AUTH", "").lower() in ("1", "true", "yes"):
        raise RuntimeError(
            "Milvus: MILVUS_REQUIRE_AUTH=1 but no MILVUS_TOKEN or MILVUS_USERNAME+MILVUS_PASSWORD."
        )

    if os.getenv("MILVUS_ALLOW_ANONYMOUS_HTTPS", "").lower() in ("1", "true", "yes"):
        if _uri_suggests_managed_or_tls(uri):
            _LOG.warning(
                "Milvus: MILVUS_ALLOW_ANONYMOUS_HTTPS=1 — connecting without credentials to %s",
                _uri_host_hint(uri),
            )
        # Still may be http — fall through
    elif _uri_suggests_managed_or_tls(uri):
        raise RuntimeError(
            "Milvus: HTTPS / Zilliz-style endpoint but no credentials. "
            "Set MILVUS_TOKEN or MILVUS_USERNAME+MILVUS_PASSWORD. "
            "Escape hatch (not for production): MILVUS_ALLOW_ANONYMOUS_HTTPS=1."
        )

    host = _http_hostname(uri)
    if host is not None and not _anonymous_http_host_allowed(host):
        raise RuntimeError(
            f"Milvus: refusing anonymous connect to http://{host} (not in the local/Docker allowlist). "
            "Set MILVUS_TOKEN or MILVUS_USERNAME+MILVUS_PASSWORD, or add the hostname to "
            "MILVUS_ANONYMOUS_HTTP_HOSTS, or set MILVUS_ALLOW_ANONYMOUS=1 for insecure lab use."
        )


def log_milvus_auth_summary(uri: str) -> None:
    _LOG.info(
        "Milvus connect: auth=%s target=%s",
        milvus_auth_label(),
        _uri_host_hint(uri),
    )


def print_milvus_auth_status_for_shell(uri: str) -> int:
    """
    Print Milvus auth summary to stdout (not logging) for shell scripts.
    Returns 0 if checks pass, 1 on policy failure.
    """
    creds = milvus_has_credentials()
    print(f"milvus_auth_label: {milvus_auth_label()}", file=sys.stdout, flush=True)
    print(f"milvus_creds_in_env: {'yes' if creds else 'no'}", file=sys.stdout, flush=True)
    print(f"milvus_target_host: {_uri_host_hint(uri)}", file=sys.stdout, flush=True)
    req = os.getenv("DEMO_STATUS_REQUIRE_MILVUS_CREDENTIALS", "").lower() in (
        "1",
        "true",
        "yes",
    )
    if req and not creds:
        print("milvus_auth_check: FAIL (DEMO_STATUS_REQUIRE_MILVUS_CREDENTIALS)", file=sys.stdout, flush=True)
        return 1
    try:
        assert_milvus_auth_before_network_connect(uri)
    except Exception as e:
        print(f"milvus_auth_check: FAIL ({e})", file=sys.stdout, flush=True)
        return 1
    print("milvus_auth_check: OK", file=sys.stdout, flush=True)
    return 0


def _looks_like_milvus_auth_failure(exc: BaseException) -> bool:
    msg = str(exc).lower()
    if "database" in msg and "not found" in msg:
        return False
    needles = (
        "unauth",
        "unauthenticated",
        "permission denied",
        "permission_denied",
        "credential",
        "invalid token",
        "invalid api key",
        "api key",
        "wrong password",
        "incorrect password",
        "username or password",
        "not allowed",
        "access denied",
        "401",
        "403",
    )
    if any(n in msg for n in needles):
        return True
    code = getattr(exc, "code", None)
    if code is not None:
        try:
            iv = int(code)
            if iv in (7, 16):
                return True
        except (TypeError, ValueError):
            pass
        cname = str(code).upper()
        if "PERMISSION" in cname or "UNAUTH" in cname:
            return True
    return False


def is_milvus_auth_failure(exc: BaseException) -> bool:
    return _looks_like_milvus_auth_failure(exc)


def reraise_milvus_connect_error(uri: str, exc: BaseException) -> None:
    """
    If ``exc`` is probably invalid/missing Milvus credentials, raise a clearer RuntimeError.
    Otherwise re-raise ``exc``.
    """
    if _looks_like_milvus_auth_failure(exc):
        raise RuntimeError(
            f"Milvus authentication failed for {_uri_host_hint(uri)!s}: {exc!s}. "
            "Verify MILVUS_TOKEN or MILVUS_USERNAME+MILVUS_PASSWORD. "
            "If the server truly allows anonymous access from this host, set MILVUS_ALLOW_ANONYMOUS=1 "
            "or add the hostname to MILVUS_ANONYMOUS_HTTP_HOSTS."
        ) from exc
    raise exc


def log_milvus_rpc_auth_ok(uri: str) -> None:
    _LOG.info("Milvus: server accepted credentials (list_collections OK) for %s", _uri_host_hint(uri))
