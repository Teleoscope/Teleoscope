# embeddings.py
import logging
import os
import hashlib
import sys
import time

from warnings import simplefilter

# environment variables
from dotenv import load_dotenv
load_dotenv()  # This loads the variables from .env
import os


MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MIVLUS_PORT = os.getenv("MIVLUS_PORT", "19530")
MILVUS_USERNAME = os.getenv("MILVUS_USERNAME")
MILVUS_PASSWORD = os.getenv("MILVUS_PASSWORD")
MILVUS_DBNAME = os.getenv("MILVUS_DBNAME", "teleoscope")
# connect() prefers Milvus Lite (MILVUS_LITE_PATH), else MILVUS_URI, else MILVUS_HOST + MIVLUS_PORT.
# When MILVUS_URI is set it wins over host:port. Docker Compose should set MILVUS_URI for workers via
# MILVUS_DOCKER_URI substitution (default http://milvus:19530) so containers do not use host localhost.
# Do not set MILVUS_URI to a file path — pymilvus orm validates URI at import time.
MILVUS_URI = os.getenv("MILVUS_URI", "").strip()
MILVUS_LITE_PATH = os.getenv("MILVUS_LITE_PATH", "").strip()


# ignore all future warnings
simplefilter(action='ignore', category=FutureWarning)

def string_to_int(s):
    # Use hashlib to create a hash of the string
    hash_object = hashlib.sha256(s.encode())
    # Convert the hash to a hexadecimal string
    hex_dig = hash_object.hexdigest()
    # Convert the hexadecimal string to an integer
    return int(hex_dig, 16)

from pymilvus import MilvusClient, DataType, MilvusException

from backend.milvus_auth import (
    assert_milvus_auth_before_network_connect,
    is_milvus_auth_failure,
    log_milvus_auth_summary,
    log_milvus_rpc_auth_ok,
    milvus_auth_label,
    milvus_connection_auth_kwargs,
    milvus_has_credentials,
    reraise_milvus_connect_error,
)
from backend.milvus_quiet import quiet_pymilvus_rpc_logs


def _is_missing_database_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "database" in msg and "not found" in msg

def _is_unimplemented_db_feature(exc: Exception) -> bool:
    msg = str(exc)
    return "DescribeDatabase" in msg or "UNIMPLEMENTED" in msg

def _ensure_database_available(client: MilvusClient):
    if _use_lite():
        return
    try:
        with quiet_pymilvus_rpc_logs():
            client.using_database(db_name=MILVUS_DBNAME)
    except Exception as exc:
        if _is_unimplemented_db_feature(exc):
            logging.warning(
                "Milvus server does not support database switching; continuing on default database."
            )
            return
        if _is_missing_database_error(exc):
            logging.warning(
                "Milvus database '%s' was missing; attempting to create it.",
                MILVUS_DBNAME,
            )
            try:
                with quiet_pymilvus_rpc_logs():
                    client.create_database(db_name=MILVUS_DBNAME)
                    client.using_database(db_name=MILVUS_DBNAME)
            except Exception as create_exc:
                logging.warning(
                    "Could not create Milvus database '%s' (%s); "
                    "continuing on default database (Zilliz Serverless or restricted cluster).",
                    MILVUS_DBNAME, create_exc,
                )
            return
        raise

def milvus_setup(client: MilvusClient, workspace_id, collection_name="teleoscope"):
    _ensure_database_available(client)
    logging.info(f"Checking if collection {collection_name} exists...")
    has_collection = False
    try:
        has_collection = client.has_collection(collection_name)
    except Exception as exc:
        if _is_missing_database_error(exc):
            _ensure_database_available(client)
            has_collection = client.has_collection(collection_name)
        else:
            raise

    if not has_collection:
        logging.info(f"Collection {collection_name} does not exist. Initializing...")
        # 2. Create schema
        # 2.1. Create schema
        schema = MilvusClient.create_schema(
            auto_id=False,
            enable_dynamic_field=True,
        )

        # 2.2. Add fields to schema
        schema.add_field(field_name="id", datatype=DataType.VARCHAR, max_length=36, is_primary=True)
        schema.add_field(field_name="vector", datatype=DataType.FLOAT_VECTOR, dim=1024)

        client.create_collection(
            collection_name=collection_name, 
            schema=schema, 
        )

        # 4.1. Set up the index parameters
        index_params = MilvusClient.prepare_index_params()

        # 4.2. Add an index on the vector field.
        index_params.add_index(
            field_name="vector",
            metric_type="IP",
            index_type="IVF_FLAT",
            index_name="vector_index",
            params={ "nlist": 1024 }
        )

        # 4.3. Create an index file
        client.create_index(
            collection_name=collection_name,
            index_params=index_params
        )
        logging.info(f"Initialized collection {collection_name}.")
    if not client.has_partition(collection_name=collection_name, partition_name=workspace_id):
        client.create_partition(collection_name=collection_name, partition_name=workspace_id)


