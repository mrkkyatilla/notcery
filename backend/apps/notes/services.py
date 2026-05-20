from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db.models import F, QuerySet

from apps.notes.models import Note
from apps.notes.tiptap import extract_plain_text
from apps.planner.models import Workspace


def apply_content_update(note: Note, content_json: dict | None = None) -> None:
    if content_json is not None:
        note.content_json = content_json
    note.content_plain = extract_plain_text(note.content_json)
    note.indexed_at = None


def refresh_search_vector(note: Note) -> None:
    vector = (
        SearchVector("title", weight="A", config="simple")
        + SearchVector("content_plain", weight="B", config="simple")
    )
    Note.objects.filter(pk=note.pk).update(search_vector=vector)


def search_notes(workspace: Workspace, queryset: QuerySet[Note], query: str) -> QuerySet[Note]:
    search_query = SearchQuery(query, config="simple")
    return (
        queryset.annotate(rank=SearchRank(F("search_vector"), search_query))
        .filter(search_vector=search_query)
        .order_by("-rank", "-updated_at")
    )
