from celery import shared_task

from apps.lab.indexing import index_lab_file


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def index_lab_file_task(self, lab_file_id: str):
    try:
        index_lab_file(lab_file_id)
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            raise
        raise self.retry(exc=exc) from exc


@shared_task(bind=True, max_retries=1, default_retry_delay=30)
def import_lab_project_task(self, import_id: str):
    from apps.lab.importing.runner import run_lab_import

    try:
        run_lab_import(import_id)
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            raise
        raise self.retry(exc=exc) from exc
