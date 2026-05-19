from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from apps.planner.models import StudyMethod


def mock_plan_payload(
    *,
    subjects: list,
    range_start,
    range_end,
    hard_subjects: list[str],
    source_chunk_ids: list[str],
    timezone: str,
) -> dict:
    tz = ZoneInfo(timezone)
    days = max((range_end - range_start).days + 1, 1)
    events = []
    if not subjects:
        day = range_start
        start = datetime.combine(day, time(10, 0), tzinfo=tz)
        events.append(
            {
                "title": "General study block",
                "subject_id": None,
                "start_at": start.isoformat(),
                "end_at": (start + timedelta(hours=1)).isoformat(),
                "method": StudyMethod.POMODORO,
            }
        )
    else:
        for index, subject in enumerate(subjects):
            day_offset = index % days
            day = range_start + timedelta(days=day_offset)
            start = datetime.combine(day, time(10 + (index % 3), 0), tzinfo=tz)
            duration_hours = 2 if subject.name in hard_subjects else 1
            events.append(
                {
                    "title": f"Study: {subject.name}",
                    "subject_id": str(subject.id),
                    "start_at": start.isoformat(),
                    "end_at": (start + timedelta(hours=duration_hours)).isoformat(),
                    "method": StudyMethod.POMODORO,
                }
            )

    adjustments = [
        f"Extra time added for {name} based on last week's feedback."
        for name in hard_subjects
    ]
    return {
        "events": events,
        "summary": "Mock AI plan for testing.",
        "source_chunk_ids": source_chunk_ids,
        "adjustments": adjustments,
    }


def mock_chat_reply(user_message: str, citations: list[dict]) -> str:
    if citations:
        excerpt = citations[0].get("excerpt", "")[:120]
        return (
            f"(Mock) Based on your materials: {excerpt} … "
            f"Regarding your question: {user_message[:200]}"
        )
    return f"(Mock) I do not have indexed materials for this yet. You asked: {user_message[:200]}"
