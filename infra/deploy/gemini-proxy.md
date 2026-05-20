# Gemini API — HTTP proxy (VPS IP engelli)

Paris / datacenter VPS’lerde Google AI Studio bazen `User location is not supported` verir. **Storj** aynı kalır; yalnızca Gemini istekleri proxy’den çıkar.

## `.env` (sunucu)

```env
GEMINI_API_KEY=...
GEMINI_CHAT_MODEL=models/gemini-2.5-flash
GEMINI_PLAN_MODEL=models/gemini-2.5-flash
AI_BACKEND=auto
INDEXER_EMBEDDING_BACKEND=auto

# Sadece Gemini (sohbet, plan, embedding). Storj/boto3 bu proxy’yi KULLANMAZ.
GEMINI_HTTP_PROXY=http://KULLANICI:SIFRE@PROXY_HOST:PORT
```

Örnekler:

| Tip | URL |
|-----|-----|
| HTTP proxy | `http://user:pass@203.0.113.10:8080` |
| HTTPS proxy URL | `http://user:pass@proxy.example:3128` (çoğu sağlayıcı HTTP CONNECT) |

**Yapmayın:** `systemctl` / global `HTTPS_PROXY` — Storj yüklemeleri de proxy’den gider, gereksiz hata riski.

**SOCKS5:** `socks5://...` için ek paket gerekebilir (`pip install pysocks`); önce HTTP proxy deneyin.

## Proxy seçimi

- Çıkış ülkesi: **ABD** veya [Gemini destekli bölge](https://ai.google.dev/available_regions)
- Tip: datacenter değil **residential** proxy daha az engellenir (pahalı)
- Sağlayıcılar: Webshare, Bright Data, kendi küçük US VPS + Squid (aşağıda)

## Test (sunucu)

```bash
cd /var/www/notcery/backend
set -a && source /var/www/notcery/.env && set +a
export DJANGO_SETTINGS_MODULE=config.settings.production

.venv/bin/python -c "
import django; django.setup()
from apps.ai.services.gemini import generate_text
print(generate_text('You are helpful.', 'Merhaba')[:200])
"

systemctl restart notcery-backend notcery-celery
```

## Kendi US VPS’te basit Squid (isteğe bağlı)

US’ta küçük bir VPS’te:

```bash
apt install -y squid
# /etc/squid/squid.conf — sadece sunucu IP’nize izin:
# acl notcery src 31.57.108.145
# http_access allow notcery
# http_access deny all
systemctl restart squid
```

Notcery `.env`:

```env
GEMINI_HTTP_PROXY=http://31.57.108.145:3128
```

(Güvenlik için Squid’de şifre + firewall şart.)

## Log

İlk Gemini çağrısında: `Gemini API traffic using GEMINI_HTTP_PROXY`
