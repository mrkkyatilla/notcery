from django.contrib import admin

from apps.feedback.models import AIFeedback


@admin.register(AIFeedback)
class AIFeedbackAdmin(admin.ModelAdmin):
    list_display = ("target_type", "target_id", "rating", "user", "created_at")
    list_filter = ("target_type", "rating")
