# Notcery Backend

Django 5 + DRF API. Sözleşme: [`../docs/openapi.yml`](../docs/openapi.yml).

## Kurulum

```bash
# Proje kökünden
cp .env.example .env
make up

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements/dev.txt
export DATABASE_URL=postgresql://notcery:notcery@localhost:5432/notcery
export SECRET_KEY=your-dev-secret-key-min-32-chars
python manage.py migrate
python manage.py runserver
```

## Endpoint'ler (Faz 0–1)

| Path | Açıklama |
|------|----------|
| `GET /api/v1/health` | Sağlık |
| `GET /api/v1/config/public` | Dil, tema, Google client id |
| `POST /api/v1/auth/register` | E-posta kayıt |
| `POST /api/v1/auth/login` | Giriş |
| `POST /api/v1/auth/google` | Google ID token |
| `GET/PATCH /api/v1/users/me` | Profil |
| `GET/POST /api/v1/workspaces` | Workspace |
| `GET/POST .../subjects` | Dersler |
| `GET/POST .../events?from=&to=` | Takvim slotları |
| `PATCH/DELETE /api/v1/events/{id}` | Slot güncelle / sil |
| `POST .../plans/save` | Haftayı plan olarak kaydet |
| `GET /api/v1/plans/versions/{id}` | Plan detayı |
| `POST .../plans/versions/{id}/activate` | Aktif plan |
| `GET/POST .../notes` | Notlar (`?q=`, `?subject_id=`) |
| `GET/PATCH/DELETE /api/v1/notes/{id}` | Not detayı |
| `POST .../chat/sessions` | Chat oturumu (iskelet) |
| `POST /api/v1/chat/sessions/{id}/messages` | 503 — Faz 5 |
| `POST .../documents/upload-url` | MinIO presigned upload |
| `GET/POST .../documents` | Kütüphane |
| `POST .../retrieve` | RAG arama (dev/debug) |

**Celery worker:** `celery -A config worker -l info`  
**Env:** `GEMINI_API_KEY`, `AWS_S3_ENDPOINT_URL`, `INDEXER_EMBEDDING_BACKEND=mock|gemini`

Swagger: http://localhost:8000/api/docs/

## Test

```bash
pytest
ruff check .
```

## Celery

```bash
celery -A config worker -l info
# debug.ping task: config.celery.ping
```
