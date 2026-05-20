# Cloudflare — note.wrupup.com

## DNS (Cloudflare dashboard)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `note` | `31.57.108.145` | Proxied (turuncu bulut) önerilir |

Kayıt yayılınca: `dig +short note.wrupup.com` Cloudflare IP’leri dönebilir (normal).

## SSL/TLS (kritik)

**Önerilen:** SSL/TLS encryption mode → **Full (strict)**

1. Sunucuda önce **Certbot** ile origin sertifikası alın (aşağıdaki README).
2. Cloudflare’de **Full (strict)** seçin.

| Mod | Sonuç |
|-----|--------|
| Flexible | Origin HTTP; Django redirect döngüsü riski — kullanmayın |
| Full | Origin’de sertifika gerekir |
| Full (strict) | Origin’de geçerli Let’s Encrypt — **tercih** |

## Hızlı ayarlar (isteğe bağlı)

- **Always Use HTTPS:** On
- **Automatic HTTPS Rewrites:** On
- **Brotoli:** On
- **WebSockets:** On (ileride canlı özellikler için)

## Google OAuth

Authorized JavaScript origins / redirect URIs:

- `https://note.wrupup.com`

(Cloudflare proxy açık olsa da kullanıcı tarafı bu URL.)

## Certbot + turuncu bulut

HTTP-01 challenge bazen proxy yüzünden takılır. Çözümler:

1. Certbot sırasında `note` kaydını geçici **DNS only** (gri bulut) yapın, sertifika alın, tekrar Proxied yapın.
2. Veya: `certbot certonly --webroot -w /var/www/notcery/frontend/dist -d note.wrupup.com`

## Güncelleme sonrası

Cloudflare cache agresifse ilk deploy’da: **Caching → Configuration → Purge Everything** (gerekirse).
