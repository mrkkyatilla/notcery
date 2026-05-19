from rest_framework.permissions import BasePermission

from apps.planner.models import StudyEvent, Subject, Workspace


class IsWorkspaceOwner(BasePermission):
    def has_permission(self, request, view):
        workspace_id = view.kwargs.get("workspace_id")
        if not workspace_id:
            return True
        return Workspace.objects.filter(id=workspace_id, owner=request.user).exists()


class IsSubjectWorkspaceOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Subject):
            return obj.workspace.owner_id == request.user.id
        return False


class IsStudyEventWorkspaceOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, StudyEvent):
            return obj.workspace.owner_id == request.user.id
        return False


class IsPlanVersionWorkspaceOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        from apps.planner.models import PlanVersion

        if isinstance(obj, PlanVersion):
            return obj.workspace.owner_id == request.user.id
        return False
