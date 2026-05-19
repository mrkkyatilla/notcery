from rest_framework import serializers

from apps.feedback.models import AIFeedback, FeedbackRating, FeedbackTargetType


class AIFeedbackCreateSerializer(serializers.Serializer):
    target_type = serializers.ChoiceField(choices=FeedbackTargetType.choices)
    target_id = serializers.UUIDField()
    rating = serializers.ChoiceField(choices=FeedbackRating.choices)
    comment = serializers.CharField(required=False, allow_blank=True, max_length=2000)


class AIFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIFeedback
        fields = ("id", "target_type", "target_id", "rating", "comment", "created_at")
        read_only_fields = fields
