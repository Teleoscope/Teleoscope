# `backend/archive` (historical code)

This folder contains legacy and experimental backend scripts from earlier architectures.

## Usage expectations

- Not part of the active production runtime.
- Not part of the default test or CI paths.
- Keep files for reference unless a specific cleanup/migration task says otherwise.

For active backend work, use modules in `backend/` root (for example `tasks.py`, `graph.py`, `vectorizer.py`, `uploader.py`).
