import io

from pypdf import PdfReader


def extract_text_from_bytes(data: bytes, mime_type: str) -> str:
    mime = (mime_type or "").lower()
    if mime == "application/pdf":
        return _extract_pdf(data)
    if mime in ("text/plain", "text/markdown"):
        return data.decode("utf-8", errors="replace")
    raise ValueError(f"Unsupported mime type: {mime_type}")


def _extract_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    pages: list[str] = []
    for _index, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            pages.append(page_text.strip())
    return "\n\n".join(pages)
