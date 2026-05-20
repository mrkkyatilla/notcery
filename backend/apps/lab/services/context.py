from apps.ai.services.text_cleanup import clean_rag_text
from apps.lab.models import LabFile
from apps.lab.retrieval import LabRetrievedChunk

MAX_CONTEXT_CHARS = 20_000
MAX_CHUNK_CHARS = 1_800


def chunk_source_label(chunk: LabRetrievedChunk) -> str:
    meta = chunk.metadata or {}
    return str(meta.get("filename") or "file")


def format_lab_rag_context(chunks: list[LabRetrievedChunk]) -> tuple[str, list[str]]:
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
            f"[source={label} file_id={chunk.lab_file_id} relevance={chunk.score}]\n{text}"
        )
        if total + len(block) > MAX_CONTEXT_CHARS:
            break
        parts.append(block)
        total += len(block)

    return "\n\n---\n\n".join(parts), chunk_ids


def chunks_to_lab_citations(chunks: list[LabRetrievedChunk]) -> list[dict]:
    seen: set[str] = set()
    citations: list[dict] = []
    for chunk in chunks:
        fid = str(chunk.lab_file_id)
        if fid in seen:
            continue
        seen.add(fid)
        citations.append(
            {
                "type": "lab_file",
                "chunk_id": str(chunk.id),
                "lab_file_id": fid,
                "label": chunk_source_label(chunk),
                "excerpt": "",
            }
        )
    return citations


def resolve_file_labels(file_ids: list) -> dict[str, str]:
    if not file_ids:
        return {}
    rows = LabFile.objects.filter(id__in=file_ids).values_list("id", "name")
    return {str(row_id): name for row_id, name in rows}
