# CI workflows guide

This directory contains GitHub Actions workflows for Teleoscope.

## Core workflows

- `test-suite.yml`: fast merge-gate checks (backend unit + frontend smoke).
- `test.playwright.yml`: UI system checks split into:
  - `ui-core-e2e` on push/PR
  - `ui-vectorization-full-e2e` on schedule/manual dispatch (runs 10-doc + 100-doc vectorization passes)

## Why this split exists

The split keeps pull-request checks stable while preserving scheduled/manual vectorization coverage with bounded runtime (10-doc smoke + 100-doc medium run).

## Contributor note

When changing test jobs, update:

- `TESTING.md`
- `AGENTS.md`
- `.cursor/skills/cloud-agent-starter/SKILL.md`
