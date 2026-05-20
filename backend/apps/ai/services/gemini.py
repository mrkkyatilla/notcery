import json
import logging
import time
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT_SECONDS = 60
MAX_RETRIES = 3
RETRYABLE_STATUS_HINTS = ("429", "503", "resource_exhausted", "unavailable")


class GeminiClientError(Exception):
    pass


def _configure():
    import google.generativeai as genai

    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        raise GeminiClientError("GEMINI_API_KEY is not configured.")
    genai.configure(api_key=api_key)
    return genai


def generate_json(
    prompt: str,
    *,
    model_name: str | None = None,
    response_schema: dict[str, Any] | None = None,
    max_retries: int = MAX_RETRIES,
) -> dict[str, Any]:
    genai = _configure()
    model_id = model_name or getattr(
        settings, "GEMINI_PLAN_MODEL", "models/gemini-2.5-flash"
    )
    generation_config: dict[str, Any] = {
        "response_mime_type": "application/json",
    }
    if response_schema:
        generation_config["response_schema"] = response_schema

    model = genai.GenerativeModel(model_id, generation_config=generation_config)
    last_error: Exception | None = None

    for attempt in range(max_retries):
        try:
            started = time.monotonic()
            response = model.generate_content(
                prompt,
                request_options={"timeout": DEFAULT_TIMEOUT_SECONDS},
            )
            elapsed_ms = int((time.monotonic() - started) * 1000)
            text = (response.text or "").strip()
            logger.info("Gemini JSON call model=%s ms=%s chars=%s", model_id, elapsed_ms, len(text))
            if not text:
                raise GeminiClientError("Empty response from Gemini.")
            return json.loads(text)
        except Exception as exc:
            last_error = exc
            if not _is_retryable(exc) or attempt >= max_retries - 1:
                raise GeminiClientError(str(exc)) from exc
            delay = 2**attempt
            logger.warning("Gemini retry %s/%s after %ss: %s", attempt + 1, max_retries, delay, exc)
            time.sleep(delay)

    raise GeminiClientError(str(last_error or "Unknown Gemini error"))


def generate_text(
    system_prompt: str,
    user_message: str,
    *,
    model_name: str | None = None,
    max_retries: int = MAX_RETRIES,
) -> str:
    genai = _configure()
    model_id = model_name or getattr(
        settings, "GEMINI_CHAT_MODEL", "models/gemini-2.5-flash"
    )
    model = genai.GenerativeModel(model_id)
    prompt = f"{system_prompt}\n\nUser:\n{user_message}"
    last_error: Exception | None = None

    for attempt in range(max_retries):
        try:
            started = time.monotonic()
            response = model.generate_content(
                prompt,
                request_options={"timeout": DEFAULT_TIMEOUT_SECONDS},
            )
            elapsed_ms = int((time.monotonic() - started) * 1000)
            text = (response.text or "").strip()
            logger.info("Gemini chat model=%s ms=%s chars=%s", model_id, elapsed_ms, len(text))
            if not text:
                raise GeminiClientError("Empty chat response from Gemini.")
            return text
        except Exception as exc:
            last_error = exc
            if not _is_retryable(exc) or attempt >= max_retries - 1:
                raise GeminiClientError(str(exc)) from exc
            time.sleep(2**attempt)

    raise GeminiClientError(str(last_error or "Unknown Gemini error"))


def _is_retryable(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(hint in message for hint in RETRYABLE_STATUS_HINTS)
