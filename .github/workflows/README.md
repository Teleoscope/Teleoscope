# CI workflows guide

This directory contains GitHub Actions workflows for Teleoscope.

## Core workflows

- `test-suite.yml`: fast merge-gate checks (backend unit + frontend smoke).
- `test.playwright.yml`: UI system checks split into:
  - `ui-core-e2e` on push/PR
  - `ui-vectorization-full-e2e` on schedule/manual dispatch

## Why this split exists

Full 1000-document vectorization UI tests are expensive and can exceed practical PR time budgets.  
The split keeps pull-request checks stable while preserving full vectorization coverage in scheduled/manual runs.

## Contributor note

When changing test jobs, update:

- `TESTING.md`
- `AGENTS.md`
- `.cursor/skills/cloud-agent-starter/SKILL.md`
