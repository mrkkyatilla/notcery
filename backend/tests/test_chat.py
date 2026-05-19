import pytest
from apps.chat.models import ChatSession
from apps.planner.models import Workspace


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="Chat WS")


@pytest.mark.django_db
def test_create_chat_session(auth_client, workspace):
    response = auth_client.post(f"/api/v1/workspaces/{workspace.id}/chat/sessions")
    assert response.status_code == 201
    assert ChatSession.objects.filter(workspace=workspace).count() == 1


@pytest.mark.django_db
def test_chat_message_mock_reply(auth_client, workspace):
    session = auth_client.post(f"/api/v1/workspaces/{workspace.id}/chat/sessions").data
    response = auth_client.post(
        f"/api/v1/chat/sessions/{session['id']}/messages",
        {"content": "Merhaba", "context": {"use_rag": False}},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["message"]["role"] == "assistant"
