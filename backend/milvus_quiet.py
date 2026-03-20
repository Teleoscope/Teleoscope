"""Temporarily raise pymilvus log levels so expected RPC failures are not ERROR-spammy."""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator


@contextmanager
def quiet_pymilvus_rpc_logs() -> Iterator[None]:
    names = ("pymilvus", "pymilvus.client", "pymilvus.decorators")
    saved: list[tuple[logging.Logger, int]] = []
    for name in names:
        lg = logging.getLogger(name)
        saved.append((lg, lg.getEffectiveLevel()))
        lg.setLevel(logging.CRITICAL)
    try:
        yield
    finally:
        for lg, lvl in saved:
            lg.setLevel(lvl)
