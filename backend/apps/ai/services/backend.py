import os

from django.conf import settings


def resolve_ai_backend() -> str:
    backend = os.environ.get("AI_BACKEND") or getattr(settings, "AI_BACKEND", "auto")
    if backend == "auto":
        if getattr(settings, "GEMINI_API_KEY", ""):
            return "gemini"
        return "mock"
    return backend
