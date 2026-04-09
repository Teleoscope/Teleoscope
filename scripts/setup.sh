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
  # printf -v is safe against command injection (no eval)
  printf -v "$var" '%s' "$value"
}

gen() { python3 -c "import secrets; print(secrets.token_hex(32))"; }

# Produce a YAML double-quoted scalar that safely wraps the argument.
# Handles backslashes, double-quotes, and newlines correctly.
yaml_val() {
  python3 -c "
import sys
v = sys.argv[1]
safe = v.replace('\\\\', '\\\\\\\\').replace('\"', '\\\\\"').replace('\\n', '\\\\n').replace('\\r', '\\\\r')
print('\"' + safe + '\"')
" "$1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VARS_FILE="$REPO_ROOT/ansible/vars/vars.yaml"

# ── ensure pip --user bin is on PATH (macOS: ~/Library/Python/3.x/bin) ──────
PY_USER_BIN="$(python3 -m site --user-base 2>/dev/null)/bin"
export PATH="$PY_USER_BIN:$HOME/.local/bin:$PATH"

# ── banner ──────────────────────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       Teleoscope — deployment setup      ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${RESET}"
echo "  Writes ansible/vars/vars.yaml, then optionally"
echo "  runs: ansible-playbook ansible/site.yaml"
echo ""

# ── existing deployment fast-path ────────────────────────────────────────────
INFRA_FILE="$REPO_ROOT/ansible/vars/infra-outputs.yaml"

if [[ -f "$VARS_FILE" && -f "$INFRA_FILE" ]]; then
  # ── Parse key values from infra-outputs.yaml ──────────────────────────────
  # Use a heredoc so bash never touches the Python source — no quoting issues.
  _get_yaml() {
    python3 - "$1" "$2" 2>/dev/null <<'PYEOF' || true
import sys, re
key = sys.argv[1]
for line in open(sys.argv[2]):
    m = re.match(r'^' + re.escape(key) + r""":\s*["']?([^"'\n]+)["']?\s*$""", line)
    if m:
        print(m.group(1).strip())
        sys.exit(0)
print('')
PYEOF
  }

  EIP="$(_get_yaml ec2_main_public_ip "$INFRA_FILE")"          || true
  WORKER_ID="$(_get_yaml ec2_worker_instance "$INFRA_FILE")"   || true
  GPU_ID="$(_get_yaml ec2_vectorize_instance "$INFRA_FILE")"   || true
  AWS_REGION_LOCAL="$(_get_yaml aws_region "$VARS_FILE")"      || true
  DOMAIN_LOCAL="$(python3 - "$VARS_FILE" 2>/dev/null <<'PYEOF' || true
import re, sys
for line in open(sys.argv[1]):
    m = re.search(r'ca:\s*(\S+)', line)
    if m:
        print(m.group(1))
        sys.exit(0)
print('')
PYEOF
)"

  header "Current deployment status"

  # ── Quick connectivity probes (non-blocking, short timeouts) ──────────────
  _port_check() {
    # _port_check host port label
    local host="$1" port="$2" label="$3"
    if python3 -c "
import socket, sys
try:
    socket.create_connection(('$host', $port), timeout=3); sys.exit(0)
except: sys.exit(1)
" 2>/dev/null; then
      success "$label  ${DIM}(${host}:${port})${RESET}"
      echo "ok"
    else
      warn "$label  ${DIM}(${host}:${port} — no response)${RESET}"
      echo "down"
    fi
  }

  _http_status() {
    # Returns HTTP status code or "down"
    local url="$1"
    curl -sko /dev/null --max-time 4 -w "%{http_code}" "$url" 2>/dev/null || echo "down"
  }

  echo -e "  ${DIM}Elastic IP: ${EIP:-unknown}${RESET}"
  echo ""

  if [[ -n "$EIP" ]]; then
    APP_TCP="$(_port_check "$EIP" 3000 "App  (port 3000)"     2>/dev/null | tail -1)"
    HTTP_CODE="$(_http_status "http://${EIP}" 2>/dev/null)"
    HTTPS_CODE="$(_http_status "https://${DOMAIN_LOCAL:-$EIP}" 2>/dev/null)"

    if [[ "$HTTP_CODE" =~ ^[0-9]+$ && "$HTTP_CODE" != "000" ]]; then
      success "HTTP   (port 80)    → HTTP $HTTP_CODE"
    else
      warn    "HTTP   (port 80)    → no response"
    fi

    if [[ "$HTTPS_CODE" =~ ^[0-9]+$ && "$HTTPS_CODE" != "000" ]]; then
      success "HTTPS  (port 443)   → HTTP $HTTPS_CODE"
    else
      warn    "HTTPS  (port 443)   → not configured (run setup-tls.yaml after DNS)"
    fi
  else
    warn "No Elastic IP found in infra-outputs.yaml"
  fi

  # ── EC2 instance states (via AWS API) ─────────────────────────────────────
  echo ""
  if command -v aws &>/dev/null && [[ -n "$WORKER_ID" ]]; then
    _ec2_state() {
      aws ec2 describe-instances \
        --instance-ids "$1" \
        --region "${AWS_REGION_LOCAL:-ca-central-1}" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text 2>/dev/null || echo "unknown"
    }
    WORKER_STATE="$(_ec2_state "$WORKER_ID")"
    GPU_STATE="$(_ec2_state "$GPU_ID")"

    # Colour by state
    _state_color() {
      case "$1" in
        running)  echo -e "${GREEN}$1${RESET}" ;;
        stopped)  echo -e "${DIM}$1${RESET}" ;;
        *)        echo -e "${YELLOW}$1${RESET}" ;;
      esac
    }

    printf "  %-28s %s\n" "Worker EC2 ($WORKER_ID):" "$(_state_color "$WORKER_STATE")"
    printf "  %-28s %s\n" "GPU EC2    ($GPU_ID):"    "$(_state_color "$GPU_STATE")"
  fi

  # ── SSH check to main EC2 for container health ─────────────────────────────
  SSH_KEY_LOCAL="$(python3 - "$VARS_FILE" 2>/dev/null <<'PYEOF' || true
