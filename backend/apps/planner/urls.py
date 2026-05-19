from django.urls import path

from .views import (
    PlanSaveView,
    PlanVersionActivateView,
    PlanVersionDetailView,
    StudyEventDetailView,
    StudyEventListCreateView,
    SubjectDetailView,
    SubjectListCreateView,
    WorkspaceListCreateView,
)

urlpatterns = [
    path("workspaces", WorkspaceListCreateView.as_view(), name="workspace-list"),
    path(
        "workspaces/<uuid:workspace_id>/subjects",
        SubjectListCreateView.as_view(),
        name="subject-list",
    ),
    path(
        "subjects/<uuid:subject_id>",
        SubjectDetailView.as_view(),
        name="subject-detail",
    ),
    path(
        "workspaces/<uuid:workspace_id>/events",
        StudyEventListCreateView.as_view(),
        name="event-list",
    ),
    path(
        "events/<uuid:event_id>",
        StudyEventDetailView.as_view(),
        name="event-detail",
    ),
    path(
        "workspaces/<uuid:workspace_id>/plans/save",
        PlanSaveView.as_view(),
        name="plan-save",
    ),
    path(
        "plans/versions/<uuid:version_id>",
        PlanVersionDetailView.as_view(),
        name="plan-version-detail",
    ),
    path(
        "plans/versions/<uuid:version_id>/activate",
        PlanVersionActivateView.as_view(),
        name="plan-version-activate",
    ),
]
