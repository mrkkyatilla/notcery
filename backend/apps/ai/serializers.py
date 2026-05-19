
from rest_framework import serializers

from apps.ai.models import AsyncTask


class PlanGenerateSerializer(serializers.Serializer):
    range_start = serializers.DateField()
    range_end = serializers.DateField()
    constraints = serializers.DictField(required=False)
    use_rag = serializers.BooleanField(default=True)

    def validate(self, attrs):
        if attrs["range_end"] < attrs["range_start"]:
            raise serializers.ValidationError("range_end must be on or after range_start.")
        return attrs


class AsyncTaskAcceptedSerializer(serializers.Serializer):
    task_id = serializers.UUIDField()
    status = serializers.CharField()
    poll_url = serializers.CharField()


class AsyncTaskSerializer(serializers.ModelSerializer):
    task_id = serializers.UUIDField(source="id", read_only=True)

    class Meta:
        model = AsyncTask
        fields = ("task_id", "status", "result", "error")
        read_only_fields = fields
