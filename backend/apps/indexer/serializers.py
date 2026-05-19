import os

from rest_framework import serializers

from apps.indexer.models import Document

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
}
MIME_EXTENSIONS = {
    "application/pdf": {".pdf"},
    "text/plain": {".txt"},
    "text/markdown": {".md", ".markdown"},
}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


def _validate_filename_matches_mime(filename: str, mime_type: str) -> None:
    extension = os.path.splitext(filename)[1].lower()
    allowed = MIME_EXTENSIONS.get(mime_type, set())
    if extension not in allowed:
        raise serializers.ValidationError(
            f"Filename extension {extension or '(none)'} does not match mime type {mime_type}."
        )


class UploadUrlRequestSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=500)
    mime_type = serializers.CharField(max_length=100)
    size_bytes = serializers.IntegerField(min_value=1)

    def validate_mime_type(self, value):
        if value not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                "Allowed types: application/pdf, text/plain, text/markdown."
            )
        return value

    def validate_size_bytes(self, value):
        if value > MAX_UPLOAD_BYTES:
            raise serializers.ValidationError("File exceeds 50 MB limit.")
        return value

    def validate(self, attrs):
        _validate_filename_matches_mime(attrs["filename"], attrs["mime_type"])
        return attrs


class UploadUrlResponseSerializer(serializers.Serializer):
    upload_url = serializers.URLField()
    file_key = serializers.CharField()
    expires_in = serializers.IntegerField()


class DocumentCreateSerializer(serializers.Serializer):
    file_key = serializers.CharField(max_length=1024)
    original_filename = serializers.CharField(max_length=500)
    mime_type = serializers.CharField(max_length=100)
    size_bytes = serializers.IntegerField(min_value=1)
    subject_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_mime_type(self, value):
        if value not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                "Allowed types: application/pdf, text/plain, text/markdown."
            )
        return value

    def validate(self, attrs):
        _validate_filename_matches_mime(attrs["original_filename"], attrs["mime_type"])
        return attrs


class DocumentSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source="workspace.id", read_only=True)
    subject_id = serializers.UUIDField(source="subject.id", allow_null=True, read_only=True)

    class Meta:
        model = Document
        fields = (
            "id",
            "workspace_id",
            "subject_id",
            "original_filename",
            "mime_type",
            "size_bytes",
            "status",
            "error_message",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class RetrieveRequestSerializer(serializers.Serializer):
    query = serializers.CharField(min_length=1)
    top_k = serializers.IntegerField(min_value=1, max_value=20, default=8)
    subject_id = serializers.UUIDField(required=False, allow_null=True)
    source_types = serializers.ListField(
        child=serializers.ChoiceField(choices=["document", "note", "performance"]),
        required=False,
    )


class RetrievedChunkSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    text = serializers.CharField()
    score = serializers.FloatField()
    source_type = serializers.CharField()
    document_id = serializers.UUIDField(allow_null=True)
    note_id = serializers.UUIDField(allow_null=True)
    metadata = serializers.DictField()
    excerpt = serializers.SerializerMethodField()

    def get_excerpt(self, obj):
        text = obj.text if hasattr(obj, "text") else obj.get("text", "")
        return text[:300] + ("…" if len(text) > 300 else "")
