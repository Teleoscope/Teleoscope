# Docs directory guide

Supporting project documentation and focused runbooks live here.

## Current docs

- `TESTING-WITHOUT-DOCKER.md`: local testing approach when Docker is unavailable.
- `EC2-INSTALL.md`: install Teleoscope on **AWS EC2** with Docker Compose (security group notes, sizing, HTTPS).
- `ZILLIZ-MIGRATION.md`: export Docker Milvus → **Zilliz Cloud**, env vars, Compose notes.

Ansible VM deployment: see `../ansible/README.md` (repo root `ansible/README.md`).

For main entrypoint documentation, start with:

- root `README.md` (install/deploy overview)
- root `TESTING.md` (test matrix and CI)
