# monitor.py
"""
EC2 auto-scaler for the worker EC2 and the vectorizer GPU EC2.

Runs on the always-on app server (t3.large) and watches RabbitMQ queue depths:

  Worker EC2  — dispatch / tasks / graph / uploader queues
    non-empty + instance stopped  → start
    all empty for WORKER_IDLE_STOP_MINUTES → stop

  Vectorizer GPU EC2  — teleoscope-vectorize queue
    non-empty + instance stopped  → start
    empty for VECTORIZER_IDLE_STOP_MINUTES → stop

Required env vars:
  EC2_WORKER_INSTANCE          Instance ID for the Python worker EC2
  EC2_VECTORIZE_INSTANCE       Instance ID for the GPU vectorizer EC2
  RABBITMQ_VHOST               RabbitMQ vhost (usually /)

Optional env vars:
  AWS_REGION                   default: ca-central-1
  MONITOR_CHECK_INTERVAL       seconds between polls (default: 10)
  WORKER_IDLE_STOP_MINUTES     idle minutes before stopping worker EC2 (default: 10)
  VECTORIZER_IDLE_STOP_MINUTES idle minutes before stopping GPU EC2 (default: 10)
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
        raise EnvironmentError(f"{var} is required but not set.")
    return value


EC2_WORKER_INSTANCE     = _require("EC2_WORKER_INSTANCE")
EC2_VECTORIZE_INSTANCE  = _require("EC2_VECTORIZE_INSTANCE")
RABBITMQ_VHOST          = _require("RABBITMQ_VHOST")

AWS_REGION              = os.getenv("AWS_REGION", "ca-central-1")
CHECK_INTERVAL          = int(os.getenv("MONITOR_CHECK_INTERVAL", "10"))
WORKER_IDLE_STOP        = int(os.getenv("WORKER_IDLE_STOP_MINUTES", "10"))
VECTORIZER_IDLE_STOP    = int(os.getenv("VECTORIZER_IDLE_STOP_MINUTES", "10"))

# Queues that drive the worker EC2 (everything except the vectorize queue).
WORKER_QUEUES = [
    os.getenv("RABBITMQ_DISPATCH_QUEUE",      "teleoscope-dispatch"),
    os.getenv("RABBITMQ_TASK_QUEUE",          "teleoscope-tasks"),
    os.getenv("RABBITMQ_UPLOAD_VECTOR_QUEUE", "teleoscope-upload-vector"),
    "graph",
]
VECTORIZE_QUEUE = os.getenv("RABBITMQ_VECTORIZE_QUEUE", "teleoscope-vectorize")

_TRANSIENT = {"pending", "stopping", "shutting-down", "rebooting"}

ec2 = boto3.client("ec2", region_name=AWS_REGION)


# ---------------------------------------------------------------------------
# EC2 helpers
# ---------------------------------------------------------------------------

def instance_state(instance_id: str) -> str | None:
    try:
        resp = ec2.describe_instances(InstanceIds=[instance_id])
        reservations = resp.get("Reservations", [])
        if not reservations:
            return None
        return reservations[0]["Instances"][0]["State"]["Name"]
    except ClientError as e:
        logging.error("describe_instances(%s): %s", instance_id, e)
        return None


def start_instance(instance_id: str, label: str) -> None:
    try:
        ec2.start_instances(InstanceIds=[instance_id])
        logging.info("%s: issued start_instances(%s)", label, instance_id)
    except ClientError as e:
        logging.error("%s: start_instances(%s): %s", label, instance_id, e)


def stop_instance(instance_id: str, label: str) -> None:
    try:
        ec2.stop_instances(InstanceIds=[instance_id])
        logging.info("%s: issued stop_instances(%s)", label, instance_id)
    except ClientError as e:
        logging.error("%s: stop_instances(%s): %s", label, instance_id, e)


# ---------------------------------------------------------------------------
# RabbitMQ helpers
# ---------------------------------------------------------------------------

def queue_depth(queue_name: str) -> int | None:
    try:
        conn = utils.get_connection()
        ch = conn.channel()
        result = ch.queue_declare(queue=queue_name, passive=True)
        depth = result.method.message_count
        conn.close()
        return depth
    except Exception as e:
        logging.warning("queue_depth(%s): %s", queue_name, e)
        return None


def total_depth(queues: list[str]) -> int | None:
    """Sum depths across a list of queues. Returns None if all checks fail."""
    total = 0
    any_ok = False
    for q in queues:
        d = queue_depth(q)
        if d is not None:
            total += d
            any_ok = True
    return total if any_ok else None


# ---------------------------------------------------------------------------
# Per-instance scaler logic
# ---------------------------------------------------------------------------

class InstanceScaler:
    """Starts an EC2 instance when queues are non-empty; stops it when idle."""

    def __init__(self, instance_id: str, queues: list[str], idle_minutes: int, label: str):
        self.instance_id = instance_id
        self.queues = queues
        self.idle_minutes = idle_minutes
        self.label = label
        self._empty_since: float | None = None

    def tick(self) -> None:
        depth = total_depth(self.queues)
        state = instance_state(self.instance_id)

        logging.info(
            "%s: queue_depth=%s  state=%s",
            self.label,
            depth if depth is not None else "ERR",
            state or "ERR",
        )

        if depth is None or state is None:
            return

        if depth > 0:
            self._empty_since = None
            if state == "stopped":
                logging.info("%s: %d messages — starting instance.", self.label, depth)
                start_instance(self.instance_id, self.label)
            elif state in _TRANSIENT:
                logging.info("%s: instance in transient state '%s' — waiting.", self.label, state)
        else:
            if self._empty_since is None:
                self._empty_since = time.time()
            idle = (time.time() - self._empty_since) / 60.0

            if state == "running":
                if idle >= self.idle_minutes:
                    logging.info(
                        "%s: queues empty %.1f / %d min — stopping instance.",
                        self.label, idle, self.idle_minutes,
                    )
                    stop_instance(self.instance_id, self.label)
                    self._empty_since = None
                else:
                    logging.info(
                        "%s: queues empty %.1f / %d min — keeping instance running.",
                        self.label, idle, self.idle_minutes,
                    )


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def monitor_loop() -> None:
    worker_scaler = InstanceScaler(
        instance_id=EC2_WORKER_INSTANCE,
        queues=WORKER_QUEUES,
        idle_minutes=WORKER_IDLE_STOP,
        label="workers",
    )
    gpu_scaler = InstanceScaler(
        instance_id=EC2_VECTORIZE_INSTANCE,
        queues=[VECTORIZE_QUEUE],
        idle_minutes=VECTORIZER_IDLE_STOP,
        label="vectorizer",
    )

    logging.info(
        "monitor: region=%s  check_interval=%ds  "
        "worker=%s (idle_stop=%dm)  gpu=%s (idle_stop=%dm)",
        AWS_REGION, CHECK_INTERVAL,
        EC2_WORKER_INSTANCE, WORKER_IDLE_STOP,
        EC2_VECTORIZE_INSTANCE, VECTORIZER_IDLE_STOP,
    )

    while True:
        worker_scaler.tick()
        gpu_scaler.tick()
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    monitor_loop()
