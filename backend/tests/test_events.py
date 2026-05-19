from datetime import timedelta

import pytest
from apps.planner.models import PlanVersion, StudyEvent, Workspace
from apps.users.models import User
from django.utils import timezone
from rest_framework.test import APIClient


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="Study WS")


@pytest.mark.django_db
def test_event_crud(auth_client, workspace):
    start = timezone.now().replace(hour=9, minute=0, second=0, microsecond=0)
    end = start + timedelta(hours=2)
    from_iso = (start - timedelta(days=1)).isoformat()
    to_iso = (end + timedelta(days=1)).isoformat()

    create = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/events",
        {
            "title": "Integral çalışması",
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
            "method": "pomodoro",
        },
        format="json",
    )
    assert create.status_code == 201
    event_id = create.data["id"]
    assert create.data["status"] == "planned"

    listed = auth_client.get(
        f"/api/v1/workspaces/{workspace.id}/events",
        {"from": from_iso, "to": to_iso},
    )
    assert listed.status_code == 200
    assert len(listed.data["results"]) == 1

    patch = auth_client.patch(
        f"/api/v1/events/{event_id}",
        {"status": "done", "user_feedback": "hard"},
        format="json",
    )
    assert patch.status_code == 200
    assert patch.data["status"] == "done"
    assert patch.data["user_feedback"] == "hard"

    delete = auth_client.delete(f"/api/v1/events/{event_id}")
    assert delete.status_code == 204
    assert not StudyEvent.objects.filter(id=event_id).exists()


@pytest.mark.django_db
def test_event_list_requires_range(auth_client, workspace):
    response = auth_client.get(f"/api/v1/workspaces/{workspace.id}/events")
    assert response.status_code == 400
    assert response.data["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.django_db
def test_event_overlap_warning(auth_client, workspace):
    start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
    end = start + timedelta(hours=1)
    auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/events",
        {
            "title": "First",
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
            "method": "deep_reading",
        },
        format="json",
    )
    overlap_start = start + timedelta(minutes=30)
    overlap_end = overlap_start + timedelta(hours=1)
    second = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/events",
        {
            "title": "Second",
            "start_at": overlap_start.isoformat(),
            "end_at": overlap_end.isoformat(),
            "method": "pomodoro",
        },
        format="json",
    )
    assert second.status_code == 201
    assert "warnings" in second.data
    assert second.data["warnings"][0]["code"] == "EVENT_OVERLAP"


@pytest.mark.django_db
def test_other_user_cannot_access_events(user, workspace):
    other = User.objects.create_user(email="other2@example.com", password="securepass123")
    client = APIClient()
    client.force_authenticate(user=other)
    start = timezone.now()
    response = client.get(
        f"/api/v1/workspaces/{workspace.id}/events",
        {"from": start.isoformat(), "to": (start + timedelta(days=1)).isoformat()},
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_plan_save_and_activate(auth_client, workspace):
    start = timezone.now().replace(hour=14, minute=0, second=0, microsecond=0)
    StudyEvent.objects.create(
        workspace=workspace,
        title="Slot",
        start_at=start,
        end_at=start + timedelta(hours=1),
        method="pomodoro",
    )
    range_start = start.date()
    range_end = range_start + timedelta(days=6)

    save = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/plans/save",
        {
            "range_start": range_start.isoformat(),
            "range_end": range_end.isoformat(),
            "link_events": True,
        },
        format="json",
    )
    assert save.status_code == 201
    plan_id = save.data["id"]
    assert save.data["generated_by"] == "user"
    assert save.data["event_count"] == 1

    detail = auth_client.get(f"/api/v1/plans/versions/{plan_id}")
    assert detail.status_code == 200
    assert len(detail.data["events"]) == 1

    activate = auth_client.post(f"/api/v1/plans/versions/{plan_id}/activate")
    assert activate.status_code == 200
    assert activate.data["is_active"] is True
    assert PlanVersion.objects.filter(workspace=workspace, is_active=True).count() == 1
