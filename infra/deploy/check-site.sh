#!/usr/bin/env bash
# Run on server as root: ./infra/deploy/check-site.sh
set -euo pipefail

APP=/var/www/notcery
echo "=== Notcery site check ==="

echo -e "\n[1] Frontend dist"
if [[ -f "$APP/frontend/dist/index.html" ]]; then
  echo "OK: dist/index.html exists"
  ls -la "$APP/frontend/dist/index.html"
else
  echo "FAIL: run npm run build in $APP/frontend"
fi

echo -e "\n[2] Backend service"
systemctl is-active notcery-backend 2>/dev/null || echo "notcery-backend: inactive/missing"
systemctl status notcery-backend --no-pager -l 2>/dev/null | head -15 || true

echo -e "\n[3] Nginx"
systemctl is-active nginx 2>/dev/null || echo "nginx: inactive"
nginx -t 2>&1 || true
echo "site config:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || true
grep -E '^\s*(root|server_name|listen)' /etc/nginx/sites-enabled/notcery 2>/dev/null || \
  grep -E '^\s*(root|server_name|listen)' /etc/nginx/sites-available/notcery 2>/dev/null || \
  echo "notcery nginx site missing"

echo -e "\n[4] Ports"
ss -tlnp | grep -E ':80|:443|:8000' || true

echo -e "\n[5] HTTP checks"
curl -sI http://127.0.0.1/ | head -3 || echo "curl :80 failed"
curl -sS http://127.0.0.1:8000/api/v1/health 2>&1 || echo "backend :8000 failed"
curl -sI https://note.wrupup.com/ 2>&1 | head -5 || echo "https public failed"

echo -e "\n[6] Docker DB/Redis"
docker-compose -f "$APP/infra/docker-compose.yml" ps 2>/dev/null || \
  docker compose -f "$APP/infra/docker-compose.yml" ps 2>/dev/null || true

echo -e "\n[7] .env ports (grep)"
grep -E '^(DATABASE_URL|REDIS_URL|ALLOWED_HOSTS|STRUCTURED_LOGGING|DEBUG)=' "$APP/.env" 2>/dev/null || echo "no .env"

echo -e "\n[8] Last backend logs"
journalctl -u notcery-backend -n 12 --no-pager 2>/dev/null || true

echo -e "\n=== Done ==="
