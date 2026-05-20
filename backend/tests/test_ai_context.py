from uuid import uuid4

from apps.ai.services.context import chunk_source_label, chunks_to_citations, format_rag_context
from apps.indexer.retrieval import RetrievedChunk


def _chunk(**kwargs) -> RetrievedChunk:
    defaults = {
        "id": uuid4(),
        "text": "Integral \ufffd garbled",
        "score": 0.9,
        "source_type": "document",
        "document_id": uuid4(),
        "note_id": None,
        "metadata": {"filename": "calc.pdf"},
    }
    defaults.update(kwargs)
    return RetrievedChunk(**defaults)


def test_format_rag_context_cleans_text():
    ctx, ids = format_rag_context([_chunk()])
    assert "calc.pdf" in ctx
    assert "\ufffd" not in ctx
    assert len(ids) == 1


def test_chunks_to_citations_dedupes_and_labels():
    doc_id = uuid4()
    chunks = [
        _chunk(document_id=doc_id, text="a"),
        _chunk(id=uuid4(), document_id=doc_id, text="b"),
    ]
    citations = chunks_to_citations(chunks)
    assert len(citations) == 1
    assert citations[0]["label"] == "calc.pdf"
    assert citations[0]["excerpt"] == ""
