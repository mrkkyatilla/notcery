#!/usr/bin/env bash
# Backend + frontend + systemd. Run ON THE SERVER as root: /var/www/notcery
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root on the server (e.g. sudo $0)" >&2
  exit 1
fi

APP_DIR="${APP_DIR:-/var/www/notcery}"

if [[ ! -d "$APP_DIR/frontend" ]] || [[ ! -d "$APP_DIR/infra/deploy" ]]; then
  echo "Incomplete repo at $APP_DIR — run:" >&2
  echo "  cd $APP_DIR && git pull" >&2
  exit 1
fi

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $APP_DIR/.env" >&2
  exit 1
fi

set -a
source .env
set +a
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"

echo "==> Docker (postgres + redis)"
if command -v docker-compose >/dev/null 2>&1; then
  docker-compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d postgres redis
else
  docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d postgres redis
fi

echo "==> Backend"
cd "$APP_DIR/backend"
python3 -m venv .venv
.venv/bin/pip install -q -U pip
.venv/bin/pip install -q -r requirements/prod.txt
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput

echo "==> systemd"
install -m 644 "$APP_DIR/infra/deploy/systemd/notcery-backend.service" /etc/systemd/system/
install -m 644 "$APP_DIR/infra/deploy/systemd/notcery-celery.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now notcery-backend
systemctl enable notcery-celery 2>/dev/null || true

echo "==> Frontend"
cd "$APP_DIR/frontend"
export VITE_API_URL="${VITE_API_URL:-https://note.wrupup.com/api/v1}"
export VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build

echo "==> Nginx"
command -v nginx >/dev/null || { echo "Install nginx first: ./infra/deploy/install-deps.sh" >&2; exit 1; }
install -m 644 "$APP_DIR/infra/deploy/nginx/notcery.conf" /etc/nginx/sites-available/notcery
mkdir -p /etc/nginx/sites-enabled
ln -sf /etc/nginx/sites-available/notcery /etc/nginx/sites-enabled/notcery
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo ""
echo "OK. Next: certbot --nginx -d note.wrupup.com --agree-tos -m YOUR_EMAIL"
systemctl status notcery-backend --no-pager || true
ls -la "$APP_DIR/frontend/dist/index.html"
