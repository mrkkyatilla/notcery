import os
import re
from dataclasses import dataclass
from uuid import UUID

from django.conf import settings
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import F, FloatField, Value
from django.db.models.functions import Coalesce, Greatest
from pgvector.django import CosineDistance

from apps.indexer.embeddings import get_embedder
from apps.lab.models import LabChunk
from apps.planner.models import Workspace


@dataclass
class LabRetrievedChunk:
    id: UUID
    text: str
    score: float
    lab_file_id: UUID
    metadata: dict


def retrieve_lab(
    workspace: Workspace,
    query: str,
    *,
    top_k: int | None = None,
    active_file_ids: list[UUID] | None = None,
) -> list[LabRetrievedChunk]:
    if not query.strip():
        return []

    top_k = top_k or int(getattr(settings, "LAB_TOP_K", 12))
    min_similarity = float(getattr(settings, "LAB_MIN_SIMILARITY", 0.32))
    lexical_weight = float(getattr(settings, "LAB_HYBRID_LEXICAL_WEIGHT", 0.35))
    vector_weight = 1.0 - lexical_weight

    query_vector = get_embedder().embed_query(query.strip())
    qs = LabChunk.objects.filter(workspace=workspace).annotate(
        distance=CosineDistance("embedding", query_vector),
        vector_score=Greatest(Value(0.0), 1.0 - F("distance"), output_field=FloatField()),
        lexical_score=Coalesce(
            TrigramSimilarity("text", query.strip()),
            Value(0.0),
            output_field=FloatField(),
        ),
        hybrid_score=F("vector_score") * vector_weight + F("lexical_score") * lexical_weight,
    )

    if active_file_ids:
        qs = qs.filter(lab_file_id__in=active_file_ids)

    use_mock = os.environ.get("INDEXER_EMBEDDING_BACKEND", "") == "mock" or getattr(
        settings, "INDEXER_EMBEDDING_BACKEND", ""
    ) == "mock"
    results: list[LabRetrievedChunk] = []
    for chunk in qs.order_by("-hybrid_score")[: top_k * 3]:
        score = float(getattr(chunk, "hybrid_score", 0) or 0)
        vector_sim = float(getattr(chunk, "vector_score", 0) or 0)
        if use_mock:
            overlap = _keyword_overlap_score(query, chunk.text)
            score = max(score, overlap)
            vector_sim = max(vector_sim, overlap)
        if vector_sim < min_similarity and score < min_similarity:
            continue
        results.append(
            LabRetrievedChunk(
                id=chunk.id,
                text=chunk.text,
                score=round(score, 4),
                lab_file_id=chunk.lab_file_id,
                metadata=chunk.metadata or {},
            )
        )
        if len(results) >= top_k:
            break
    return results


def _keyword_overlap_score(query: str, text: str) -> float:
    query_words = {w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 2}
    text_words = {w for w in re.findall(r"[a-z0-9]+", text.lower()) if len(w) > 2}
    if not query_words:
        return 0.0
    return len(query_words & text_words) / len(query_words)
