from django.db import transaction
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.exceptions import APIError
from apps.core.workspace import get_owned_workspace
from apps.indexer.tasks import index_study_event_feedback_task
from apps.planner.models import (
    PlanGeneratedBy,
    PlanVersion,
    StudyEvent,
    StudyEventStatus,
    Subject,
    UserFeedback,
    Workspace,
)
from apps.planner.permissions import IsSubjectWorkspaceOwner, IsWorkspaceOwner
from apps.planner.serializers import (
    PlanSaveSerializer,
    PlanVersionDetailSerializer,
    PlanVersionSerializer,
    StudyEventSerializer,
    StudyEventUpdateSerializer,
    StudyEventWriteSerializer,
    SubjectCreateSerializer,
    SubjectSerializer,
    WorkspaceCreateSerializer,
    WorkspaceSerializer,
)
from apps.planner.services import (
    events_for_plan_range,
    events_in_range,
    find_overlapping_events,
    overlap_warnings,
    parse_range_bounds,
)


def _create_event_from_data(workspace: Workspace, data: dict) -> StudyEvent:
    subject_id = data.pop("subject_id", None)
    subject = None
    if subject_id:
        subject = Subject.objects.get(id=subject_id, workspace=workspace)
    return StudyEvent.objects.create(workspace=workspace, subject=subject, **data)


def _update_event_from_data(event: StudyEvent, workspace: Workspace, data: dict) -> StudyEvent:
    if "subject_id" in data:
        subject_id = data.pop("subject_id")
        if subject_id is None:
            event.subject = None
        else:
            event.subject = Subject.objects.get(id=subject_id, workspace=workspace)
    for key, value in data.items():
        setattr(event, key, value)
    event.save()
    return event


def _event_response(event: StudyEvent, overlaps: list) -> dict:
    body = StudyEventSerializer(event).data
    if overlaps:
        body["warnings"] = overlap_warnings(overlaps)
    return body


class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WorkspaceCreateSerializer
        return WorkspaceSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = WorkspaceSerializer(queryset, many=True)
        return Response({"results": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = WorkspaceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = Workspace.objects.create(owner=request.user, **serializer.validated_data)
        return Response(
            WorkspaceSerializer(workspace).data,
            status=status.HTTP_201_CREATED,
        )


class SubjectListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsWorkspaceOwner]
    serializer_class = SubjectSerializer

    def get_workspace(self):
        return get_owned_workspace(self.request.user, self.kwargs["workspace_id"])

    def get_queryset(self):
        return Subject.objects.filter(workspace_id=self.kwargs["workspace_id"])

    def list(self, request, *args, **kwargs):
        self.get_workspace()
        queryset = self.filter_queryset(self.get_queryset())
        serializer = SubjectSerializer(queryset, many=True)
        return Response({"results": serializer.data})

    def create(self, request, *args, **kwargs):
        workspace = self.get_workspace()
        serializer = SubjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subject = Subject.objects.create(workspace=workspace, **serializer.validated_data)
        return Response(SubjectSerializer(subject).data, status=status.HTTP_201_CREATED)


class SubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsSubjectWorkspaceOwner]
    serializer_class = SubjectSerializer
    lookup_url_kwarg = "subject_id"

    def get_queryset(self):
        return Subject.objects.filter(workspace__owner=self.request.user)

    def patch(self, request, *args, **kwargs):
        subject = self.get_object()
        serializer = SubjectCreateSerializer(subject, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(SubjectSerializer(subject).data)


class StudyEventListCreateView(APIView):
    permission_classes = [IsWorkspaceOwner]

    def get(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        from_param = request.query_params.get("from")
        to_param = request.query_params.get("to")
        if not from_param or not to_param:
            raise APIError(
                code="VALIDATION_ERROR",
                message="Query parameters 'from' and 'to' are required.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        start, end, error = parse_range_bounds(from_param, to_param)
        if error:
            raise APIError(code="VALIDATION_ERROR", message=error, status_code=400)

        events = events_in_range(workspace, start, end)
        return Response({"results": StudyEventSerializer(events, many=True).data})

    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = StudyEventWriteSerializer(
            data=request.data, context={"workspace": workspace}
        )
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        overlaps = find_overlapping_events(
            workspace, data["start_at"], data["end_at"]
        )
        event = _create_event_from_data(workspace, data)
        return Response(
            _event_response(event, overlaps),
            status=status.HTTP_201_CREATED,
        )


class StudyEventDetailView(APIView):
    def get_object(self, request, event_id) -> StudyEvent:
        try:
            event = StudyEvent.objects.select_related("workspace", "subject").get(
                id=event_id, workspace__owner=request.user
            )
        except StudyEvent.DoesNotExist as exc:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc
        return event

    def patch(self, request, event_id):
        event = self.get_object(request, event_id)
        serializer = StudyEventUpdateSerializer(
            data=request.data,
            partial=True,
            context={"workspace": event.workspace, "event": event},
        )
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        start = data.get("start_at", event.start_at)
        end = data.get("end_at", event.end_at)
        overlaps = find_overlapping_events(
            event.workspace, start, end, exclude_event_id=event.id
        )
        event = _update_event_from_data(event, event.workspace, data)
        if event.status == StudyEventStatus.DONE and event.user_feedback == UserFeedback.HARD:
            index_study_event_feedback_task.delay(str(event.id))
        return Response(_event_response(event, overlaps))

    def delete(self, request, event_id):
        event = self.get_object(request, event_id)
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlanSaveView(APIView):
    permission_classes = [IsWorkspaceOwner]

    @transaction.atomic
    def post(self, request, workspace_id):
        workspace = get_owned_workspace(request.user, workspace_id)
        serializer = PlanSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        plan = PlanVersion.objects.create(
            workspace=workspace,
            generated_by=PlanGeneratedBy.USER,
            range_start=data["range_start"],
            range_end=data["range_end"],
        )
        if data["link_events"]:
            events_for_plan_range(workspace, data["range_start"], data["range_end"]).update(
                plan_version=plan
            )
        return Response(
            PlanVersionSerializer(plan).data,
            status=status.HTTP_201_CREATED,
        )


class PlanVersionDetailView(APIView):
    def get_object(self, request, version_id) -> PlanVersion:
        try:
            return (
                PlanVersion.objects.prefetch_related("study_events", "study_events__subject")
                .select_related("workspace")
                .get(id=version_id, workspace__owner=request.user)
            )
        except PlanVersion.DoesNotExist as exc:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc

    def get(self, request, version_id):
        plan = self.get_object(request, version_id)
        return Response(PlanVersionDetailSerializer(plan).data)


class PlanVersionActivateView(APIView):
    @transaction.atomic
    def post(self, request, version_id):
        try:
            plan = PlanVersion.objects.select_related("workspace").get(
                id=version_id, workspace__owner=request.user
            )
        except PlanVersion.DoesNotExist as exc:
            raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc

        PlanVersion.objects.filter(workspace=plan.workspace).update(is_active=False)
        plan.is_active = True
        plan.save(update_fields=["is_active", "updated_at"])
        return Response(PlanVersionSerializer(plan).data)
