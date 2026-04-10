# Install Credential Flow Investigation

This document traces how passwords and secrets move through the current supported AWS install path:

`scripts/setup.sh` -> `ansible/*.yaml` + `ansible/.env*.j2` -> `docker-compose*.yml` -> service bootstrap/runtime code.

It is intentionally scoped to the current supported deployment flow and uses `scripts/setup.sh` as the canonical operator entrypoint.

## Canonical Flow

### 1. `scripts/setup.sh` creates the deploy-time source values

`scripts/setup.sh` collects operator inputs, generates secrets, and writes `ansible/vars/vars.yaml`.

Generated secrets:

- `mongodb_admin_password`
- `mongodb_dev_password`
- `rabbitmq_admin_password`
- `rabbitmq_dev_password`
- `nextauth_secret`
- `vectorizer_control_token`

External secrets collected from the operator:

- `milvus_uri`
- `milvus_token`
- optional OAuth / Loops / Stripe values

Notable details from the generated file:

- MongoDB app, public, and registrar passwords are all the same generated value.
- RabbitMQ admin, dev, and public passwords are all the same generated value.
- `mongodb_admin_name` is written as `admin`.
- RabbitMQ usernames are written as `teleoscope`.

### 2. Ansible renders `.env` files from `vars.yaml`

Current render paths:

- Main EC2: `ansible/.env.j2`
- Worker EC2: `ansible/.env.workers.j2`
- GPU/vectorizer EC2: `ansible/.env.vectorizer.j2`

Those templates are written by:

- `ansible/site.yaml`
- `ansible/deploy-main.yaml`
- `ansible/deploy-vectorizer.yaml`
- `ansible/deploy-update.yaml` for the main EC2 only

### 3. Docker Compose combines `.env`, `env_file`, and inline `environment:`

This is where several credential assumptions diverge. Some services consume the templated values from `.env`. Others override those values with hardcoded inline `environment:` entries.

### 4. Runtime code reads the container environment

Main consumers:

- MongoDB bootstrap: `docker/mongo-init.js`
- RabbitMQ bootstrap: `docker-compose.yml` `rabbitmq` service
- App MongoDB client: `teleoscope.ca/src/lib/mongodb.ts`
- App RabbitMQ client: `teleoscope.ca/src/lib/amqp.ts`
- Python workers/utilities: `backend/utils.py`, `backend/tasks.py`, `backend/graph.py`
- Milvus auth: `backend/milvus_auth.py`
- User password hashing/verification: `teleoscope.ca/src/lib/account.ts`, `teleoscope.ca/src/lib/auth.ts`

## Credential Inventory

| Credential | Origin | Templated into | Compose/runtime consumer | Lifecycle |
|---|---|---|---|---|
| MongoDB admin password | `scripts/setup.sh` -> `mongodb_admin_password` | main `.env` as `MONGODB_ADMIN_PASSWORD` | Mongo root bootstrap and health/admin commands | Bootstrap on first Mongo init; later reused for admin commands |
| MongoDB admin username | `scripts/setup.sh` -> `mongodb_admin_name` | not rendered into current Docker `.env` path | current Docker path uses username `admin` | Informational in the current Docker path; should match runtime docs and operator expectations |
| MongoDB app password | `scripts/setup.sh` -> `mongodb_dev_password` | main and worker `.env` as `MONGODB_PASSWORD` | app/workers Mongo clients, `docker/mongo-init.js` app-user creation | Bootstrap on first init plus some later reconciliation |
| RabbitMQ username/password | `scripts/setup.sh` -> `rabbitmq_*` | main, worker, vectorizer `.env` | broker bootstrap, monitor, worker EC2, vectorizer EC2, some main-stack clients | Broker bootstrap on first init; runtime elsewhere |
| NextAuth secret | `scripts/setup.sh` -> `nextauth_secret` | main `.env` | Next.js app auth/session handling | Runtime config |
| Milvus URI/token | operator input -> `milvus_uri`, `milvus_token` | main and worker `.env` | workers, health checks, seed/demo scripts | Runtime config |
| Vectorizer control token | `scripts/setup.sh` -> `vectorizer_control_token` | main and vectorizer `.env` | app proxy route and vectorizer control server | Runtime config |
| End-user passwords | supplied at signup | stored as `users.hashed_password` in MongoDB | `teleoscope.ca/src/lib/auth.ts` | Application data, never sourced from Ansible/Docker secrets |

## Findings

### 1. MongoDB admin username must stay aligned with the current Docker deployment

The supported setup flow now writes:

- `mongodb_admin_name: admin`

Current Docker bootstrap and operational checks consistently use:

