#!/usr/bin/env bash
# One-time OS packages for /var/www/notcery (Ubuntu/Debian). Run as root on the server.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y \
  ca-certificates curl git \
  nginx certbot python3-certbot-nginx \
  python3 python3-venv python3-pip \
  docker.io docker-compose

# Node.js 20+ required (Vite/TypeScript use ?? and modern syntax in tooling)
need_node_upgrade() {
  if ! command -v node >/dev/null 2>&1; then
    return 0
  fi
  node -e 'const v=process.versions.node.split(".").map(Number); process.exit(v[0]<18?0:1)' 2>/dev/null
}

if need_node_upgrade; then
  echo "Installing Node.js 22 (current: $(node -v 2>/dev/null || echo none))"
  # Purge Ubuntu node 12.x (conflicts with NodeSource: libnode-dev, common.gypi, etc.)
  apt-get remove -y nodejs npm 2>/dev/null || true
  apt-get purge -y nodejs npm libnode-dev libnode72 nodejs-doc 2>/dev/null || true
  apt-get autoremove -y
  rm -f /etc/apt/sources.list.d/nodesource.list \
    /etc/apt/sources.list.d/nodesource.sources \
    /etc/apt/sources.list.d/nsolid.list 2>/dev/null || true
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get update
  apt-get install -y nodejs
fi

echo ""
echo "Installed versions:"
python3 --version
node --version
npm --version
nginx -v 2>&1 || true
docker-compose --version 2>&1 || true
echo ""
echo "Next: cd /var/www/notcery && ./infra/deploy/setup-app.sh"
