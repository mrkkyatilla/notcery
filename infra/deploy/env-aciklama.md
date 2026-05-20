# `.env` alanları — ne işe yarar?

Backend `AWS_*` değişkenleriyle **herhangi bir S3 uyumlu** depoyu konuşur (MinIO, Storj, AWS S3). Kod: `backend/apps/indexer/storage.py` (boto3).

---

## Depolama: MinIO mu, Storj mu?

### Seçenek A — Storj (öneriniz, sunucuda MinIO gerekmez)

1. [Storj Console](https://console.storj.io) → proje → **Buckets** → bucket oluşturun (ör. `notcery-prod`).
2. **Access** → **S3 Credentials** → yeni access key (Access Key + Secret Key bir kez gösterilir).
3. Docker’da **MinIO servisini çalıştırmayın** (veya compose’dan kaldırın).

`.env` örneği:

```env
# MinIO kullanmıyorsanız — bu satırlar sadece docker minio içindir, boş bırakılabilir / silinebilir
# MINIO_ROOT_USER=
# MINIO_ROOT_PASSWORD=

AWS_ACCESS_KEY_ID=<storj-s3-access-key>
AWS_SECRET_ACCESS_KEY=<storj-s3-secret-key>
AWS_S3_ENDPOINT_URL=https://gateway.storjshare.io
AWS_S3_REGION_NAME=us-east-1
AWS_STORAGE_BUCKET_NAME=notcery-prod
```

Bucket adı Storj’da oluşturduğunuz isimle **birebir aynı** olmalı. Uygulama ilk kullanımda `ensure_bucket_exists()` dener; Storj’da bucket’ı siz oluşturduysanız yeterli.

### Seçenek B — Sunucuda MinIO (Docker)

MinIO konteyneri `MINIO_ROOT_*` ile admin hesabı açar. Django’nun kullandığı `AWS_*` **aynı değerler** olmalı (MinIO = tek kullanıcı).

Siz üretirsiniz — örnek (gerçekte rastgele güçlü şifre kullanın):

```env
MINIO_ROOT_USER=notcery_storage
MINIO_ROOT_PASSWORD=<uzun-rastgele-şifre-32+>

AWS_ACCESS_KEY_ID=notcery_storage
AWS_SECRET_ACCESS_KEY=<aynı-şifre>
AWS_S3_ENDPOINT_URL=http://127.0.0.1:9000
AWS_S3_REGION_NAME=us-east-1
AWS_STORAGE_BUCKET_NAME=notcery
```

`minioadmin` / `minioadmin` sadece **yerel geliştirme** içindir; production’da kullanmayın.

---

## Zorunlu / üretimde doldurulmalı

| Değişken | Açıklama |
|----------|----------|
| `SECRET_KEY` | Django güvenliği. `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_SIGNING_KEY` | JWT imzalama; `SECRET_KEY`’den farklı, yine rastgele uzun string |
| `POSTGRES_PASSWORD` | Postgres şifresi; `DATABASE_URL` içindeki şifre ile **aynı** |
| `DATABASE_URL` | `postgresql://notcery:ŞİFRE@127.0.0.1:5432/notcery` |
| `AWS_*` (Storj) | Yukarıdaki Storj S3 credential + endpoint + bucket |
| `ALLOWED_HOSTS` | `note.wrupup.com,31.57.108.145` |
| `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` | `https://note.wrupup.com` |

---

## Kimlik (Google ile giriş)

| Değişken | Boşsa | Doldurulunca |
|----------|--------|----------------|
| `GOOGLE_OAUTH_CLIENT_ID` | Google login çalışmaz | Google Cloud OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Token exchange çalışmaz | Client secret |
| `VITE_GOOGLE_CLIENT_ID` | Frontend build’de aynı client ID (çoğu zaman `GOOGLE_OAUTH_CLIENT_ID` ile aynı) |

Google Console’da `https://note.wrupup.com` origin/redirect ekli olmalı.

---

## JWT (varsayılanlar genelde yeterli)

| Değişken | Açıklama |
|----------|----------|
| `JWT_ALGORITHM` | `RS256` — projede tanımlı akış |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | Access token ömrü (15) |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Refresh token ömrü (7) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | Token metadata; değiştirmeniz şart değil |

---

## AI sohbet + kütüphane “bekliyor”

| Belirti | Neden |
|---------|--------|
| Dosya **pending/processing** | **Celery worker** çalışmıyor veya indeks görevi hata veriyor (`systemctl status notcery-celery`) |
| Sohbet **“Girdiğiniz bilgileri kontrol edin”** | API `VALIDATION_ERROR` döner; çoğunlukla **Gemini** (`GEMINI_API_KEY`, model adı, kota). Eski UI genel metni gösterirdi. |

`.env` (üretim):

```env
GEMINI_API_KEY=<Google AI Studio API key>
AI_BACKEND=auto
INDEXER_EMBEDDING_BACKEND=auto
GEMINI_CHAT_MODEL=models/gemini-2.5-flash
GEMINI_PLAN_MODEL=models/gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=models/text-embedding-004
```

### `User location is not supported for the API use`

Google **AI Studio** API (`GEMINI_API_KEY`) sunucunun **çıkış IP** ülkesine bakar; VPS ülkesi destek listesinde değilse (bazı TR / bölgesel IP’ler dahil) **400** verir. Bu kod hatası değil.

Sunucu ülkesini kontrol:

```bash
curl -s https://ipinfo.io/country
# veya: curl -s https://ifconfig.co/country-iso
```

**Seçenekler:**

| Seçenek | Açıklama |
|---------|----------|
| **A — Geçici mock** | `.env`: `AI_BACKEND=mock`, `INDEXER_EMBEDDING_BACKEND=mock` → sohbet/plan sahte; RAG/indeks sınırlı |
| **B — IPv6 öncelik** | Datacenter IPv4 engelli; IPv6 açıksa `gai.conf` ile deneyin (aşağıda) |
| **C — VPS / proxy** | Farklı çıkış IP veya HTTP proxy |
| **D — Vertex AI** | GCP projesi + destekli `location` (kodda şu an yok) |
| **E — `GEMINI_HTTP_PROXY`** | Sadece Gemini trafiği proxy’den (Storj etkilenmez) — **`infra/deploy/gemini-proxy.md`** |

**IPv6 denemesi (sunucuda):**

```bash
# IPv6 çıkış var mı?
curl -6 -s --max-time 5 https://generativelanguage.googleapis.com/ | head -1
curl -6 -s https://ifconfig.co/ip

# Sistemde IPv6'yı DNS çözümünde öne al
grep -q '^precedence ::/0' /etc/gai.conf 2>/dev/null || \
  echo 'precedence ::/0  100' >> /etc/gai.conf

systemctl restart notcery-backend notcery-celery

cd /var/www/notcery/backend
set -a && source /var/www/notcery/.env && set +a
export DJANGO_SETTINGS_MODULE=config.settings.production
.venv/bin/python -c "
import django; django.setup()
from apps.ai.services.gemini import generate_text
print(generate_text('You are helpful.', 'Test')[:150])
"
```

Destekli bölgeler: [ai.google.dev/available_regions](https://ai.google.dev/available_regions)

Sunucuda test:

```bash
cd /var/www/notcery/backend
set -a && source /var/www/notcery/.env && set +a
export DJANGO_SETTINGS_MODULE=config.settings.production
.venv/bin/python -c "
import django; django.setup()
from apps.ai.services.gemini import generate_text
print(generate_text('You are a helpful assistant.', 'Merhaba')[:200])
"
```

Celery:

```bash
systemctl enable --now notcery-celery
journalctl -u notcery-celery -n 30 --no-pager
```

---

## AI / indeksleme

| Değişken | Boşsa / `mock` | `auto` + API key |
|----------|----------------|------------------|
| `GEMINI_API_KEY` | Embedding ve AI “mock” kalır | Google AI Studio / Gemini API |
| `INDEXER_EMBEDDING_BACKEND` | `auto` → key yoksa mock, varsa gemini | Doküman arama/embeddings |
| `AI_BACKEND` | `auto` → aynı mantık | Plan/chat üretimi |

İlk aşamada boş bırakıp test edebilirsiniz; RAG/AI gerçek model kullanmaz.

---

## İzleme (isteğe bağlı)

| Değişken | Açıklama |
|----------|----------|
| `SENTRY_DSN` | Boş = Sentry kapalı. Proje oluşturup DSN yapıştırın |
| `SENTRY_ENVIRONMENT` | `production` |
| `STRUCTURED_LOGGING` | `true` — JSON log |
| `LOG_LEVEL` | `INFO`, `DEBUG`, `WARNING` |

---

## Ödeme (Faz 7 — şimdilik boş kalabilir)

| Değişken | Açıklama |
|----------|----------|
| `STRIPE_SECRET_KEY` | Stripe dashboard secret key |
| `STRIPE_WEBHOOK_SECRET` | Webhook imza doğrulama |
| `STRIPE_PRO_PRICE_ID` | Pro plan price ID |
| `STRIPE_CHECKOUT_*_URL` | Ödeme sonrası dönüş URL’leri (şablonda `note.wrupup.com` var) |

Boşken faturalama endpoint’leri çalışmaz veya test modunda kalır — MVP için sorun olmayabilir.

---

## Celery / Redis / Postgres

| Değişken | Açıklama |
|----------|----------|
| `REDIS_URL` | Cache + genel Redis (`/0`) |
| `CELERY_BROKER_URL` | Kuyruk (`/1`) |
| `CELERY_RESULT_BACKEND` | Sonuç store (`/2`) |
| `POSTGRES_USER` / `POSTGRES_DB` | Docker compose ile uyumlu; compose bu değişkenleri okur |

---

## Storj + Docker compose

Storj kullanırken stack:

```bash
docker-compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d postgres redis
# veya: ./infra/deploy/compose.sh up -d postgres redis
```

(`minio` satırını çalıştırmayın — dosyada tüm servisler var; sadece postgres+redis yeterli.)

MinIO’yu tamamen kapatmak için ileride `docker-compose.yml` içinde `minio`’ya `profiles: ["minio"]` eklenebilir; şimdilik `up` komutunda servis listesini sınırlamak yeterli.