- `MONGO_INITDB_ROOT_USERNAME: admin` in `docker-compose.yml`
- `mongosh -u admin ...` in `docker-compose.yml`, `ansible/site.yaml`, `ansible/deploy-update.yaml`, `ansible/check-health.yaml`, and `ansible/seed-demo.yaml`

Impact:

- The Docker runtime still uses `admin` directly.
- The supported `setup.sh` / example-vars path now matches that runtime behavior, so operators are less likely to try the wrong username in Compass, `mongosh`, or Ansible debugging.

Confidence: high

### 2. Main-stack RabbitMQ clients do not currently consume the same credentials that `setup.sh` generates

`scripts/setup.sh` generates RabbitMQ credentials and `ansible/.env.j2` writes them into `.env` as:

- `RABBITMQ_USERNAME={{ rabbitmq_dev_username }}`
- `RABBITMQ_PASSWORD={{ rabbitmq_dev_password }}`

The main broker also bootstraps from those same values:

- `RABBITMQ_DEFAULT_USER: ${RABBITMQ_USERNAME:-guest}`
- `RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-guest}`

But several main-stack services override the templated `.env` values with hardcoded inline credentials in `docker-compose.yml`:

- `app`
- `worker-tasks`
- `dispatch`
- `worker-graph`
- `vectorizer`
- `uploader`

Those services set:

- `RABBITMQ_USERNAME: guest`
- `RABBITMQ_PASSWORD: guest`

while the worker-only and vectorizer-only EC2 stacks correctly use `${RABBITMQ_USERNAME}` / `${RABBITMQ_PASSWORD}` from their rendered `.env` files.

Impact:

- The broker may be initialized with the `setup.sh`-generated `teleoscope` credentials while main-stack clients still attempt `guest`.
- The worker EC2 and vectorizer EC2 may be aligned with Ansible while the main EC2 app path is not.
- This is the clearest Ansible-intent vs Docker-runtime mismatch in the current supported path.

Likely symptom:

- Anything on the main EC2 that needs AMQP may fail authentication or silently fail to publish/consume, even when `vars.yaml` and `.env` look correct.

Confidence: high

### 3. MongoDB app password is only bootstrapped automatically on first volume creation

`docker/mongo-init.js` creates the `teleoscope` app user from `MONGODB_PASSWORD`, but that script runs only during initial MongoDB container initialization with a fresh data volume.

There are explicit repair steps later:

- `ansible/deploy-update.yaml` runs `updateUser(...)`
- `ansible/seed-demo.yaml` runs `updateUser(...)`

But there is no equivalent reconciliation step in:

- `ansible/site.yaml`
- `ansible/deploy-main.yaml`

Impact:

- Re-rendering `.env` does not guarantee the live MongoDB user password matches the new value.
- A rerun path that reuses the existing Mongo volume but does not execute the `updateUser(...)` repair can leave app/worker credentials drifted from the database.

Likely symptom:

- Mongo auth failures after a password change in `vars.yaml` or after regenerating secrets and reusing an existing deployment state.

Confidence: high

### 4. RabbitMQ has the same first-boot drift risk, but no reconciliation step

RabbitMQ bootstrap uses `RABBITMQ_DEFAULT_USER` / `RABBITMQ_DEFAULT_PASS` from Compose environment. Those values initialize the broker state when the data volume is first created.

Unlike MongoDB, there is no current Ansible repair step that reconciles RabbitMQ users/passwords after bootstrap.

Impact:

- Rewriting `.env` later does not by itself prove the live RabbitMQ credentials changed.
- Any credential rotation via `vars.yaml` depends on whether the live broker state is recreated, not just whether Ansible re-rendered the file.

Likely symptom:

- Worker/vectorizer/main app credentials can all look correct in files while the broker still expects an older password.

Confidence: medium-high

### 5. `deploy-update.yaml` keeps the main `.env` in sync, but not the worker or vectorizer `.env`

`deploy-update.yaml` rewrites the main EC2 `.env` before restart, but the worker and vectorizer update plays only pull code and rebuild Compose stacks. They do not render:

- `ansible/.env.workers.j2`
- `ansible/.env.vectorizer.j2`

Impact:

- If `vars.yaml` changes after the first install, the main EC2 may get new values while worker/vectorizer instances keep stale `.env` files.
- This is especially risky for shared RabbitMQ and MongoDB credentials.

Likely symptom:

- Main node health looks good while worker or vectorizer EC2s fail to reconnect after they are started later.

Confidence: high

### 6. `scripts/setup.sh` re-run compatibility depends on which downstream playbook path it triggers

`scripts/setup.sh` supports multiple current flows:

