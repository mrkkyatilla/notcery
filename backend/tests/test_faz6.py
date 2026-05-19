from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

import pytest
import yaml
from apps.ai.models import AsyncTask, AsyncTaskStatus
from apps.planner.models import Workspace
from apps.users.models import User

pytestmark = pytest.mark.django_db

OPENAPI_PATH = Path(__file__).resolve().parents[2] / "docs" / "openapi.yml"

REQUIRED_PATHS = (
    "/health",
    "/users/me",
    "/users/me/export",
    "/billing/me",
    "/waitlist",
    "/feedback/ai",
    "/workspaces/{workspace_id}/plans/generate",
    "/tasks/{task_id}",
    "/tasks/{task_id}/retry",
    "/chat/sessions/{session_id}/messages",
)


@patch("apps.core.health.check_redis", return_value={"status": "ok"})
@patch("apps.core.health.check_database", return_value={"status": "ok"})
def test_health_endpoint(_mock_db, _mock_redis, api_client):
    response = api_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.data["status"] == "ok"
    assert response.data["checks"]["database"]["status"] == "ok"
    assert "X-Request-ID" in response.headers


def test_openapi_contract_is_valid():
    with OPENAPI_PATH.open(encoding="utf-8") as handle:
        spec = yaml.safe_load(handle)
    assert spec["openapi"].startswith("3.")
    for path in REQUIRED_PATHS:
        assert path in spec["paths"], f"Missing documented path: {path}"


def test_user_data_export(auth_client, user):
    workspace = Workspace.objects.create(owner=user, name="Export WS")
    response = auth_client.get("/api/v1/users/me/export")
    assert response.status_code == 200
    assert response.data["user"]["email"] == user.email
    assert len(response.data["workspaces"]) == 1
    assert response.data["workspaces"][0]["id"] == str(workspace.id)


@patch("apps.users.services.privacy.delete_file")
def test_user_account_delete(mock_delete_file, auth_client, user):
    Workspace.objects.create(owner=user, name="Delete WS")
    response = auth_client.delete(
        "/api/v1/users/me",
        {"confirm": "DELETE"},
        format="json",
    )
    assert response.status_code == 204
    assert not User.objects.filter(id=user.id).exists()


def test_task_retry_failed_plan(auth_client, user):
    workspace = Workspace.objects.create(owner=user, name="Retry WS")
    start = date.today()
    end = start + timedelta(days=3)
    generate = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/plans/generate",
        {"range_start": start.isoformat(), "range_end": end.isoformat(), "use_rag": False},
        format="json",
    )
    task_id = generate.data["task_id"]
    task = AsyncTask.objects.get(id=task_id)
    task.status = AsyncTaskStatus.FAILED
    task.error = {"code": "PLAN_GENERATION_FAILED"}
    task.save(update_fields=["status", "error", "updated_at"])

    retry = auth_client.post(f"/api/v1/tasks/{task_id}/retry")
    assert retry.status_code == 200
    assert retry.data["status"] == AsyncTaskStatus.SUCCESS
    task.refresh_from_db()
    assert task.status == AsyncTaskStatus.SUCCESS
    assert task.result is not None


def test_upload_rejects_mismatched_extension(auth_client, user):
    workspace = Workspace.objects.create(owner=user, name="Upload WS")
    response = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/documents/upload-url",
        {
            "filename": "notes.exe",
            "mime_type": "application/pdf",
            "size_bytes": 1000,
        },
        format="json",
    )
    assert response.status_code == 400
