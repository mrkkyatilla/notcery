import json
import logging
from datetime import UTC, datetime

from apps.core.request_context import request_id_ctx, user_id_ctx


class JsonLogFormatter(logging.Formatter):
    """Emit one JSON object per log line for production aggregators."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", request_id_ctx.get()),
            "user_id": getattr(record, "user_id", user_id_ctx.get()),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        for key in ("method", "path", "status", "duration_ms", "task_id"):
            if hasattr(record, key):
                value = getattr(record, key)
                if value is not None:
                    payload[key] = value
        return json.dumps(payload, ensure_ascii=False)


class RequestContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        record.user_id = user_id_ctx.get()
        return True
