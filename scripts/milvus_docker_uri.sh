#!/usr/bin/env bash
# shellcheck shell=bash
# Resolve host-side MILVUS_URI when Milvus runs in Docker with a mapped port (possibly random).
# Source from repo root after `docker compose` defines the milvus service:
#   REPO_ROOT=...; # shellcheck source=scripts/milvus_docker_uri.sh
#   source "$REPO_ROOT/scripts/milvus_docker_uri.sh"
#   milvus_export_host_uri_from_compose

milvus_export_host_uri_from_compose() {
  local p
  p="$(docker compose port milvus 19530 2>/dev/null | cut -d: -f2)"
  export MILVUS_URI="http://localhost:${p:-19530}"
}
