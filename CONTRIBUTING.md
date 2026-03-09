# Contributing Guide (Repository Orientation)

This file is a quick map for contributors so edits land in the right place.

## Canonical code paths

- `teleoscope.ca/`: active frontend + Next.js API routes.
- `backend/`: active Python workers and vector pipeline.
- `tests/`: Python tests (unit/integration/e2e).
- `scripts/`: operational scripts (test stack, one-click demo, load checks).
- `.github/workflows/`: CI definitions.

## Legacy/historical paths

- `frontend/`: older frontend project; do not use for new feature work unless explicitly requested.
- `backend/archive/`: historical scripts and experiments; not production runtime paths.

## Before opening a PR

1. Prefer targeted tests for changed area (see `TESTING.md`).
2. Keep docs in sync when adding/removing commands.
3. If you add a new top-level script, document it in `scripts/README.md`.

## Where to start reading

- Product/run/install overview: `README.md`
- Testing commands and CI behavior: `TESTING.md`
- Cloud-agent runbook: `AGENTS.md`
