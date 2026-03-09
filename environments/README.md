# Environments directory guide

This directory stores environment definitions for reproducible local dev setups.

## Files

- `environment.yml`: mamba/conda environment definition used by local setup docs.

## Usage

From repo root:

```bash
mamba env create -f environments/environment.yml
mamba activate teleoscope
```
