from django.urls import path

from .views import ChatMessageListCreateView, ChatSessionCreateView

urlpatterns = [
    path(
        "workspaces/<uuid:workspace_id>/chat/sessions",
        ChatSessionCreateView.as_view(),
        name="chat-session-create",
    ),
    path(
        "chat/sessions/<uuid:session_id>/messages",
        ChatMessageListCreateView.as_view(),
        name="chat-messages",
    ),
]
