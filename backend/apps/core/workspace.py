from rest_framework import status

from apps.core.exceptions import APIError
from apps.planner.models import Workspace


def get_owned_workspace(user, workspace_id) -> Workspace:
    try:
        return Workspace.objects.get(id=workspace_id, owner=user)
    except Workspace.DoesNotExist as exc:
        raise APIError(code="NOT_FOUND", status_code=status.HTTP_404_NOT_FOUND) from exc
