# vectorizer.py
"""
RabbitMQ consumer for document vectorization (BGE-M3).

By default (activity-based mode), the embedding model and RabbitMQ consumer start only after
workspace activity (POST /activity on the control server). After VECTORIZER_IDLE_SECONDS
(default 300) without workspace activity or vectorization work, the consumer stops and the
model is unloaded to free RAM.

Set VECTORIZER_ALWAYS_ON=1 to keep the legacy behavior: consume immediately on startup
with no control HTTP server (for CI and unattended stacks).
"""
from __future__ import annotations

import gc
import json
import logging
import os
import signal
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

import pika
import torch
from dotenv import load_dotenv
from FlagEmbedding import BGEM3FlagModel

from backend import utils

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S,%f",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logging.getLogger("pika").setLevel(logging.WARNING)

load_dotenv()


def check_env_var(var_name: str) -> str:
    value = os.getenv(var_name)
    if not value:
        raise EnvironmentError(
            f"{var_name} environment variable is not set. Please configure it before running the script."
        )
    return value


RABBITMQ_VECTORIZE_QUEUE = check_env_var("RABBITMQ_VECTORIZE_QUEUE")
RABBITMQ_UPLOAD_VECTOR_QUEUE = check_env_var("RABBITMQ_UPLOAD_VECTOR_QUEUE")
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

RETRY_DELAY = 5
MAX_RETRIES = 5

IDLE_SECONDS = int(os.getenv("VECTORIZER_IDLE_SECONDS", "300"))
CONTROL_HOST = os.getenv("VECTORIZER_CONTROL_HOST", "0.0.0.0")
CONTROL_PORT = int(os.getenv("VECTORIZER_CONTROL_PORT", "8765"))
CONTROL_TOKEN = os.getenv("VECTORIZER_CONTROL_TOKEN", "").strip()
ALWAYS_ON = os.getenv("VECTORIZER_ALWAYS_ON", "").lower() in ("1", "true", "yes")

model: BGEM3FlagModel | None = None
model_lock = threading.Lock()

last_workspace_activity = time.time()
activity_lock = threading.Lock()

consumer_channel: pika.channel.Channel | None = None
consumer_connection: pika.BlockingConnection | None = None
consumer_state_lock = threading.Lock()
_is_consuming = False

resume_consumer = threading.Event()
http_server: HTTPServer | None = None


def touch_workspace_activity() -> None:
    global last_workspace_activity
    with activity_lock:
        last_workspace_activity = time.time()


def load_model() -> None:
    global model
    with model_lock:
        if model is None:
            logging.info("Checking for GPU...")
            if torch.cuda.is_available():
                device = torch.device("cuda")
                logging.info("Found GPU.")
            else:
                device = torch.device("cpu")
                logging.info("No GPU available. Using CPU.")
            logging.info("Loading model...")
            model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True, device=device)
            logging.info("Model loaded successfully.")


def unload_model() -> None:
    global model
    with model_lock:
        if model is not None:
            logging.info("Unloading embedding model (idle timeout).")
            del model
            model = None
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()


def publish_vectors(
    ch: pika.channel.Channel,
    vector_data: list,
    workspace_id: str,
    database: str,
    retries: int = 0,
) -> None:
    try:
        ch.queue_declare(queue=RABBITMQ_UPLOAD_VECTOR_QUEUE, durable=True)
        message = json.dumps(
            {
                "database": database,
                "vector_data": vector_data,
                "workspace_id": workspace_id,
            }
        )
        ch.basic_publish(
            exchange="", routing_key=RABBITMQ_UPLOAD_VECTOR_QUEUE, body=message
        )
        logging.info("Published vectors to vector upload queue.")
    except Exception as e:
        logging.error(
            "Unexpected error publishing to RabbitMQ: %s: %s",
            e.__class__.__name__,
            e,
        )
        time.sleep(RETRY_DELAY)
        if retries < MAX_RETRIES:
            publish_vectors(ch, vector_data, workspace_id, database, retries + 1)


def vectorize_documents(
    ch: pika.channel.Channel,
    method: Any,
    properties: Any,
    body: bytes,
) -> None:
    touch_workspace_activity()
    load_model()
    assert model is not None

    try:
        message = json.loads(body.decode("utf-8"))
        documents = message.get("documents", [])
        workspace_id = message.get("workspace_id", "")
        database = message.get("database", "default")

        if len(documents) == 0:
            logging.warning("No documents found in the message.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        if workspace_id == "":
            logging.warning("No workspace included.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        logging.info(
            "Vectorizing %s documents for database %s and workspace %s...",
            len(documents),
            database,
            workspace_id,
        )

        batch_size = 128
        texts = [doc["text"] for doc in documents]
        total_batches = (len(texts) + batch_size - 1) // batch_size

        for i in range(0, len(texts), batch_size):
            current_batch_size = min(batch_size, len(texts) - i)
            logging.info(
                "Vectorizing batch %s/%s with size %s...",
                i // batch_size + 1,
                total_batches,
                current_batch_size,
            )

            batch_texts = texts[i : i + current_batch_size]
            try:
                raw_vecs = model.encode(batch_texts)["dense_vecs"]
                vector_data = [
                    {"id": doc["id"], "vector": vec.tolist()}
                    for doc, vec in zip(
                        documents[i : i + current_batch_size], raw_vecs
                    )
                ]
                logging.info(
                    "Batch %s/%s completed. Sending to %s.",
                    i // batch_size + 1,
                    total_batches,
                    RABBITMQ_UPLOAD_VECTOR_QUEUE,
                )
                publish_vectors(ch, vector_data, workspace_id, database)
            except Exception as e:
                logging.error(
                    "Error in batch %s/%s: %s", i // batch_size + 1, total_batches, e
                )
                break
            finally:
                del batch_texts, raw_vecs, vector_data
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

            touch_workspace_activity()

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    except Exception as e:
        logging.error("Error during vectorization: %s", e)
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)


