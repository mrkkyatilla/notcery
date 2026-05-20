import uuid

from django.conf import settings
from django.db import models
from pgvector.django import VectorField

from apps.indexer.models import EMBEDDING_DIMENSIONS
from apps.planner.models import Workspace


class LabIndexStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    READY = "ready", "Ready"
    FAILED = "failed", "Failed"


class LabFileKind(models.TextChoices):
    UPLOAD = "upload", "Upload"
    ARTIFACT = "artifact", "Artifact"
    IMPORT = "import", "Import"


class LabMessageRole(models.TextChoices):
    USER = "user", "User"
    ASSISTANT = "assistant", "Assistant"


class LabOutputMode(models.TextChoices):
    FREE = "free", "Free"
    RISK_MATRIX = "risk_matrix", "Risk matrix"
    COMPARISON_TABLE = "comparison_table", "Comparison table"


class LabFolder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="lab_folders")
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )
    name = models.CharField(max_length=255)
    path = models.CharField(max_length=1024)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lab_folder"
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "path"],
                name="lab_folder_workspace_path_uniq",
            ),
        ]

    def __str__(self):
        return self.path


class LabFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="lab_files")
    folder = models.ForeignKey(
        LabFolder,
        on_delete=models.CASCADE,
        related_name="files",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=500)
    file_key = models.CharField(max_length=1024)
    mime_type = models.CharField(max_length=100)
    extension = models.CharField(max_length=32, blank=True)
    size_bytes = models.PositiveBigIntegerField(default=0)
    index_status = models.CharField(
        max_length=20,
        choices=LabIndexStatus.choices,
        default=LabIndexStatus.PENDING,
    )
    error_message = models.TextField(blank=True)
    kind = models.CharField(max_length=20, choices=LabFileKind.choices, default=LabFileKind.UPLOAD)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_files",
    )
    source_session = models.ForeignKey(
        "LabSession",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="artifact_files",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lab_file"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class LabChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="lab_chunks")
    lab_file = models.ForeignKey(LabFile, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.PositiveIntegerField()
    text = models.TextField()
    embedding = VectorField(dimensions=EMBEDDING_DIMENSIONS)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lab_chunk"
        ordering = ["chunk_index"]
        indexes = [
            models.Index(fields=["workspace", "lab_file"]),
        ]

    def __str__(self):
        return f"lab_chunk:{self.chunk_index}"


class LabSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="lab_sessions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lab_sessions",
    )
    title = models.CharField(max_length=255, blank=True)
    active_file_ids = models.JSONField(default=list, blank=True)
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lab_session"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title or str(self.id)


class LabMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(LabSession, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=20, choices=LabMessageRole.choices)
    content = models.TextField()
    citations = models.JSONField(default=list, blank=True)
    structured_result = models.JSONField(null=True, blank=True)
    tool_trace = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lab_message"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.role}:{self.id}"
