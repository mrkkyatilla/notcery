from django.contrib import admin

from apps.notes.models import Note


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("title", "workspace", "subject", "updated_at", "indexed_at")
    search_fields = ("title", "content_plain")
    list_filter = ("workspace",)
    readonly_fields = ("content_plain", "search_vector", "indexed_at")
