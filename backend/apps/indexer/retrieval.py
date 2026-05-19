import os
import re
from dataclasses import dataclass
from uuid import UUID

from django.conf import settings
from django.db.models import Q
from pgvector.django import CosineDistance

from apps.indexer.embeddings import get_embedder
from apps.indexer.models import IndexerChunk
from apps.planner.models import Workspace


@dataclass
class RetrievedChunk:
    id: UUID
    text: str
    score: float
    source_type: str
    document_id: UUID | None
    note_id: UUID | None
    metadata: dict


def retrieve(
    workspace: Workspace,
    query: str,
    *,
    top_k: int = 8,
    subject_id: UUID | None = None,
    source_types: list[str] | None = None,
) -> list[RetrievedChunk]:
    if not query.strip():
        return []

    query_vector = get_embedder().embed_query(query.strip())
    qs = IndexerChunk.objects.filter(workspace=workspace).annotate(
        distance=CosineDistance("embedding", query_vector)
    )

    if subject_id:
        sid = str(subject_id)
        qs = qs.filter(Q(metadata__subject_id=sid) | Q(metadata__subject_id__isnull=True))

    if source_types:
        qs = qs.filter(source_type__in=source_types)

    min_similarity = float(getattr(settings, "INDEXER_MIN_SIMILARITY", 0.35))
    use_mock = os.environ.get("INDEXER_EMBEDDING_BACKEND", "") == "mock" or getattr(
        settings, "INDEXER_EMBEDDING_BACKEND", ""
    ) == "mock"
    results: list[RetrievedChunk] = []
    for chunk in qs.order_by("distance")[: top_k * 2]:
        similarity = 1 - float(chunk.distance)
        if use_mock:
            overlap = _keyword_overlap_score(query, chunk.text)
            similarity = max(similarity, overlap)
        if similarity < min_similarity:
            continue
        results.append(
            RetrievedChunk(
                id=chunk.id,
                text=chunk.text,
                score=round(similarity, 4),
                source_type=chunk.source_type,
                document_id=chunk.document_id,
                note_id=chunk.note_id,
                metadata=chunk.metadata,
            )
        )
        if len(results) >= top_k:
            break
    return results


def _keyword_overlap_score(query: str, text: str) -> float:
    """Lexical fallback for mock embeddings in tests."""
    query_words = {w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 2}
    text_words = {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2}
    if not query_words:
        return 0.0
    return len(query_words & text_words) / len(query_words)
