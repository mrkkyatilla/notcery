import json
import logging
from datetime import date, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone
from pydantic import ValidationError

from apps.ai.models import AsyncTask, AsyncTaskStatus
from apps.ai.schemas.plan import PlanGenerationResponseSchema
from apps.ai.services.backend import resolve_ai_backend
from apps.ai.services.context import format_rag_context
from apps.ai.services.gemini import GeminiClientError, generate_json
from apps.ai.services.mock import mock_plan_payload
from apps.indexer.models import ChunkSourceType
from apps.indexer.retrieval import retrieve
from apps.planner.models import (
    PlanGeneratedBy,
    PlanVersion,
    StudyEvent,
    StudyEventStatus,
    Subject,
    UserFeedback,
    Workspace,
)
from apps.users.models import User

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "plan_v1.txt"

PLAN_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "events": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "subject_id": {"type": "string", "nullable": True},
                    "start_at": {"type": "string"},
                    "end_at": {"type": "string"},
                    "method": {"type": "string"},
                },
                "required": ["title", "start_at", "end_at", "method"],
            },
        },
        "summary": {"type": "string", "nullable": True},
        "source_chunk_ids": {"type": "array", "items": {"type": "string"}},
        "adjustments": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["events"],
}


def _load_prompt_template() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def _subjects_block(subjects) -> str:
    if not subjects:
        return "(no subjects — create general study blocks)"
    lines = []
    for subject in subjects:
        lines.append(
            f"- id={subject.id} name={subject.name} difficulty={subject.difficulty} "
            f"weekly_target_hours={subject.weekly_target_hours}"
        )
    return "\n".join(lines)


def _hard_feedback_block(workspace: Workspace, range_start) -> tuple[str, list[str]]:
    week_ago = timezone.now() - timedelta(days=7)
    hard_events = (
        StudyEvent.objects.filter(
            workspace=workspace,
            user_feedback=UserFeedback.HARD,
            status=StudyEventStatus.DONE,
            end_at__gte=week_ago,
        )
        .select_related("subject")
        .order_by("-end_at")[:20]
    )
    names: list[str] = []
    lines = []
    for event in hard_events:
        label = event.subject.name if event.subject else event.title
        if label not in names:
            names.append(label)
        lines.append(f"- {label} on {event.end_at.date()}")
    if not lines:
        return "(none)", []
    return "\n".join(lines), names


def _retrieve_plan_context(workspace: Workspace, subjects, use_rag: bool) -> tuple[str, list[str]]:
    if not use_rag:
        return "(RAG disabled for this request)", []

    queries = [
        "curriculum topics syllabus exam preparation",
        "study performance difficulty hard topics",
    ]
    if subjects:
        queries.append(" ".join(subject.name for subject in subjects[:5]))

    seen: set = set()
    merged = []
    for query in queries:
        for chunk in retrieve(
            workspace,
            query,
            top_k=4,
            source_types=[
                ChunkSourceType.DOCUMENT,
                ChunkSourceType.NOTE,
                ChunkSourceType.PERFORMANCE,
            ],
        ):
            if chunk.id in seen:
                continue
            seen.add(chunk.id)
            merged.append(chunk)
            if len(merged) >= 8:
                break
        if len(merged) >= 8:
            break

    return format_rag_context(merged)


def _build_prompt(
    *,
    user: User,
    workspace: Workspace,
    range_start,
    range_end,
    constraints: dict | None,
    rag_context: str,
    hard_block: str,
) -> str:
    template = _load_prompt_template()
    subjects = list(Subject.objects.filter(workspace=workspace).order_by("name"))
    constraints_block = json.dumps(constraints or {}, ensure_ascii=False, indent=2)
    return template.format(
        timezone=user.timezone or "UTC",
        range_start=range_start.isoformat(),
        range_end=range_end.isoformat(),
        subjects_block=_subjects_block(subjects),
        constraints_block=constraints_block,
        hard_feedback_block=hard_block,
        rag_context=rag_context,
    )


def _call_model(
    prompt: str,
    *,
    subjects,
    range_start,
    range_end,
    hard_names,
    chunk_ids,
    tz,
) -> dict:
    backend = resolve_ai_backend()
    if backend == "mock":
        return mock_plan_payload(
            subjects=subjects,
            range_start=range_start,
            range_end=range_end,
            hard_subjects=hard_names,
            source_chunk_ids=chunk_ids,
            timezone=tz,
        )
    return generate_json(prompt, response_schema=PLAN_JSON_SCHEMA)


