import logging
from pathlib import Path
from uuid import UUID

from apps.ai.services.backend import resolve_ai_backend
from apps.ai.services.context import chunks_to_citations, format_rag_context
from apps.ai.services.gemini import GeminiClientError, generate_text
from apps.ai.services.mock import mock_chat_reply
from apps.chat.models import ChatMessage, ChatRole, ChatSession
from apps.indexer.retrieval import retrieve
from apps.notes.models import Note

logger = logging.getLogger(__name__)

SYSTEM_PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "chat_system.txt"


def _load_system_template() -> str:
    return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")


def _retrieve_chat_context(session: ChatSession, content: str, context: dict) -> list:
    workspace = session.workspace
    subject_id = context.get("subject_id")
    note_id = context.get("note_id")
    use_rag = context.get("use_rag", True)
    if not use_rag:
        return []

    query = content.strip()
    if note_id:
        try:
            note = Note.objects.get(id=note_id, workspace=workspace)
            query = f"{note.title} {note.content_plain[:500]} {query}"
        except Note.DoesNotExist:
            pass

    sid = UUID(str(subject_id)) if subject_id else None
    return retrieve(workspace, query, top_k=8, subject_id=sid)


def send_chat_message(session: ChatSession, content: str, context: dict | None = None) -> dict:
    context = context or {}
    content = content.strip()
    if not content:
        raise ValueError("Message content is required.")

    ChatMessage.objects.create(session=session, role=ChatRole.USER, content=content)

    chunks = _retrieve_chat_context(session, content, context)
    rag_context, _chunk_ids = format_rag_context(chunks)
    system_prompt = _load_system_template().format(rag_context=rag_context)
    citations = chunks_to_citations(chunks)

    backend = resolve_ai_backend()
    try:
        if backend == "mock":
            assistant_text = mock_chat_reply(content, citations)
        else:
            assistant_text = generate_text(system_prompt, content)
    except GeminiClientError as exc:
        logger.exception("Chat generation failed for session %s", session.id)
        raise ValueError("AI is temporarily unavailable. Please try again.") from exc

    assistant = ChatMessage.objects.create(
        session=session,
        role=ChatRole.ASSISTANT,
        content=assistant_text,
        citations=citations,
    )

    return {
        "message": {
            "id": str(assistant.id),
            "role": ChatRole.ASSISTANT,
            "content": assistant_text,
        },
        "citations": citations,
    }
