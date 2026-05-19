import logging
import time
import uuid

from django.conf import settings

from apps.core.request_context import request_id_ctx, user_id_ctx

logger = logging.getLogger("notcery.http")


class LocaleMiddleware:
    """Parse Accept-Language and attach request.locale (tr|en)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.locale = self._resolve_locale(request)
        return self.get_response(request)

    def _resolve_locale(self, request) -> str:
        header = request.headers.get("Accept-Language", "")
        if header:
            primary = header.split(",")[0].strip().lower()
            if primary.startswith("en"):
                return "en"
            if primary.startswith("tr"):
                return "tr"
        if request.user.is_authenticated and hasattr(request.user, "locale"):
            if request.user.locale in settings.NOTCERY_SUPPORTED_LOCALES:
                return request.user.locale
        return settings.NOTCERY_DEFAULT_LOCALE


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.request_id = request_id
        token_rid = request_id_ctx.set(request_id)
        try:
            response = self.get_response(request)
        finally:
            request_id_ctx.reset(token_rid)
        response["X-Request-ID"] = request_id
        return response


class RequestContextMiddleware:
    """Bind authenticated user id into logging context."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user_id = str(request.user.id) if request.user.is_authenticated else "-"
        token_uid = user_id_ctx.set(user_id)
        try:
            return self.get_response(request)
        finally:
            user_id_ctx.reset(token_uid)


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/v1/health"):
            return self.get_response(request)

        started = time.monotonic()
        response = self.get_response(request)
        duration_ms = int((time.monotonic() - started) * 1000)
        logger.info(
            "http_request",
            extra={
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "request_id": getattr(request, "request_id", "-"),
                "user_id": (
                    str(request.user.id) if request.user.is_authenticated else None
                ),
            },
        )
        return response


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=()",
        )
        if not settings.DEBUG:
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response
