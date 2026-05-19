from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler

MESSAGES = {
    "VALIDATION_ERROR": {"tr": "Geçersiz istek.", "en": "Invalid request."},
    "UNAUTHORIZED": {"tr": "Oturum açmanız gerekiyor.", "en": "Authentication required."},
    "FORBIDDEN": {"tr": "Bu işlem için yetkiniz yok.", "en": "You do not have permission."},
    "NOT_FOUND": {"tr": "Kaynak bulunamadı.", "en": "Resource not found."},
    "CONFLICT": {"tr": "Çakışma oluştu.", "en": "Conflict."},
    "RATE_LIMITED": {"tr": "Çok fazla istek.", "en": "Too many requests."},
    "ACCOUNT_EXISTS_LINK_REQUIRED": {
        "tr": "Bu e-posta zaten kayıtlı. Google bağlamak için giriş yapın.",
        "en": "Email already registered. Sign in to link Google.",
    },
    "GOOGLE_TOKEN_INVALID": {
        "tr": "Google oturumu geçersiz veya süresi dolmuş.",
        "en": "Google token is invalid or expired.",
    },
    "PLAN_GENERATION_FAILED": {
        "tr": "Plan oluşturulamadı.",
        "en": "Plan generation failed.",
    },
    "QUOTA_EXCEEDED": {
        "tr": "Plan kotanız doldu. Pro'ya geçerek devam edebilirsiniz.",
        "en": "Quota exceeded. Upgrade to Pro to continue.",
    },
}


def localized_message(code: str, locale: str, override: str | None = None) -> str:
    if override:
        return override
    entry = MESSAGES.get(code, {})
    return entry.get(locale) or entry.get("tr") or code


class APIError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "VALIDATION_ERROR"

    def __init__(self, code=None, message=None, details=None, status_code=None):
        self.code = code or self.default_code
        if status_code is not None:
            self.status_code = status_code
        self.message = message
        self.details = details or {}
        super().__init__(detail=message or self.code)


def error_response(
    code: str,
    message: str | None,
    details: dict | None,
    http_status: int,
    locale: str,
):
    return Response(
        {
            "error": {
                "code": code,
                "message": localized_message(code, locale, message),
                "details": details or {},
            }
        },
        status=http_status,
    )


def api_exception_handler(exc, context):
    request = context.get("request")
    locale = getattr(request, "locale", settings.NOTCERY_DEFAULT_LOCALE) if request else "tr"

    if isinstance(exc, APIError):
        return error_response(exc.code, exc.message, exc.details, exc.status_code, locale)

    response = exception_handler(exc, context)
    if response is None:
        return None

    code = "VALIDATION_ERROR"
    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        code = "UNAUTHORIZED"
    elif response.status_code == status.HTTP_403_FORBIDDEN:
        code = "FORBIDDEN"
    elif response.status_code == status.HTTP_404_NOT_FOUND:
        code = "NOT_FOUND"
    elif response.status_code == status.HTTP_409_CONFLICT:
        code = "CONFLICT"
    elif response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        code = "RATE_LIMITED"

    details = {}
    message = None
    if isinstance(response.data, dict):
        if "detail" in response.data:
            detail = response.data["detail"]
            message = str(detail) if not isinstance(detail, list) else str(detail[0])
        else:
            details = response.data
    elif isinstance(response.data, list):
        message = str(response.data[0]) if response.data else None

    if code in MESSAGES:
        message = None

    return error_response(code, message, details, response.status_code, locale)