import re, sys
for line in open(sys.argv[1]):
    m = re.match(r"""ssh_private_key_file:\s*["']?([^"'\n]+)""", line)
    if m:
        print(m.group(1).strip())
        sys.exit(0)
PYEOF
)"
  SSH_KEY_LOCAL="${SSH_KEY_LOCAL/#\~/$HOME}"

  if [[ -n "$EIP" && -f "$SSH_KEY_LOCAL" ]]; then
    echo ""
    CONTAINER_STATUS="$(ssh -i "$SSH_KEY_LOCAL" \
      -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      -o IdentitiesOnly=yes -o ConnectTimeout=5 -o BatchMode=yes \
      "ubuntu@${EIP}" \
      "docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep -v '^$'" 2>/dev/null || true)"

    if [[ -n "$CONTAINER_STATUS" ]]; then
      echo -e "  ${DIM}Containers:${RESET}"
      while IFS= read -r line; do
        NAME="${line%% *}"
        STATUS="${line#* }"
        if echo "$STATUS" | grep -q "(healthy)"; then
          success "  $NAME  ${DIM}($STATUS)${RESET}"
        elif echo "$STATUS" | grep -q "(unhealthy)"; then
          warn    "  $NAME  ${RED}($STATUS)${RESET}"
        else
          echo -e "    ${DIM}$NAME  ($STATUS)${RESET}"
        fi
      done <<< "$CONTAINER_STATUS"
    else
      warn "Could not reach main EC2 for container status (SSH timeout or no key)"
    fi
  fi

  # ── TLS status ─────────────────────────────────────────────────────────────
  INVENTORY="$REPO_ROOT/ansible/vars/inventory.yaml"
  TLS_NOTE=""
  if [[ "$HTTPS_CODE" == "000" || -z "$HTTPS_CODE" || "$HTTPS_CODE" == "down" ]]; then
    TLS_NOTE="${YELLOW}  TLS not configured — after DNS propagates run:${RESET}\n    ansible-playbook -i ansible/vars/inventory.yaml ansible/setup-tls.yaml"
  fi

  # ── Action menu ────────────────────────────────────────────────────────────
  echo ""
  echo "  ─────────────────────────────────────────────"
  echo -e "  ${BOLD}What would you like to do?${RESET}"
  echo ""
  echo "   [h]  Health check — full status report (check-health.yaml)"
  echo "   [u]  Update — pull latest code + restart changed containers"
  echo "   [f]  Full redeploy — re-run site.yaml (skips AWS provisioning)"
  echo "   [p]  Full redeploy WITH re-provisioning (recreates EC2s)"
  echo "   [t]  TLS setup — run setup-tls.yaml (after DNS is pointed)"
  echo "   [q]  Quit"
  echo ""
  echo -en "  Choice [h/u/f/p/t/q]: "; read -r choice

  cd "$REPO_ROOT"
  case "${choice:-h}" in
    h|H)
      echo ""
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
        -i ansible/vars/inventory.yaml ansible/check-health.yaml
      ;;
    u|U)
      echo ""
      echo -e "  ${DIM}Pulling latest code and restarting changed containers…${RESET}"
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
        -i ansible/vars/inventory.yaml ansible/deploy-update.yaml
      ;;
    f|F)
      echo ""
      echo -e "  ${DIM}Running site.yaml (skipping AWS provisioning)…${RESET}"
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
        ansible/site.yaml --skip-tags provision
      ;;
    p|P)
      echo ""
      warn "This will re-provision EC2s — existing instances will be replaced."
      echo -en "  Are you sure? [y/N]: "; read -r confirm
      [[ "${confirm:-N}" =~ ^[Yy] ]] || { echo "  Aborted."; exit 0; }
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook ansible/site.yaml
      ;;
    t|T)
      echo ""
      echo -e "  ${DIM}Running setup-tls.yaml — DNS must already point to ${EIP}…${RESET}"
      ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook \
        -i ansible/vars/inventory.yaml ansible/setup-tls.yaml
      ;;
    q|Q|"")
      echo "  Bye."
      ;;
    *)
      echo "  Unknown choice '$choice'. Run setup.sh again and pick h/u/f/p/t/q."
      ;;
  esac
  echo ""
  exit 0
