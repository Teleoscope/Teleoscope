# Installing Teleoscope on AWS EC2

> **Automated path:** `bash scripts/setup.sh` provisions EC2 instances, installs Docker, deploys the stack, configures nginx + TLS, and sets up the on-demand GPU vectorizer in one run. See [ansible/README.md](../ansible/README.md). Use the manual steps below if you want a single-instance setup without the GPU auto-scaler or Zilliz.

This guide walks through running the **full stack** (Next.js app, MongoDB, RabbitMQ, Milvus, workers, vectorizer) on a single **Ubuntu** EC2 instance using **Docker Compose**—the same layout as local development and CI.

## What you need

- An AWS account and permission to create EC2 instances, security groups, and (recommended) an Elastic IP.
- An SSH key pair in the region where you launch the instance.
- A public **DNS name** or Elastic IP for production auth: NextAuth must see the same URL users use in the browser (see [Environment](#environment)).

## Choose an instance size

The stack includes **Milvus**, **embedding inference** (BGE-M3 in the vectorizer), and several Python workers. Undersized instances will OOM or thrash.

| Profile | Suggested types | Notes |
|--------|------------------|--------|
| **Try / dev** | `t3.xlarge` or `m6i.xlarge` (16 GB RAM) | Minimum to stand up Compose; vectorization is slow on CPU. |
| **Small production** | `m6i.2xlarge` or `r6i.xlarge` (32 GB RAM) | More comfortable for Milvus + model + app. |
| **Faster embeddings** | **GPU** e.g. `g5.xlarge` + [NVIDIA drivers + container toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) | Use `docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d` after GPU Docker is working. |

Storage: start with **80–100 GB gp3** on the root volume; images, volumes, and model cache grow over time.

OS: **Ubuntu Server 22.04 LTS** (matches the Ansible playbooks’ tested `jammy` target).

## 1. Create the EC2 instance

1. In the EC2 console, launch an instance with the AMI and size above.
2. **Security group** (inbound)—at minimum:
   - **TCP 22** from your IP only (SSH).
   - **TCP 80** and **443** from `0.0.0.0/0` if you terminate TLS on the instance or behind an ALB (recommended for production).
   - **TCP 3000** only temporarily if you want to smoke-test before putting a reverse proxy in front; **do not** leave the app on plain HTTP:3000 open to the world in production.

**Important:** The default `docker-compose.yml` **publishes** several ports on the host (e.g. **27017** MongoDB, **5672/15672** RabbitMQ, **8000** files API, **8765** vectorizer control, **19530** Milvus when fixed). Your security group must **not** expose those to the public internet. Allow **only** SSH (restricted), HTTP/HTTPS, and optionally 3000 for short-lived debugging.

3. (Optional) Allocate an **Elastic IP** and associate it with the instance so DNS and `.env` URLs stay stable.

## 2. Install Docker and Compose

SSH in as `ubuntu` (or your AMI user), then:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back in so the `docker` group applies, or use `newgrp docker`.

## 3. Clone the repository

```bash
sudo apt-get install -y git
git clone https://github.com/<your-org>/Teleoscope.git
cd Teleoscope
```

Use your fork or deployment branch if applicable.

## 4. Environment

```bash
cp .env.example .env
```

Edit `.env` for production. At minimum set strong secrets and **public URLs**:

| Variable | Purpose |
|----------|---------|
| `MONGODB_PASSWORD` | Must match what the Compose file expects for the `teleoscope` user (see `.env.example` / `docker-compose.yml`). |
| `NEXTAUTH_SECRET` | Long random string for session signing. |
| `NEXTAUTH_URL` | **Exact** site URL users open, e.g. `https://teleoscope.example.com` (no trailing slash quirks—match your proxy). |
| `TELEOSCOPE_BASE_URL` | Same idea as `NEXTAUTH_URL` for server-side links and callbacks. |

Compose wires **internal** hostnames (`mongodb`, `rabbitmq`, `milvus`, `vectorizer`, …) for containers; you usually **do not** change those unless you split services across hosts.

**Vectorizer behavior:** By default the stack uses **activity-based** wake (workspace UI pings). For a server with no browser traffic tests, or to avoid idle shutdown during batch jobs, set `VECTORIZER_ALWAYS_ON=1` in `.env` (see root `README.md` and `.env.example`).

**Milvus port:** Compose defaults to host **19530** (`MILVUS_HOST_PORT` defaults to 19530). Set **`MILVUS_HOST_PORT=0`** only if you need a random free port; containers still reach the service as `milvus:19530` on the Docker network.

## 5. Start the stack

```bash
docker compose up -d --build
```

First start can take a long time (image builds, model download inside the vectorizer image/worker). Watch logs:

```bash
docker compose logs -f app
docker compose logs -f vectorizer
```

Smoke test from the instance:

```bash
curl -sf http://localhost:3000/api/hello
./scripts/test-stack.sh http://localhost:3000
```

If Milvus uses a random host port, `docker compose port milvus 19530` shows the mapping for host-side probes.

## 6. HTTPS and a reverse proxy (production)

Do **not** rely on port 3000 alone on the public internet. Typical patterns:

- **Application Load Balancer (ALB)** in front of the instance on **443**, target group → instance **3000** (or **80** → nginx → 3000).
- **Caddy** or **nginx** on the instance listening on **80/443**, proxying to `127.0.0.1:3000`, with Let’s Encrypt.

After TLS is in place, confirm `NEXTAUTH_URL` / `TELEOSCOPE_BASE_URL` use `https://…` and restart the app container if you changed `.env`:

```bash
docker compose up -d app
```

## 7. Demo corpus (optional)

To ship the **public /demo** experience with the pre-seeded corpus, see **[demo-corpus-setup.md](demo-corpus-setup.md)** and **`scripts/one-click-demo.sh`** (host steps may require Conda/mamba for the seed script even when the stack runs in Docker).

## 8. Operations

**Updates**

```bash
cd Teleoscope
git pull
docker compose up -d --build
```

**Data:** MongoDB, Milvus, etcd, MinIO, and upload volumes live in **Docker volumes**. Back up with your preferred snapshot strategy (EBS snapshot of the volume, or documented `mongodump` / Milvus export procedures).

**SSH + Docker**

```bash
docker compose ps
docker compose logs --tail=200 worker-tasks
```

## Alternative: fully automated deploy

`bash scripts/setup.sh` handles everything above — EC2 provisioning, Docker install, stack startup, nginx, and TLS — plus spins up a separate on-demand GPU EC2 for the vectorizer and uses Zilliz Cloud instead of a local Milvus. See [ansible/README.md](../ansible/README.md) for the full reference.

## Troubleshooting

| Symptom | Check |
|--------|--------|
| App exits / OOM | Larger instance or `VECTORIZER_ALWAYS_ON=0` with fewer concurrent jobs; GPU for vectorizer. |
| Auth redirects wrong | `NEXTAUTH_URL` / `TELEOSCOPE_BASE_URL` must match the browser URL scheme and host. |
| Mongo “transaction” errors | Compose Mongo is configured as a **single-node replica set**; ensure `mongodb-init` completed (`docker compose logs mongodb-init`). |
| Vector jobs never run | Vectorizer waiting for activity: open a workspace or set `VECTORIZER_ALWAYS_ON=1`. Ensure `VECTORIZER_CONTROL_URL` is set for the app (Compose sets it by default). |

For general testing and CI-style checks, see root **[TESTING.md](../TESTING.md)** and **[README.md](../README.md)**.
