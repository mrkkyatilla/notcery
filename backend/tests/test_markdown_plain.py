from apps.notes.markdown_plain import strip_markdown


def test_strip_markdown_headings_and_lists():
    md = "# Title\n\n- [x] Done\n- [ ] Todo\n\n**bold** text"
    plain = strip_markdown(md)
    assert "Title" in plain
    assert "Done" in plain
    assert "Todo" in plain
    assert "bold" in plain
    assert "#" not in plain


def test_strip_markdown_fences_and_math():
    md = "```mermaid\nflowchart TD\n  A --> B\n```\n\nInline $x^2$ and $$\\int_0^1 f$$"
    plain = strip_markdown(md)
    assert "flowchart" not in plain
    assert "mermaid" not in plain


def test_strip_markdown_links():
    md = "See [docs](https://example.com) and ![alt](img.png)"
    plain = strip_markdown(md)
    assert "docs" in plain
    assert "https://" not in plain
