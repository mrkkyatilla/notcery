from django.urls import path

from .views import (
    DocumentDetailView,
    DocumentListCreateView,
    DocumentUploadUrlView,
    RetrieveView,
)

urlpatterns = [
    path(
        "workspaces/<uuid:workspace_id>/documents/upload-url",
        DocumentUploadUrlView.as_view(),
        name="document-upload-url",
    ),
    path(
        "workspaces/<uuid:workspace_id>/documents",
        DocumentListCreateView.as_view(),
        name="document-list",
    ),
    path(
        "documents/<uuid:document_id>",
        DocumentDetailView.as_view(),
        name="document-detail",
    ),
    path(
        "workspaces/<uuid:workspace_id>/retrieve",
        RetrieveView.as_view(),
        name="workspace-retrieve",
    ),
]
