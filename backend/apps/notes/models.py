import uuid

from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.db import models

from apps.notes.tiptap import empty_document
from apps.planner.models import Subject, Workspace


class Note(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="notes")
    subject = models.ForeignKey(
        Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name="notes"
    )
    title = models.CharField(max_length=500, blank=True, default="")
    content_json = models.JSONField(default=empty_document)  # callable default
    content_markdown = models.TextField(blank=True, default="")
    content_plain = models.TextField(blank=True, default="")
    search_vector = SearchVectorField(null=True, editable=False)
    indexed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notes_note"
        ordering = ["-updated_at"]
        indexes = [
            GinIndex(fields=["search_vector"]),
            models.Index(fields=["workspace", "-updated_at"]),
        ]

    def __str__(self):
        return self.title or str(self.id)
