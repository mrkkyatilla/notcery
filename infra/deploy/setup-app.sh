#!/usr/bin/env bash
# Backend + frontend + systemd. Called by install-production.sh or alone (root).
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

APP_DIR="${APP_DIR:-/var/www/notcery}"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="${NOTCERY_DOMAIN:-note.wrupup.com}"
COMPOSE="$DEPLOY_DIR/compose.sh"

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $APP_DIR/.env" >&2
  exit 1
fi

set -a
# shellcheck source=/dev/null
source .env
set +a
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"
export STRUCTURED_LOGGING="${STRUCTURED_LOGGING:-false}"

echo "==> Docker (postgres + redis)"
chmod +x "$COMPOSE"
"$COMPOSE" up -d postgres redis

echo "==> Postgres hazır bekleniyor"
for _ in $(seq 1 30); do
  if "$COMPOSE" exec -T postgres pg_isready -U "${POSTGRES_USER:-notcery}" -d "${POSTGRES_DB:-notcery}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Backend"
cd "$APP_DIR/backend"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q -U pip
.venv/bin/pip install -q -r requirements/prod.txt
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput

echo "==> systemd"
install -m 644 "$DEPLOY_DIR/systemd/notcery-backend.service" /etc/systemd/system/
install -m 644 "$DEPLOY_DIR/systemd/notcery-celery.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable notcery-backend notcery-celery
systemctl restart notcery-backend
systemctl restart notcery-celery || true

echo "==> Frontend build"
cd "$APP_DIR/frontend"
export VITE_API_URL="${VITE_API_URL:-https://${DOMAIN}/api/v1}"
export VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build

echo "==> Nginx"
command -v nginx >/dev/null || { echo "nginx yok — önce install-deps.sh" >&2; exit 1; }
install -m 644 "$DEPLOY_DIR/nginx/notcery.conf" /etc/nginx/sites-available/notcery
mkdir -p /etc/nginx/sites-enabled
ln -sf /etc/nginx/sites-available/notcery /etc/nginx/sites-enabled/notcery
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

echo "==> setup-app bitti"
