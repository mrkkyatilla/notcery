from apps.indexer.indexing import index_document, index_note, index_study_event_feedback
from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def index_document_task(self, document_id: str):
    try:
        index_document(document_id)
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            raise
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=3, default_retry_delay=15)
def index_note_task(self, note_id: str):
    try:
        index_note(note_id)
    except Exception as exc:
        raise self.retry(exc=exc) from exc


@shared_task
def index_study_event_feedback_task(event_id: str):
    index_study_event_feedback(event_id)
