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

# Node.js 22 (frontend build)
if ! command -v npm >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
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
