"""Text extraction for Lab files (MVP: reuse indexer PDF/plain; extend in Faz 2)."""

import os

from apps.indexer.parsing import extract_text_from_bytes

# Extension → mime for extraction routing
EXTENSION_MIME = {
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".markdown": "text/markdown",
    ".json": "application/json",
    ".csv": "text/plain",
    ".html": "text/html",
    ".htm": "text/html",
    ".xml": "text/plain",
    ".py": "text/plain",
    ".js": "text/plain",
    ".ts": "text/plain",
    ".tsx": "text/plain",
    ".jsx": "text/plain",
    ".go": "text/plain",
    ".rs": "text/plain",
    ".java": "text/plain",
    ".c": "text/plain",
    ".cpp": "text/plain",
    ".h": "text/plain",
    ".sql": "text/plain",
    ".yaml": "text/plain",
    ".yml": "text/plain",
    ".sh": "text/plain",
    ".rb": "text/plain",
    ".php": "text/plain",
    ".swift": "text/plain",
    ".kt": "text/plain",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".zip": "application/zip",
}

TEXT_PREVIEW_EXTENSIONS = {
    ext
    for ext, mime in EXTENSION_MIME.items()
    if mime.startswith("text/") or mime in ("application/json", "image/svg+xml")
}


def is_text_previewable(filename: str, mime_type: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    if ext in TEXT_PREVIEW_EXTENSIONS:
        return True
    effective = guess_mime_from_name(filename, mime_type)
    return effective.startswith("text/") or effective == "application/json"


def is_image_previewable(filename: str, mime_type: str) -> bool:
    effective = guess_mime_from_name(filename, mime_type)
    return effective.startswith("image/") and effective != "image/svg+xml"


def is_pdf_previewable(filename: str, mime_type: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext == ".pdf" or guess_mime_from_name(filename, mime_type) == "application/pdf"


def guess_mime_from_name(filename: str, declared_mime: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext in EXTENSION_MIME:
        return EXTENSION_MIME[ext]
    # Browsers often mis-detect code (e.g. .ts/.tsx → video/mp2t).
    if declared_mime and declared_mime not in (
        "application/octet-stream",
        "video/mp2t",
        "video/vnd.dlna.mpeg-tts",
    ):
        return declared_mime
    return "text/plain"


def extract_lab_text(data: bytes, filename: str, mime_type: str) -> str:
    effective = guess_mime_from_name(filename, mime_type)
    if effective.startswith("text/") or effective == "application/json":
        return data.decode("utf-8", errors="replace")
    if effective == "application/pdf":
        return extract_text_from_bytes(data, effective)
    # Fallback: try plain decode for unknown code files
    try:
        return data.decode("utf-8", errors="replace")
    except Exception as exc:
        raise ValueError(f"Unsupported file type for indexing: {mime_type}") from exc
