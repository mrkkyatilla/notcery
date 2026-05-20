"""Path rules for bulk import (zip / git)."""

import fnmatch
import os

IGNORE_DIR_NAMES = {
    ".git",
    ".svn",
    ".hg",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".venv",
    "venv",
    "env",
    ".env",
    "dist",
    "build",
    "out",
    "target",
    "vendor",
    ".next",
    ".nuxt",
    ".turbo",
    "coverage",
    ".idea",
    ".vscode",
    ".cursor",
}

IGNORE_FILE_GLOBS = [
    "*.min.js",
    "*.min.css",
    "*.map",
    "*.pyc",
    "*.pyo",
    "*.class",
    "*.jar",
    "*.war",
    "*.exe",
    "*.dll",
    "*.so",
    "*.dylib",
    "*.zip",
    "*.tar",
    "*.gz",
    "*.7z",
    "*.rar",
    "*.pdf",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.webp",
    "*.ico",
    "*.woff",
    "*.woff2",
    "*.ttf",
    "*.eot",
    ".DS_Store",
]


def should_ignore_relative_path(rel_path: str) -> bool:
    """Return True if path should be skipped (not imported)."""
    rel_path = rel_path.replace("\\", "/").strip("/")
    if not rel_path:
        return True
    parts = rel_path.split("/")
    for part in parts[:-1]:
        if part in IGNORE_DIR_NAMES:
            return True
    basename = parts[-1]
    for pattern in IGNORE_FILE_GLOBS:
        if fnmatch.fnmatch(basename, pattern):
            return True
    return False


def is_allowed_import_extension(filename: str, allowed_extensions: set[str]) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in allowed_extensions and ext != ".zip"
