from unittest.mock import patch
from uuid import uuid4

import pytest
from apps.indexer.chunking import split_text
from apps.indexer.indexing import index_document, index_note
from apps.indexer.models import ChunkSourceType, Document, DocumentStatus, IndexerChunk
from apps.indexer.retrieval import retrieve
from apps.notes.models import Note
from apps.notes.tiptap import empty_document
from apps.planner.models import Workspace
from apps.users.models import User
from django.test import override_settings

INTEGRAL_TEXT = (
    "Integral calculus is the study of integrals and accumulation of quantities. "
    "Substitution method helps solve complex integrals."
)


def test_split_text_overlap():
    text = "a" * 5000
    chunks = split_text(text, chunk_size=1000, overlap=100)
    assert len(chunks) >= 4
    assert all(len(chunk) <= 1000 for chunk in chunks)


@pytest.mark.django_db
def test_index_note_creates_chunks(user):
    workspace = Workspace.objects.create(owner=user, name="Idx WS")
    note = Note.objects.create(
        workspace=workspace,
        title="Integral",
        content_json=empty_document(),
        content_plain=INTEGRAL_TEXT,
    )
    index_note(note.id)
    note.refresh_from_db()
    assert note.indexed_at is not None
    assert IndexerChunk.objects.filter(note=note, source_type=ChunkSourceType.NOTE).exists()


@pytest.mark.django_db
@patch("apps.indexer.indexing.download_file_bytes")
def test_index_document_txt(mock_download, user):
    mock_download.return_value = INTEGRAL_TEXT.encode("utf-8")
    workspace = Workspace.objects.create(owner=user, name="Doc WS")
    document = Document.objects.create(
        workspace=workspace,
        original_filename="calc.txt",
        file_key=f"workspaces/{workspace.id}/test.txt",
        mime_type="text/plain",
        size_bytes=100,
    )
    index_document(document.id)
    document.refresh_from_db()
    assert document.status == DocumentStatus.READY
    assert IndexerChunk.objects.filter(document=document).count() >= 1


@pytest.mark.django_db
@override_settings(INDEXER_MIN_SIMILARITY=0.0)
def test_retrieve_returns_relevant_chunks(user):
    workspace = Workspace.objects.create(owner=user, name="RAG WS")
    note = Note.objects.create(
        workspace=workspace,
        title="Math",
        content_plain=INTEGRAL_TEXT,
        content_json=empty_document(),
    )
    index_note(note.id)

    results = retrieve(workspace, "integral substitution", top_k=5)
    assert len(results) >= 1
    assert results[0].score > 0
    assert "integral" in results[0].text.lower()


@pytest.mark.django_db
@override_settings(INDEXER_MIN_SIMILARITY=0.0)
def test_retrieve_api(auth_client, user):
    workspace = Workspace.objects.create(owner=user, name="API RAG")
    note = Note.objects.create(
        workspace=workspace,
        content_plain=INTEGRAL_TEXT,
        content_json=empty_document(),
    )
    index_note(note.id)
    response = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/retrieve",
        {"query": "integral calculus", "top_k": 5},
        format="json",
    )
    assert response.status_code == 200
    assert len(response.data["results"]) >= 1


@pytest.mark.django_db
def test_retrieve_workspace_isolation(user):
    ws_a = Workspace.objects.create(owner=user, name="A")
    other = User.objects.create_user(email="iso@example.com", password="securepass123")
    ws_b = Workspace.objects.create(owner=other, name="B")

    note_a = Note.objects.create(
        workspace=ws_a,
        content_plain=INTEGRAL_TEXT,
        content_json=empty_document(),
    )
    note_b = Note.objects.create(
        workspace=ws_b,
        content_plain="Completely different biology content about cells.",
        content_json=empty_document(),
    )
    index_note(note_a.id)
    index_note(note_b.id)

    results = retrieve(ws_a, "integral", top_k=5)
    assert all(
        chunk.note_id is None or Note.objects.get(id=chunk.note_id).workspace_id == ws_a.id
        for chunk in results
    )


@pytest.mark.django_db
@patch("apps.indexer.indexing.download_file_bytes")
@patch("apps.indexer.views.generate_presigned_upload_url")
def test_document_register_flow(mock_presign, mock_download, auth_client, user):
    mock_presign.return_value = "http://minio:9000/bucket/key?signed=1"
    mock_download.return_value = INTEGRAL_TEXT.encode("utf-8")
    workspace = Workspace.objects.create(owner=user, name="Lib WS")
    file_key = f"workspaces/{workspace.id}/{uuid4()}/notes.txt"

    upload_meta = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/documents/upload-url",
        {
            "filename": "notes.txt",
            "mime_type": "text/plain",
            "size_bytes": 1200,
        },
        format="json",
    )
    assert upload_meta.status_code == 200
    assert "upload_url" in upload_meta.data

    create = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/documents",
        {
            "file_key": file_key,
            "original_filename": "notes.txt",
            "mime_type": "text/plain",
            "size_bytes": 1200,
        },
        format="json",
    )
    assert create.status_code == 201
    document_id = create.data["id"]
    index_document(document_id)

    detail = auth_client.get(f"/api/v1/documents/{document_id}")
    assert detail.status_code == 200
    assert detail.data["status"] == DocumentStatus.READY
