from unittest.mock import patch

import pytest
from apps.lab.importing.git_import import validate_git_url
from apps.lab.models import LabImport
from apps.planner.models import Workspace

pytestmark = pytest.mark.django_db


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="Git Import WS")


def test_validate_git_url_github():
    assert (
        validate_git_url("https://github.com/org/repo")
        == "https://github.com/org/repo"
    )


def test_validate_git_url_rejects_unknown_host():
    with pytest.raises(ValueError, match="not allowed"):
        validate_git_url("https://evil.example.com/repo.git")


def test_git_import_api_starts_job(auth_client, workspace):
    with patch("apps.lab.services.import_job.import_lab_project_task") as mock_task:
        mock_task.delay.return_value = type("R", (), {"id": "task-2"})()
        resp = auth_client.post(
            f"/api/v1/workspaces/{workspace.id}/lab/imports/git",
            {"url": "https://github.com/org/demo", "label": "demo"},
            format="json",
        )
    assert resp.status_code == 201
    assert resp.data["source_type"] == "git"
    assert LabImport.objects.filter(workspace=workspace, source_type="git").exists()
