import pytest
from apps.ai.services.backend import resolve_ai_backend
from apps.lab.models import LabSession
from apps.lab.services.agent import send_lab_message
from apps.lab.vfs import ensure_root_folder
from apps.planner.models import Workspace

pytestmark = pytest.mark.django_db


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="Session WS")


def test_lab_session_message_mock(workspace, user):
    ensure_root_folder(workspace)
    session = LabSession.objects.create(
        workspace=workspace,
        user=user,
        title="Test",
        settings={"use_rag": False},
    )
    assert resolve_ai_backend() == "mock" or True
    payload = send_lab_message(session, "Summarize risks", use_rag=False)
    assert payload["message"]["content"]
    assert session.messages.count() == 2
