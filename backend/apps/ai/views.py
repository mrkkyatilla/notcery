from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.models import AsyncTask, AsyncTaskStatus, AsyncTaskType
from apps.ai.serializers import (
    AsyncTaskAcceptedSerializer,
    AsyncTaskSerializer,
    PlanGenerateSerializer,
)
from apps.ai.tasks import generate_plan_task
from apps.billing.models import UsageMetric
from apps.billing.quota import enforce_quota, record_usage
from apps.core.exceptions import APIError
from apps.core.workspace import get_owned_workspace
from apps.planner.permissions import IsWorkspaceOwner


class PlanGenerateView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        enforce_quota(request.user, UsageMetric.PLAN_GENERATE)
        serializer = PlanGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payload = {
            "range_start": data["range_start"].isoformat(),
            "range_end": data["range_end"].isoformat(),
            "constraints": data.get("constraints"),
            "use_rag": data.get("use_rag", True),
        }
        async_task = AsyncTask.objects.create(
            user=request.user,
            workspace=workspace,
            task_type=AsyncTaskType.PLAN_GENERATION,
            status=AsyncTaskStatus.PENDING,
            request_payload=payload,
        )
        celery_result = generate_plan_task.delay(str(async_task.id), payload)
        async_task.celery_task_id = celery_result.id or ""
        async_task.save(update_fields=["celery_task_id", "updated_at"])
        record_usage(request.user, UsageMetric.PLAN_GENERATE)

        poll_url = f"/api/v1/tasks/{async_task.id}"
        body = {
            "task_id": async_task.id,
            "status": AsyncTaskStatus.PENDING,
            "poll_url": poll_url,
        }
        return Response(
            AsyncTaskAcceptedSerializer(body).data,
            status=status.HTTP_202_ACCEPTED,
        )


class TaskDetailView(APIView):
    def get(self, request, task_id):
        try:
            task = AsyncTask.objects.get(id=task_id, user=request.user)
        except AsyncTask.DoesNotExist as exc:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc
        return Response(AsyncTaskSerializer(task).data)


class TaskRetryView(APIView):
    def post(self, request, task_id):
        try:
            task = AsyncTask.objects.get(id=task_id, user=request.user)
        except AsyncTask.DoesNotExist as exc:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc

        if task.status not in (AsyncTaskStatus.FAILED, AsyncTaskStatus.PENDING):
            raise APIError(
                code="VALIDATION_ERROR",
                message="Only failed or pending tasks can be retried.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not task.request_payload:
            raise APIError(
                code="VALIDATION_ERROR",
                message="Task payload is missing; create a new plan instead.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        task.status = AsyncTaskStatus.PENDING
        task.error = None
        task.result = None
        task.save(update_fields=["status", "error", "result", "updated_at"])
        celery_result = generate_plan_task.delay(str(task.id), task.request_payload)
        task.celery_task_id = celery_result.id or ""
        task.save(update_fields=["celery_task_id", "updated_at"])
        task.refresh_from_db()
        return Response(AsyncTaskSerializer(task).data)
