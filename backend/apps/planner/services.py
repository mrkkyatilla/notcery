from django.utils.dateparse import parse_date, parse_datetime

from apps.planner.models import StudyEvent, Workspace


def parse_range_bounds(from_param: str, to_param: str):
    start = parse_datetime(from_param)
    end = parse_datetime(to_param)
    if start is None or end is None:
        return None, None, "from and to must be ISO 8601 datetimes."
    if start >= end:
        return None, None, "from must be before to."
    return start, end, None


def events_in_range(workspace: Workspace, start, end):
    return StudyEvent.objects.filter(
        workspace=workspace,
        start_at__lt=end,
        end_at__gt=start,
    ).select_related("subject", "plan_version")


def find_overlapping_events(
    workspace: Workspace,
    start,
    end,
    exclude_event_id=None,
) -> list[StudyEvent]:
    qs = StudyEvent.objects.filter(
        workspace=workspace,
        start_at__lt=end,
        end_at__gt=start,
    )
    if exclude_event_id:
        qs = qs.exclude(id=exclude_event_id)
    return list(qs[:5])


def overlap_warnings(overlaps: list[StudyEvent]) -> list[dict]:
    return [
        {
            "code": "EVENT_OVERLAP",
            "message": "Another event overlaps this time range.",
            "event_id": str(event.id),
            "title": event.title,
        }
        for event in overlaps
    ]


def parse_plan_date_range(range_start: str, range_end: str):
    start = parse_date(range_start)
    end = parse_date(range_end)
    if start is None or end is None:
        return None, None, "range_start and range_end must be YYYY-MM-DD."
    if start > end:
        return None, None, "range_start must be on or before range_end."
    return start, end, None


def events_for_plan_range(workspace: Workspace, range_start, range_end):
    """Events whose start date falls within [range_start, range_end] (inclusive)."""
    return StudyEvent.objects.filter(
        workspace=workspace,
        start_at__date__gte=range_start,
        start_at__date__lte=range_end,
    )
