import uuid

from django.conf import settings
from django.db import models


class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspaces",
    )
    name = models.CharField(max_length=200)
    exam_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "planner_workspace"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="subjects")
    name = models.CharField(max_length=200)
    difficulty = models.PositiveSmallIntegerField(default=3)
    weekly_target_hours = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    color = models.CharField(max_length=7, default="#6366f1")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "planner_subject"
        ordering = ["name"]

    def __str__(self):
        return self.name


class PlanGeneratedBy(models.TextChoices):
    AI = "ai", "AI"
    USER = "user", "User"


class PlanVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="plan_versions"
    )
    generated_by = models.CharField(max_length=10, choices=PlanGeneratedBy.choices)
    prompt_snapshot = models.TextField(blank=True)
    raw_response = models.JSONField(null=True, blank=True)
    is_active = models.BooleanField(default=False)
    range_start = models.DateField(null=True, blank=True)
    range_end = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "planner_plan_version"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Plan {self.id} ({self.generated_by})"


class StudyMethod(models.TextChoices):
    POMODORO = "pomodoro", "Pomodoro"
    ACTIVE_RECALL = "active_recall", "Active recall"
    SPACED_REVIEW = "spaced_review", "Spaced review"
    DEEP_READING = "deep_reading", "Deep reading"
    PRACTICE_EXAM = "practice_exam", "Practice exam"
    RESEARCH = "research", "Research"


class StudyEventStatus(models.TextChoices):
    PLANNED = "planned", "Planned"
    DONE = "done", "Done"
    SKIPPED = "skipped", "Skipped"


class UserFeedback(models.TextChoices):
    EASY = "easy", "Easy"
    HARD = "hard", "Hard"


class StudyEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="study_events")
    subject = models.ForeignKey(
        Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name="study_events"
    )
    plan_version = models.ForeignKey(
        PlanVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="study_events",
    )
    title = models.CharField(max_length=300)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    method = models.CharField(max_length=20, choices=StudyMethod.choices)
    status = models.CharField(
        max_length=10,
        choices=StudyEventStatus.choices,
        default=StudyEventStatus.PLANNED,
    )
    user_feedback = models.CharField(
        max_length=10, choices=UserFeedback.choices, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "planner_study_event"
        ordering = ["start_at"]
        indexes = [
            models.Index(fields=["workspace", "start_at", "end_at"]),
        ]

    def __str__(self):
        return self.title
