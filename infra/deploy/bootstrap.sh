#!/usr/bin/env bash
# One-time server setup for note.wrupup.com. Run ON THE SERVER (as root):
#   bash bootstrap.sh
# Or from laptop:
#   ssh notcery 'bash -s' < infra/deploy/bootstrap.sh

set -euo pipefail

APP_DIR=/var/www/notcery
REPO_URL="${NOTCERY_REPO_URL:-https://github.com/mrkkyatilla/notcery.git}"

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl git nginx certbot python3-certbot-nginx \
    python3.12 python3.12-venv python3-pip

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION_ID}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
fi

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" pull --ff-only || true
fi

if [[ ! -f "$APP_DIR/.env" ]]; then
  cp "$APP_DIR/infra/deploy/env.production.example" "$APP_DIR/.env"
  echo ">>> Edit $APP_DIR/.env before going live (secrets, OAuth, DB password)."
fi

# Docker infra (localhost-only ports)
cd "$APP_DIR"
"$APP_DIR/infra/deploy/compose.sh" up -d

install -m 644 "$APP_DIR/infra/deploy/nginx/notcery.conf" /etc/nginx/sites-available/notcery
ln -sf /etc/nginx/sites-available/notcery /etc/nginx/sites-enabled/notcery
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

install -m 644 "$APP_DIR/infra/deploy/systemd/notcery-backend.service" /etc/systemd/system/
install -m 644 "$APP_DIR/infra/deploy/systemd/notcery-celery.service" /etc/systemd/system/
systemctl daemon-reload

if [[ -x "$APP_DIR/infra/deploy/deploy.sh" ]]; then
  "$APP_DIR/infra/deploy/deploy.sh" --local
fi

echo ">>> Bootstrap done. Next:"
echo "    1. Edit $APP_DIR/.env"
echo "    2. certbot --nginx -d note.wrupup.com --agree-tos -m you@example.com"
echo "    3. systemctl enable --now notcery-backend notcery-celery"
