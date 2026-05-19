from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import UsageMetric
from apps.billing.quota import enforce_quota
from apps.core.exceptions import APIError
from apps.core.workspace import get_owned_workspace
from apps.indexer.models import Document
from apps.indexer.retrieval import retrieve
from apps.indexer.serializers import (
    DocumentCreateSerializer,
    DocumentSerializer,
    RetrieveRequestSerializer,
    UploadUrlRequestSerializer,
    UploadUrlResponseSerializer,
)
from apps.indexer.storage import build_file_key, delete_file, generate_presigned_upload_url
from apps.indexer.tasks import index_document_task
from apps.planner.models import Subject
from apps.planner.permissions import IsWorkspaceOwner


class DocumentUploadUrlView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = UploadUrlRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        enforce_quota(request.user, UsageMetric.STORAGE_BYTES, extra_bytes=data["size_bytes"])
        file_key = build_file_key(workspace.id, data["filename"])
        expires = 3600
        upload_url = generate_presigned_upload_url(file_key, data["mime_type"], expires)
        payload = {
            "upload_url": upload_url,
            "file_key": file_key,
            "expires_in": expires,
        }
        return Response(UploadUrlResponseSerializer(payload).data)


class DocumentListCreateView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        docs = Document.objects.filter(workspace=workspace).select_related("subject")
        return Response({"results": DocumentSerializer(docs, many=True).data})

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = DocumentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        enforce_quota(request.user, UsageMetric.STORAGE_BYTES, extra_bytes=data["size_bytes"])

        if Document.objects.filter(workspace=workspace, file_key=data["file_key"]).exists():
            raise APIError(
                code="CONFLICT",
                message="Document with this file_key already exists.",
                status_code=status.HTTP_409_CONFLICT,
            )

        subject = None
        subject_id = data.get("subject_id")
        if subject_id:
            subject = Subject.objects.get(id=subject_id, workspace=workspace)

        document = Document.objects.create(
            workspace=workspace,
            subject=subject,
            file_key=data["file_key"],
            original_filename=data["original_filename"],
            mime_type=data["mime_type"],
            size_bytes=data["size_bytes"],
        )
        index_document_task.delay(str(document.id))
        return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class DocumentDetailView(APIView):
    def get_document(self, request, document_id) -> Document:
        return Document.objects.select_related("workspace", "subject").get(
            id=document_id, workspace__owner=request.user
        )

    def get(self, request, document_id):
        try:
            document = self.get_document(request, document_id)
        except Document.DoesNotExist:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from None
        return Response(DocumentSerializer(document).data)

    def delete(self, request, document_id):
        try:
            document = self.get_document(request, document_id)
        except Document.DoesNotExist:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from None
        file_key = document.file_key
        document.delete()
        try:
            delete_file(file_key)
        except Exception:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class RetrieveView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = RetrieveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        chunks = retrieve(
            workspace,
            data["query"],
            top_k=data.get("top_k", 8),
            subject_id=data.get("subject_id"),
            source_types=data.get("source_types"),
        )
        results = [
            {
                "id": str(chunk.id),
                "text": chunk.text,
                "score": chunk.score,
                "source_type": chunk.source_type,
                "document_id": str(chunk.document_id) if chunk.document_id else None,
                "note_id": str(chunk.note_id) if chunk.note_id else None,
                "metadata": chunk.metadata,
                "excerpt": chunk.text[:300] + ("…" if len(chunk.text) > 300 else ""),
            }
            for chunk in chunks
        ]
        return Response({"query": data["query"], "results": results})