fi

# vars.yaml exists but no infra-outputs yet — original single-question fast-path
if [[ -f "$VARS_FILE" ]]; then
  echo -e "  ${GREEN}Found existing ansible/vars/vars.yaml${RESET}"
  echo -en "  Re-use it and run deployment? [Y/n]: "; read -r reuse
  if [[ "${reuse:-Y}" =~ ^[Yy] ]]; then
    cd "$REPO_ROOT"
    echo ""
    ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook ansible/site.yaml
    echo ""
    exit 0
  fi
  echo ""
fi

# ── prerequisites ────────────────────────────────────────────────────────────
header "Checking prerequisites"

# Hard blockers — cannot auto-install
command -v python3 &>/dev/null \
  && success "python3" \
  || die "python3 is required. Install from https://python.org"

command -v aws &>/dev/null \
  && success "aws CLI" \
  || die "aws CLI not found. Install: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"

# Pip-installable tools — collect missing ones, then offer a single install
PIP_NEEDED=()
command -v ansible &>/dev/null \
  && success "ansible" \
  || { warn "ansible not found"; PIP_NEEDED+=(ansible); }
python3 -c "import boto3" 2>/dev/null \
  && success "boto3" \
  || { warn "boto3 not found"; PIP_NEEDED+=(boto3); }

