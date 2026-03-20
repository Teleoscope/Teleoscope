# `teleoscope.ca` (active app)

This directory is the active Next.js application for Teleoscope.

## What is here

- `src/app/`: App Router pages and API routes.
- `src/components/`: UI components and workspace panels.
- `src/lib/`: frontend helpers and shared utilities.
- `tests/`: Playwright e2e tests.
- `vitest.config.ts`: modular/unit test configuration.

## Common local commands

```bash
pnpm install
pnpm schema
pnpm dev
```

```bash
pnpm lint
pnpm test:unit
pnpm exec playwright test --project=chromium
```

## Notes for contributors

- This is the canonical frontend path for active product work.
- Do not start new feature work in `frontend/` (repo root) unless a task explicitly requests legacy/migration changes.
- For full-stack setup and CI/testing expectations, read root `README.md` and `TESTING.md`.
