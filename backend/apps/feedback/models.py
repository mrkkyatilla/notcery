import uuid

from django.conf import settings
from django.db import models


class FeedbackTargetType(models.TextChoices):
    PLAN_VERSION = "plan_version", "Plan version"
    CHAT_MESSAGE = "chat_message", "Chat message"


class FeedbackRating(models.TextChoices):
    UP = "up", "Thumbs up"
    DOWN = "down", "Thumbs down"


class AIFeedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_feedbacks",
    )
    target_type = models.CharField(max_length=32, choices=FeedbackTargetType.choices)
    target_id = models.UUIDField()
    rating = models.CharField(max_length=8, choices=FeedbackRating.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback_ai"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "target_type", "target_id"],
                name="unique_feedback_per_target",
            )
        ]

    def __str__(self):
        return f"{self.target_type}:{self.target_id} ({self.rating})"
