"""Start Lab bulk import jobs."""

from __future__ import annotations

import os

from django.conf import settings

from apps.billing.models import UsageMetric
from apps.billing.quota import enforce_quota
from apps.lab.importing.git_import import validate_git_url
from apps.lab.importing.pipeline import ensure_import_root_folder
from apps.lab.models import LabImport, LabImportSourceType, LabImportStatus
from apps.lab.tasks import import_lab_project_task
def _resolve_parent_folder(workspace, parent_folder_id):
    from apps.lab.vfs import ensure_root_folder, resolve_parent_folder

    if parent_folder_id is None:
        return ensure_root_folder(workspace)
    return resolve_parent_folder(workspace, parent_folder_id)


def start_zip_import(
    *,
    workspace,
    user,
    file_key: str,
    original_filename: str,
    size_bytes: int,
    parent_folder_id=None,
    label: str | None = None,
) -> LabImport:
    max_zip = int(getattr(settings, "LAB_IMPORT_ZIP_MAX_BYTES", 200 * 1024 * 1024))
    if size_bytes > max_zip:
        raise ValueError("Zip archive exceeds size limit.")
    enforce_quota(user, UsageMetric.STORAGE_BYTES, extra_bytes=size_bytes)

    display = (label or "").strip() or os.path.splitext(original_filename)[0]
    parent = _resolve_parent_folder(workspace, parent_folder_id)
    root_folder = ensure_import_root_folder(
        workspace, label=display, parent_folder=parent
    )

    lab_import = LabImport.objects.create(
        workspace=workspace,
        created_by=user,
        status=LabImportStatus.PENDING,
        source_type=LabImportSourceType.ZIP,
        source_label=original_filename,
        source_payload={"file_key": file_key, "size_bytes": size_bytes},
        root_folder=root_folder,
        stats={"total_candidates": 0, "imported": 0, "skipped": 0, "failed": 0},
    )
    result = import_lab_project_task.delay(str(lab_import.id))
    lab_import.celery_task_id = result.id or ""
    lab_import.save(update_fields=["celery_task_id", "updated_at"])
    return lab_import


def start_git_import(
    *,
    workspace,
    user,
    url: str,
    branch: str | None = None,
    parent_folder_id=None,
    label: str | None = None,
) -> LabImport:
    url = validate_git_url(url)
    enforce_quota(user, UsageMetric.STORAGE_BYTES, extra_bytes=0)

    display = (label or "").strip() or url.rstrip("/").split("/")[-1].replace(".git", "")
    parent = _resolve_parent_folder(workspace, parent_folder_id)
    root_folder = ensure_import_root_folder(
        workspace, label=display, parent_folder=parent
    )

    lab_import = LabImport.objects.create(
        workspace=workspace,
        created_by=user,
        status=LabImportStatus.PENDING,
        source_type=LabImportSourceType.GIT,
        source_label=url,
        source_payload={"url": url, "branch": branch or ""},
        root_folder=root_folder,
        stats={"total_candidates": 0, "imported": 0, "skipped": 0, "failed": 0},
    )
    result = import_lab_project_task.delay(str(lab_import.id))
    lab_import.celery_task_id = result.id or ""
    lab_import.save(update_fields=["celery_task_id", "updated_at"])
    return lab_import
