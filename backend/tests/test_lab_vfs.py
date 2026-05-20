import pytest
from apps.lab.models import LabFolder
from apps.lab.vfs import build_child_path, ensure_root_folder
from apps.planner.models import Workspace

pytestmark = pytest.mark.django_db


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="Lab WS")


def test_ensure_root_folder(workspace):
    root = ensure_root_folder(workspace)
    assert root.path == "/"
    again = ensure_root_folder(workspace)
    assert again.id == root.id


def test_build_child_path(workspace):
    root = ensure_root_folder(workspace)
    child = LabFolder.objects.create(
        workspace=workspace,
        parent=root,
        name="docs",
        path=build_child_path(root, "docs"),
    )
    assert child.path == "/docs"
    nested_path = build_child_path(child, "contracts")
    assert nested_path == "/docs/contracts"
