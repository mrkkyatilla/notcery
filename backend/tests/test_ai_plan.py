from datetime import date, timedelta

import pytest
from apps.ai.models import AsyncTask, AsyncTaskStatus
from apps.planner.models import PlanGeneratedBy, PlanVersion, StudyEvent, Subject, Workspace

pytestmark = pytest.mark.django_db


@pytest.fixture
def workspace_with_subjects(user):
    workspace = Workspace.objects.create(owner=user, name="Exam prep")
    Subject.objects.create(workspace=workspace, name="Mathematics", difficulty=4)
    Subject.objects.create(workspace=workspace, name="Physics", difficulty=3)
    return workspace


def test_plan_generate_happy_path(auth_client, workspace_with_subjects):
    start = date.today()
    end = start + timedelta(days=6)
    response = auth_client.post(
        f"/api/v1/workspaces/{workspace_with_subjects.id}/plans/generate",
        {
            "range_start": start.isoformat(),
            "range_end": end.isoformat(),
            "use_rag": False,
        },
        format="json",
    )
    assert response.status_code == 202
    task_id = response.data["task_id"]
    assert response.data["status"] == "pending"
    assert f"/api/v1/tasks/{task_id}" in response.data["poll_url"]

    poll = auth_client.get(f"/api/v1/tasks/{task_id}")
    assert poll.status_code == 200
    assert poll.data["status"] == AsyncTaskStatus.SUCCESS
    plan_id = poll.data["result"]["plan_version_id"]

    plan = PlanVersion.objects.get(id=plan_id)
    assert plan.generated_by == PlanGeneratedBy.AI
    events = StudyEvent.objects.filter(plan_version=plan)
    assert events.count() >= 1


def test_task_poll_not_found_for_other_user(api_client, user, workspace_with_subjects):
    from apps.users.models import User

    other = User.objects.create_user(email="other@example.com", password="securepass123")
    api_client.force_authenticate(user=user)
    start = date.today()
    response = api_client.post(
        f"/api/v1/workspaces/{workspace_with_subjects.id}/plans/generate",
        {"range_start": start.isoformat(), "range_end": start.isoformat(), "use_rag": False},
        format="json",
    )
    task_id = response.data["task_id"]

    api_client.force_authenticate(user=other)
    poll = api_client.get(f"/api/v1/tasks/{task_id}")
    assert poll.status_code == 404


def test_plan_generate_validation(auth_client, workspace_with_subjects):
    start = date.today()
    end = start - timedelta(days=1)
    response = auth_client.post(
        f"/api/v1/workspaces/{workspace_with_subjects.id}/plans/generate",
        {"range_start": start.isoformat(), "range_end": end.isoformat()},
        format="json",
    )
    assert response.status_code == 400


def test_async_task_record_created(auth_client, workspace_with_subjects):
    start = date.today()
    auth_client.post(
        f"/api/v1/workspaces/{workspace_with_subjects.id}/plans/generate",
        {"range_start": start.isoformat(), "range_end": start.isoformat(), "use_rag": False},
        format="json",
    )
    assert AsyncTask.objects.filter(workspace=workspace_with_subjects).count() == 1
