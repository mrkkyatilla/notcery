#!/usr/bin/env bash
# Notcery — tek seferlik production kurulum (sunucu, root)
#
#   cd /var/www/notcery
#   git clone ...  # veya git pull
#   cp infra/deploy/env.production.storj.example .env && nano .env
#   chmod +x infra/deploy/*.sh
#   ./infra/deploy/install-production.sh
#
# Sadece uygulama (paketler kuruluysa): ./infra/deploy/install-production.sh --app-only
# Sadece OS paketleri: ./infra/deploy/install-production.sh --deps-only

set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$DEPLOY_DIR/../.." && pwd)}"
DOMAIN="${NOTCERY_DOMAIN:-note.wrupup.com}"

APP_ONLY=false
DEPS_ONLY=false
SKIP_SSL_HINT=false

for arg in "$@"; do
  case "$arg" in
    --app-only) APP_ONLY=true ;;
    --deps-only) DEPS_ONLY=true ;;
    --domain=*) DOMAIN="${arg#*=}" ;;
  esac
done

log() { echo ""; echo "==> $*"; }

require_root() {
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "Bu script root ile çalıştırılmalı: sudo $0" >&2
    exit 1
  fi
}

preflight_repo() {
  log "Repo kontrolü ($APP_DIR)"
  local missing=0
  for path in frontend/package.json backend/manage.py infra/deploy/nginx/notcery.conf \
    backend/apps/notes/views.py frontend/src/features/notes/NoteEditor.tsx; do
    if [[ ! -e "$APP_DIR/$path" ]]; then
      echo "  EKSIK: $path" >&2
      missing=1
    fi
  done
  if [[ "$missing" -eq 1 ]]; then
    echo "git pull yapın; .gitignore nedeniyle notes/ dosyaları commit'te olmalı." >&2
    exit 1
  fi
}

preflight_env() {
  log ".env kontrolü"
  if [[ ! -f "$APP_DIR/.env" ]]; then
    if [[ -f "$APP_DIR/infra/deploy/env.production.storj.example" ]]; then
      cp "$APP_DIR/infra/deploy/env.production.storj.example" "$APP_DIR/.env"
      echo "  .env oluşturuldu (storj örneği). Düzenleyin: nano $APP_DIR/.env" >&2
      echo "  Sonra scripti tekrar çalıştırın." >&2
      exit 1
    fi
    echo "  $APP_DIR/.env yok." >&2
    exit 1
  fi

  # Önerilen production varsayılanları (yoksa ekle / düzelt)
  grep -q '^DJANGO_SETTINGS_MODULE=' "$APP_DIR/.env" || \
    echo 'DJANGO_SETTINGS_MODULE=config.settings.production' >> "$APP_DIR/.env"
  grep -q '^STRUCTURED_LOGGING=' "$APP_DIR/.env" || \
    echo 'STRUCTURED_LOGGING=false' >> "$APP_DIR/.env"
  if grep -q '^STRUCTURED_LOGGING=true' "$APP_DIR/.env" 2>/dev/null; then
    sed -i 's/^STRUCTURED_LOGGING=.*/STRUCTURED_LOGGING=false/' "$APP_DIR/.env"
    echo "  STRUCTURED_LOGGING=false yapıldı (Python 3.10 uyumu)."
  fi
  if ! grep -q '^POSTGRES_HOST_PORT=' "$APP_DIR/.env"; then
    echo 'POSTGRES_HOST_PORT=5433' >> "$APP_DIR/.env"
    echo "  POSTGRES_HOST_PORT=5433 eklendi."
  fi
  if ! grep -q '^REDIS_HOST_PORT=' "$APP_DIR/.env"; then
    echo 'REDIS_HOST_PORT=6380' >> "$APP_DIR/.env"
    echo "  REDIS_HOST_PORT=6380 eklendi."
  fi
  if ! grep -q '127.0.0.1:5433' "$APP_DIR/.env" && grep -q '^DATABASE_URL=' "$APP_DIR/.env"; then
    echo "  UYARI: DATABASE_URL portu 5433 olmalı (Docker postgres)." >&2
  fi
  if ! grep -q ',127.0.0.1' "$APP_DIR/.env" && grep -q '^ALLOWED_HOSTS=' "$APP_DIR/.env"; then
    echo "  UYARI: ALLOWED_HOSTS içine 127.0.0.1,localhost ekleyin." >&2
  fi
}

postflight() {
  log "Sağlık kontrolü"
  sleep 2
  systemctl is-active notcery-backend nginx docker >/dev/null 2>&1 || true

  if curl -sf -H "Host: $DOMAIN" -H "X-Forwarded-Proto: https" \
    http://127.0.0.1:8000/api/v1/health >/dev/null 2>&1; then
    echo "  API health: OK"
  else
    echo "  API health: başarısız — journalctl -u notcery-backend -n 30" >&2
  fi

  if [[ -f "$APP_DIR/frontend/dist/index.html" ]]; then
    echo "  Frontend dist: OK"
  else
    echo "  Frontend dist: EKSIK" >&2
  fi

  if curl -sf -H "Host: $DOMAIN" http://127.0.0.1/api/v1/health >/dev/null 2>&1; then
    echo "  Nginx → API: OK"
  else
    echo "  Nginx → API: kontrol edin" >&2
  fi

  echo ""
  echo "============================================"
  echo " Kurulum tamamlandı: https://$DOMAIN"
  echo "============================================"
  echo " SSL yoksa: certbot --nginx -d $DOMAIN --agree-tos -m EMAIL"
  echo " Gemini VPS engeli: infra/deploy/gemini-proxy.md (GEMINI_HTTP_PROXY)"
  echo " Güncelleme: ./infra/deploy/deploy.sh --local"
  echo " Kontrol: ./infra/deploy/check-site.sh"
  echo "============================================"
}

main() {
  require_root
  cd "$APP_DIR"

  if ! $DEPS_ONLY; then
    preflight_repo
    preflight_env
  fi

  if ! $APP_ONLY; then
    log "OS paketleri (Node 22, nginx, docker, python)"
    bash "$DEPLOY_DIR/install-deps.sh"
  fi

  if $DEPS_ONLY; then
    echo "Sadece paketler kuruldu. Devam: ./infra/deploy/install-production.sh --app-only"
    exit 0
  fi

  log "Uygulama (Docker, backend, frontend, nginx, systemd)"
  NOTCERY_DOMAIN="$DOMAIN" bash "$DEPLOY_DIR/setup-app.sh"

  postflight
}

main "$@"
