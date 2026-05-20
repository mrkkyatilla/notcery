# Sunucu kurulumu — `/var/www/notcery`

Repo yolu: **`/var/www/notcery`**  
Site (build sonrası): **`/var/www/notcery/frontend/dist`**  
API (iç): `127.0.0.1:8000`

Cloudflare DNS hazırsa aşağıdaki sırayı sunucuda (`root`) uygulayın.

---

## Önemli: komutlar nerede çalışır?

| Ortam | Dizin | Kim |
|--------|--------|-----|
| **Sunucu** | `/var/www/notcery` | `root` (veya `sudo`) |
| Lokal PC | `/home/.../Documents/notcery` | geliştirme only |

`staticfiles` yolu `/home/hanslanda/Documents/notcery/...` ise komutları **yanlışlıkla lokalde** çalıştırmışsınızdır. Production kurulumu **sadece sunucuda** `root@server-ngf2n0:/var/www/notcery`.

Sunucuda repo eksikse:

```bash
ls /var/www/notcery/frontend /var/www/notcery/infra/deploy
cd /var/www/notcery && git pull
```

---

## 0. Paketler (ilk kez — sunucuda mutlaka)

`python3.12`, `npm`, `nginx` yoksa backend/frontend kurulmaz.

```bash
cd /var/www/notcery
chmod +x infra/deploy/*.sh
./infra/deploy/install-deps.sh
./infra/deploy/setup-app.sh
```

Elle kurulum yerine bu iki script sırayı uygular.

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

## Sorun giderme: `address already in use` (5432)

Sunucuda **sistem PostgreSQL** (`apt install postgresql`) çoğu zaman `127.0.0.1:5432` kullanır; Docker aynı porta bind edemez.

**Seçenek A — Docker Postgres (önerilen, pgvector için):**

```bash
sudo systemctl stop postgresql
sudo systemctl disable postgresql   # isteğe bağlı, yeniden başlamasın
```

`.env`: `POSTGRES_HOST_PORT=5433` ve `DATABASE_URL=...@127.0.0.1:5433/...` (prod overlay varsayılanı).

**Seçenek B — Sistem Postgres’i kullan, Docker postgres’i başlatma:**

```bash
docker-compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d redis
# DATABASE_URL mevcut sistem kullanıcı/şifre/port ile (genelde 5432)
```

Kontrol: `sudo ss -tlnp | grep 5432`

---

## Sorun giderme: `address already in use` (6379 — Redis)

**redis-server** servisi çoğu zaman `127.0.0.1:6379` kullanır. Prod overlay varsayılan host portu **6380**.

`.env` (tüm Redis URL’leri aynı host portu):

```env
REDIS_HOST_PORT=6380
REDIS_URL=redis://127.0.0.1:6380/0
CELERY_BROKER_URL=redis://127.0.0.1:6380/1
CELERY_RESULT_BACKEND=redis://127.0.0.1:6380/2
```

Alternatif: `sudo systemctl stop redis-server` → Docker’ı `6379` ile kullanabilirsiniz.

Kontrol: `sudo ss -tlnp | grep 6379`

---

## 3. Altyapı (Postgres, Redis)

**Storj** kullanıyorsanız MinIO’yu başlatmayın. `.env` için: `env.production.storj.example` ve `env-aciklama.md`.

Sunucuda çoğu Ubuntu kurulumunda **`docker compose` (boşluk) yok**, **`docker-compose` (tire)** kullanın:

```bash
cd /var/www/notcery
chmod +x infra/deploy/compose.sh

# Storj (sadece postgres + redis):
./infra/deploy/compose.sh up -d postgres redis

# veya doğrudan:
docker-compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d postgres redis

docker-compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml ps
```

`unknown shorthand flag: 'f' in -f` → `docker compose` yerine `docker-compose` veya `./infra/deploy/compose.sh` kullanın.

---

## Frontend build: `SyntaxError: Unexpected token '?'`

Sunucudaki **Node çok eski** (Ubuntu `apt install nodejs` → v12/v10). TypeScript/Vite için **Node 18+** gerekir.

```bash
node -v   # v18+ olmalı (tercihen v20/v22)

# Çift NodeSource kaydı varsa önce temizle (Signed-By conflict):
rm -f /etc/apt/sources.list.d/nodesource.list \
  /etc/apt/sources.list.d/nodesource.sources \
  /etc/apt/sources.list.d/nsolid.list
# libnode-dev 12.x NodeSource 22 ile çakışır — önce purge:
apt-get purge -y nodejs npm libnode-dev libnode72 nodejs-doc 2>/dev/null || true
apt-get autoremove -y
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get update && apt-get install -y nodejs
node -v && npm -v

cd /var/www/notcery/frontend
rm -rf node_modules
npm ci   # veya npm install
npm run build
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
