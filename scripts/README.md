# Scripts directory guide

Operational and helper scripts for local setup, validation, and demos.

## Frequently used scripts

- `test-stack.sh`: quick stack connectivity check.
- `run-all-tests.sh`: aggregate test runner.
- `one-click-test.sh`: Docker stack + test flow.
- `one-click-test-no-docker.sh`: local non-Docker test flow.
- `start-local-stack.sh`: local service startup helper.
- `one-click-demo.sh`: one-command public demo bootstrap and verification.
- `load-test-demo.mjs`: demo API concurrency/load test helper.
- `seed-test-data.py`: test account/workspace seed script.

## Notes

- Keep scripts idempotent when possible.
- Add or update script docs in this file when introducing new scripts.
