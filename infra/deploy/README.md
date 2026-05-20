# Notcery — production deploy (note.wrupup.com)

| | |
|--|--|
| Repo path | `/var/www/notcery` |
| GitHub | `https://github.com/mrkkyatilla/notcery.git` |

## Tek komut kurulum

**[`KURULUM.md`](KURULUM.md)** (Türkçe)

```bash
cd /var/www/notcery && git pull
cp infra/deploy/env.production.storj.example .env && nano .env
chmod +x infra/deploy/*.sh
./infra/deploy/install-production.sh
```

## Diğer rehberler

| Dosya | İçerik |
|--------|--------|
| [`SUNUCU.md`](SUNUCU.md) | Manuel adımlar |
| [`env-aciklama.md`](env-aciklama.md) | `.env` |
| [`gemini-proxy.md`](gemini-proxy.md) | Gemini + proxy |
| [`cloudflare.md`](cloudflare.md) | DNS / SSL |

## Güncelleme

```bash
./infra/deploy/deploy.sh --local
```
