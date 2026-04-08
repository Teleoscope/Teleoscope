#!/usr/bin/env bash
# setup.sh — interactive first-time setup for Teleoscope on AWS.
#
# Checks prerequisites, collects the handful of values only you can know,
# auto-generates all passwords and secrets, writes ansible/vars/vars.yaml,
# and optionally runs the full deployment.
#
# Usage:
#   bash scripts/setup.sh

set -euo pipefail

# ── colours ────────────────────────────────────────────────────────────────
BOLD='\033[1m'; DIM='\033[2m'; CYAN='\033[1;36m'
GREEN='\033[1;32m'; YELLOW='\033[1;33m'; RED='\033[1;31m'; RESET='\033[0m'

header()  { echo -e "\n${CYAN}${BOLD}▶ $*${RESET}"; }
success() { echo -e "  ${GREEN}✓${RESET} $*"; }
warn()    { echo -e "  ${YELLOW}!${RESET} $*"; }
die()     { echo -e "${RED}✗ $*${RESET}" >&2; exit 1; }

ask() {
  # ask VAR "Prompt" "default"
  local var="$1" prompt="$2" default="${3:-}"
  local hint=""; [[ -n "$default" ]] && hint=" ${DIM}[$default]${RESET}"
  echo -en "  ${prompt}${hint}: "
  read -r value; value="${value:-$default}"
  eval "$var=\"\$value\""
}

