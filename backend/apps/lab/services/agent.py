import json
import logging
from pathlib import Path
from uuid import UUID

from django.conf import settings

from apps.ai.services.backend import resolve_ai_backend
from apps.ai.services.gemini import GeminiClientError, generate_json, generate_text
from apps.ai.services.mock import mock_chat_reply
from apps.lab.models import (
    LabFile,
    LabFileKind,
    LabIndexStatus,
    LabMessage,
    LabMessageRole,
    LabOutputMode,
    LabSession,
)
from apps.lab.retrieval import retrieve_lab
from apps.lab.services.context import (
    chunks_to_lab_citations,
    format_lab_rag_context,
)
from apps.lab.services.schemas import COMPARISON_TABLE_JSON_SCHEMA, RISK_MATRIX_JSON_SCHEMA
from apps.lab.storage import build_lab_file_key, upload_text_content
from apps.lab.tasks import index_lab_file_task
from apps.lab.vfs import get_or_create_artifacts_folder

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "agent_system.txt"
MAX_HISTORY_MESSAGES = 12


def _load_system_template() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def _history_block(session: LabSession) -> str:
    messages = LabMessage.objects.filter(session=session).order_by("-created_at")[:MAX_HISTORY_MESSAGES]
    lines = []
    for msg in reversed(list(messages)):
        role = "User" if msg.role == LabMessageRole.USER else "Assistant"
        content = (msg.content or "")[:2000]
        lines.append(f"{role}: {content}")
    if not lines:
        return "(no prior messages)"
    return "\n".join(lines)


def _parse_active_file_ids(session: LabSession, override: list | None) -> list[UUID] | None:
    raw = override if override is not None else (session.active_file_ids or [])
    if not raw:
        return None
    return [UUID(str(item)) for item in raw]


def _structured_prompt_suffix(mode: str) -> str:
    if mode == LabOutputMode.RISK_MATRIX:
        return (
            "\n\nRespond with JSON matching the risk matrix schema: summary plus risks "
            "with title, severity, likelihood, description, mitigation, sources."
        )
    if mode == LabOutputMode.COMPARISON_TABLE:
        return (
            "\n\nRespond with JSON: summary, columns (headers), rows with topic and cells."
        )
    return ""


def _format_structured_as_markdown(mode: str, data: dict) -> str:
    if mode == LabOutputMode.RISK_MATRIX:
        lines = [data.get("summary", ""), "", "## Risk matrix", ""]
        for risk in data.get("risks") or []:
            title = risk.get("title", "Risk")
            sev = risk.get("severity", "")
            lines.append(f"- **{title}** ({sev}): {risk.get('description', '')}")
            if risk.get("mitigation"):
                lines.append(f"  - Mitigation: {risk['mitigation']}")
        return "\n".join(lines).strip()
    if mode == LabOutputMode.COMPARISON_TABLE:
        lines = [data.get("summary", ""), ""]
        cols = data.get("columns") or []
        if cols:
            lines.append("| Topic | " + " | ".join(cols) + " |")
            lines.append("| --- | " + " | ".join(["---"] * len(cols)) + " |")
            for row in data.get("rows") or []:
                cells = row.get("cells") or []
                lines.append("| " + row.get("topic", "") + " | " + " | ".join(cells) + " |")
        return "\n".join(lines).strip()
    return json.dumps(data, ensure_ascii=False, indent=2)


def _create_artifact_file(
    session: LabSession,
    *,
    name: str,
    content: str,
    mime_type: str,
) -> LabFile:
    folder = get_or_create_artifacts_folder(session.workspace)
    file_key = build_lab_file_key(session.workspace_id, name)
    upload_text_content(file_key, content, mime_type=mime_type)
    lab_file = LabFile.objects.create(
        workspace=session.workspace,
        folder=folder,
        name=name,
        file_key=file_key,
        mime_type=mime_type,
        extension=name.rsplit(".", 1)[-1] if "." in name else "",
        size_bytes=len(content.encode("utf-8")),
        kind=LabFileKind.ARTIFACT,
        created_by=session.user,
        source_session=session,
        index_status=LabIndexStatus.PENDING,
    )
    index_lab_file_task.delay(str(lab_file.id))
    return lab_file


def send_lab_message(
    session: LabSession,
    content: str,
    *,
    output_mode: str = LabOutputMode.FREE,
    use_rag: bool = True,
    active_file_ids: list | None = None,
) -> dict:
    content = content.strip()
    if not content:
        raise ValueError("Message content is required.")

    LabMessage.objects.create(session=session, role=LabMessageRole.USER, content=content)

    chunks = []
    if use_rag:
        file_ids = _parse_active_file_ids(session, active_file_ids)
        chunks = retrieve_lab(
            session.workspace,
            content,
            active_file_ids=file_ids,
        )

    rag_context, _chunk_ids = format_lab_rag_context(chunks)
    system_prompt = _load_system_template().format(rag_context=rag_context)
    history = _history_block(session)
    full_system = f"{system_prompt}\n\nPrior conversation:\n{history}"

    citations = chunks_to_lab_citations(chunks)
    structured_result = None
    artifact_file = None

    backend = resolve_ai_backend()
    try:
        if backend == "mock":
            assistant_text = mock_chat_reply(content, citations)
        elif output_mode == LabOutputMode.RISK_MATRIX:
            prompt = f"{full_system}{_structured_prompt_suffix(output_mode)}\n\nUser:\n{content}"
            structured_result = generate_json(
                prompt,
                response_schema=RISK_MATRIX_JSON_SCHEMA,
            )
            assistant_text = _format_structured_as_markdown(output_mode, structured_result)
        elif output_mode == LabOutputMode.COMPARISON_TABLE:
            prompt = f"{full_system}{_structured_prompt_suffix(output_mode)}\n\nUser:\n{content}"
            structured_result = generate_json(
                prompt,
                response_schema=COMPARISON_TABLE_JSON_SCHEMA,
            )
            assistant_text = _format_structured_as_markdown(output_mode, structured_result)
        else:
            assistant_text = generate_text(full_system, content)
    except GeminiClientError as exc:
        logger.exception("Lab agent failed for session %s", session.id)
        raise ValueError("AI is temporarily unavailable. Please try again.") from exc

    if structured_result and output_mode != LabOutputMode.FREE:
        ext = "json" if output_mode == LabOutputMode.RISK_MATRIX else "json"
        name = f"artifact-{session.id.hex[:8]}-{output_mode}.{ext}"
        artifact_file = _create_artifact_file(
            session,
            name=name,
            content=json.dumps(structured_result, ensure_ascii=False, indent=2),
            mime_type="application/json",
        )
        md_name = name.replace(".json", ".md")
        _create_artifact_file(
            session,
            name=md_name,
            content=assistant_text,
            mime_type="text/markdown",
        )

    assistant = LabMessage.objects.create(
        session=session,
        role=LabMessageRole.ASSISTANT,
        content=assistant_text,
        citations=citations,
        structured_result=structured_result,
    )

    payload = {
        "message": {
            "id": str(assistant.id),
            "role": LabMessageRole.ASSISTANT,
            "content": assistant_text,
        },
        "citations": citations,
        "structured_result": structured_result,
    }
    if artifact_file:
        payload["artifact_file"] = {
            "id": str(artifact_file.id),
            "name": artifact_file.name,
        }
    return payload
