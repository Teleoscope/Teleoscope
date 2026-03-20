# embeddings.py
import logging
import os
import hashlib

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
# Server: MILVUS_URI or MILVUS_HOST:MIVLUS_PORT. Lite: MILVUS_LITE_PATH (file path).
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
                "Milvus database '%s' was missing; creating it now.",
                MILVUS_DBNAME,
            )
            with quiet_pymilvus_rpc_logs():
                client.create_database(db_name=MILVUS_DBNAME)
                client.using_database(db_name=MILVUS_DBNAME)
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


def _use_lite():
    return bool(MILVUS_LITE_PATH)


def _milvus_token() -> str | None:
    t = os.getenv("MILVUS_TOKEN", "").strip()
    if t:
        return t
    u, p = os.getenv("MILVUS_USERNAME", ""), os.getenv("MILVUS_PASSWORD", "")
    if u and p:
        return f"{u}:{p}"
    return None


def _milvus_client_kwargs(uri: str, *, with_db_name: bool) -> dict:
    kw: dict = {"uri": uri}
    tok = _milvus_token()
    if tok:
        kw["token"] = tok
    if with_db_name:
        kw["db_name"] = MILVUS_DBNAME
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
    if _milvus_token():
        return False
    return True


def _connect_after_probe(uri: str) -> MilvusClient:
    """Probe list_collections; avoid constructor db_name on self-hosted HTTP when possible."""
    if _prefer_default_db_first(uri):
        try:
            client = MilvusClient(**_milvus_client_kwargs(uri, with_db_name=False))
            client.list_collections()
            return client
        except Exception as exc:
            logging.info(
                "Milvus connect without db_name failed (%s); retrying with db_name=%s.",
                exc,
                MILVUS_DBNAME,
            )

    try:
        client = MilvusClient(**_milvus_client_kwargs(uri, with_db_name=True))
        try:
            client.list_collections()
        except Exception as probe_exc:
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
                client = MilvusClient(**_milvus_client_kwargs(uri, with_db_name=False))
            else:
                raise
        return client
    except MilvusException as e:
        logging.info(
            "Exception %s when creating Milvus client with db '%s'; "
            "using default database.",
            e,
            MILVUS_DBNAME,
        )
        return MilvusClient(**_milvus_client_kwargs(uri, with_db_name=False))


def connect():
    logging.info("Connecting to Milvus...")
    if _use_lite():
        # Milvus Lite: local file, no server (runs without Docker). Use MILVUS_LITE_PATH so pymilvus orm is not given a file URI at import.
        path = MILVUS_LITE_PATH
        if path.startswith("file://"):
            path = path[7:]
        client = MilvusClient(uri=path)
        logging.info("Connected to Milvus Lite.")
        return client

    if MILVUS_URI:
        client = _connect_after_probe(MILVUS_URI)
        logging.info("Connected to Milvus (MILVUS_URI).")
        return client

    uri = f"http://{MILVUS_HOST}:{MIVLUS_PORT}"
    client = _connect_after_probe(uri)
    logging.info("Connected to Milvus.")
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
                "Milvus database '%s' missing when switching; creating it.",
                MILVUS_DBNAME,
            )
            with quiet_pymilvus_rpc_logs():
                client.create_database(db_name=MILVUS_DBNAME)
                client.using_database(db_name=MILVUS_DBNAME)
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
    client.load_collection(collection_name=collection_name)
    res = client.delete(
        collection_name=collection_name,
        ids=ids
    )