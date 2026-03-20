# Docs directory guide

Supporting project documentation and focused runbooks live here.

## Current docs

- `testing-without-docker.md`: local testing approach when Docker is unavailable.
- Milvus debugging: `../scripts/milvus-status.py` (collections, partitions, row counts, optional `describe_collection`); demo + Mongo alignment: `../scripts/demo-status.sh`.
- `ec2-install.md`: install Teleoscope on **AWS EC2** with Docker Compose (security group notes, sizing, HTTPS).
- `zilliz-migration.md`: export Docker Milvus → **Zilliz Cloud**, env vars, Compose notes.

Ansible VM deployment: see `../ansible/README.md` (repo root `ansible/README.md`).

For main entrypoint documentation, start with:

- root `README.md` (install/deploy overview)
- root `TESTING.md` (test matrix and CI)
