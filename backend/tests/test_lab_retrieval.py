import pytest
from apps.indexer.embeddings import MockEmbedder
from apps.lab.indexing import _write_lab_chunks
from apps.lab.models import LabFile, LabFolder, LabIndexStatus
from apps.lab.retrieval import retrieve_lab
from apps.lab.vfs import ensure_root_folder
from apps.planner.models import Workspace

pytestmark = pytest.mark.django_db


@pytest.fixture
def workspace(user):
    return Workspace.objects.create(owner=user, name="Retrieval WS")


def test_retrieve_lab_finds_relevant_chunk(workspace, user, monkeypatch):
    monkeypatch.setattr("apps.indexer.embeddings.get_embedder", lambda: MockEmbedder())
    folder = ensure_root_folder(workspace)
    lab_file = LabFile.objects.create(
        workspace=workspace,
        folder=folder,
        name="policy.txt",
        file_key="workspaces/x/lab/test.txt",
        mime_type="text/plain",
        extension=".txt",
        index_status=LabIndexStatus.READY,
        created_by=user,
    )
    _write_lab_chunks(
        workspace=workspace,
        lab_file=lab_file,
        texts=[
            "Data retention policy requires encryption at rest for customer records.",
            "Vacation policy allows twenty days per year.",
        ],
    )
    results = retrieve_lab(workspace, "encryption customer data", top_k=3)
    assert len(results) >= 1
    assert any("encryption" in r.text.lower() for r in results)
