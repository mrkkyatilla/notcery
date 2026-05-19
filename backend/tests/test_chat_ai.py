import pytest
from apps.chat.models import ChatMessage, ChatRole
from apps.indexer.indexing import index_note
from apps.notes.models import Note
from apps.notes.tiptap import empty_document
from apps.planner.models import Workspace

pytestmark = pytest.mark.django_db

INTEGRAL_TEXT = (
    "Integration by substitution replaces complicated integrals with simpler ones. "
    "Choose u and compute du carefully."
)


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="Study")


def test_chat_message_with_rag(auth_client, user, workspace):
    note = Note.objects.create(
        workspace=workspace,
        title="Integrals",
        content_plain=INTEGRAL_TEXT,
        content_json=empty_document(),
    )
    index_note(note.id)

    session_resp = auth_client.post(f"/api/v1/workspaces/{workspace.id}/chat/sessions")
    assert session_resp.status_code == 201
    session_id = session_resp.data["id"]

    message_resp = auth_client.post(
        f"/api/v1/chat/sessions/{session_id}/messages",
        {
            "content": "Explain integration by substitution",
            "context": {"use_rag": True, "note_id": str(note.id)},
        },
        format="json",
    )
    assert message_resp.status_code == 200
    assert message_resp.data["message"]["role"] == ChatRole.ASSISTANT
    assert "Mock" in message_resp.data["message"]["content"] or len(
        message_resp.data["message"]["content"]
    ) > 0

    history = auth_client.get(f"/api/v1/chat/sessions/{session_id}/messages")
    assert history.status_code == 200
    assert len(history.data["results"]) == 2
    roles = {item["role"] for item in history.data["results"]}
    assert roles == {ChatRole.USER, ChatRole.ASSISTANT}

    assistant = ChatMessage.objects.filter(session_id=session_id, role=ChatRole.ASSISTANT).first()
    assert assistant is not None


def test_chat_session_isolation(auth_client, user, workspace):
    from apps.users.models import User

    session_resp = auth_client.post(f"/api/v1/workspaces/{workspace.id}/chat/sessions")
    session_id = session_resp.data["id"]

    other = User.objects.create_user(email="intruder@example.com", password="securepass123")
    auth_client.force_authenticate(user=other)
    response = auth_client.post(
        f"/api/v1/chat/sessions/{session_id}/messages",
        {"content": "Hello"},
        format="json",
    )
    assert response.status_code == 404