def _use_lite() -> bool:
    return bool(os.getenv("MILVUS_LITE_PATH", "").strip())


def _milvus_client_timeout() -> float | None:
    """RPC timeout (seconds) for MilvusClient; unset = no limit (workers). Scripts set MILVUS_CLIENT_TIMEOUT."""
    if os.getenv("MILVUS_UNBOUNDED_RPC", "").lower() in ("1", "true", "yes"):
        return None
    raw = os.getenv("MILVUS_CLIENT_TIMEOUT", "").strip()
    if not raw:
        return None
    try:
        return float(raw)
    except ValueError:
        return None


_milvus_trace_t0: float | None = None


def _milvus_connect_trace(msg: str) -> None:
    """stderr timeline when MILVUS_DIAG=1 or MILVUS_DEBUG=1."""
    if not (os.getenv("MILVUS_DIAG", "").strip() or os.getenv("MILVUS_DEBUG", "").strip()):
        return
    global _milvus_trace_t0
    if _milvus_trace_t0 is None:
        _milvus_trace_t0 = time.perf_counter()
    dt = time.perf_counter() - _milvus_trace_t0
    print(f"[milvus +{dt:7.2f}s] {msg}", file=sys.stderr, flush=True)


def _milvus_client_kwargs(uri: str, *, with_db_name: bool) -> dict:
    kw: dict = {"uri": uri, **milvus_connection_auth_kwargs()}
    if with_db_name:
        kw["db_name"] = MILVUS_DBNAME
    t = _milvus_client_timeout()
    if t is not None:
        kw["timeout"] = t
    return kw


def _prefer_default_db_first(uri: str) -> bool:
    """
    Standalone / Docker Milvus over plain HTTP usually has no database named MILVUS_DBNAME;
    passing db_name in the constructor makes pymilvus log RPC errors before we can fall back.
    Zilliz and other HTTPS + token endpoints typically expect the named DB in connect.
    """
    if os.getenv("MILVUS_FORCE_DB_NAME_ON_CONNECT", "").lower() in ("1", "true", "yes"):
        return False
    if uri.lower().startswith("https://"):
        return False
    if milvus_has_credentials():
        return False
    return True


def _connect_after_probe(uri: str) -> MilvusClient:
    """Probe list_collections; avoid constructor db_name on self-hosted HTTP when possible."""
    if _prefer_default_db_first(uri):
        try:
            _milvus_connect_trace(f"MilvusClient(uri=…, db_name off) timeout={_milvus_client_timeout()!r}")
            client = MilvusClient(**_milvus_client_kwargs(uri, with_db_name=False))
            _milvus_connect_trace("list_collections() (no db_name)")
            client.list_collections()
            log_milvus_rpc_auth_ok(uri)
            _milvus_connect_trace("list_collections OK")
            return client
        except Exception as exc:
            if is_milvus_auth_failure(exc):
                reraise_milvus_connect_error(uri, exc)
            logging.info(
                "Milvus connect without db_name failed (%s); retrying with db_name=%s.",
                exc,
                MILVUS_DBNAME,
            )

    try:
        _milvus_connect_trace(
            f"MilvusClient(uri=…, db_name={MILVUS_DBNAME!r}) timeout={_milvus_client_timeout()!r}"
        )
        client = MilvusClient(**_milvus_client_kwargs(uri, with_db_name=True))
        try:
            _milvus_connect_trace("list_collections() (with db_name)")
            client.list_collections()
            log_milvus_rpc_auth_ok(uri)
            _milvus_connect_trace("list_collections OK")
        except Exception as probe_exc:
            if is_milvus_auth_failure(probe_exc):
                reraise_milvus_connect_error(uri, probe_exc)
            msg = str(probe_exc)
            if (
                "database" in msg.lower()
                or "DescribeDatabase" in msg
                or "UNIMPLEMENTED" in msg
            ):
                logging.warning(
                    "Milvus database '%s' is unavailable or unsupported; "
                    "falling back to default database.",
                    MILVUS_DBNAME,
                )
                _milvus_connect_trace("fallback MilvusClient without db_name")
                client = MilvusClient(**_milvus_client_kwargs(uri, with_db_name=False))
            else:
                raise
        return client
    except MilvusException as e:
        if is_milvus_auth_failure(e):
            reraise_milvus_connect_error(uri, e)
        logging.info(
            "Exception %s when creating Milvus client with db '%s'; "
            "using default database.",
            e,
            MILVUS_DBNAME,
        )
        _milvus_connect_trace("MilvusException → final client without db_name")
        return MilvusClient(**_milvus_client_kwargs(uri, with_db_name=False))


