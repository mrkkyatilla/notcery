from django.contrib import admin

from apps.ai.models import AsyncTask


@admin.register(AsyncTask)
class AsyncTaskAdmin(admin.ModelAdmin):
    list_display = ("id", "task_type", "status", "user", "workspace", "created_at")
    list_filter = ("task_type", "status")
