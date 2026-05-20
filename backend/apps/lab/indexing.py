import logging

from django.db import transaction
from django.utils import timezone

from apps.ai.services.text_cleanup import clean_rag_text
from apps.indexer.chunking import split_text
from apps.indexer.embeddings import get_embedder
from apps.lab.models import LabChunk, LabFile, LabIndexStatus
from apps.lab.parsing import extract_lab_text
from apps.lab.storage import download_file_bytes

logger = logging.getLogger(__name__)


def _write_lab_chunks(*, workspace, lab_file: LabFile, texts: list[str]) -> int:
    if not texts:
        return 0
    embedder = get_embedder()
    vectors = embedder.embed_texts(texts)
    LabChunk.objects.filter(lab_file=lab_file).delete()
    chunks = []
    for index, (text, vector) in enumerate(zip(texts, vectors, strict=True)):
        chunks.append(
            LabChunk(
                workspace=workspace,
                lab_file=lab_file,
                chunk_index=index,
                text=text,
                embedding=vector,
                metadata={
                    "filename": lab_file.name,
                    "summary_level": "detail",
                },
            )
        )
    LabChunk.objects.bulk_create(chunks, batch_size=100)
    return len(chunks)


@transaction.atomic
def index_lab_file(lab_file_id) -> None:
    lab_file = LabFile.objects.select_related("workspace").get(id=lab_file_id)
    lab_file.index_status = LabIndexStatus.PROCESSING
    lab_file.error_message = ""
    lab_file.save(update_fields=["index_status", "error_message", "updated_at"])

    try:
        raw = download_file_bytes(lab_file.file_key)
        text = extract_lab_text(raw, lab_file.name, lab_file.mime_type)
        text = clean_rag_text(text, max_len=500_000)
        parts = split_text(text)
        if not parts:
            raise ValueError("No extractable text in file.")

        count = _write_lab_chunks(workspace=lab_file.workspace, lab_file=lab_file, texts=parts)
        if count == 0:
            raise ValueError("Indexing produced no chunks.")

        lab_file.index_status = LabIndexStatus.READY
        lab_file.save(update_fields=["index_status", "updated_at"])
    except Exception as exc:
        logger.exception("Lab file indexing failed: %s", lab_file_id)
        lab_file.index_status = LabIndexStatus.FAILED
        lab_file.error_message = str(exc)[:2000]
        lab_file.save(update_fields=["index_status", "error_message", "updated_at"])
        raise
