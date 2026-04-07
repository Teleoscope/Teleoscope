# monitor.py
"""
EC2 auto-scaler for the vectorizer (and optionally the vector DB) instance.

Watches the RABBITMQ_VECTORIZE_QUEUE queue:
  - Queue non-empty + instance stopped/stopping  → start the EC2 instance.
  - Queue empty for VECTORIZER_IDLE_STOP_MINUTES → stop the EC2 instance.

The vectorizer instance should run docker-compose.vectorizer.yml with
VECTORIZER_ALWAYS_ON=1 so it consumes immediately on boot.

Required env vars:
  EC2_VECTORIZE_INSTANCE       EC2 instance ID for the vectorizer, e.g. i-0abc123
  RABBITMQ_VECTORIZE_QUEUE     Queue name to watch
  RABBITMQ_VHOST               RabbitMQ vhost

Optional env vars:
  EC2_VECTORDB_INSTANCE        EC2 instance ID for a self-hosted vector DB (omit when using Zilliz)
  AWS_REGION                   AWS region (default: ca-central-1)
  MONITOR_CHECK_INTERVAL       Seconds between queue polls (default: 10)
  VECTORIZER_IDLE_STOP_MINUTES Minutes of empty queue before stopping the instance (default: 10)
"""
from __future__ import annotations

import logging
import os
import sys
import time

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

from backend import utils

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S,%f",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logging.getLogger("pika").setLevel(logging.WARNING)


def _require(var: str) -> str:
    value = os.getenv(var)
    if not value:
        raise EnvironmentError(
            f"{var} environment variable is not set. Please configure it before running."
        )
    return value


RABBITMQ_VECTORIZE_QUEUE = _require("RABBITMQ_VECTORIZE_QUEUE")
RABBITMQ_VHOST = _require("RABBITMQ_VHOST")
EC2_VECTORIZE_INSTANCE = _require("EC2_VECTORIZE_INSTANCE")
# Optional — omit when using Zilliz Cloud instead of a self-hosted vector DB.
EC2_VECTORDB_INSTANCE = os.getenv("EC2_VECTORDB_INSTANCE", "").strip() or None

AWS_REGION = os.getenv("AWS_REGION", "ca-central-1")
CHECK_INTERVAL = int(os.getenv("MONITOR_CHECK_INTERVAL", "10"))
IDLE_STOP_MINUTES = int(os.getenv("VECTORIZER_IDLE_STOP_MINUTES", "10"))

ec2 = boto3.client("ec2", region_name=AWS_REGION)

# Transient states — do not issue start/stop while the instance is in one of these.
_TRANSIENT_STATES = {"pending", "stopping", "shutting-down", "rebooting"}


# ---------------------------------------------------------------------------
# EC2 helpers
# ---------------------------------------------------------------------------


def get_instance_state(instance_id: str) -> str | None:
    """Return the EC2 instance state name, or None on error."""
    try:
        resp = ec2.describe_instances(InstanceIds=[instance_id])
        reservations = resp.get("Reservations", [])
        if not reservations:
            return None
        state = reservations[0]["Instances"][0]["State"]["Name"]
        return state
    except ClientError as e:
        logging.error("describe_instances(%s): %s", instance_id, e)
        return None


def start_instance(instance_id: str) -> None:
    try:
        ec2.start_instances(InstanceIds=[instance_id])
        logging.info("start_instances(%s) issued.", instance_id)
    except ClientError as e:
        logging.error("start_instances(%s): %s", instance_id, e)


def stop_instance(instance_id: str) -> None:
    try:
        ec2.stop_instances(InstanceIds=[instance_id])
        logging.info("stop_instances(%s) issued.", instance_id)
    except ClientError as e:
        logging.error("stop_instances(%s): %s", instance_id, e)


# ---------------------------------------------------------------------------
# RabbitMQ helpers
# ---------------------------------------------------------------------------


def get_queue_depth(queue_name: str) -> int | None:
    """Return the number of ready messages in the queue, or None on error."""
    try:
        connection = utils.get_connection()
        channel = connection.channel()
        result = channel.queue_declare(queue=queue_name, passive=True)
        depth = result.method.message_count
        connection.close()
        return depth
    except Exception as e:
        logging.error("get_queue_depth(%s): %s", queue_name, e)
        return None


# ---------------------------------------------------------------------------
# Monitor loop
# ---------------------------------------------------------------------------


def monitor_loop() -> None:
    queue_empty_since: float | None = None  # wall time when queue first became empty

    logging.info(
        "monitor: watching queue=%s instance=%s region=%s idle_stop=%dm check_interval=%ds",
        RABBITMQ_VECTORIZE_QUEUE,
        EC2_VECTORIZE_INSTANCE,
        AWS_REGION,
        IDLE_STOP_MINUTES,
        CHECK_INTERVAL,
    )
    if EC2_VECTORDB_INSTANCE:
        logging.info("monitor: also keeping vectordb instance=%s alive.", EC2_VECTORDB_INSTANCE)

    while True:
        depth = get_queue_depth(RABBITMQ_VECTORIZE_QUEUE)
        state = get_instance_state(EC2_VECTORIZE_INSTANCE)

        logging.info(
            "vectorize queue depth=%s  vectorizer state=%s",
            depth if depth is not None else "ERR",
            state or "ERR",
        )

        if depth is not None and state is not None:
            if depth > 0:
                # Work to do — reset idle timer; start instance if it's stopped.
                queue_empty_since = None
                if state == "stopped":
                    logging.info(
                        "Queue has %d messages and instance is stopped — starting %s.",
                        depth,
                        EC2_VECTORIZE_INSTANCE,
                    )
                    start_instance(EC2_VECTORIZE_INSTANCE)
                elif state in _TRANSIENT_STATES:
                    logging.info("Instance %s is in transient state '%s' — waiting.", EC2_VECTORIZE_INSTANCE, state)
            else:
                # Queue is empty — track how long it has been idle.
                if queue_empty_since is None:
                    queue_empty_since = time.time()
                idle_minutes = (time.time() - queue_empty_since) / 60.0

                if state == "running":
                    if idle_minutes >= IDLE_STOP_MINUTES:
                        logging.info(
                            "Queue empty for %.1f min (threshold %d min) — stopping %s.",
                            idle_minutes,
                            IDLE_STOP_MINUTES,
                            EC2_VECTORIZE_INSTANCE,
                        )
                        stop_instance(EC2_VECTORIZE_INSTANCE)
                        queue_empty_since = None  # reset so we don't re-issue stop
                    else:
                        logging.info(
                            "Queue empty for %.1f / %d min — keeping instance running.",
                            idle_minutes,
                            IDLE_STOP_MINUTES,
                        )

        # Optional: keep the self-hosted vector DB instance alive (skip for Zilliz).
        if EC2_VECTORDB_INSTANCE:
            db_state = get_instance_state(EC2_VECTORDB_INSTANCE)
            logging.info("vectordb instance=%s state=%s", EC2_VECTORDB_INSTANCE, db_state or "ERR")
            if db_state == "stopped":
                logging.info("Vector DB instance is stopped — starting %s.", EC2_VECTORDB_INSTANCE)
                start_instance(EC2_VECTORDB_INSTANCE)

        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    monitor_loop()
