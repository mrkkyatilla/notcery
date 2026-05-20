#!/usr/bin/env bash
# Deploy or update Notcery on the production server.
#
# From laptop (after SSH works):
#   ./infra/deploy/deploy.sh
#
# On server:
#   /var/www/notcery/infra/deploy/deploy.sh --local

set -euo pipefail

APP_DIR=/var/www/notcery
LOCAL=false

for arg in "$@"; do
  case "$arg" in
    --local) LOCAL=true ;;
  esac
done

run_remote() {
  if $LOCAL; then
    bash -c "$1"
  else
    ssh notcery bash -c "$1"
  fi
}

if ! $LOCAL; then
  echo "Deploying to notcery (31.57.108.145)..."
  rsync -az --exclude node_modules --exclude .venv --exclude frontend/dist \
    "$(cd "$(dirname "$0")/../.." && pwd)/" notcery:"$APP_DIR/" 2>/dev/null || \
    ssh notcery "cd $APP_DIR && git pull --ff-only"
fi

REMOTE_SCRIPT=$(cat <<'EOS'
set -euo pipefail
APP_DIR=/var/www/notcery
cd "$APP_DIR"

set -a
[[ -f .env ]] && source .env
set +a

docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d

cd backend
python3.12 -m venv .venv
.venv/bin/pip install -q -U pip
.venv/bin/pip install -q -r requirements/prod.txt
.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput

cd "$APP_DIR/frontend"
npm ci
export VITE_API_URL="${VITE_API_URL:-https://note.wrupup.com/api/v1}"
export VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-}"
npm run build

systemctl enable notcery-backend
systemctl restart notcery-backend
systemctl enable notcery-celery 2>/dev/null || true
systemctl restart notcery-celery 2>/dev/null || true

echo "Deploy finished. Check: systemctl status notcery-backend"
EOS
)

run_remote "$REMOTE_SCRIPT"