def _validate_with_retry(
    prompt: str,
    *,
    subjects,
    range_start,
    range_end,
    hard_names,
    chunk_ids,
    timezone_name: str,
    max_attempts: int = 3,
) -> PlanGenerationResponseSchema:
    last_error: Exception | None = None
    current_prompt = prompt

    for attempt in range(max_attempts):
        try:
            raw = _call_model(
                current_prompt,
                subjects=subjects,
                range_start=range_start,
                range_end=range_end,
                hard_names=hard_names,
                chunk_ids=chunk_ids,
                tz=timezone_name,
            )
            if not raw.get("source_chunk_ids"):
                raw["source_chunk_ids"] = chunk_ids
            return PlanGenerationResponseSchema.model_validate(raw)
        except (ValidationError, GeminiClientError, ValueError) as exc:
            last_error = exc
            logger.warning("Plan generation attempt %s failed: %s", attempt + 1, exc)
            current_prompt = (
                f"{prompt}\n\nPrevious output was invalid ({exc}). Return valid JSON only."
            )

    raise ValueError(str(last_error or "Plan generation failed"))


@transaction.atomic
def persist_plan(
    workspace: Workspace,
    *,
    prompt_snapshot: str,
    raw_response: dict,
    range_start,
    range_end,
    parsed: PlanGenerationResponseSchema,
) -> PlanVersion:
    plan = PlanVersion.objects.create(
        workspace=workspace,
        generated_by=PlanGeneratedBy.AI,
        prompt_snapshot=prompt_snapshot[:50_000],
        raw_response=raw_response,
        range_start=range_start,
        range_end=range_end,
    )
    subject_ids = {str(subject.id) for subject in Subject.objects.filter(workspace=workspace)}
    events = []
    for item in parsed.events:
        subject = None
        if item.subject_id and str(item.subject_id) in subject_ids:
            subject = Subject.objects.get(id=item.subject_id)
        start_at = item.start_at
        end_at = item.end_at
        if timezone.is_naive(start_at):
            start_at = timezone.make_aware(start_at, ZoneInfo(workspace.owner.timezone or "UTC"))
        if timezone.is_naive(end_at):
            end_at = timezone.make_aware(end_at, ZoneInfo(workspace.owner.timezone or "UTC"))
        events.append(
            StudyEvent(
                workspace=workspace,
                subject=subject,
                plan_version=plan,
                title=item.title,
                start_at=start_at,
                end_at=end_at,
                method=item.method,
                status=StudyEventStatus.PLANNED,
            )
        )
    StudyEvent.objects.bulk_create(events)
    return plan


def _parse_date(value) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def run_plan_generation(async_task_id: str, payload: dict) -> None:
    task = AsyncTask.objects.select_related("workspace", "workspace__owner", "user").get(
        id=async_task_id
    )
    workspace = task.workspace
    user = task.user

    try:
        range_start = _parse_date(payload["range_start"])
        range_end = _parse_date(payload["range_end"])
        constraints = payload.get("constraints")
        use_rag = payload.get("use_rag", True)

        if range_end < range_start:
            raise ValueError("range_end must be on or after range_start.")

        subjects = list(Subject.objects.filter(workspace=workspace).order_by("name"))
        hard_block, hard_names = _hard_feedback_block(workspace, range_start)
        rag_context, chunk_ids = _retrieve_plan_context(workspace, subjects, use_rag)
        prompt = _build_prompt(
            user=user,
            workspace=workspace,
            range_start=range_start,
            range_end=range_end,
            constraints=constraints,
            rag_context=rag_context,
            hard_block=hard_block,
        )
        parsed = _validate_with_retry(
            prompt,
            subjects=subjects,
            range_start=range_start,
            range_end=range_end,
            hard_names=hard_names,
            chunk_ids=chunk_ids,
            timezone_name=user.timezone or "UTC",
        )
        plan = persist_plan(
            workspace,
            prompt_snapshot=prompt,
            raw_response=parsed.model_dump(mode="json"),
            range_start=range_start,
            range_end=range_end,
            parsed=parsed,
        )
        task.status = AsyncTaskStatus.SUCCESS
        task.result = {
            "plan_version_id": str(plan.id),
            "adjustments": parsed.adjustments,
            "summary": parsed.summary,
        }
        task.error = None
        task.save(update_fields=["status", "result", "error", "updated_at"])
    except Exception as exc:
        logger.exception("Plan generation failed for task %s", async_task_id)
        task.status = AsyncTaskStatus.FAILED
        task.error = {
            "code": "PLAN_GENERATION_FAILED",
            "message": "Plan could not be generated. Please try again.",
            "details": {"reason": str(exc)[:500]},
        }
        task.save(update_fields=["status", "error", "updated_at"])
        raise
