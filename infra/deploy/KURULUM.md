# Notcery — tek seferlik sunucu kurulumu

Yaşanan sorunlara göre düzenlenmiş akış: **docker-compose** (değil `docker compose`), port **5433/6380**, Python **3.10+**, Node **22**, `STRUCTURED_LOGGING=false`, Storj, opsiyonel **GEMINI_HTTP_PROXY**.

## Önkoşullar

- Ubuntu/Debian VPS, **root**
- DNS: `note.wrupup.com` → sunucu IP
- GitHub’dan tam repo (`backend/apps/notes`, `frontend/src/features/notes` commit’te olmalı)

## Tek komut

```bash
cd /var/www/notcery
git clone https://github.com/mrkkyatilla/notcery.git .   # ilk kez
# veya: git pull

cp infra/deploy/env.production.storj.example .env
nano .env   # SECRET_KEY, DB şifre, Storj AWS_*, Google OAuth, GEMINI_API_KEY

chmod +x infra/deploy/*.sh
./infra/deploy/install-production.sh
```

İsteğe bağlı domain:

```bash
./infra/deploy/install-production.sh --domain=note.wrupup.com
```

## Script ne yapar?

| Adım | Script / araç |
|------|----------------|
| Node 22, nginx, docker, python | `install-deps.sh` |
| `.env` eksikse storj şablonu | `install-production.sh` |
| Postgres + Redis (5433, 6380) | `compose.sh` |
| Backend venv, migrate, static | `setup-app.sh` |
| gunicorn + celery systemd | `setup-app.sh` |
| `npm ci` + `npm run build` | `setup-app.sh` |
| nginx site config | `setup-app.sh` |
| Health kontrolü | `install-production.sh` |

## `.env` minimum (üretim)

```env
SECRET_KEY=...
JWT_SIGNING_KEY=...
DEBUG=false
ALLOWED_HOSTS=note.wrupup.com,SUNUCU_IP,127.0.0.1,localhost
DJANGO_SETTINGS_MODULE=config.settings.production
STRUCTURED_LOGGING=false
SECURE_SSL_REDIRECT=false

POSTGRES_HOST_PORT=5433
REDIS_HOST_PORT=6380
DATABASE_URL=postgresql://notcery:SIFRE@127.0.0.1:5433/notcery
REDIS_URL=redis://127.0.0.1:6380/0
CELERY_BROKER_URL=redis://127.0.0.1:6380/1
CELERY_RESULT_BACKEND=redis://127.0.0.1:6380/2

AWS_*  # Storj S3
GEMINI_API_KEY=...
GEMINI_CHAT_MODEL=models/gemini-2.5-flash
GEMINI_PLAN_MODEL=models/gemini-2.5-flash
# GEMINI_HTTP_PROXY=http://...   # VPS Gemini engelli ise

VITE_API_URL=https://note.wrupup.com/api/v1
VITE_GOOGLE_CLIENT_ID=...
```

## Kurulum sonrası

```bash
certbot --nginx -d note.wrupup.com --agree-tos -m email@example.com
./infra/deploy/check-site.sh
```

## Güncelleme (kod değişince)

```bash
cd /var/www/notcery && git pull
./infra/deploy/deploy.sh --local
```

## Alt komutlar

| Komut | Ne zaman |
|--------|----------|
| `./infra/deploy/install-production.sh --deps-only` | Sadece apt/node/docker |
| `./infra/deploy/install-production.sh --app-only` | Paketler hazır, sadece app |
| `./infra/deploy/deploy.sh --local` | Günlük deploy |

## Sorun giderme

| Belirti | Dosya |
|---------|--------|
| Port 5432/6379 dolu | `SUNUCU.md` |
| Gemini location | `gemini-proxy.md` |
| Storj / upload | `env-aciklama.md` |
