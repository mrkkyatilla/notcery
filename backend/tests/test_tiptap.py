from apps.notes.tiptap import extract_plain_text


def test_extract_plain_text_paragraph():
    doc = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Merhaba dünya"}],
            }
        ],
    }
    assert extract_plain_text(doc) == "Merhaba dünya"


def test_extract_plain_text_heading_and_list():
    doc = {
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": {"level": 2},
                "content": [{"type": "text", "text": "Integral"}],
            },
            {
                "type": "bulletList",
                "content": [
                    {
                        "type": "listItem",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": "Substitution"}],
                            }
                        ],
                    }
                ],
            },
        ],
    }
    text = extract_plain_text(doc)
    assert "Integral" in text
    assert "Substitution" in text


def test_extract_empty_doc():
    assert extract_plain_text({"type": "doc", "content": []}) == ""
