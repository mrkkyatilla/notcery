from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from apps.core.exceptions import APIError


def verify_google_id_token(token: str) -> dict:
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise APIError(
            code="GOOGLE_TOKEN_INVALID",
            message="Google OAuth is not configured.",
            status_code=401,
        )
    try:
        payload = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
        )
    except ValueError as exc:
        raise APIError(
            code="GOOGLE_TOKEN_INVALID",
            status_code=401,
        ) from exc

    if not payload.get("email_verified"):
        raise APIError(
            code="GOOGLE_TOKEN_INVALID",
            message="Google email is not verified.",
            status_code=401,
        )
    return payload
