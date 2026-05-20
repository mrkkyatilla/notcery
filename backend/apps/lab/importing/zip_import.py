"""Extract zip from Storj and run import pipeline."""

from __future__ import annotations

import io
import shutil
import tempfile
import zipfile
from pathlib import Path

from django.conf import settings

from apps.lab.importing.pipeline import ALLOWED_EXTENSIONS, import_candidates
from apps.lab.importing.walk import collect_candidates, safe_relative_path
from apps.lab.models import LabImport, LabImportStatus
from apps.lab.storage import download_file_bytes


def extract_zip_to_temp(file_key: str) -> Path:
    raw = download_file_bytes(file_key)
    tmp = tempfile.mkdtemp(prefix="lab-import-zip-")
    root = Path(tmp)
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            rel = safe_relative_path(root, info.filename)
            if not rel:
                continue
            target = root / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(zf.read(info))
    return root


def run_zip_import(lab_import: LabImport, *, user) -> dict:
    file_key = (lab_import.source_payload or {}).get("file_key")
    if not file_key:
        raise ValueError("Missing file_key in import payload.")

    max_files = int(getattr(settings, "LAB_IMPORT_MAX_FILES", 500))
    root_dir = extract_zip_to_temp(file_key)
    try:
        candidates, skipped_walk = collect_candidates(
            root_dir,
            allowed_extensions=ALLOWED_EXTENSIONS,
            max_files=max_files,
        )
        stats = import_candidates(lab_import, candidates, user=user)
        stats["skipped"] = stats.get("skipped", 0) + skipped_walk
        return stats
    finally:
        shutil.rmtree(root_dir, ignore_errors=True)
