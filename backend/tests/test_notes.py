
import pytest
from apps.notes.models import Note
from apps.planner.models import Subject, Workspace
from apps.users.models import User
from django.utils import timezone
from rest_framework.test import APIClient

TIptap_DOC = {
    "type": "doc",
    "content": [
        {
            "type": "paragraph",
            "content": [{"type": "text", "text": "Kuantum dolanıklık notları"}],
        }
    ],
}


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="Notes WS")


@pytest.fixture
def subject(workspace):
    return Subject.objects.create(
        workspace=workspace, name="Fizik", difficulty=4, color="#3b82f6"
    )


@pytest.mark.django_db
def test_note_crud(auth_client, workspace, subject):
    create = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/notes",
        {
            "title": "Ders notu",
            "subject_id": str(subject.id),
            "content_json": TIptap_DOC,
        },
        format="json",
    )
    assert create.status_code == 201
    note_id = create.data["id"]
    assert create.data["indexed_at"] is None

    note = Note.objects.get(id=note_id)
    assert "Kuantum" in note.content_plain

    get = auth_client.get(f"/api/v1/notes/{note_id}")
    assert get.status_code == 200
    assert get.data["content_json"]["type"] == "doc"

    patch = auth_client.patch(
        f"/api/v1/notes/{note_id}",
        {"title": "Güncel not"},
        format="json",
    )
    assert patch.status_code == 200
    assert patch.data["title"] == "Güncel not"

    listed = auth_client.get(f"/api/v1/workspaces/{workspace.id}/notes")
    assert listed.status_code == 200
    assert len(listed.data["results"]) == 1

    delete = auth_client.delete(f"/api/v1/notes/{note_id}")
    assert delete.status_code == 204


@pytest.mark.django_db
def test_note_search(auth_client, workspace):
    auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/notes",
        {"title": "Matematik", "content_json": TIptap_DOC},
        format="json",
    )
    auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/notes",
        {
            "title": "Tarih",
            "content_json": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Osmanlı dönemi"}],
                    }
                ],
            },
        },
        format="json",
    )

    found = auth_client.get(
        f"/api/v1/workspaces/{workspace.id}/notes",
        {"q": "Kuantum"},
    )
    assert found.status_code == 200
    assert len(found.data["results"]) == 1
    assert found.data["results"][0]["title"] == "Matematik"


@pytest.mark.django_db
def test_note_filter_by_subject(auth_client, workspace, subject):
    other = Subject.objects.create(
        workspace=workspace, name="Kimya", difficulty=2, color="#22c55e"
    )
    auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/notes",
        {"title": "A", "subject_id": str(subject.id)},
        format="json",
    )
    auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/notes",
        {"title": "B", "subject_id": str(other.id)},
        format="json",
    )
    response = auth_client.get(
        f"/api/v1/workspaces/{workspace.id}/notes",
        {"subject_id": str(subject.id)},
    )
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["title"] == "A"


@pytest.mark.django_db
def test_note_other_user_forbidden(user, workspace):
    other = User.objects.create_user(email="nope@example.com", password="securepass123")
    client = APIClient()
    client.force_authenticate(user=other)
    response = client.get(f"/api/v1/workspaces/{workspace.id}/notes")
    assert response.status_code == 403


@pytest.mark.django_db
def test_content_update_clears_indexed_at(auth_client, workspace):
    create = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/notes",
        {"title": "Idx", "content_json": TIptap_DOC},
        format="json",
    )
    note_id = create.data["id"]
    Note.objects.filter(id=note_id).update(indexed_at=timezone.now())

    auth_client.patch(
        f"/api/v1/notes/{note_id}",
        {
            "content_json": {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Yeni içerik"}],
                    }
                ],
            }
        },
        format="json",
    )
    note = Note.objects.get(id=note_id)
    assert note.indexed_at is None
    assert "Yeni içerik" in note.content_plain
