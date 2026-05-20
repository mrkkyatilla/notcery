"""Import extracted files into Lab VFS + Storj + index queue."""

from __future__ import annotations

import logging
import os
import re
import uuid
from pathlib import Path

from django.conf import settings

from apps.billing.models import UsageMetric
from apps.billing.quota import enforce_quota
from apps.lab.importing.walk import ImportCandidate
from apps.lab.models import LabFile, LabFileKind, LabFolder, LabImport, LabImportStatus
from apps.lab.parsing import EXTENSION_MIME, guess_mime_from_name
from apps.lab.storage import build_lab_file_key, upload_bytes
from apps.lab.vfs import build_child_path, ensure_root_folder

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {k for k in EXTENSION_MIME if k != ".zip"}


def _slugify_label(label: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", label.strip()).strip("-")
    return (slug[:80] or "import").lower()


def ensure_import_root_folder(
    workspace,
    *,
    label: str,
    parent_folder: LabFolder | None,
) -> LabFolder:
    ensure_root_folder(workspace)
    base_parent = parent_folder or ensure_root_folder(workspace)
    folder_name = _slugify_label(label)
    import_path = build_child_path(base_parent, folder_name)
    # avoid collision
    suffix = 0
    path = import_path
    name = folder_name
    while LabFolder.objects.filter(workspace=workspace, path=path).exists():
        suffix += 1
        name = f"{folder_name}-{suffix}"
        path = build_child_path(base_parent, name)
    return LabFolder.objects.create(
        workspace=workspace,
        parent=base_parent,
        name=name,
        path=path,
    )


def _get_or_create_folder_chain(
    workspace,
    root_folder: LabFolder,
    rel_dir: str,
    cache: dict[str, LabFolder],
) -> LabFolder:
    if not rel_dir:
        return root_folder
    parts = rel_dir.split("/")
    parent = root_folder
    built = ""
    for part in parts:
        built = f"{built}/{part}" if built else part
        if built in cache:
            parent = cache[built]
            continue
        path = build_child_path(parent, part)
        folder, _created = LabFolder.objects.get_or_create(
            workspace=workspace,
            path=path,
            defaults={"name": part, "parent": parent},
        )
        if folder.parent_id != parent.id:
            folder.parent = parent
            folder.name = part
            folder.save(update_fields=["parent", "name", "updated_at"])
        cache[built] = folder
        parent = folder
    return parent


def import_candidates(
    lab_import: LabImport,
    candidates: list[ImportCandidate],
    *,
    user,
) -> dict:
    workspace = lab_import.workspace
    root_folder = lab_import.root_folder
    if not root_folder:
        raise ValueError("Import has no root folder.")

    stats = {
        "total_candidates": len(candidates),
        "imported": 0,
        "skipped": 0,
        "failed": 0,
        "bytes_imported": 0,
    }
    folder_cache: dict[str, LabFolder] = {"": root_folder}
    bytes_accum = 0

    for candidate in candidates:
        try:
            enforce_quota(user, UsageMetric.STORAGE_BYTES, extra_bytes=candidate.size_bytes)
        except Exception:
            stats["skipped"] += len(candidates) - stats["imported"] - stats["failed"]
            break

        rel = candidate.rel_path.replace("\\", "/")
        rel_dir = os.path.dirname(rel)
        filename = os.path.basename(rel)
        try:
            folder = _get_or_create_folder_chain(
                workspace, root_folder, rel_dir, folder_cache
            )
            data = candidate.abs_path.read_bytes()
            mime = guess_mime_from_name(filename, "")
            ext = os.path.splitext(filename)[1].lower()
            file_key = build_lab_file_key(workspace.id, filename)
            upload_bytes(file_key, data, mime_type=mime)
            lab_file = LabFile.objects.create(
                workspace=workspace,
                folder=folder,
                name=filename,
                file_key=file_key,
                mime_type=mime,
                extension=ext,
                size_bytes=len(data),
                kind=LabFileKind.IMPORT,
                created_by=user,
            )
            from apps.lab.tasks import index_lab_file_task

            index_lab_file_task.delay(str(lab_file.id))
            stats["imported"] += 1
            stats["bytes_imported"] += len(data)
            bytes_accum += len(data)
        except Exception as exc:
            logger.warning("Import file failed %s: %s", rel, exc)
            stats["failed"] += 1

    return stats


def update_import_stats(lab_import: LabImport, stats: dict, *, status: str | None = None) -> None:
    lab_import.stats = {**(lab_import.stats or {}), **stats}
    if status:
        lab_import.status = status
    lab_import.save(update_fields=["stats", "status", "updated_at"])
