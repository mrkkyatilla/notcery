from unittest.mock import patch

import pytest
from apps.users.models import User


@pytest.mark.django_db
def test_register_and_login(api_client):
    reg = api_client.post(
        "/api/v1/auth/register",
        {
            "email": "new@example.com",
            "password": "securepass123",
            "locale": "en",
            "theme": "dark",
        },
        format="json",
    )
    assert reg.status_code == 201
    assert reg.data["user"]["email"] == "new@example.com"
    assert reg.data["user"]["locale"] == "en"
    assert "access" in reg.data["tokens"]

    login = api_client.post(
        "/api/v1/auth/login",
        {"email": "new@example.com", "password": "securepass123"},
        format="json",
    )
    assert login.status_code == 200


@pytest.mark.django_db
def test_config_public(api_client):
    response = api_client.get("/api/v1/config/public")
    assert response.status_code == 200
    assert "locales" in response.data
    assert "google_oauth" in response.data


@pytest.mark.django_db
def test_users_me_requires_auth(api_client):
    response = api_client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.data["error"]["code"] == "UNAUTHORIZED"


@pytest.mark.django_db
def test_patch_locale_theme(auth_client, user):
    response = auth_client.patch(
        "/api/v1/users/me",
        {"theme": "dark", "locale": "en"},
        format="json",
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.theme == "dark"
    assert user.locale == "en"


@pytest.mark.django_db
def test_accept_language_en(api_client):
    response = api_client.get(
        "/api/v1/users/me",
        HTTP_ACCEPT_LANGUAGE="en",
    )
    assert response.status_code == 401
    assert "Authentication" in response.data["error"]["message"]


@pytest.mark.django_db
@patch("apps.users.serializers.verify_google_id_token")
def test_google_auth_new_user(mock_verify, api_client):
    mock_verify.return_value = {
        "sub": "google-sub-123",
        "email": "google@example.com",
        "email_verified": True,
        "name": "Google User",
        "picture": "https://example.com/photo.jpg",
    }
    response = api_client.post(
        "/api/v1/auth/google",
        {"id_token": "fake-token"},
        format="json",
    )
    assert response.status_code == 201
    assert response.data["is_new_user"] is True
    assert User.objects.filter(email="google@example.com").exists()


@pytest.mark.django_db
@patch("apps.users.serializers.verify_google_id_token")
def test_google_auth_invalid(mock_verify, api_client):
    from apps.core.exceptions import APIError

    mock_verify.side_effect = APIError(code="GOOGLE_TOKEN_INVALID", status_code=401)
    response = api_client.post(
        "/api/v1/auth/google",
        {"id_token": "bad"},
        format="json",
    )
    assert response.status_code == 401
    assert response.data["error"]["code"] == "GOOGLE_TOKEN_INVALID"
