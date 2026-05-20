import pytest

from apps.lab.importing.ignore import should_ignore_relative_path
from apps.lab.importing.walk import safe_relative_path

pytestmark = pytest.mark.django_db


def test_should_ignore_node_modules():
    assert should_ignore_relative_path("src/node_modules/pkg/index.js") is True
    assert should_ignore_relative_path("src/main.py") is False


def test_safe_relative_path_rejects_traversal():
    assert safe_relative_path(__import__("pathlib").Path("/tmp"), "../etc/passwd") is None
    assert safe_relative_path(__import__("pathlib").Path("/tmp"), "src/a.py") == "src/a.py"
