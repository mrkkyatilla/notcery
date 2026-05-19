from django.contrib import admin

from apps.planner.models import PlanVersion, StudyEvent, Subject, Workspace


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "exam_date", "created_at")
    search_fields = ("name", "owner__email")
    list_filter = ("created_at",)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "difficulty", "color")
    search_fields = ("name", "workspace__name")
    list_filter = ("difficulty",)


@admin.register(PlanVersion)
class PlanVersionAdmin(admin.ModelAdmin):
    list_display = ("id", "workspace", "generated_by", "is_active", "range_start", "range_end")
    list_filter = ("generated_by", "is_active")
    search_fields = ("workspace__name",)


@admin.register(StudyEvent)
class StudyEventAdmin(admin.ModelAdmin):
    list_display = ("title", "workspace", "start_at", "end_at", "method", "status")
    list_filter = ("status", "method")
    search_fields = ("title", "workspace__name")
    date_hierarchy = "start_at"
