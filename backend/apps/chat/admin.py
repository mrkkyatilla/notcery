from django.contrib import admin

from apps.chat.models import ChatSession


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "workspace", "user", "created_at")
    search_fields = ("user__email", "workspace__name")
