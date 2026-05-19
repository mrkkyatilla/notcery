import pytest
from apps.planner.models import Workspace
from apps.users.models import User


@pytest.mark.django_db
def test_workspace_crud(auth_client, user):
    create = auth_client.post(
        "/api/v1/workspaces",
        {"name": "YKS 2026", "exam_date": "2026-06-15"},
        format="json",
    )
    assert create.status_code == 201
    workspace_id = create.data["id"]

    subject = auth_client.post(
        f"/api/v1/workspaces/{workspace_id}/subjects",
        {"name": "Matematik", "difficulty": 4, "color": "#ef4444"},
        format="json",
    )
    assert subject.status_code == 201

    other = User.objects.create_user(email="other@example.com", password="securepass123")
    from rest_framework.test import APIClient

    client = APIClient()
    client.force_authenticate(user=other)
    denied = client.get(f"/api/v1/workspaces/{workspace_id}/subjects")
    assert denied.status_code == 403


@pytest.mark.django_db
def test_subject_patch_delete(auth_client, user):
    ws = Workspace.objects.create(owner=user, name="Test")
    create = auth_client.post(
        f"/api/v1/workspaces/{ws.id}/subjects",
        {"name": "Fizik", "difficulty": 3, "color": "#22c55e"},
        format="json",
    )
    subject_id = create.data["id"]

    patch = auth_client.patch(
        f"/api/v1/subjects/{subject_id}",
        {"difficulty": 5},
        format="json",
    )
    assert patch.status_code == 200
    assert patch.data["difficulty"] == 5

    delete = auth_client.delete(f"/api/v1/subjects/{subject_id}")
    assert delete.status_code == 204
