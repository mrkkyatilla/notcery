# Notcery — production deploy (note.wrupup.com)

| | |
|--|--|
| Sunucu | `31.57.108.145` |
| Repo path | `/var/www/notcery` |
| Frontend | `/var/www/notcery/frontend/dist` (after `npm run build`) |
| GitHub | `https://github.com/mrkkyatilla/notcery.git` |

**Türkçe adım adım:** [`SUNUCU.md`](SUNUCU.md)  
**Cloudflare:** [`cloudflare.md`](cloudflare.md)

## Quick path (repo already in `/var/www/notcery`)

```bash
cd /var/www/notcery
cp infra/deploy/env.production.example .env && nano .env
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d
./infra/deploy/deploy.sh --local
cp infra/deploy/nginx/notcery.conf /etc/nginx/sites-available/notcery
ln -sf /etc/nginx/sites-available/notcery /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d note.wrupup.com --agree-tos -m you@wrupup.com
```

Cloudflare SSL mode: **Full (strict)** after certbot.