if [[ ${#PIP_NEEDED[@]} -gt 0 ]]; then
  echo ""
  echo -e "  ${YELLOW}Missing:${RESET} ${PIP_NEEDED[*]}"
  echo -en "  Install via pip? [Y/n]: "; read -r yn
  if [[ "${yn:-Y}" =~ ^[Yy] ]]; then
    python3 -m pip install --user "${PIP_NEEDED[@]}"
    # pip --user bin dir is platform-specific: ~/Library/Python/3.x/bin on macOS,
    # ~/.local/bin on Linux. Ask Python itself where it put them.
    PY_USER_BIN="$(python3 -m site --user-base)/bin"
    export PATH="$PY_USER_BIN:$HOME/.local/bin:$PATH"
    # Persist to shell profile so ansible is found in future sessions.
    if [[ "$SHELL" == *zsh* ]]; then  SHELL_RC="$HOME/.zshrc"
    elif [[ "$SHELL" == *bash* ]]; then SHELL_RC="$HOME/.bash_profile"
    else SHELL_RC=""; fi
    if [[ -n "$SHELL_RC" ]] && ! grep -qF "$PY_USER_BIN" "$SHELL_RC" 2>/dev/null; then
      printf '\n# Added by Teleoscope setup.sh\nexport PATH="%s:$PATH"\n' "$PY_USER_BIN" >> "$SHELL_RC"
      warn "Added $PY_USER_BIN to $SHELL_RC — run: source $SHELL_RC to persist in this shell"
    fi
    echo ""
    for item in "${PIP_NEEDED[@]}"; do
      case "$item" in
        ansible) command -v ansible &>/dev/null \
                   && success "ansible installed" \
                   || die "ansible install failed — run: pip3 install ansible" ;;
        boto3)   python3 -c "import boto3" 2>/dev/null \
                   && success "boto3 installed" \
                   || die "boto3 install failed — run: pip3 install boto3" ;;
      esac
    done
  else
    die "Cannot continue without: ${PIP_NEEDED[*]}"
  fi
fi

# ansible-galaxy collection (requires ansible, so checked after pip installs)
if ansible-galaxy collection list 2>/dev/null | grep -q "amazon\.aws"; then
  success "amazon.aws collection"
else
  warn "amazon.aws collection missing"
  echo -en "  Install now? [Y/n]: "; read -r yn
  [[ "${yn:-Y}" =~ ^[Yy] ]] \
    && ansible-galaxy collection install -r "$REPO_ROOT/ansible/requirements.yaml" \
    && success "amazon.aws collection installed" \
    || die "Run: ansible-galaxy collection install -r ansible/requirements.yaml"
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

# Verify the key pair exists in AWS before proceeding
if aws ec2 describe-key-pairs --key-names "$AWS_KEY_PAIR" --region "$AWS_REGION" &>/dev/null; then
  success "Key pair '$AWS_KEY_PAIR' found in $AWS_REGION"
else
  warn "Key pair '$AWS_KEY_PAIR' not found in $AWS_REGION — verify the name and region."
  echo -en "  Continue anyway? [y/N]: "; read -r yn
  [[ "${yn:-N}" =~ ^[Yy] ]] || die "Fix the key pair name and try again."
fi

ask SSH_KEY_FILE "Path to .pem file"   "~/.ssh/${AWS_KEY_PAIR}.pem"
SSH_KEY_FILE="${SSH_KEY_FILE/#\~/$HOME}"
if [[ -f "$SSH_KEY_FILE" ]]; then
  # Check permissions: must be 0400 or 0600 or SSH will refuse to use it
  if [[ "$(uname)" == "Darwin" ]]; then
    PERM="$(stat -f "%OLp" "$SSH_KEY_FILE")"
  else
    PERM="$(stat -c "%a" "$SSH_KEY_FILE")"
  fi
  if [[ "$PERM" == "400" || "$PERM" == "600" ]]; then
    success "SSH key found (permissions: $PERM)"
  else
    warn "SSH key permissions are $PERM — fixing to 400 (required by SSH)"
    chmod 400 "$SSH_KEY_FILE"
    success "SSH key permissions fixed to 400"
  fi
else
  warn "Key file not found at $SSH_KEY_FILE — ensure it exists before deploying."
fi

MY_IP="$(curl -sf --max-time 3 https://checkip.amazonaws.com 2>/dev/null || true)"
[[ -n "$MY_IP" ]] \
  && ask SSH_CIDR "SSH allowed CIDR (your IP: ${MY_IP})" "${MY_IP}/32" \
  || ask SSH_CIDR "SSH allowed CIDR" "0.0.0.0/0"

# Validate CIDR format: x.x.x.x/n
if ! [[ "$SSH_CIDR" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
  die "Invalid CIDR format '$SSH_CIDR'. Example: 203.0.113.1/32 or 0.0.0.0/0"
fi

# ── domain ───────────────────────────────────────────────────────────────────
header "Domain & TLS"

ask DOMAIN        "Domain name"                   "teleoscope.ca"
ask CERTBOT_EMAIL "Email for Let's Encrypt"        ""

# Validate domain: no spaces, has at least one dot, no leading/trailing dots
if [[ "$DOMAIN" =~ [[:space:]] ]] || [[ "$DOMAIN" != *.* ]] || [[ "$DOMAIN" == .* ]] || [[ "$DOMAIN" == *. ]]; then
  die "Invalid domain '$DOMAIN'. Example: teleoscope.ca"
fi

[[ -z "$CERTBOT_EMAIL" ]] && die "Certbot email is required."
# Validate email: must have @ with content before and after
if ! [[ "$CERTBOT_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]]; then
  die "Invalid email '$CERTBOT_EMAIL'. Example: admin@teleoscope.ca"
fi

# ── instances ────────────────────────────────────────────────────────────────
header "EC2 instances"
echo -e "  ${DIM}Approximate monthly costs (on-demand, ca-central-1):${RESET}"
echo -e "  ${DIM}  t3.large   (\$60/mo)  — main: app + MongoDB + RabbitMQ + nginx (always on)${RESET}"
echo -e "  ${DIM}  m6i.large  (\$87/mo)  — worker: Python workers (on-demand, billed by the hour)${RESET}"
echo -e "  ${DIM}  g5.xlarge  (\$1.006/hr) — GPU: BGE-M3 vectorizer (on-demand, started by monitor.py)${RESET}"
echo ""

ask MAIN_TYPE    "Main instance type"          "t3.large"
ask WORKER_TYPE  "Worker instance type"        "m6i.large"
ask GPU_TYPE     "GPU instance type"           "g5.xlarge"
ask MAIN_VOL     "Main EBS volume (GB)"        "80"
ask WORKER_VOL   "Worker EBS volume (GB)"      "60"
ask GPU_VOL      "GPU EBS volume (GB)"         "60"
ask WORKER_STOP  "Worker idle stop (minutes)"  "10"
ask IDLE_STOP    "GPU idle stop (minutes)"     "10"

# Validate volume sizes are integers
for _v in "$MAIN_VOL" "$WORKER_VOL" "$GPU_VOL"; do
  [[ "$_v" =~ ^[0-9]+$ ]] || die "Volume size must be an integer (got: $_v)"
done
# Validate instance types have no spaces
for _t in "$MAIN_TYPE" "$WORKER_TYPE" "$GPU_TYPE"; do
  [[ "$_t" =~ [[:space:]] ]] && die "Instance type cannot contain spaces (got: $_t)"
done

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
printf "  %-26s %s\n" "Main instance:"   "$MAIN_TYPE  (${MAIN_VOL} GB, always on ~\$60/mo)"
printf "  %-26s %s\n" "Worker instance:" "$WORKER_TYPE  (${WORKER_VOL} GB, idle stop: ${WORKER_STOP} min)"
printf "  %-26s %s\n" "GPU instance:"    "$GPU_TYPE  (${GPU_VOL} GB, idle stop: ${IDLE_STOP} min)"
printf "  %-26s %s\n" "Zilliz URI:"      "$ZILLIZ_URI"
echo ""
echo -e "  ${YELLOW}${BOLD}Generated secrets (save these — you'll need them if vars.yaml is lost):${RESET}"
printf "  %-26s %s\n" "MongoDB admin password:"  "$MONGO_ADMIN_PASS"
printf "  %-26s %s\n" "MongoDB app password:"    "$MONGO_PASS"
printf "  %-26s %s\n" "RabbitMQ password:"       "$RABBITMQ_PASS"
printf "  %-26s %s\n" "NextAuth secret:"         "$NEXTAUTH_SECRET"
printf "  %-26s %s\n" "Vectorizer token:"        "$VEC_TOKEN"
echo "  ─────────────────────────────────────────────"
echo ""
echo -en "  Write ansible/vars/vars.yaml? [Y/n]: "
read -r yn; [[ "${yn:-Y}" =~ ^[Nn] ]] && { echo "Aborted."; exit 0; }

# ── write vars.yaml ───────────────────────────────────────────────────────────
mkdir -p "$REPO_ROOT/ansible/vars"

cat > "$VARS_FILE" <<YAML
# ansible/vars/vars.yaml — generated by scripts/setup.sh
# Do NOT commit this file (it is gitignored).
# To encrypt: ansible-vault encrypt ansible/vars/vars.yaml
# To edit encrypted: ansible-vault edit ansible/vars/vars.yaml

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

milvus_uri: $(yaml_val "$ZILLIZ_URI")
milvus_token: $(yaml_val "$ZILLIZ_TOKEN")
milvus_dbname: ${MILVUS_DB}

vectorizer_control_token: "${VEC_TOKEN}"
YAML

# Append optional integrations using YAML-safe quoting (handles special chars)
[[ -n "$LOOPS_API_KEY"  ]] && printf 'loops_api_key: %s\n'     "$(yaml_val "$LOOPS_API_KEY")"  >> "$VARS_FILE"
[[ -n "$STRIPE_SECRET"  ]] && printf 'stripe_secret_key: %s\n' "$(yaml_val "$STRIPE_SECRET")"  >> "$VARS_FILE"

success "Wrote ansible/vars/vars.yaml"

# ── deploy ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}  Ready to deploy${RESET}"
echo ""
echo "  ansible-playbook ansible/site.yaml will:"
echo "    1. Provision 3 EC2s (main/worker/GPU), security groups, IAM role, Elastic IP"
echo "    2. Install Docker on all 3 instances"
echo "    3. Start main stack (app + MongoDB + RabbitMQ) + nginx"
echo "    4. Build worker image; stop worker EC2 (monitor.py starts on demand)"
echo "    5. Build GPU image + BGE-M3 (~1 GB); stop GPU EC2 (monitor.py starts on demand)"
echo ""
echo "  Estimated time: 15–20 minutes."
echo "  Full log written to: ./ansible-deploy.log"
echo ""
echo -en "  Deploy now? [Y/n]: "; read -r yn

if [[ "${yn:-Y}" =~ ^[Yy] ]]; then
  cd "$REPO_ROOT"
  ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook ansible/site.yaml
  echo ""
  echo -e "${GREEN}${BOLD}  Deployment complete!${RESET}"
  echo "  Point your DNS A record to the Elastic IP shown above, then run:"
  echo "    ansible-playbook -i ansible/vars/inventory.yaml ansible/setup-tls.yaml"
else
  echo ""
  echo -e "  ${BOLD}To deploy later:${RESET}"
  echo "    ansible-playbook ansible/site.yaml"
fi
echo ""
