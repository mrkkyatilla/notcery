"""Optional HTTP(S) proxy for Google Gemini API calls only (not Storj/boto3)."""

from __future__ import annotations

import os
from contextlib import contextmanager

from django.conf import settings

_PROXY_ENV_KEYS = (
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "http_proxy",
    "https_proxy",
    "ALL_PROXY",
    "all_proxy",
)

_logged_proxy = False


def gemini_http_proxy_url() -> str:
    return (
        os.environ.get("GEMINI_HTTP_PROXY", "").strip()
        or getattr(settings, "GEMINI_HTTP_PROXY", "").strip()
    )


@contextmanager
def gemini_http_proxy():
    """
    Temporarily set process proxy env vars for google-generativeai (uses requests/urllib3).
    Does not affect boto3/Storj when GEMINI_HTTP_PROXY is used instead of global HTTPS_PROXY.
    """
    global _logged_proxy
    proxy = gemini_http_proxy_url()
    if not proxy:
        yield
        return

    if not _logged_proxy:
        import logging

        logging.getLogger(__name__).info("Gemini API traffic using GEMINI_HTTP_PROXY")
        _logged_proxy = True

    saved = {key: os.environ.get(key) for key in _PROXY_ENV_KEYS}
    for key in _PROXY_ENV_KEYS:
        os.environ[key] = proxy
    try:
        yield
    finally:
        for key, value in saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
