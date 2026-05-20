"""Execute a LabImport job."""

from __future__ import annotations

import logging

from apps.lab.importing.git_import import run_git_import
from apps.lab.importing.pipeline import update_import_stats
from apps.lab.importing.zip_import import run_zip_import
from apps.lab.models import LabImport, LabImportSourceType, LabImportStatus

logger = logging.getLogger(__name__)


def run_lab_import(import_id: str) -> None:
    lab_import = LabImport.objects.select_related(
        "workspace", "created_by", "root_folder"
    ).get(id=import_id)

    lab_import.status = LabImportStatus.RUNNING
    lab_import.error_message = ""
    lab_import.save(update_fields=["status", "error_message", "updated_at"])

    user = lab_import.created_by
    if not user:
        lab_import.status = LabImportStatus.FAILED
        lab_import.error_message = "Import has no owner."
        lab_import.save(update_fields=["status", "error_message", "updated_at"])
        return

    try:
        if lab_import.source_type == LabImportSourceType.ZIP:
            stats = run_zip_import(lab_import, user=user)
        elif lab_import.source_type == LabImportSourceType.GIT:
            stats = run_git_import(lab_import, user=user)
        else:
            raise ValueError(f"Unknown source type: {lab_import.source_type}")

        update_import_stats(
            lab_import,
            stats,
            status=LabImportStatus.COMPLETED,
        )
    except Exception as exc:
        logger.exception("Lab import failed: %s", import_id)
        lab_import.status = LabImportStatus.FAILED
        lab_import.error_message = str(exc)[:2000]
        lab_import.save(update_fields=["status", "error_message", "updated_at"])
        raise
