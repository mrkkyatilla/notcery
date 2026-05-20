"""Normalize text from PDF chunks and RAG context for prompts and display."""

from __future__ import annotations

import re
import unicodedata

# Common PDF extraction artifacts (private-use / missing glyphs)
_REPLACEMENT_CHARS = re.compile(r"[\ufffd\u0000-\u0008\u000b\u000c\u000e-\u001f]")


def clean_rag_text(text: str, *, max_len: int = 1200) -> str:
    """Make indexer text safer for LLM prompts (drop control chars, collapse noise)."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = _REPLACEMENT_CHARS.sub(" ", text)
    text = "".join(c if (c.isprintable() or c in "\n\t") else " " for c in text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:max_len]