gen() { python3 -c "import secrets; print(secrets.token_hex(32))"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VARS_FILE="$REPO_ROOT/ansible/vars/vars.yaml"

# ── banner ──────────────────────────────────────────────────────────────────
clear
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       Teleoscope — deployment setup      ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${RESET}"
echo "  Writes ansible/vars/vars.yaml, then optionally"
echo "  runs: ansible-playbook ansible/site.yaml"
echo ""

# ── prerequisites ────────────────────────────────────────────────────────────
header "Checking prerequisites"

check() {
  command -v "$1" &>/dev/null \
    && success "$1" \
    || die "$1 not found — $2"
}
check ansible  "pip install ansible"
check python3  "install Python 3"
check aws      "https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
python3 -c "import boto3" 2>/dev/null && success "boto3" || die "pip install boto3"

if ansible-galaxy collection list 2>/dev/null | grep -q "amazon\.aws"; then
  success "amazon.aws collection"
else
  warn "amazon.aws collection missing"
  echo -en "  Install now? [Y/n]: "; read -r yn
  [[ "${yn:-Y}" =~ ^[Yy] ]] \
    && ansible-galaxy collection install -r "$REPO_ROOT/ansible/requirements.yaml" \
    || warn "Run: ansible-galaxy collection install -r ansible/requirements.yaml"
fi

if aws sts get-caller-identity &>/dev/null; then
  ACCT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
  success "AWS credentials (account: $ACCT)"
else
  warn "AWS credentials not configured or expired."
  echo "  Set: export AWS_ACCESS_KEY_ID=...  AWS_SECRET_ACCESS_KEY=..."
  echo "  or:  export AWS_PROFILE=my-profile"
  echo -en "  Continue anyway? [y/N]: "; read -r yn
  [[ "${yn:-N}" =~ ^[Yy] ]] || exit 1
fi

# ── AWS ──────────────────────────────────────────────────────────────────────
header "AWS"

ask AWS_REGION   "Region"              "ca-central-1"
ask AWS_KEY_PAIR "EC2 key pair name"   ""
[[ -z "$AWS_KEY_PAIR" ]] && die "EC2 key pair name is required."
ask SSH_KEY_FILE "Path to .pem file"   "~/.ssh/${AWS_KEY_PAIR}.pem"
SSH_KEY_FILE="${SSH_KEY_FILE/#\~/$HOME}"
[[ -f "$SSH_KEY_FILE" ]] || warn "Key file not found — ensure it exists before deploying."

MY_IP="$(curl -sf --max-time 3 https://checkip.amazonaws.com 2>/dev/null || true)"
[[ -n "$MY_IP" ]] \
  && ask SSH_CIDR "SSH allowed CIDR (your IP: ${MY_IP})" "${MY_IP}/32" \
  || ask SSH_CIDR "SSH allowed CIDR" "0.0.0.0/0"

# ── domain ───────────────────────────────────────────────────────────────────
header "Domain & TLS"

ask DOMAIN        "Domain name"                   "teleoscope.ca"
ask CERTBOT_EMAIL "Email for Let's Encrypt"        ""
[[ -z "$CERTBOT_EMAIL" ]] && die "Certbot email is required."

# ── instances ────────────────────────────────────────────────────────────────
header "EC2 instances"
echo -e "  ${DIM}main:   app + MongoDB + RabbitMQ + nginx + monitor.py (always on, ~\$60/mo)${RESET}"
echo -e "  ${DIM}worker: Python workers — started by monitor.py when queues are non-empty${RESET}"
echo -e "  ${DIM}GPU:    BGE-M3 vectorizer — started by monitor.py when vectorize queue is non-empty${RESET}"
echo ""

ask MAIN_TYPE    "Main instance type"          "t3.large"
ask WORKER_TYPE  "Worker instance type"        "m6i.large"
ask GPU_TYPE     "GPU instance type"           "g5.xlarge"
ask MAIN_VOL     "Main EBS volume (GB)"        "80"
ask WORKER_VOL   "Worker EBS volume (GB)"      "60"
ask GPU_VOL      "GPU EBS volume (GB)"         "60"
ask WORKER_STOP  "Worker idle stop (minutes)"  "10"
ask IDLE_STOP    "GPU idle stop (minutes)"     "10"

# ── zilliz ───────────────────────────────────────────────────────────────────
header "Zilliz Cloud  (vector database — zilliz.com)"
echo -e "  ${DIM}Copy the endpoint and token from your cluster's Connect panel.${RESET}"
echo ""

ask ZILLIZ_URI  "Endpoint URI"   ""
[[ -z "$ZILLIZ_URI" ]] && die "Zilliz URI is required."
echo -en "  API token (hidden): "; read -rs ZILLIZ_TOKEN; echo
[[ -z "$ZILLIZ_TOKEN" ]] && die "Zilliz token is required."
ask MILVUS_DB   "Database name"  "teleoscope"

# ── optional integrations ─────────────────────────────────────────────────────
header "Optional integrations  (press Enter to skip)"
echo ""

ask GOOGLE_CLIENT_ID     "Google OAuth client ID"     ""
ask GOOGLE_CLIENT_SECRET "Google OAuth client secret" ""
ask LOOPS_API_KEY        "Loops API key"              ""
ask STRIPE_SECRET        "Stripe secret key"          ""

# ── generate all secrets ─────────────────────────────────────────────────────
header "Generating secrets"

MONGO_ADMIN_PASS="$(gen)"; success "MongoDB admin password"
MONGO_PASS="$(gen)";       success "MongoDB app password"
RABBITMQ_PASS="$(gen)";    success "RabbitMQ password"
NEXTAUTH_SECRET="$(gen)";  success "NextAuth secret"
VEC_TOKEN="$(gen)";        success "Vectorizer control token"

# ── summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}  Configuration summary${RESET}"
echo "  ─────────────────────────────────────────────"
printf "  %-26s %s\n" "Domain:"          "$DOMAIN"
printf "  %-26s %s\n" "AWS region:"      "$AWS_REGION"
printf "  %-26s %s\n" "Key pair:"        "$AWS_KEY_PAIR"
printf "  %-26s %s\n" "Main instance:"   "$MAIN_TYPE  (${MAIN_VOL} GB, always on)"
printf "  %-26s %s\n" "Worker instance:" "$WORKER_TYPE  (${WORKER_VOL} GB, idle stop: ${WORKER_STOP} min)"
printf "  %-26s %s\n" "GPU instance:"    "$GPU_TYPE  (${GPU_VOL} GB, idle stop: ${IDLE_STOP} min)"
printf "  %-26s %s\n" "Zilliz URI:"      "$ZILLIZ_URI"
printf "  %-26s %s\n" "All secrets:"     "auto-generated ✓"
echo "  ─────────────────────────────────────────────"
echo ""
echo -en "  Write ansible/vars/vars.yaml? [Y/n]: "
read -r yn; [[ "${yn:-Y}" =~ ^[Nn] ]] && { echo "Aborted."; exit 0; }

# ── write vars.yaml ───────────────────────────────────────────────────────────
mkdir -p "$REPO_ROOT/ansible/vars"

cat > "$VARS_FILE" <<YAML
# ansible/vars/vars.yaml — generated by scripts/setup.sh
# Do NOT commit this file (it is gitignored).

ansible_user: ubuntu
remote_prefix: /home
ssh_private_key_file: "${SSH_KEY_FILE}"
ssh_allowed_cidr: "${SSH_CIDR}"

teleoscope:
  ca: ${DOMAIN}

aws_region: ${AWS_REGION}
aws_key_pair: ${AWS_KEY_PAIR}
main_instance_type: ${MAIN_TYPE}
worker_instance_type: ${WORKER_TYPE}
gpu_instance_type: ${GPU_TYPE}
main_volume_size: ${MAIN_VOL}
worker_volume_size: ${WORKER_VOL}
vectorizer_volume_size: ${GPU_VOL}
worker_idle_stop_minutes: ${WORKER_STOP}
vectorizer_idle_stop_minutes: ${IDLE_STOP}

mongodb_admin_name: teleoscope_admin
mongodb_admin_password: "${MONGO_ADMIN_PASS}"
mongodb_dev_name: teleoscope
mongodb_dev_password: "${MONGO_PASS}"
mongodb_database: teleoscope
mongodb_public_user: teleoscope
mongodb_public_password: "${MONGO_PASS}"
mongodb_registrar_user: teleoscope
mongodb_registrar_password: "${MONGO_PASS}"

rabbitmq_vhost: /
rabbitmq_admin_username: teleoscope
rabbitmq_admin_password: "${RABBITMQ_PASS}"
rabbitmq_dev_username: teleoscope
rabbitmq_dev_password: "${RABBITMQ_PASS}"
rabbitmq_public_user: teleoscope
rabbitmq_public_password: "${RABBITMQ_PASS}"
rabbitmq_task_queue: teleoscope-tasks
rabbitmq_dispatch_queue: teleoscope-dispatch

nextauth_secret: "${NEXTAUTH_SECRET}"
google_client_id: "${GOOGLE_CLIENT_ID}"
google_client_secret: "${GOOGLE_CLIENT_SECRET}"

certbot_email: ${CERTBOT_EMAIL}

milvus_uri: "${ZILLIZ_URI}"
milvus_token: "${ZILLIZ_TOKEN}"
milvus_dbname: ${MILVUS_DB}

vectorizer_control_token: "${VEC_TOKEN}"
YAML

[[ -n "$LOOPS_API_KEY"  ]] && echo "loops_api_key: \"${LOOPS_API_KEY}\""     >> "$VARS_FILE"
[[ -n "$STRIPE_SECRET"  ]] && echo "stripe_secret_key: \"${STRIPE_SECRET}\"" >> "$VARS_FILE"

success "Wrote ansible/vars/vars.yaml"

# ── deploy ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}  Ready to deploy${RESET}"
echo ""
echo "  ansible-playbook ansible/site.yaml will:"
echo "    1. Provision 3 EC2s (main/worker/GPU), security groups, IAM role, Elastic IP"
echo "    2. Install Docker on all 3 instances"
echo "    3. Start main stack (app + MongoDB + RabbitMQ) + nginx + TLS"
echo "    4. Build worker image; stop worker EC2 (monitor.py starts on demand)"
echo "    5. Build GPU image + BGE-M3 (~1 GB); stop GPU EC2 (monitor.py starts on demand)"
echo ""
echo "  Estimated time: 10–15 minutes."
echo ""
echo -en "  Deploy now? [Y/n]: "; read -r yn

if [[ "${yn:-Y}" =~ ^[Yy] ]]; then
  cd "$REPO_ROOT"
  ansible-playbook ansible/site.yaml
  echo ""
  echo -e "${GREEN}${BOLD}  Deployment complete!${RESET}"
  echo "  Point your DNS A record to the Elastic IP shown above, then"
  echo "  https://${DOMAIN} will be live."
else
  echo ""
  echo -e "  ${BOLD}To deploy later:${RESET}"
  echo "    ansible-playbook ansible/site.yaml"
fi
echo ""
