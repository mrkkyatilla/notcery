import os

from rest_framework import serializers

from apps.lab.models import (
    LabFile,
    LabFolder,
    LabMessage,
    LabOutputMode,
    LabSession,
)
from apps.lab.parsing import EXTENSION_MIME, guess_mime_from_name

MAX_UPLOAD_BYTES = 50 * 1024 * 1024

ALLOWED_EXTENSIONS = set(EXTENSION_MIME.keys()) | {".pdf"}


def _validate_extension(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise serializers.ValidationError(
            f"Extension {ext or '(none)'} not supported. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    return ext


class LabFolderSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source="workspace.id", read_only=True)
    parent_id = serializers.UUIDField(source="parent.id", allow_null=True, read_only=True)

    class Meta:
        model = LabFolder
        fields = (
            "id",
            "workspace_id",
            "parent_id",
            "name",
            "path",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class LabFolderCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    parent_id = serializers.UUIDField(required=False, allow_null=True)


class LabFolderUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    sort_order = serializers.IntegerField(required=False)


class LabUploadUrlRequestSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=500)
    mime_type = serializers.CharField(max_length=100, required=False, default="application/octet-stream")
    size_bytes = serializers.IntegerField(min_value=1)
    folder_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        _validate_extension(attrs["filename"])
        if attrs["size_bytes"] > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("File exceeds 50 MB limit.")
        attrs["mime_type"] = guess_mime_from_name(attrs["filename"], attrs.get("mime_type", ""))
        return attrs


class LabUploadUrlResponseSerializer(serializers.Serializer):
    upload_url = serializers.URLField()
    file_key = serializers.CharField()
    expires_in = serializers.IntegerField()


class LabFileCreateSerializer(serializers.Serializer):
    file_key = serializers.CharField(max_length=1024)
    original_filename = serializers.CharField(max_length=500)
    mime_type = serializers.CharField(max_length=100, required=False)
    size_bytes = serializers.IntegerField(min_value=1)
    folder_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        _validate_extension(attrs["original_filename"])
        if attrs["size_bytes"] > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("File exceeds 50 MB limit.")
        attrs["mime_type"] = guess_mime_from_name(
            attrs["original_filename"],
            attrs.get("mime_type") or "application/octet-stream",
        )
        return attrs


class LabFileSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source="workspace.id", read_only=True)
    folder_id = serializers.UUIDField(source="folder.id", allow_null=True, read_only=True)

    class Meta:
        model = LabFile
        fields = (
            "id",
            "workspace_id",
            "folder_id",
            "name",
            "mime_type",
            "extension",
            "size_bytes",
            "index_status",
            "error_message",
            "kind",
            "source_session_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class LabFileUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=500, required=False)
    folder_id = serializers.UUIDField(required=False, allow_null=True)


class LabFileContentSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=True)


class LabSessionSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source="workspace.id", read_only=True)

    class Meta:
        model = LabSession
        fields = (
            "id",
            "workspace_id",
            "title",
            "active_file_ids",
            "settings",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class LabSessionCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    active_file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
    )


class LabSessionUpdateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    active_file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
    )
    settings = serializers.DictField(required=False)


class LabMessageContextSerializer(serializers.Serializer):
    use_rag = serializers.BooleanField(default=True)
    output_mode = serializers.ChoiceField(
        choices=LabOutputMode.choices,
        default=LabOutputMode.FREE,
    )
    active_file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
    )


class LabMessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=8000)
    context = LabMessageContextSerializer(required=False)


class LabMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabMessage
        fields = (
            "id",
            "role",
            "content",
            "citations",
            "structured_result",
            "created_at",
        )
        read_only_fields = fields


class LabRetrieveRequestSerializer(serializers.Serializer):
    query = serializers.CharField(min_length=1)
    top_k = serializers.IntegerField(min_value=1, max_value=20, default=12)
    active_file_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
    )


class LabRetrievedChunkSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    text = serializers.CharField()
    score = serializers.FloatField()
    lab_file_id = serializers.UUIDField()
    metadata = serializers.DictField()
    excerpt = serializers.SerializerMethodField()

    def get_excerpt(self, obj):
        text = obj.text if hasattr(obj, "text") else obj.get("text", "")
        return text[:300] + ("…" if len(text) > 300 else "")
