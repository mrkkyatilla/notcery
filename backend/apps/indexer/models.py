import uuid

from django.db import models
from pgvector.django import VectorField

from apps.notes.models import Note
from apps.planner.models import Subject, Workspace

EMBEDDING_DIMENSIONS = 768


class DocumentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    PROCESSING = "processing", "Processing"
    READY = "ready", "Ready"
    FAILED = "failed", "Failed"


class ChunkSourceType(models.TextChoices):
    DOCUMENT = "document", "Document"
    NOTE = "note", "Note"
    PERFORMANCE = "performance", "Performance"


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="documents")
    subject = models.ForeignKey(
        Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name="documents"
    )
    original_filename = models.CharField(max_length=500)
    file_key = models.CharField(max_length=1024)
    mime_type = models.CharField(max_length=100)
    size_bytes = models.PositiveBigIntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=DocumentStatus.choices, default=DocumentStatus.PENDING
    )
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "indexer_document"
        ordering = ["-created_at"]

    def __str__(self):
        return self.original_filename


class IndexerChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="indexer_chunks"
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="chunks",
    )
    note = models.ForeignKey(
        Note, on_delete=models.CASCADE, null=True, blank=True, related_name="indexer_chunks"
    )
    source_type = models.CharField(max_length=20, choices=ChunkSourceType.choices)
    chunk_index = models.PositiveIntegerField()
    text = models.TextField()
    embedding = VectorField(dimensions=EMBEDDING_DIMENSIONS)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "indexer_chunk"
        ordering = ["chunk_index"]
        indexes = [
            models.Index(fields=["workspace", "source_type"]),
            models.Index(fields=["document"]),
            models.Index(fields=["note"]),
        ]
    def __str__(self):
        return f"{self.source_type}:{self.chunk_index}"
