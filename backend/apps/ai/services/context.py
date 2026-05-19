from apps.indexer.retrieval import RetrievedChunk

MAX_CONTEXT_CHARS = 12_000
MAX_CHUNK_CHARS = 1_500


def format_rag_context(chunks: list[RetrievedChunk]) -> tuple[str, list[str]]:
    if not chunks:
        return "(no indexed context retrieved)", []

    parts: list[str] = []
    chunk_ids: list[str] = []
    total = 0

    for chunk in chunks:
        chunk_id = str(chunk.id)
        chunk_ids.append(chunk_id)
        text = chunk.text[:MAX_CHUNK_CHARS]
        block = (
            f"[chunk_id={chunk_id} source={chunk.source_type} score={chunk.score}]\n{text}"
        )
        if total + len(block) > MAX_CONTEXT_CHARS:
            break
        parts.append(block)
        total += len(block)

    return "\n\n---\n\n".join(parts), chunk_ids


def chunks_to_citations(chunks: list[RetrievedChunk]) -> list[dict]:
    citations = []
    for chunk in chunks:
        excerpt = chunk.text[:300] + ("…" if len(chunk.text) > 300 else "")
        citations.append(
            {
                "type": "chunk",
                "chunk_id": str(chunk.id),
                "source_type": chunk.source_type,
                "document_id": str(chunk.document_id) if chunk.document_id else None,
                "note_id": str(chunk.note_id) if chunk.note_id else None,
                "excerpt": excerpt,
            }
        )
    return citations
