from django.db import connection


def check_database() -> dict:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)[:200]}


def check_redis() -> dict:
    try:
        import redis
        from django.conf import settings

        client = redis.from_url(settings.CELERY_BROKER_URL, socket_connect_timeout=2)
        client.ping()
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)[:200]}


def run_health_checks() -> dict:
    checks = {
        "database": check_database(),
        "redis": check_redis(),
    }
    all_ok = all(item["status"] == "ok" for item in checks.values())
    return {
        "status": "ok" if all_ok else "degraded",
        "checks": checks,
    }
