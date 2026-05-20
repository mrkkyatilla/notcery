from uuid import UUID

from django.db import transaction
from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import UsageMetric
from apps.billing.quota import enforce_quota, record_usage
from apps.core.exceptions import APIError
from apps.core.workspace import get_owned_workspace
from apps.lab.models import (
    LabChunk,
    LabFile,
    LabFolder,
    LabIndexStatus,
    LabMessage,
    LabSession,
)
from apps.lab.retrieval import retrieve_lab
from apps.lab.serializers import (
    LabFileContentSerializer,
    LabFileCreateSerializer,
    LabFileSerializer,
    LabFileUpdateSerializer,
    LabFolderCreateSerializer,
    LabFolderSerializer,
    LabFolderUpdateSerializer,
    LabMessageCreateSerializer,
    LabMessageSerializer,
    LabRetrieveRequestSerializer,
    LabRetrievedChunkSerializer,
    LabSessionCreateSerializer,
    LabSessionSerializer,
    LabSessionUpdateSerializer,
    LabUploadUrlRequestSerializer,
    LabUploadUrlResponseSerializer,
)
from apps.lab.services.agent import send_lab_message
from apps.lab.parsing import is_image_previewable, is_pdf_previewable, is_text_previewable
from apps.lab.storage import (
    build_lab_file_key,
    delete_file,
    download_file_bytes,
    generate_presigned_download_url,
    generate_presigned_upload_url,
    upload_text_content,
)
from apps.lab.tasks import index_lab_file_task
from apps.lab.vfs import (
    build_child_path,
    ensure_root_folder,
    repair_orphan_folders,
    resolve_parent_folder,
)
from apps.planner.permissions import IsWorkspaceOwner


def _get_folder(workspace, folder_id) -> LabFolder | None:
    if folder_id is None:
        return None
    try:
        return LabFolder.objects.get(id=folder_id, workspace=workspace)
    except LabFolder.DoesNotExist as exc:
        raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc


