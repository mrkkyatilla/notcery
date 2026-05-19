import os

import pytest
from apps.users.models import User
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def indexer_test_settings(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
    settings.INDEXER_EMBEDDING_BACKEND = "mock"
    settings.INDEXER_MIN_SIMILARITY = 0.0
    settings.AI_BACKEND = "mock"
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "notcery-pytest",
        }
    }
    os.environ["INDEXER_EMBEDDING_BACKEND"] = "mock"
    os.environ["AI_BACKEND"] = "mock"


@pytest.fixture(autouse=True)
def stub_async_index_tasks(monkeypatch):
    """Avoid Celery/S3 side effects in non-indexer tests."""
    monkeypatch.setattr("apps.indexer.tasks.index_document_task.delay", lambda *_a, **_k: None)
    monkeypatch.setattr(
        "apps.indexer.tasks.index_study_event_feedback_task.delay", lambda *_a, **_k: None
    )


@pytest.fixture(autouse=True)
def disable_automatic_note_indexing():
    """Indexer tests call index_note explicitly; avoid signal overhead in other suites."""
    from apps.indexer.signals import schedule_note_indexing
    from apps.notes.models import Note
    from django.db.models.signals import post_save

    post_save.disconnect(schedule_note_indexing, sender=Note)
    yield
    post_save.connect(schedule_note_indexing, sender=Note)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="student@example.com",
        password="securepass123",
        locale="tr",
        theme="system",
        timezone="Europe/Istanbul",
    )


@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client
