from django.urls import path

from .views import PlanGenerateView, TaskDetailView, TaskRetryView

urlpatterns = [
    path(
        "workspaces/<uuid:workspace_id>/plans/generate",
        PlanGenerateView.as_view(),
        name="plan-generate",
    ),
    path("tasks/<uuid:task_id>", TaskDetailView.as_view(), name="task-detail"),
    path("tasks/<uuid:task_id>/retry", TaskRetryView.as_view(), name="task-retry"),
]