class LabFolderListCreateView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        ensure_root_folder(workspace)
        repair_orphan_folders(workspace)
        folders = LabFolder.objects.filter(workspace=workspace)
        return Response({"results": LabFolderSerializer(folders, many=True).data})

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = LabFolderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            parent = resolve_parent_folder(workspace, data.get("parent_id"))
        except ValueError as exc:
            raise APIError(
                code="NOT_FOUND",
                message="Parent folder not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            ) from exc
        path = build_child_path(parent, data["name"])
        if LabFolder.objects.filter(workspace=workspace, path=path).exists():
            raise APIError(
                code="CONFLICT",
                message="Folder path already exists.",
                status_code=status.HTTP_409_CONFLICT,
            )
        folder = LabFolder.objects.create(
            workspace=workspace,
            parent=parent,
            name=data["name"],
            path=path,
        )
        return Response(LabFolderSerializer(folder).data, status=status.HTTP_201_CREATED)


class LabFolderDetailView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get_folder(self, request, folder_id) -> LabFolder:
        try:
            folder = LabFolder.objects.select_related("workspace").get(id=folder_id)
        except LabFolder.DoesNotExist as exc:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc
        get_owned_workspace(request.user, folder.workspace_id)
        return folder

    def patch(self, request, folder_id):
        folder = self.get_folder(request, folder_id)
        if folder.path == "/":
            raise APIError(
                code="VALIDATION_ERROR",
                message="Root folder cannot be renamed.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        serializer = LabFolderUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if "name" in data:
            folder.name = data["name"]
            folder.path = build_child_path(folder.parent, folder.name)
        if "parent_id" in data:
            try:
                folder.parent = resolve_parent_folder(
                    folder.workspace, data["parent_id"]
                )
            except ValueError as exc:
                raise APIError(
                    code="NOT_FOUND",
                    message="Parent folder not found.",
                    status_code=status.HTTP_404_NOT_FOUND,
                ) from exc
            folder.path = build_child_path(folder.parent, folder.name)
        if "sort_order" in data:
            folder.sort_order = data["sort_order"]
        folder.save()
        return Response(LabFolderSerializer(folder).data)

    def delete(self, request, folder_id):
        folder = self.get_folder(request, folder_id)
        if folder.path == "/" or folder.path == "/artifacts":
            raise APIError(
                code="VALIDATION_ERROR",
                message="Cannot delete system folder.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if LabFolder.objects.filter(parent=folder).exists():
            raise APIError(
                code="CONFLICT",
                message="Folder is not empty (subfolders exist).",
                status_code=status.HTTP_409_CONFLICT,
            )
        if LabFile.objects.filter(folder=folder).exists():
            raise APIError(
                code="CONFLICT",
                message="Folder is not empty (files exist).",
                status_code=status.HTTP_409_CONFLICT,
            )
        folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LabFileUploadUrlView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = LabUploadUrlRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        enforce_quota(request.user, UsageMetric.STORAGE_BYTES, extra_bytes=data["size_bytes"])
        file_key = build_lab_file_key(workspace.id, data["filename"])
        expires = 3600
        upload_url = generate_presigned_upload_url(
            file_key, data["mime_type"], expires
        )
        return Response(
            LabUploadUrlResponseSerializer(
                {"upload_url": upload_url, "file_key": file_key, "expires_in": expires}
            ).data
        )


class LabFileListCreateView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        ensure_root_folder(workspace)
        qs = LabFile.objects.filter(workspace=workspace).select_related("folder")
        folder_id = request.query_params.get("folder_id")
        kind = request.query_params.get("kind")
        session_id = request.query_params.get("session_id")
        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        if kind:
            qs = qs.filter(kind=kind)
        if session_id:
            qs = qs.filter(source_session_id=session_id)
        return Response({"results": LabFileSerializer(qs, many=True).data})

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = LabFileCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        enforce_quota(request.user, UsageMetric.STORAGE_BYTES, extra_bytes=data["size_bytes"])
        folder = _get_folder(workspace, data.get("folder_id")) or ensure_root_folder(workspace)
        import os

        ext = os.path.splitext(data["original_filename"])[1].lower()
        lab_file = LabFile.objects.create(
            workspace=workspace,
            folder=folder,
            name=data["original_filename"],
            file_key=data["file_key"],
            mime_type=data["mime_type"],
            extension=ext,
            size_bytes=data["size_bytes"],
            created_by=request.user,
        )
        index_lab_file_task.delay(str(lab_file.id))
        return Response(LabFileSerializer(lab_file).data, status=status.HTTP_201_CREATED)


class LabFileDetailView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get_file(self, request, file_id) -> LabFile:
        try:
            lab_file = LabFile.objects.select_related("workspace").get(id=file_id)
        except LabFile.DoesNotExist as exc:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc
        get_owned_workspace(request.user, lab_file.workspace_id)
        return lab_file

    def patch(self, request, file_id):
        lab_file = self.get_file(request, file_id)
        serializer = LabFileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if "name" in data:
            lab_file.name = data["name"]
        if "folder_id" in data:
            lab_file.folder = _get_folder(lab_file.workspace, data["folder_id"])
        lab_file.save()
        return Response(LabFileSerializer(lab_file).data)

    def delete(self, request, file_id):
        lab_file = self.get_file(request, file_id)
        with transaction.atomic():
            LabChunk.objects.filter(lab_file=lab_file).delete()
            delete_file(lab_file.file_key)
            lab_file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LabFileStreamView(APIView):
    """Inline file bytes for previews (avoids Storj CORS issues in the browser)."""

    permission_classes = [IsWorkspaceOwner]

    def get(self, request, file_id):
        lab_file = LabFileDetailView().get_file(request, file_id)
        raw = download_file_bytes(lab_file.file_key)
        mime = lab_file.mime_type or "application/octet-stream"
        response = HttpResponse(raw, content_type=mime)
        response["Content-Disposition"] = f'inline; filename="{lab_file.name}"'
        response["Cache-Control"] = "private, max-age=300"
        return response


class LabFileContentView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get(self, request, file_id):
        lab_file = LabFileDetailView().get_file(request, file_id)
        mime = lab_file.mime_type or "application/octet-stream"
        expires = 3600
        download_url = generate_presigned_download_url(
            lab_file.file_key, mime, expires=expires
        )
        base = {
            "name": lab_file.name,
            "mime_type": mime,
            "download_url": download_url,
            "expires_in": expires,
            "content": "",
        }
        if is_text_previewable(lab_file.name, mime):
            raw = download_file_bytes(lab_file.file_key)
            base["preview_kind"] = "text"
            base["content"] = raw.decode("utf-8", errors="replace")
            return Response(base)
        if is_pdf_previewable(lab_file.name, mime):
            base["preview_kind"] = "pdf"
            return Response(base)
        if is_image_previewable(lab_file.name, mime):
            base["preview_kind"] = "image"
            return Response(base)
        base["preview_kind"] = "binary"
        return Response(base)

    def put(self, request, file_id):
        lab_file = LabFileDetailView().get_file(request, file_id)
        serializer = LabFileContentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content = serializer.validated_data["content"]
        upload_text_content(lab_file.file_key, content, mime_type=lab_file.mime_type)
        lab_file.size_bytes = len(content.encode("utf-8"))
        lab_file.index_status = LabIndexStatus.PENDING
        lab_file.save(update_fields=["size_bytes", "index_status", "updated_at"])
        index_lab_file_task.delay(str(lab_file.id))
        return Response(LabFileSerializer(lab_file).data)


class LabSessionListCreateView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        sessions = LabSession.objects.filter(workspace=workspace, user=request.user)
        return Response({"results": LabSessionSerializer(sessions, many=True).data})

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        ensure_root_folder(workspace)
        serializer = LabSessionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        session = LabSession.objects.create(
            workspace=workspace,
            user=request.user,
            title=data.get("title") or "",
            active_file_ids=[str(x) for x in data.get("active_file_ids") or []],
            settings={"output_mode": "free", "use_rag": True},
        )
        return Response(LabSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class LabSessionDetailView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get_session(self, request, session_id) -> LabSession:
        try:
            session = LabSession.objects.select_related("workspace").get(
                id=session_id, user=request.user
            )
        except LabSession.DoesNotExist as exc:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc
        get_owned_workspace(request.user, session.workspace_id)
        return session

    def patch(self, request, session_id):
        session = self.get_session(request, session_id)
        serializer = LabSessionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if "title" in data:
            session.title = data["title"]
        if "active_file_ids" in data:
            session.active_file_ids = [str(x) for x in data["active_file_ids"]]
        if "settings" in data:
            session.settings = {**(session.settings or {}), **data["settings"]}
        session.save()
        return Response(LabSessionSerializer(session).data)


class LabMessageListCreateView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get_session(self, request, session_id) -> LabSession:
        return LabSessionDetailView().get_session(request, session_id)

    def get(self, request, session_id):
        session = self.get_session(request, session_id)
        messages = LabMessage.objects.filter(session=session)
        return Response({"results": LabMessageSerializer(messages, many=True).data})

    def post(self, request, session_id):
        session = self.get_session(request, session_id)
        serializer = LabMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        enforce_quota(request.user, UsageMetric.LAB_MESSAGE)
        ctx = data.get("context") or {}
        try:
            payload = send_lab_message(
                session,
                data["content"],
                output_mode=ctx.get("output_mode", "free"),
                use_rag=ctx.get("use_rag", True),
                active_file_ids=ctx.get("active_file_ids"),
            )
            record_usage(request.user, UsageMetric.LAB_MESSAGE)
        except ValueError as exc:
            raise APIError(
                code="VALIDATION_ERROR",
                message=str(exc),
                status_code=status.HTTP_400_BAD_REQUEST,
            ) from exc
        return Response(payload, status=status.HTTP_200_OK)


class LabRetrieveView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = LabRetrieveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        file_ids = data.get("active_file_ids")
        active = [UUID(str(x)) for x in file_ids] if file_ids else None
        chunks = retrieve_lab(
            workspace,
            data["query"],
            top_k=data["top_k"],
            active_file_ids=active,
        )
        return Response(
            {"results": LabRetrievedChunkSerializer(chunks, many=True).data}
        )
