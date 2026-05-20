"""Shallow clone public git repo and run import pipeline."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings

from apps.lab.importing.pipeline import ALLOWED_EXTENSIONS, import_candidates
from apps.lab.importing.walk import collect_candidates


def validate_git_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("https", "http"):
        raise ValueError("Only https:// git URLs are supported.")
    host = (parsed.hostname or "").lower()
    allowed = [h.lower() for h in getattr(settings, "LAB_IMPORT_GIT_ALLOWED_HOSTS", [])]
    if host not in allowed:
        raise ValueError(f"Git host not allowed. Allowed: {', '.join(allowed)}")
    if not parsed.path or parsed.path == "/":
        raise ValueError("Invalid repository URL.")
    return url.strip()


def clone_repo(url: str, branch: str | None) -> Path:
    tmp = tempfile.mkdtemp(prefix="lab-import-git-")
    dest = Path(tmp)
    cmd = ["git", "clone", "--depth", "1", "--single-branch"]
    if branch:
        cmd.extend(["--branch", branch])
    cmd.extend([url, str(dest)])
    timeout = int(getattr(settings, "LAB_IMPORT_GIT_TIMEOUT_SEC", 120))
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if result.returncode != 0:
        err = (result.stderr or result.stdout or "git clone failed").strip()
        raise RuntimeError(err[:2000])
    return dest


def run_git_import(lab_import, *, user) -> dict:
    payload = lab_import.source_payload or {}
    url = validate_git_url(payload.get("url", ""))
    branch = (payload.get("branch") or "").strip() or None

    max_files = int(getattr(settings, "LAB_IMPORT_MAX_FILES", 500))
    root_dir = clone_repo(url, branch)
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
