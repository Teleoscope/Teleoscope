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
from botocore.exceptions import ClientError, NoCredentialsError, TokenRetrievalError
from dotenv import load_dotenv

from backend import utils

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logging.getLogger("pika").setLevel(logging.WARNING)
log = logging.getLogger(__name__)


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
# Startup health checks
# ---------------------------------------------------------------------------

def _check_aws_credentials() -> bool:
    """Verify AWS credentials are valid and the IAM role can describe instances."""
    try:
        sts = boto3.client("sts", region_name=AWS_REGION)
        identity = sts.get_caller_identity()
        log.info(
            "monitor: AWS credentials OK — account=%s arn=%s",
            identity.get("Account"), identity.get("Arn"),
        )
        # Verify we can actually describe our instances (not just auth)
        for iid, label in [(EC2_WORKER_INSTANCE, "worker"), (EC2_VECTORIZE_INSTANCE, "vectorizer")]:
            resp = ec2.describe_instances(InstanceIds=[iid])
            instances = resp.get("Reservations", [{}])[0].get("Instances", [{}])
            state = instances[0].get("State", {}).get("Name", "unknown") if instances else "NOT FOUND"
            name_tags = [t["Value"] for t in instances[0].get("Tags", []) if t["Key"] == "Name"] if instances else []
            name = name_tags[0] if name_tags else iid
            log.info("monitor: %s EC2 — id=%s  name=%s  state=%s", label, iid, name, state)
        return True
    except (NoCredentialsError, TokenRetrievalError) as e:
        log.error("monitor: AWS credentials missing or expired: %s", e)
        log.error("monitor: Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or use an IAM instance profile.")
        return False
    except ClientError as e:
        code = e.response["Error"]["Code"]
        if code in ("AuthFailure", "UnauthorizedOperation", "InvalidClientTokenId"):
            log.error("monitor: AWS auth error (%s): %s", code, e)
            log.error("monitor: Check IAM role permissions for ec2:DescribeInstances on these instances.")
            return False
        log.warning("monitor: AWS check returned %s — will retry: %s", code, e)
        return True  # Transient error, not a credentials problem


def _check_rabbitmq() -> bool:
    """Verify RabbitMQ connection is working at startup."""
    try:
        conn = utils.get_connection()
        conn.close()
        log.info(
            "monitor: RabbitMQ OK — host=%s vhost=%s",
            os.getenv("RABBITMQ_HOST", "rabbitmq"),
            RABBITMQ_VHOST,
        )
        return True
    except Exception as e:
        log.warning("monitor: RabbitMQ not ready yet: %s", e)
        return False


def startup_checks(max_wait_seconds: int = 120) -> None:
    """
    Block until AWS creds and RabbitMQ are both confirmed working, or give up.
    This surfaces configuration errors immediately instead of logging them every
    10 seconds for the lifetime of the container.
    """
    log.info("monitor: running startup checks (max wait %ds) …", max_wait_seconds)
    deadline = time.time() + max_wait_seconds

    aws_ok = False
    rmq_ok = False

    while time.time() < deadline:
        if not aws_ok:
            aws_ok = _check_aws_credentials()
        if not rmq_ok:
            rmq_ok = _check_rabbitmq()
        if aws_ok and rmq_ok:
            log.info("monitor: startup checks passed.")
            return
        time.sleep(5)

    # Surface a clear diagnostic rather than silently proceeding
    if not aws_ok:
        log.error(
            "monitor: STARTUP FAILED — AWS credentials invalid or IAM role missing "
            "ec2:DescribeInstances/StartInstances/StopInstances permissions. "
            "Instances will NOT be auto-scaled until this is resolved."
        )
    if not rmq_ok:
        log.error(
            "monitor: STARTUP FAILED — cannot connect to RabbitMQ after %ds. "
            "Queue depths cannot be read; instances will NOT be auto-scaled.",
            max_wait_seconds,
        )
    # Do not exit — keep running so the container stays up and the issue is visible
    # in `docker logs` without a restart loop masking the error.


# ---------------------------------------------------------------------------
# EC2 helpers
# ---------------------------------------------------------------------------

def instance_state(instance_id: str) -> str | None:
    try:
        resp = ec2.describe_instances(InstanceIds=[instance_id])
        reservations = resp.get("Reservations", [])
        if not reservations:
            log.error("instance_state(%s): no reservations — instance may have been terminated.", instance_id)
            return None
        return reservations[0]["Instances"][0]["State"]["Name"]
    except (NoCredentialsError, TokenRetrievalError) as e:
        log.error(
            "instance_state(%s): AWS credentials expired — "
            "the IAM instance profile may need rotation: %s", instance_id, e
        )
        return None
    except ClientError as e:
        log.error("instance_state(%s): %s", instance_id, e)
        return None


def start_instance(instance_id: str, label: str) -> None:
    try:
        ec2.start_instances(InstanceIds=[instance_id])
        log.info("%s: issued start_instances(%s)", label, instance_id)
    except (NoCredentialsError, TokenRetrievalError) as e:
        log.error("%s: start_instances(%s): credentials expired: %s", label, instance_id, e)
    except ClientError as e:
        log.error("%s: start_instances(%s): %s", label, instance_id, e)


def stop_instance(instance_id: str, label: str) -> None:
    try:
        ec2.stop_instances(InstanceIds=[instance_id])
        log.info("%s: issued stop_instances(%s)", label, instance_id)
    except (NoCredentialsError, TokenRetrievalError) as e:
        log.error("%s: stop_instances(%s): credentials expired: %s", label, instance_id, e)
    except ClientError as e:
        log.error("%s: stop_instances(%s): %s", label, instance_id, e)


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
        log.warning("queue_depth(%s): %s", queue_name, e)
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

        if depth is None or state is None:
            log.warning(
                "%s: skipping tick — depth=%s state=%s",
                self.label,
                "ERR" if depth is None else depth,
                "ERR" if state is None else state,
            )
            return

        if depth > 0:
            self._empty_since = None
            if state == "stopped":
                log.info("%s: %d message(s) queued — starting instance %s.", self.label, depth, self.instance_id)
                start_instance(self.instance_id, self.label)
            elif state == "running":
                log.info("%s: %d message(s) queued — instance running.", self.label, depth)
            elif state in _TRANSIENT:
                log.info("%s: %d message(s) queued — instance in transient state '%s', waiting.", self.label, depth, state)
        else:
            if self._empty_since is None:
                self._empty_since = time.time()
            idle_min = (time.time() - self._empty_since) / 60.0
            pct = min(100, int(idle_min / self.idle_minutes * 100))

            if state == "running":
                if idle_min >= self.idle_minutes:
                    log.info(
                        "%s: queues empty %.1f/%d min (100%%) — stopping instance %s.",
                        self.label, idle_min, self.idle_minutes, self.instance_id,
                    )
                    stop_instance(self.instance_id, self.label)
                    self._empty_since = None
                else:
                    log.info(
                        "%s: queues empty %.1f/%d min (%d%% of idle threshold) — instance running.",
                        self.label, idle_min, self.idle_minutes, pct,
                    )
            elif state == "stopped":
                log.info("%s: queues empty — instance already stopped.", self.label)
                self._empty_since = None  # reset so we don't count stopped time toward idle


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def monitor_loop() -> None:
    startup_checks()

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

    log.info(
        "monitor: running — region=%s  interval=%ds  "
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
