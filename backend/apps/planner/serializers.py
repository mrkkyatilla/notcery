import re

from rest_framework import serializers

from apps.planner.models import (
    PlanVersion,
    StudyEvent,
    StudyEventStatus,
    StudyMethod,
    Subject,
    UserFeedback,
    Workspace,
)


class WorkspaceSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)

    class Meta:
        model = Workspace
        fields = ("id", "name", "owner_id", "exam_date", "created_at", "updated_at")
        read_only_fields = ("id", "owner_id", "created_at", "updated_at")


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ("name", "exam_date")


class SubjectSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source="workspace.id", read_only=True)

    class Meta:
        model = Subject
        fields = (
            "id",
            "workspace_id",
            "name",
            "difficulty",
            "weekly_target_hours",
            "color",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "workspace_id", "created_at", "updated_at")


class SubjectCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ("name", "difficulty", "weekly_target_hours", "color")

    def validate_difficulty(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Difficulty must be between 1 and 5.")
        return value

    def validate_color(self, value):
        if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
            raise serializers.ValidationError("Color must be a hex code like #6366f1.")
        return value


class StudyEventSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source="workspace.id", read_only=True)
    subject_id = serializers.UUIDField(source="subject.id", allow_null=True, read_only=True)
    plan_version_id = serializers.UUIDField(
        source="plan_version.id", allow_null=True, read_only=True
    )

    class Meta:
        model = StudyEvent
        fields = (
            "id",
            "workspace_id",
            "subject_id",
            "plan_version_id",
            "title",
            "start_at",
            "end_at",
            "method",
            "status",
            "user_feedback",
        )
        read_only_fields = fields


class StudyEventWriteSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField(required=False, allow_null=True)
    title = serializers.CharField(max_length=300)
    start_at = serializers.DateTimeField()
    end_at = serializers.DateTimeField()
    method = serializers.ChoiceField(choices=StudyMethod.choices)
    status = serializers.ChoiceField(
        choices=StudyEventStatus.choices, required=False, default=StudyEventStatus.PLANNED
    )
    user_feedback = serializers.ChoiceField(
        choices=UserFeedback.choices, required=False, allow_null=True
    )

    def validate(self, attrs):
        if attrs["end_at"] <= attrs["start_at"]:
            raise serializers.ValidationError("end_at must be after start_at.")
        return attrs

    def validate_subject_id(self, value):
        workspace = self.context.get("workspace")
        if value is None or workspace is None:
            return value
        if not Subject.objects.filter(id=value, workspace=workspace).exists():
            raise serializers.ValidationError("Subject does not belong to this workspace.")
        return value


class StudyEventUpdateSerializer(serializers.Serializer):
    subject_id = serializers.UUIDField(required=False, allow_null=True)
    title = serializers.CharField(max_length=300, required=False)
    start_at = serializers.DateTimeField(required=False)
    end_at = serializers.DateTimeField(required=False)
    method = serializers.ChoiceField(choices=StudyMethod.choices, required=False)
    status = serializers.ChoiceField(choices=StudyEventStatus.choices, required=False)
    user_feedback = serializers.ChoiceField(
        choices=UserFeedback.choices, required=False, allow_null=True
    )

    def validate(self, attrs):
        instance = self.context.get("event")
        start = attrs.get("start_at", instance.start_at if instance else None)
        end = attrs.get("end_at", instance.end_at if instance else None)
        if start and end and end <= start:
            raise serializers.ValidationError("end_at must be after start_at.")
        return attrs

    def validate_subject_id(self, value):
        workspace = self.context.get("workspace")
        if value is None or workspace is None:
            return value
        if not Subject.objects.filter(id=value, workspace=workspace).exists():
            raise serializers.ValidationError("Subject does not belong to this workspace.")
        return value


class PlanVersionSerializer(serializers.ModelSerializer):
    workspace_id = serializers.UUIDField(source="workspace.id", read_only=True)
    event_count = serializers.SerializerMethodField()

    class Meta:
        model = PlanVersion
        fields = (
            "id",
            "workspace_id",
            "generated_by",
            "is_active",
            "range_start",
            "range_end",
            "event_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_event_count(self, obj):
        return obj.study_events.count()


class PlanVersionDetailSerializer(PlanVersionSerializer):
    events = StudyEventSerializer(source="study_events", many=True, read_only=True)

    class Meta(PlanVersionSerializer.Meta):
        fields = PlanVersionSerializer.Meta.fields + ("events",)


class PlanSaveSerializer(serializers.Serializer):
    range_start = serializers.DateField()
    range_end = serializers.DateField()
    link_events = serializers.BooleanField(default=True)

    def validate(self, attrs):
        if attrs["range_start"] > attrs["range_end"]:
            raise serializers.ValidationError("range_start must be on or before range_end.")
        return attrs
