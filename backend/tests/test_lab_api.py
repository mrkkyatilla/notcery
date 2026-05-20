import pytest
from apps.lab.models import LabFolder, LabSession
from apps.lab.vfs import ensure_root_folder
from apps.planner.models import Workspace

pytestmark = pytest.mark.django_db


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="API Lab")


def test_lab_folders_and_session(auth_client, workspace):
    resp = auth_client.get(f"/api/v1/workspaces/{workspace.id}/lab/folders")
    assert resp.status_code == 200
    assert any(f["path"] == "/" for f in resp.data["results"])

    resp = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/lab/folders",
        {"name": "contracts", "parent_id": None},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["path"] == "/contracts"

    resp = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/lab/sessions",
        {"title": "Analysis"},
        format="json",
    )
    assert resp.status_code == 201
    session_id = resp.data["id"]

    resp = auth_client.get(f"/api/v1/lab/sessions/{session_id}/messages")
    assert resp.status_code == 200
    assert resp.data["results"] == []

    resp = auth_client.post(
        f"/api/v1/lab/sessions/{session_id}/messages",
        {"content": "Hello lab", "context": {"use_rag": False, "output_mode": "free"}},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["message"]["role"] == "assistant"


def test_lab_folder_create_under_root(auth_client, workspace):
    root = ensure_root_folder(workspace)
    resp = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/lab/folders",
        {"name": "data", "parent_id": str(root.id)},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["path"] == "/data"
    assert LabFolder.objects.filter(workspace=workspace, path="/data").exists()
