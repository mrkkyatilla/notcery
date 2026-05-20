"""Strip Markdown to plain text for search indexing and RAG."""

import re

_FENCE_RE = re.compile(r"```[\w-]*\n.*?```", re.DOTALL)
_INLINE_CODE_RE = re.compile(r"`[^`]+`")
_HTML_TAG_RE = re.compile(r"<[^>]+>")
_IMAGE_RE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")
_LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_HEADING_RE = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_BLOCKQUOTE_RE = re.compile(r"^>\s?", re.MULTILINE)
_LIST_MARKER_RE = re.compile(r"^[\s]*[-*+]\s+(\[[ xX]\]\s+)?", re.MULTILINE)
_ORDERED_LIST_RE = re.compile(r"^[\s]*\d+\.\s+", re.MULTILINE)
_HR_RE = re.compile(r"^[-*_]{3,}\s*$", re.MULTILINE)
_MATH_DISPLAY_RE = re.compile(r"\$\$.*?\$\$", re.DOTALL)
_MATH_INLINE_RE = re.compile(r"(?<!\$)\$(?!\$)([^\$]+)\$(?!\$)")


def strip_markdown(content_markdown: str | None) -> str:
    if not content_markdown:
        return ""
    text = content_markdown
    text = _FENCE_RE.sub(" ", text)
    text = _INLINE_CODE_RE.sub(" ", text)
    text = _HTML_TAG_RE.sub(" ", text)
    text = _IMAGE_RE.sub(r"\1", text)
    text = _LINK_RE.sub(r"\1", text)
    text = _MATH_DISPLAY_RE.sub(" ", text)
    text = _MATH_INLINE_RE.sub(r"\1", text)
    text = _HEADING_RE.sub("", text)
    text = _BLOCKQUOTE_RE.sub("", text)
    text = _LIST_MARKER_RE.sub("", text)
    text = _ORDERED_LIST_RE.sub("", text)
    text = _HR_RE.sub("", text)
    text = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", text)
    text = re.sub(r"_{1,3}([^_]+)_{1,3}", r"\1", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()
