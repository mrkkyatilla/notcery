import hashlib
import math
import os
from abc import ABC, abstractmethod

from apps.core.gemini_proxy import gemini_http_proxy
from apps.indexer.models import EMBEDDING_DIMENSIONS


class BaseEmbedder(ABC):
    @abstractmethod
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        pass

    def embed_query(self, query: str) -> list[float]:
        return self.embed_texts([query])[0]


class MockEmbedder(BaseEmbedder):
    """Deterministic pseudo-embeddings for tests (no API calls)."""

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [_hash_to_vector(text) for text in texts]


class GeminiEmbedder(BaseEmbedder):
    def __init__(self, model_name: str | None = None):
        import google.generativeai as genai

        from django.conf import settings

        api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured.")
        genai.configure(api_key=api_key)
        self._model = model_name or os.environ.get(
            "GEMINI_EMBEDDING_MODEL",
            getattr(settings, "GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001"),
        )

    def embed_texts(
        self,
        texts: list[str],
        *,
        task_type: str = "retrieval_document",
    ) -> list[list[float]]:
        import google.generativeai as genai

        if not texts:
            return []
        with gemini_http_proxy():
            result = genai.embed_content(
                model=self._model,
                content=texts,
                task_type=task_type,
                output_dimensionality=EMBEDDING_DIMENSIONS,
            )
        embeddings = result.get("embedding") if isinstance(result, dict) else None
        if embeddings is None:
            embeddings = getattr(result, "embedding", None)
        if embeddings is None:
            raise RuntimeError("Unexpected embedding response from Gemini.")
        if texts and isinstance(embeddings[0], (int, float)):
            vectors = [list(embeddings)]
        else:
            vectors = [list(vector) for vector in embeddings]
        return [_normalize_vector(vector) for vector in vectors]

    def embed_query(self, query: str) -> list[float]:
        return self.embed_texts([query], task_type="retrieval_query")[0]


def _normalize_vector(vector: list[float]) -> list[float]:
    if len(vector) == EMBEDDING_DIMENSIONS:
        return vector
    if len(vector) > EMBEDDING_DIMENSIONS:
        return vector[:EMBEDDING_DIMENSIONS]
    raise RuntimeError(
        f"Embedding dimension {len(vector)} != {EMBEDDING_DIMENSIONS}. "
        "Set output_dimensionality on GEMINI_EMBEDDING_MODEL or re-index content."
    )


def _hash_to_vector(text: str) -> list[float]:
    digest = hashlib.sha256(text.lower().encode("utf-8")).digest()
    values = []
    for index in range(EMBEDDING_DIMENSIONS):
        byte = digest[index % len(digest)]
        values.append((byte / 127.5) - 1.0)
    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / norm for value in values]


def get_embedder() -> BaseEmbedder:
    backend = os.environ.get("INDEXER_EMBEDDING_BACKEND", "auto").lower()
    if backend == "mock":
        return MockEmbedder()
    if backend == "gemini":
        return GeminiEmbedder()
    if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
        return GeminiEmbedder()
    return MockEmbedder()