def connect():
    global _milvus_trace_t0
    _milvus_trace_t0 = None
    _milvus_connect_trace("connect() start")
    logging.info("Connecting to Milvus...")
    if _use_lite():
        path = os.getenv("MILVUS_LITE_PATH", "").strip()
        if path.startswith("file://"):
            path = path[7:]
        lite_kw: dict = {"uri": path}
        t = _milvus_client_timeout()
        if t is not None:
            lite_kw["timeout"] = t
        _milvus_connect_trace(f"Milvus Lite open {path!r} timeout={t!r}")
        client = MilvusClient(**lite_kw)
        logging.info("Connected to Milvus Lite.")
        _milvus_connect_trace("Milvus Lite client ready")
        return client

    from backend.milvus_uri_resolve import milvus_http_uri_from_env

    uri = milvus_http_uri_from_env()

    if os.getenv("MILVUS_SKIP_TCP_PREFLIGHT", "").lower() not in ("1", "true", "yes"):
        if uri.lower().startswith("https://"):
            # Zilliz Cloud / HTTPS: the pymilvus gRPC layer manages TLS — a raw TCP probe
            # is unnecessary and may fail in environments where port 19530 is blocked.
            _milvus_connect_trace("TCP preflight skipped (HTTPS/Zilliz — SDK manages TLS)")
        else:
            try:
                from backend.milvus_preflight import tcp_probe_from_env

                tcp_probe_from_env()
                _milvus_connect_trace("TCP preflight OK (port accepts connections)")
            except RuntimeError:
                raise
            except Exception as exc:
                logging.warning("Milvus TCP preflight skipped: %s", exc)

    assert_milvus_auth_before_network_connect(uri)
    log_milvus_auth_summary(uri)
    _milvus_connect_trace(f"auth={milvus_auth_label()} (no secrets logged)")
    _milvus_connect_trace(f"RPC target {uri} (timeout sec={_milvus_client_timeout()!r})")
    client = _connect_after_probe(uri)
    logging.info("Connected to Milvus.")
    _milvus_connect_trace("connect() done")
    return client


def use_database_if_supported(client: MilvusClient):
    """
    Switch Milvus database when supported by the server.
    Older Milvus deployments may not implement DescribeDatabase/using_database.
    """
    if _use_lite():
        return
    try:
        with quiet_pymilvus_rpc_logs():
            client.using_database(db_name=MILVUS_DBNAME)
    except Exception as exc:
        if _is_unimplemented_db_feature(exc):
            logging.warning(
                "Milvus server does not support database switching; continuing on default database."
            )
            return
        if _is_missing_database_error(exc):
            logging.warning(
                "Milvus database '%s' missing when switching; attempting to create it.",
                MILVUS_DBNAME,
            )
            try:
                with quiet_pymilvus_rpc_logs():
                    client.create_database(db_name=MILVUS_DBNAME)
                    client.using_database(db_name=MILVUS_DBNAME)
            except Exception as create_exc:
                logging.warning(
                    "Could not create Milvus database '%s' (%s); "
                    "continuing on default database (Zilliz Serverless or restricted cluster).",
                    MILVUS_DBNAME, create_exc,
                )
            return
        raise


def get_embeddings(client: MilvusClient, collection_name, workspace_id, oids, limit=16384): # hard limit for milvus
    oids = oids[0:limit]
    logging.info(f"Gathering document embeddings for {len(oids)} document oids...")
    # ensure the collection exists
    milvus_setup(client, workspace_id, collection_name=collection_name)

    use_database_if_supported(client)
    # load the collection into memory
    client.load_partitions(collection_name=collection_name, partition_names=[str(workspace_id)])
    logging.info(f"Connected to Milvus Collection {collection_name} and partition {workspace_id}.")
    
    milvus_results = client.get(
        collection_name=collection_name,
        partition_names=[str(workspace_id)],
        ids=[str(i) for i in oids], 
        output_fields=["vector"]
    )
    return milvus_results


def delete(collection_name, ids):
    client = connect()
    try:
        use_database_if_supported(client)
        client.load_collection(collection_name=collection_name)
        return client.delete(
            collection_name=collection_name,
            ids=ids
        )
    finally:
        try:
            client.close()
        except Exception:
            pass
