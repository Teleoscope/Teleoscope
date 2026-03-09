ARG BASE_IMAGE=node:22-bookworm
FROM ${BASE_IMAGE}

ENV DEBIAN_FRONTEND=noninteractive
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PATH="${PNPM_HOME}:${PATH}"

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable
RUN mkdir -p /pnpm/store && chmod 777 /pnpm/store
RUN pnpm config set store-dir /pnpm/store

WORKDIR /workspace/teleoscope.ca

# Copy lockfile + manifest first so dependency install stays cached unless deps change.
COPY teleoscope.ca/package.json teleoscope.ca/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Pre-install browser binary in the base image to avoid runtime downloads.
RUN pnpm exec playwright install --with-deps chromium
