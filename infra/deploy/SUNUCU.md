# Sunucu kurulumu — `/var/www/notcery`

Repo yolu: **`/var/www/notcery`**  
Site (build sonrası): **`/var/www/notcery/frontend/dist`**  
API (iç): `127.0.0.1:8000`

Cloudflare DNS hazırsa aşağıdaki sırayı sunucuda (`root`) uygulayın.

---

## 0. Paketler (ilk kez)

```bash
apt update
apt install -y git nginx certbot python3-certbot-nginx \
  python3.12 python3.12-venv docker.io docker-compose-v2 \
  curl
```

Docker resmi sürümü isterseniz: `infra/deploy/bootstrap.sh` (sadece Docker kurulumu için de çalışır).

Node 22:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

---

## 1. Repoyu çek

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/mrkkyatilla/notcery.git notcery
cd /var/www/notcery
```

Güncelleme:

```bash
cd /var/www/notcery && git pull
```

---

## 2. Ortam dosyası (`.env`)

```bash
cp /var/www/notcery/infra/deploy/env.production.example /var/www/notcery/.env
nano /var/www/notcery/.env
```

Mutlaka değiştir:

- `SECRET_KEY`, `JWT_SIGNING_KEY`
- `POSTGRES_PASSWORD` ve `DATABASE_URL` içindeki şifre (aynı olsun)
- `MINIO_*` / `AWS_*` şifreleri
- `GOOGLE_OAUTH_*`, `VITE_GOOGLE_CLIENT_ID` (build için)
- `GEMINI_API_KEY` (üretim AI için)

Secret üret:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

## 3. Altyapı (Postgres, Redis, MinIO)

```bash
cd /var/www/notcery
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d
docker compose -f infra/docker-compose.yml ps
```

---

## 4. Backend

```bash
cd /var/www/notcery/backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements/prod.txt

cd /var/www/notcery
set -a && source .env && set +a
cd backend
python manage.py migrate
python manage.py collectstatic --noinput
```

Systemd:

```bash
cp /var/www/notcery/infra/deploy/systemd/*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now notcery-backend
systemctl enable --now notcery-celery   # isteğe bağlı
systemctl status notcery-backend
```

---

## 5. Frontend build

```bash
cd /var/www/notcery/frontend
export VITE_API_URL=https://note.wrupup.com/api/v1
export VITE_GOOGLE_CLIENT_ID="..."   # .env ile aynı client id
npm ci
npm run build
```

Çıktı: `/var/www/notcery/frontend/dist`

---

## 6. Nginx

```bash
cp /var/www/notcery/infra/deploy/nginx/notcery.conf /etc/nginx/sites-available/notcery
ln -sf /etc/nginx/sites-available/notcery /etc/nginx/sites-enabled/notcery
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## 7. SSL (Let’s Encrypt)

Cloudflare **Full (strict)** için origin sertifikası:

```bash
# HTTP challenge takılırsa: Cloudflare'de note kaydını geçici DNS only (gri) yapın
certbot --nginx -d note.wrupup.com --agree-tos -m sizin@email.com
```

Cloudflare → SSL/TLS → **Full (strict)**.

---

## 8. Kontrol

```bash
curl -sI https://note.wrupup.com
curl -s https://note.wrupup.com/api/v1/health/   # veya health endpoint
journalctl -u notcery-backend -n 50 --no-pager
```

Tarayıcı: https://note.wrupup.com

---

## Sonraki deploy’lar

```bash
cd /var/www/notcery
git pull
./infra/deploy/deploy.sh --local
```

---

## Google Cloud Console

- Authorized origins: `https://note.wrupup.com`
- Redirect URIs: uygulamanızın callback path’i (backend dokümantasyonuna göre)

Detay: `infra/deploy/cloudflare.md`
