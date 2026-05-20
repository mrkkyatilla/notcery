from django.urls import path

from .views import NoteDetailView, NoteListCreateView

urlpatterns = [
    path(
        "workspaces/<uuid:workspace_id>/notes",
        NoteListCreateView.as_view(),
        name="note-list",
    ),
    path("notes/<uuid:note_id>", NoteDetailView.as_view(), name="note-detail"),
]
