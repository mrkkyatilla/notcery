# Notcery

Product API contract: [`backend/openapi.yml`]

## Prerequisites

- Docker 
- Python 3.12+  

## Quick start (infrastructure)

```bash
cp .env.example .env
make up
```

Services:

- PostgreSQL 16 + pgvector — `localhost:5432`
- Redis 7 — `localhost:6379`
- MinIO (S3) — API `http://localhost:9000`, console `http://localhost:9001`
- Optional Mailpit — `docker compose -f infra/docker-compose.yml --profile mail up -d` (UI `http://localhost:8025`)

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver
```

## Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

See [`frontend/README.md`](frontend/README.md) for scripts and phase notes.

## Makefile

| Target   | Description |
|----------|-------------|
| `make up` | Start infra stack (`infra/docker-compose.yml`) |
| `make down` | Stop stack |
| `make migrate` | Run Django migrations (from `backend/`) |
| `make test` | Run `pytest` in `backend/` |
| `make shell` | Open `psql` in Postgres (until app container exists) |
| `make logs` | Follow compose logs |

## Production deploy

Step-by-step guide for `https://note.wrupup.com` (HTTPS, empty VPS): [`notes/deploy/README.md`](notes/deploy/README.md).

## CI

GitHub Actions runs backend (Ruff, pytest) and frontend (lint, typecheck, test, build) on push and pull requests.

## License

MIT licese.

## NEXT PLANS
- Lighthouse staging archive
- Sentry live DSN + source map upload
- ClamAV, 24h soak, Postgres/S3 DR runbooks