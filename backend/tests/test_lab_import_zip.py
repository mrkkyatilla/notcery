from unittest.mock import patch

import pytest
from apps.lab.importing.walk import collect_candidates
from apps.lab.parsing import EXTENSION_MIME
from apps.planner.models import Workspace

pytestmark = pytest.mark.django_db

ALLOWED = {k for k in EXTENSION_MIME if k != ".zip"}


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="Import Zip WS")


def test_collect_candidates_from_zip_tree(tmp_path):
    root = tmp_path / "proj"
    (root / "src").mkdir(parents=True)
    (root / "src" / "main.py").write_text("print('hi')", encoding="utf-8")
    (root / "node_modules" / "x").mkdir(parents=True)
    (root / "node_modules" / "x" / "y.js").write_text("x", encoding="utf-8")

    candidates, _skipped = collect_candidates(root, allowed_extensions=ALLOWED, max_files=100)
    names = {c.rel_path for c in candidates}
    assert "src/main.py" in names
    assert not any("node_modules" in n for n in names)


def test_zip_import_api_starts_job(auth_client, workspace):
    from apps.lab.models import LabImport, LabImportStatus

    with patch("apps.lab.services.import_job.import_lab_project_task") as mock_task:
        mock_task.delay.return_value = type("R", (), {"id": "task-1"})()
        resp = auth_client.post(
            f"/api/v1/workspaces/{workspace.id}/lab/imports/zip",
            {
                "file_key": "workspaces/x/lab/import.zip",
                "original_filename": "project.zip",
                "size_bytes": 1024,
                "label": "my-project",
            },
            format="json",
        )
    assert resp.status_code == 201
    assert resp.data["source_type"] == "zip"
    assert LabImport.objects.filter(workspace=workspace).count() == 1
    imp = LabImport.objects.get(workspace=workspace)
    assert imp.status == LabImportStatus.PENDING
    assert imp.root_folder_id is not None
