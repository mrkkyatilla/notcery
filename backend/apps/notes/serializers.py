from rest_framework import serializers

from apps.notes.models import Note
from apps.notes.tiptap import empty_document
from apps.planner.models import Subject, Workspace


class NoteSummarySerializer(serializers.ModelSerializer):
    subject_id = serializers.UUIDField(source="subject.id", allow_null=True, read_only=True)

    class Meta:
        model = Note
        fields = ("id", "title", "subject_id", "updated_at")


class NoteSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source="workspace.id", read_only=True)
    subject_id = serializers.UUIDField(source="subject.id", allow_null=True, read_only=True)

    class Meta:
        model = Note
        fields = (
            "id",
            "workspace_id",
            "subject_id",
            "title",
            "content_json",
            "content_markdown",
            "indexed_at",
            "updated_at",
        )
        read_only_fields = fields


class NoteCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    subject_id = serializers.UUIDField(required=False, allow_null=True)
    content_json = serializers.JSONField(required=False)
    content_markdown = serializers.CharField(required=False, allow_blank=True)

    def validate_subject_id(self, value):
        workspace: Workspace = self.context["workspace"]
        if value is None:
            return value
        if not Subject.objects.filter(id=value, workspace=workspace).exists():
            raise serializers.ValidationError("Subject does not belong to this workspace.")
        return value

    def validate_content_json(self, value):
        if value is None:
            return empty_document()
        if not isinstance(value, dict):
            raise serializers.ValidationError("content_json must be a JSON object.")
        if value.get("type") != "doc":
            raise serializers.ValidationError("content_json must be a TipTap document (type: doc).")
        return value


class NoteUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=500, required=False, allow_blank=True)
    subject_id = serializers.UUIDField(required=False, allow_null=True)
    content_json = serializers.JSONField(required=False)
    content_markdown = serializers.CharField(required=False, allow_blank=True)

    def validate_subject_id(self, value):
        workspace: Workspace = self.context.get("workspace")
        if value is None or workspace is None:
            return value
        if not Subject.objects.filter(id=value, workspace=workspace).exists():
            raise serializers.ValidationError("Subject does not belong to this workspace.")
        return value

    def validate_content_json(self, value):
        if value is None:
            return value
        if not isinstance(value, dict):
            raise serializers.ValidationError("content_json must be a JSON object.")
        if value.get("type") != "doc":
            raise serializers.ValidationError("content_json must be a TipTap document (type: doc).")
        return value
