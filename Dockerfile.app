# Teleoscope web app (teleoscope.ca)
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY teleoscope.ca/package.json ./teleoscope.ca/

# Install root deps (react-joyride)
RUN pnpm install --frozen-lockfile

# Install app deps
WORKDIR /app/teleoscope.ca
RUN pnpm install --frozen-lockfile

# Copy schemas and app source (schemas must be in parent for loadschemas.py)
COPY schemas /app/schemas
COPY teleoscope.ca ./

# Generate schemas (loadschemas.py expects ../schemas)
RUN apk add --no-cache python3 py3-pip && pip3 install pyyaml
RUN python3 loadschemas.py

# Build
ENV NODE_ENV=production
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
