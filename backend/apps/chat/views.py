from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.services.chat import send_chat_message
from apps.billing.models import UsageMetric
from apps.billing.quota import enforce_quota, record_usage
from apps.chat.models import ChatMessage, ChatSession
from apps.chat.serializers import (
    ChatMessageCreateSerializer,
    ChatMessageSerializer,
    ChatSessionSerializer,
)
from apps.core.exceptions import APIError
from apps.core.workspace import get_owned_workspace
from apps.planner.permissions import IsWorkspaceOwner


class ChatSessionCreateView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        session = ChatSession.objects.create(workspace=workspace, user=request.user)
        return Response(ChatSessionSerializer(session).data, status=status.HTTP_201_CREATED)


class ChatMessageListCreateView(APIView):
    def get_session(self, request, session_id) -> ChatSession:
        try:
            return ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist as exc:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc

    def get(self, request, session_id):
        session = self.get_session(request, session_id)
        messages = ChatMessage.objects.filter(session=session)
        return Response({"results": ChatMessageSerializer(messages, many=True).data})

    def post(self, request, session_id):
        session = self.get_session(request, session_id)
        serializer = ChatMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        enforce_quota(request.user, UsageMetric.CHAT_MESSAGE)
        context = data.get("context") or {}
        if context.get("use_grounding"):
            raise APIError(
                code="VALIDATION_ERROR",
                message="Web grounding is not enabled yet.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            payload = send_chat_message(session, data["content"], context)
            record_usage(request.user, UsageMetric.CHAT_MESSAGE)
        except ValueError as exc:
            raise APIError(
                code="VALIDATION_ERROR",
                message=str(exc),
                status_code=status.HTTP_400_BAD_REQUEST,
            ) from exc
        return Response(payload, status=status.HTTP_200_OK)
