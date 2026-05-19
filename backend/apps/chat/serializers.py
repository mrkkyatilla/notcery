from rest_framework import serializers

from apps.chat.models import ChatMessage, ChatSession


class ChatSessionSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source="workspace.id", read_only=True)

    class Meta:
        model = ChatSession
        fields = ("id", "workspace_id", "created_at")


class ChatMessageContextSerializer(serializers.Serializer):
    note_id = serializers.UUIDField(required=False, allow_null=True)
    subject_id = serializers.UUIDField(required=False, allow_null=True)
    use_rag = serializers.BooleanField(default=True)
    use_grounding = serializers.BooleanField(default=False)


class ChatMessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=8000)
    context = ChatMessageContextSerializer(required=False)


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ("id", "role", "content", "citations", "created_at")
        read_only_fields = fields
