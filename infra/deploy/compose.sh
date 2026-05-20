#!/usr/bin/env bash
# Use docker-compose (v1) or docker compose (v2 plugin), whichever exists.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if docker compose version &>/dev/null 2>&1; then
  exec docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml "$@"
fi

if command -v docker-compose &>/dev/null; then
  exec docker-compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml "$@"
fi

echo "Neither 'docker compose' nor 'docker-compose' found. Install one of:" >&2
echo "  apt install docker-compose-plugin   # docker compose" >&2
echo "  apt install docker-compose          # docker-compose" >&2
exit 1
