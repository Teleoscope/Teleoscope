# Ansible deployment

Automated deployment for Teleoscope on AWS EC2 using Docker Compose.

## Quick start

### 1. Install requirements

```bash
pip install ansible boto3
ansible-galaxy collection install -r ansible/requirements.yaml
```

### 2. Configure

```bash
cp ansible/vars/vars.yaml.example ansible/vars/vars.yaml
```

Edit `ansible/vars/vars.yaml`. At minimum set:

| Variable | What it is |
|---|---|
| `aws_key_pair` | EC2 key pair name in your AWS account |
| `ssh_private_key_file` | Local path to the `.pem` file |
| `mongodb_dev_password` | Strong password for the app DB user |
| `nextauth_secret` | Random secret — `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `milvus_uri` | Your Zilliz Cloud endpoint |
| `milvus_token` | Your Zilliz Cloud API key |
| `certbot_email` | Email for Let's Encrypt expiry notices |
| `aws_region` | AWS region to deploy into |

### 3. Set AWS credentials

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
# or: export AWS_PROFILE=my-sso-profile
```

### 4. Deploy everything

```bash
ansible-playbook ansible/site.yaml
```

This runs six plays in sequence:

1. **Provision AWS** — security groups, IAM role, main EC2, GPU EC2, Elastic IP
2. **Wait for SSH** — waits up to 5 minutes for both instances to accept connections
3. **Install Docker** — Docker CE + Compose plugin on both instances
4. **Deploy main stack** — clone repo, write `.env`, `docker compose up`, nginx, TLS cert
5. **Deploy GPU vectorizer** — clone repo, build image (downloads BGE-M3 ~1 GB), then **stop** the GPU instance so `monitor.py` can manage it on-demand
6. **Summary** — prints the Elastic IP and DNS instructions

After it finishes, point your DNS:
```
teleoscope.ca  A  <Elastic IP printed in summary>
```

---

## Day-to-day operations

### Push new code to production

```bash
ansible-playbook -i ansible/vars/inventory.yaml ansible/deploy-update.yaml
```

Pulls `main`, rebuilds changed containers, waits for health check.

### Re-provision main stack only (e.g. after `.env` change)

```bash
ansible-playbook -i ansible/vars/inventory.yaml ansible/deploy-main.yaml
```

### Re-provision GPU vectorizer (e.g. after model or code change)

```bash
ansible-playbook -i ansible/vars/inventory.yaml ansible/deploy-vectorizer.yaml
```

Rebuilds the image and stops the instance — `monitor.py` takes over.

### Provision infrastructure only

```bash
ansible-playbook ansible/provision-aws.yaml
```

Writes instance IDs and IPs to `ansible/vars/infra-outputs.yaml`.

---

## Architecture

```
Your laptop
    └── ansible-playbook site.yaml
            │
            ├── Play 1: localhost → AWS API (boto3)
            │     Creates: security groups, IAM role, main EC2, GPU EC2, Elastic IP
            │
            ├── Play 2–3: both EC2s
            │     Installs Docker CE + Compose plugin
            │
            ├── Play 4: main EC2
            │     Runs: app, worker-tasks, dispatch, worker-graph,
            │            uploader, files, MongoDB, RabbitMQ, monitor
            │     TLS: nginx + Let's Encrypt (certbot --nginx)
            │
            └── Play 5: GPU EC2 → then stopped
                  Runs: vectorizer (BGEM3 embeddings, VECTORIZER_ALWAYS_ON=1)
                  Controlled by: monitor.py on main EC2 (starts/stops on-demand)
```

**On-demand GPU vectorizer flow:**
- Queue `teleoscope-vectorize` gets messages → `monitor.py` starts the GPU EC2
- GPU EC2 boots → Docker daemon auto-starts the vectorizer container (already built)
- Queue drains + idle for `VECTORIZER_IDLE_STOP_MINUTES` (default 10 min) → `monitor.py` stops the GPU EC2
- Cold start: ~2–3 min (EC2 boot), then immediate consume (model pre-loaded at build time)

---

## Inventory

`site.yaml` builds a dynamic in-memory inventory during provisioning — no inventory file needed for a first run.

After provisioning, `ansible/vars/infra-outputs.yaml` is written with all IPs and instance IDs. Fill in `ansible/vars/inventory.yaml` from those values for subsequent standalone playbooks.

---

## Legacy: PM2 path

The original PM2-based playbooks (`newteleoscope.yaml`, `mongodb.yaml`, `rabbitmq.yaml`, etc.) remain in this directory for reference. They target the `newmachines` host group and use `vars/vars.yaml`. The Docker path (`site.yaml`) is the recommended approach.
