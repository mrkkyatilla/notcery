"""Collect import candidates from a directory tree."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from apps.lab.importing.ignore import is_allowed_import_extension, should_ignore_relative_path


@dataclass(frozen=True)
class ImportCandidate:
    abs_path: Path
    rel_path: str  # posix, relative to extract root
    size_bytes: int


def safe_relative_path(root: Path, member_path: str) -> str | None:
    """Normalize zip/archive member path; reject zip-slip."""
    clean = member_path.replace("\\", "/").strip()
    while clean.startswith("./"):
        clean = clean[2:]
    if clean.startswith("/") or ".." in clean.split("/"):
        return None
    return clean.strip("/")


def collect_candidates(
    root_dir: Path,
    *,
    allowed_extensions: set[str],
    max_files: int,
) -> tuple[list[ImportCandidate], int]:
    """
    Walk root_dir and return (candidates, skipped_count).
    Stops after max_files candidates.
    """
    root_dir = root_dir.resolve()
    candidates: list[ImportCandidate] = []
    skipped = 0

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # prune ignored dirs in-place
        rel_dir = os.path.relpath(dirpath, root_dir).replace("\\", "/")
        if rel_dir == ".":
            rel_dir = ""
        dirnames[:] = [
            d
            for d in dirnames
            if not should_ignore_relative_path(
                f"{rel_dir}/{d}".strip("/") if rel_dir else d
            )
        ]

        for name in filenames:
            rel = f"{rel_dir}/{name}".strip("/") if rel_dir else name
            if should_ignore_relative_path(rel):
                skipped += 1
                continue
            if not is_allowed_import_extension(name, allowed_extensions):
                skipped += 1
                continue
            abs_path = Path(dirpath) / name
            try:
                size = abs_path.stat().st_size
            except OSError:
                skipped += 1
                continue
            candidates.append(
                ImportCandidate(abs_path=abs_path, rel_path=rel, size_bytes=size)
            )
            if len(candidates) >= max_files:
                return candidates, skipped
    return candidates, skipped
