from apps.ai.services.text_cleanup import clean_rag_text
from apps.indexer.retrieval import RetrievedChunk

MAX_CONTEXT_CHARS = 12_000
MAX_CHUNK_CHARS = 1_500


def chunk_source_label(chunk: RetrievedChunk) -> str:
    meta = chunk.metadata or {}
    if chunk.source_type == "document":
        return str(meta.get("filename") or "Document")
    if chunk.source_type == "note":
        return str(meta.get("note_title") or "Note")
    if chunk.source_type == "performance":
        return "Study feedback"
    return chunk.source_type


def format_rag_context(chunks: list[RetrievedChunk]) -> tuple[str, list[str]]:
    if not chunks:
        return "(no indexed context retrieved)", []

    parts: list[str] = []
    chunk_ids: list[str] = []
    total = 0

    for chunk in chunks:
        chunk_id = str(chunk.id)
        chunk_ids.append(chunk_id)
        label = chunk_source_label(chunk)
        text = clean_rag_text(chunk.text, max_len=MAX_CHUNK_CHARS)
        block = (
            f"[source={label} type={chunk.source_type} relevance={chunk.score}]\n{text}"
        )
        if total + len(block) > MAX_CONTEXT_CHARS:
            break
        parts.append(block)
        total += len(block)

    return "\n\n---\n\n".join(parts), chunk_ids


def chunks_to_citations(chunks: list[RetrievedChunk]) -> list[dict]:
    """One UI citation per document/note (filename only — no excerpt body)."""
    seen: set[tuple[str | None, str | None, str]] = set()
    citations: list[dict] = []
    for chunk in chunks:
        dedupe_key = (
            str(chunk.document_id) if chunk.document_id else None,
            str(chunk.note_id) if chunk.note_id else None,
            chunk.source_type,
        )
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        citations.append(
            {
                "type": "chunk",
                "chunk_id": str(chunk.id),
                "source_type": chunk.source_type,
                "document_id": str(chunk.document_id) if chunk.document_id else None,
                "note_id": str(chunk.note_id) if chunk.note_id else None,
                "label": chunk_source_label(chunk),
                "excerpt": "",
            }
        )
    return citations
