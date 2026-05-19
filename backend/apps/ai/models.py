import uuid

from django.conf import settings
from django.db import models

from apps.planner.models import Workspace


class AsyncTaskStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCESS = "success", "Success"
    FAILED = "failed", "Failed"


class AsyncTaskType(models.TextChoices):
    PLAN_GENERATION = "plan_generation", "Plan generation"


class AsyncTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="async_tasks",
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="async_tasks",
    )
    task_type = models.CharField(max_length=32, choices=AsyncTaskType.choices)
    status = models.CharField(
        max_length=16,
        choices=AsyncTaskStatus.choices,
        default=AsyncTaskStatus.PENDING,
    )
    celery_task_id = models.CharField(max_length=255, blank=True)
    request_payload = models.JSONField(null=True, blank=True)
    result = models.JSONField(null=True, blank=True)
    error = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_async_task"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.task_type}:{self.id} ({self.status})"
