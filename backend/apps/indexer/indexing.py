import logging

from django.db import transaction
from django.utils import timezone

from apps.indexer.chunking import split_text
from apps.indexer.embeddings import get_embedder
from apps.indexer.models import (
    ChunkSourceType,
    Document,
    DocumentStatus,
    IndexerChunk,
)
from apps.indexer.parsing import extract_text_from_bytes
from apps.indexer.storage import download_file_bytes
from apps.notes.models import Note
from apps.planner.models import StudyEvent, UserFeedback

logger = logging.getLogger(__name__)


def _write_chunks(
    *,
    workspace,
    source_type: str,
    texts: list[str],
    document=None,
    note=None,
    base_metadata: dict | None = None,
) -> int:
    if not texts:
        return 0
    embedder = get_embedder()
    vectors = embedder.embed_texts(texts)
    IndexerChunk.objects.filter(
        workspace=workspace,
        source_type=source_type,
        document=document,
        note=note,
    ).delete()

    chunks = []
    for index, (text, vector) in enumerate(zip(texts, vectors, strict=True)):
        metadata = dict(base_metadata or {})
        metadata["chunk_index"] = index
        chunks.append(
            IndexerChunk(
                workspace=workspace,
                document=document,
                note=note,
                source_type=source_type,
                chunk_index=index,
                text=text,
                embedding=vector,
                metadata=metadata,
            )
        )
    IndexerChunk.objects.bulk_create(chunks, batch_size=100)
    return len(chunks)


@transaction.atomic
def index_document(document_id) -> None:
    document = Document.objects.select_related("workspace", "subject").get(id=document_id)
    document.status = DocumentStatus.PROCESSING
    document.error_message = ""
    document.save(update_fields=["status", "error_message", "updated_at"])

    try:
        raw = download_file_bytes(document.file_key)
        text = extract_text_from_bytes(raw, document.mime_type)
        parts = split_text(text)
        if not parts:
            raise ValueError("No extractable text in document.")

        metadata = {
            "filename": document.original_filename,
            "subject_id": str(document.subject_id) if document.subject_id else None,
        }
        _write_chunks(
            workspace=document.workspace,
            source_type=ChunkSourceType.DOCUMENT,
            texts=parts,
            document=document,
            base_metadata=metadata,
        )
        document.status = DocumentStatus.READY
        document.save(update_fields=["status", "updated_at"])
    except Exception as exc:
        logger.exception("Document indexing failed: %s", document_id)
        document.status = DocumentStatus.FAILED
        document.error_message = str(exc)[:2000]
        document.save(update_fields=["status", "error_message", "updated_at"])
        raise


@transaction.atomic
def index_note(note_id) -> None:
    note = Note.objects.select_related("workspace", "subject").get(id=note_id)
    if not note.content_plain.strip():
        IndexerChunk.objects.filter(
            workspace=note.workspace, source_type=ChunkSourceType.NOTE, note=note
        ).delete()
        note.indexed_at = timezone.now()
        note.save(update_fields=["indexed_at"])
        return

    title_prefix = f"{note.title}\n\n" if note.title else ""
    parts = split_text(f"{title_prefix}{note.content_plain}")
    metadata = {
        "note_title": note.title,
        "subject_id": str(note.subject_id) if note.subject_id else None,
    }
    _write_chunks(
        workspace=note.workspace,
        source_type=ChunkSourceType.NOTE,
        texts=parts,
        note=note,
        base_metadata=metadata,
    )
    note.indexed_at = timezone.now()
    note.save(update_fields=["indexed_at"])


def index_study_event_feedback(event_id) -> None:
    event = StudyEvent.objects.select_related("workspace", "subject").get(id=event_id)
    if event.user_feedback != UserFeedback.HARD:
        return

    subject_name = event.subject.name if event.subject else "Genel"
    date_str = event.start_at.date().isoformat()
    text = (
        f"{subject_name}: {date_str} — kullanıcı bu çalışmada zorlandı. "
        f"Etkinlik: {event.title}. Yöntem: {event.method}."
    )
    IndexerChunk.objects.filter(
        workspace=event.workspace,
        source_type=ChunkSourceType.PERFORMANCE,
        metadata__study_event_id=str(event.id),
    ).delete()

    embedder = get_embedder()
    vector = embedder.embed_texts([text])[0]
    IndexerChunk.objects.create(
        workspace=event.workspace,
        source_type=ChunkSourceType.PERFORMANCE,
        chunk_index=0,
        text=text,
        embedding=vector,
        metadata={
            "study_event_id": str(event.id),
            "subject_id": str(event.subject_id) if event.subject_id else None,
            "date": date_str,
        },
    )
