from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat.models import ChatMessage
from apps.core.exceptions import APIError
from apps.feedback.models import AIFeedback, FeedbackTargetType
from apps.feedback.serializers import AIFeedbackCreateSerializer, AIFeedbackSerializer
from apps.planner.models import PlanVersion


class AIFeedbackCreateView(APIView):
    def post(self, request):
        serializer = AIFeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self._assert_target_owned(request.user, data["target_type"], data["target_id"])

        feedback, created = AIFeedback.objects.update_or_create(
            user=request.user,
            target_type=data["target_type"],
            target_id=data["target_id"],
            defaults={
                "rating": data["rating"],
                "comment": data.get("comment", ""),
            },
        )
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(AIFeedbackSerializer(feedback).data, status=status_code)

    def _assert_target_owned(self, user, target_type: str, target_id) -> None:
        if target_type == FeedbackTargetType.PLAN_VERSION:
            exists = PlanVersion.objects.filter(
                id=target_id, workspace__owner=user
            ).exists()
        elif target_type == FeedbackTargetType.CHAT_MESSAGE:
            exists = ChatMessage.objects.filter(
                id=target_id, session__user=user
            ).exists()
        else:
            exists = False
        if not exists:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND)
