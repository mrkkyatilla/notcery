from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.workspace import get_owned_workspace
from apps.notes.models import Note
from apps.notes.serializers import (
    NoteCreateSerializer,
    NoteSerializer,
    NoteSummarySerializer,
    NoteUpdateSerializer,
)
from apps.notes.services import apply_content_update, refresh_search_vector
from apps.notes.tiptap import empty_document
from apps.planner.models import Subject
from apps.planner.permissions import IsWorkspaceOwner


class NoteListCreateView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        queryset = Note.objects.filter(workspace=workspace).select_related("subject")

        subject_id = request.query_params.get("subject_id")
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)

        q = request.query_params.get("q", "").strip()
        if q:
            from apps.notes.services import search_notes

            queryset = search_notes(workspace, queryset, q)
        else:
            queryset = queryset.order_by("-updated_at")

        return Response({"results": NoteSummarySerializer(queryset, many=True).data})

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = NoteCreateSerializer(
            data=request.data, context={"workspace": workspace}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        subject = None
        subject_id = data.get("subject_id")
        if subject_id:
            subject = Subject.objects.get(id=subject_id, workspace=workspace)

        note = Note(
            workspace=workspace,
            subject=subject,
            title=data.get("title", ""),
            content_json=data.get("content_json", empty_document()),
            content_markdown=data.get("content_markdown", ""),
        )
        if "content_markdown" in data:
            apply_content_update(note, content_markdown=data["content_markdown"])
        else:
            apply_content_update(note, data.get("content_json"))
        note.save()
        refresh_search_vector(note)

        return Response(NoteSerializer(note).data, status=status.HTTP_201_CREATED)


class NoteDetailView(APIView):
    def get_note(self, request, note_id) -> Note:
        return Note.objects.select_related("workspace", "subject").get(
            id=note_id, workspace__owner=request.user
        )

    def get(self, request, note_id):
        try:
            note = self.get_note(request, note_id)
        except Note.DoesNotExist:
            from apps.core.exceptions import APIError

            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from None
        return Response(NoteSerializer(note).data)

    def patch(self, request, note_id):
        try:
            note = self.get_note(request, note_id)
        except Note.DoesNotExist:
            from apps.core.exceptions import APIError

            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from None

        serializer = NoteUpdateSerializer(
            data=request.data,
            partial=True,
            context={"workspace": note.workspace},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if "title" in data:
            note.title = data["title"]
        if "subject_id" in data:
            subject_id = data["subject_id"]
            note.subject = (
                Subject.objects.get(id=subject_id, workspace=note.workspace)
                if subject_id
                else None
            )
        if "content_markdown" in data:
            apply_content_update(note, content_markdown=data["content_markdown"])
        elif "content_json" in data:
            apply_content_update(note, data["content_json"])

        note.save()
        refresh_search_vector(note)
        return Response(NoteSerializer(note).data)

    def delete(self, request, note_id):
        try:
            note = self.get_note(request, note_id)
        except Note.DoesNotExist:
            from apps.core.exceptions import APIError

            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from None
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