- fresh install -> `ansible/site.yaml`
- existing infra -> menu options including `deploy-update.yaml`, `site.yaml --skip-tags provision`, `seed-demo.yaml`, and TLS setup
- existing `vars.yaml` without `infra-outputs.yaml` -> `ansible/site.yaml`

Because the downstream playbooks do not all reconcile credentials the same way, the guarantees differ:

- `deploy-update.yaml` repairs Mongo app password on the main EC2
- `site.yaml` does not
- worker/vectorizer updates do not rewrite their `.env`
- RabbitMQ has no comparable repair step in any current update path

Impact:

- `setup.sh` is the canonical entrypoint, but the credential guarantees currently vary by menu path.

Confidence: high


## Mismatch Table

| Declared here | Runtime reality | Why it matters | Likely symptom |
|---|---|---|---|
| `mongodb_admin_name` in `vars.yaml` | current Docker path uses `admin` directly | this value should stay aligned with runtime and docs even if not wired through Compose | confusion during manual debugging and credential recovery if it drifts again |
| `rabbitmq_dev_username/password` in `vars.yaml` and main `.env` | several main-stack services override to `guest` | Ansible-generated broker creds and client creds can diverge | AMQP auth failures or failed background task dispatch |
| new `MONGODB_PASSWORD` in `.env` | Mongo app user may still have old password in persisted DB | bootstrap-only user creation | Mongo auth failures after secret changes |
| new `RABBITMQ_PASSWORD` in `.env` | live broker may still have old password in persisted state | bootstrap-only broker user creation | worker/app/vectorizer auth drift |
| changed `vars.yaml` after initial deploy | `deploy-update.yaml` rewrites only main `.env` | worker/vectorizer stacks can keep stale secrets | remote worker/vectorizer reconnect failures |

## Drift and Repair Matrix

| Component | First-run bootstrap | Re-rendered on update | Explicit repair step today |
|---|---|---|---|
| Mongo root user | yes | `.env` yes on main | no root-user repair found |
| Mongo app user | yes | main `.env` yes, worker `.env` depends on playbook | yes in `deploy-update.yaml` and `seed-demo.yaml` |
| RabbitMQ default user | yes | `.env` yes where rendered | no repair step found |
| Main EC2 `.env` | yes | yes in `deploy-update.yaml` and `deploy-main.yaml` | n/a |
| Worker EC2 `.env` | yes | not in `deploy-update.yaml` | no |
| Vectorizer EC2 `.env` | yes | not in `deploy-update.yaml` | no |

## Operator Guidance

### Passwords that affect service startup and inter-service connectivity

- MongoDB admin password
- MongoDB app password
- RabbitMQ username/password
- Milvus token
- vectorizer control token

These matter for container bootstrap, worker connectivity, seed scripts, health checks, and background processing.

### Passwords that affect deploy/update health

- MongoDB admin password for Ansible repair and health commands
- MongoDB app password for app/worker DB access
- RabbitMQ username/password for broker/client alignment
- Milvus token for health checks and demo seeding

### Passwords that affect app login

- End-user passwords stored in MongoDB as `hashed_password`

These are not the same as infrastructure secrets in `vars.yaml`.

## Safe Remediation Order

1. Make the current runtime contract explicit in docs.

- Document `scripts/setup.sh` as the source of deploy-time secrets.
- Document which credentials are bootstrap-only and which are runtime.
- Document that user sign-in passwords are separate from install secrets.

2. Remove or align misleading configurability.

- Keep `mongodb_admin_name` aligned with the Docker runtime username `admin`, or wire that variable through the Docker path end-to-end.
- Make RabbitMQ credential handling consistent across the main stack and worker/vectorizer stacks.

3. Add reconciliation where drift is currently possible.

- Add a RabbitMQ user/password reconciliation step comparable to the Mongo `updateUser(...)` repair.
- Ensure update paths that are reachable from `setup.sh` rewrite the worker and vectorizer `.env` files when shared credentials change.

4. Preserve `setup.sh` compatibility while tightening guarantees.

- Fresh install via `setup.sh` must still work without extra manual steps.
- Re-running `setup.sh` against an existing deployment should have documented credential guarantees per menu path.
- `deploy-update.yaml`, `deploy-main.yaml`, and `deploy-vectorizer.yaml` should converge on one shared credential-sync model.

## Open Questions Worth Validating Before Code Changes

- Whether the live production path expects the main EC2 app to publish to RabbitMQ continuously or only in specific user flows.
- Whether any current operations depend on the RabbitMQ `guest` user still being available even when `setup.sh` generated `teleoscope` credentials.
- Whether the desired behavior is credential rotation on `vars.yaml` change or strict immutability after first install unless an explicit rotate action is taken.

Those are implementation decisions. The mismatches above are observable from the current repo layout without assuming answers.
