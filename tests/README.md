# Tests directory guide

This directory contains Python test suites for backend and pipeline behavior.

## Layout

- `test_*.py` in root: backend unit/integration checks.
- `e2e/`: end-to-end pipeline tests (upload -> vectorize -> rank/search).
- `fixtures/`: CSV data used by tests and seed scripts.

## Run references

- Fast backend suite: `PYTHONPATH=. python -m pytest tests/ -m "not integration and not e2e" -v`
- Integration: `PYTHONPATH=. python -m pytest tests/ -m integration -v`
- Pipeline e2e: `PYTHONPATH=. python -m pytest tests/e2e/ -m e2e -v`

See root `TESTING.md` for complete test matrix and CI behavior.
