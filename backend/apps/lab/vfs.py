"""Virtual filesystem helpers for Lab folders."""

from __future__ import annotations

from apps.lab.models import LabFolder
from apps.planner.models import Workspace


def normalize_folder_path(path: str) -> str:
    path = path.strip() or "/"
    if not path.startswith("/"):
        path = f"/{path}"
    path = "/".join(part for part in path.split("/") if part)
    return f"/{path}" if path else "/"


def build_child_path(parent: LabFolder | None, name: str) -> str:
    clean = name.strip().replace("/", "_") or "untitled"
    if parent is None:
        return normalize_folder_path(clean)
    base = parent.path.rstrip("/")
    return normalize_folder_path(f"{base}/{clean}")


def ensure_root_folder(workspace: Workspace) -> LabFolder:
    root, _created = LabFolder.objects.get_or_create(
        workspace=workspace,
        path="/",
        defaults={"name": "root", "parent": None, "sort_order": 0},
    )
    return root


def resolve_parent_folder(workspace: Workspace, parent_id) -> LabFolder:
    """Use workspace root when parent_id is omitted (Lab explorer expects a single tree root)."""
    if parent_id is None:
        return ensure_root_folder(workspace)
    folder = LabFolder.objects.filter(id=parent_id, workspace=workspace).first()
    if folder is None:
        raise ValueError("parent folder not found")
    return folder


def repair_orphan_folders(workspace: Workspace) -> None:
    """Attach legacy folders created with parent=NULL to the workspace root."""
    root = ensure_root_folder(workspace)
    LabFolder.objects.filter(
        workspace=workspace,
        parent__isnull=True,
    ).exclude(path="/").update(parent=root)


def get_or_create_artifacts_folder(workspace: Workspace) -> LabFolder:
    root = ensure_root_folder(workspace)
    path = "/artifacts"
    folder, _created = LabFolder.objects.get_or_create(
        workspace=workspace,
        path=path,
        defaults={"name": "artifacts", "parent": root, "sort_order": 999},
    )
    return folder
