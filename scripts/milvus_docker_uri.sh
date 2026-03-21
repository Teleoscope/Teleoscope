#!/usr/bin/env bash
# shellcheck shell=bash
# Host-side MILVUS_URI for seed/status scripts when Milvus runs in this repo's Docker Compose.
#
# Compose maps container 19530 -> host MILVUS_HOST_PORT (default 19530 in docker-compose.yml).
# When MILVUS_HOST_PORT=0, Docker picks a random host port — then we resolve it with compose.
#
# Source from repo root:
#   source "$REPO_ROOT/scripts/milvus_docker_uri.sh"
#   milvus_export_host_uri_from_compose

milvus_export_host_uri_from_compose() {
  local p="${MILVUS_HOST_PORT:-19530}"
  if [[ "$p" == "0" ]]; then
    p="$(docker compose port milvus 19530 2>/dev/null | cut -d: -f2)"
  fi
  export MILVUS_URI="http://localhost:${p:-19530}"
}
