import logging
from datetime import datetime, timezone

from django.db import transaction

from apps.indexer.models import Document
from apps.indexer.storage import delete_file
from apps.notes.models import Note
from apps.planner.models import StudyEvent, Workspace
from apps.users.models import User

logger = logging.getLogger(__name__)


def _purge_workspace_files(workspace: Workspace) -> None:
    for document in Document.objects.filter(workspace=workspace):
        try:
            delete_file(document.file_key)
        except Exception:
            logger.exception("Failed to delete S3 object %s", document.file_key)


def export_user_data(user: User) -> dict:
    workspaces = Workspace.objects.filter(owner=user).prefetch_related(
        "subjects",
        "notes",
        "study_events",
        "study_events__subject",
    )
    exported_workspaces = []
    for workspace in workspaces:
        notes = Note.objects.filter(workspace=workspace).order_by("updated_at")
        events = StudyEvent.objects.filter(workspace=workspace).select_related("subject")
        exported_workspaces.append(
            {
                "id": str(workspace.id),
                "name": workspace.name,
                "exam_date": workspace.exam_date.isoformat() if workspace.exam_date else None,
                "subjects": [
                    {
                        "id": str(subject.id),
                        "name": subject.name,
                        "difficulty": subject.difficulty,
                    }
                    for subject in workspace.subjects.all()
                ],
                "notes": [
                    {
                        "id": str(note.id),
                        "title": note.title,
                        "content_plain": note.content_plain,
                        "subject_id": str(note.subject_id) if note.subject_id else None,
                        "updated_at": note.updated_at.isoformat(),
                    }
                    for note in notes
                ],
                "study_events": [
                    {
                        "id": str(event.id),
                        "title": event.title,
                        "start_at": event.start_at.isoformat(),
                        "end_at": event.end_at.isoformat(),
                        "method": event.method,
                        "status": event.status,
                        "subject_id": str(event.subject_id) if event.subject_id else None,
                    }
                    for event in events
                ],
            }
        )

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "locale": user.locale,
            "timezone": user.timezone,
        },
        "workspaces": exported_workspaces,
    }


@transaction.atomic
def delete_user_account(user: User) -> None:
    for workspace in Workspace.objects.filter(owner=user):
        _purge_workspace_files(workspace)
    user.delete()
