"""Extract plain text from TipTap / ProseMirror JSON documents."""

EMPTY_DOC = {"type": "doc", "content": []}


def empty_document() -> dict:
    return dict(EMPTY_DOC)


def extract_plain_text(content_json: dict | None) -> str:
    if not content_json or not isinstance(content_json, dict):
        return ""
    parts: list[str] = []
    _walk_node(content_json, parts)
    return "\n".join(line.strip() for line in " ".join(parts).splitlines() if line.strip())


def _walk_node(node: dict, parts: list[str]) -> None:
    if not isinstance(node, dict):
        return
    node_type = node.get("type")
    if node_type == "text":
        text = node.get("text", "")
        if text:
            parts.append(text)
        return
    if node_type in ("hardBreak", "horizontalRule"):
        parts.append("\n")
    for child in node.get("content") or []:
        if isinstance(child, dict):
            _walk_node(child, parts)
    if node_type in ("paragraph", "heading", "listItem", "blockquote", "codeBlock"):
        parts.append("\n")
