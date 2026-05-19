from django.contrib import admin

from apps.indexer.models import Document, IndexerChunk


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("original_filename", "workspace", "status", "mime_type", "created_at")
    list_filter = ("status", "mime_type")
    search_fields = ("original_filename", "workspace__name")


@admin.register(IndexerChunk)
class IndexerChunkAdmin(admin.ModelAdmin):
    list_display = ("source_type", "workspace", "chunk_index", "created_at")
    list_filter = ("source_type",)
    search_fields = ("text",)
