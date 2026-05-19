from unittest.mock import patch

import pytest


@pytest.mark.django_db
@patch("apps.core.health.check_redis", return_value={"status": "ok"})
@patch("apps.core.health.check_database", return_value={"status": "ok"})
def test_health(_mock_db, _mock_redis, api_client):
    response = api_client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["checks"]["database"]["status"] == "ok"
    assert "X-Request-ID" in response.headers