def _stop_consuming_safe() -> None:
    global consumer_channel
    ch = consumer_channel
    if ch is not None:
        try:
            ch.stop_consuming()
        except Exception as e:
            logging.warning("stop_consuming: %s", e)


def idle_watcher_loop() -> None:
    while True:
        time.sleep(10)
        if ALWAYS_ON:
            continue
        with activity_lock:
            idle = time.time() - last_workspace_activity
        if idle < IDLE_SECONDS:
            continue
        with consumer_state_lock:
            consuming = _is_consuming
            conn = consumer_connection
        if not consuming or conn is None:
            continue
        logging.info(
            "No workspace activity for %s s; stopping consumer and unloading model.",
            IDLE_SECONDS,
        )
        try:
            if conn.is_open:
                conn.add_callback_threadsafe(_stop_consuming_safe)
        except Exception as e:
            logging.warning("Idle watcher could not stop consumer: %s", e)


def on_workspace_activity_ping() -> None:
    """HTTP handler + internal: bump activity and wake consumer if idle."""
    touch_workspace_activity()
    with consumer_state_lock:
        consuming = _is_consuming
    if not consuming:
        resume_consumer.set()


class _ActivityHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
        logging.info("%s - %s", self.address_string(), fmt % args)

    def do_POST(self) -> None:
        if self.path != "/activity":
            self.send_error(404)
            return
        if CONTROL_TOKEN:
            auth = self.headers.get("Authorization", "")
            if auth != f"Bearer {CONTROL_TOKEN}":
                self.send_error(401)
                self.end_headers()
                return
        on_workspace_activity_ping()
        self.send_response(204)
        self.end_headers()


def consumer_thread_main() -> None:
    global consumer_channel, consumer_connection, _is_consuming
    while True:
        logging.info(
            "Vectorizer waiting for workspace activity (POST /activity on control port)..."
        )
        resume_consumer.wait()
        resume_consumer.clear()
        touch_workspace_activity()
        ch = None
        conn = None
        try:
            load_model()
            conn = utils.get_connection()
            ch = conn.channel()
            with consumer_state_lock:
                consumer_connection = conn
                consumer_channel = ch
                _is_consuming = True
            ch.queue_declare(queue=RABBITMQ_VECTORIZE_QUEUE, durable=True)
            ch.basic_qos(prefetch_count=1)
            ch.basic_consume(
                queue=RABBITMQ_VECTORIZE_QUEUE,
                on_message_callback=vectorize_documents,
            )
            ch.start_consuming()
        except Exception:
            logging.exception("Consumer thread error")
        finally:
            with consumer_state_lock:
                _is_consuming = False
                consumer_channel = None
                consumer_connection = None
            try:
                if ch is not None and not getattr(ch, "is_closed", False):
                    ch.close()
            except Exception:
                pass
            try:
                if conn is not None and conn.is_open:
                    conn.close()
            except Exception:
                pass
            unload_model()


def run_always_on_mode() -> None:
    logging.info("VECTORIZER_ALWAYS_ON: consuming immediately (no activity gate).")
    load_model()
    connection = utils.get_connection()
    channel = connection.channel()
    channel.queue_declare(queue=RABBITMQ_VECTORIZE_QUEUE, durable=True)
    channel.basic_consume(
        queue=RABBITMQ_VECTORIZE_QUEUE, on_message_callback=vectorize_documents
    )
    channel.start_consuming()


def graceful_shutdown(signum: int, frame: Any) -> None:
    logging.info("Received signal %s; shutting down vectorizer...", signum)
    global http_server
    if http_server:
        try:
            http_server.shutdown()
        except Exception:
            pass
    sys.exit(0)


def main() -> None:
    global http_server
    signal.signal(signal.SIGTERM, graceful_shutdown)
    signal.signal(signal.SIGINT, graceful_shutdown)

    if ALWAYS_ON:
        try:
            run_always_on_mode()
        except KeyboardInterrupt:
            graceful_shutdown(signal.SIGINT, None)
        return

    threading.Thread(target=consumer_thread_main, daemon=True).start()
    threading.Thread(target=idle_watcher_loop, daemon=True).start()

    http_server = HTTPServer((CONTROL_HOST, CONTROL_PORT), _ActivityHandler)
    if CONTROL_TOKEN:
        logging.info(
            "Vectorizer control listening on %s:%s (auth required). Idle after %s s without activity.",
            CONTROL_HOST,
            CONTROL_PORT,
            IDLE_SECONDS,
        )
    else:
        logging.warning(
            "Vectorizer control on %s:%s with NO token — use only on trusted networks. Idle after %s s.",
            CONTROL_HOST,
            CONTROL_PORT,
            IDLE_SECONDS,
        )
    try:
        http_server.serve_forever()
    except KeyboardInterrupt:
        graceful_shutdown(signal.SIGINT, None)


if __name__ == "__main__":
    main()
