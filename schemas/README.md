# Schemas directory guide

Source schema definitions used to generate app/backend type artifacts.

## Workflow

1. Edit schema definitions in this directory.
2. Regenerate frontend schema artifacts:
   - `cd teleoscope.ca`
   - `python loadschemas.py` (or `pnpm schema`)

Generated frontend outputs are written under `teleoscope.ca/src/schemas/` and `teleoscope.ca/src/types/`.
