# Backend directory guide

This directory contains the active Python backend runtime for Teleoscope.

## Main areas

- `tasks.py`: Celery tasks for ingestion, updates, and processing.
- `dispatch.py`: RabbitMQ dispatch consumer.
- `graph.py`: graph operations and rank/set processing.
- `vectorizer.py`: embedding generation worker.
- `uploader.py`: vector upload to Milvus.
- `embeddings.py`: Milvus connection helpers and embedding utilities.
- `archive/`: historical scripts (not production runtime paths).

## Contributor notes

- Keep new production logic in active modules above.
- Do not place new production behavior in `archive/`.
- See root `TESTING.md` for backend test commands.
