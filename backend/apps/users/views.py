from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.billing.views import get_public_feature_flags
from apps.core.exceptions import APIError
from apps.users.models import AuthProvider, Locale, SocialAccount, SocialProvider, Theme, User
from apps.users.serializers import (
    AccountDeleteSerializer,
    GoogleAuthSerializer,
    LoginSerializer,
    RefreshSerializer,
    RegisterSerializer,
    TokenPairSerializer,
    UserSerializer,
    UserUpdateSerializer,
    build_token_pair,
)
from apps.users.services.google import verify_google_id_token
from apps.users.services.privacy import delete_user_account, export_user_data


def auth_response(user: User, is_new_user: bool = False, status_code=status.HTTP_200_OK):
    data = {
        "user": UserSerializer(user).data,
        "tokens": build_token_pair(user),
        "is_new_user": is_new_user,
    }
    return Response(data, status=status_code)


class PublicConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "locales": [
                    {"code": "tr", "label": "Türkçe"},
                    {"code": "en", "label": "English"},
                ],
                "themes": [
                    {"code": "light", "label": "Light" if request.locale == "en" else "Açık"},
                    {"code": "dark", "label": "Dark" if request.locale == "en" else "Koyu"},
                    {
                        "code": "system",
                        "label": "System" if request.locale == "en" else "Sistem",
                    },
                ],
                "default_locale": settings.NOTCERY_DEFAULT_LOCALE,
                "default_theme": Theme.SYSTEM,
                "google_oauth": {
                    "enabled": bool(settings.GOOGLE_OAUTH_CLIENT_ID),
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID or "",
                },
                "feature_flags": get_public_feature_flags(),
            }
        )


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return auth_response(user, is_new_user=True, status_code=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return auth_response(serializer.validated_data["user"])


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.context["google_payload"]
        sub = payload["sub"]
        email = payload.get("email", "").lower()

        social = (
            SocialAccount.objects.select_related("user")
            .filter(provider=SocialProvider.GOOGLE, provider_user_id=sub)
            .first()
        )
        if social:
            return auth_response(social.user)

        existing = User.objects.filter(email__iexact=email).first()
        if existing and existing.auth_provider != AuthProvider.GOOGLE:
            raise APIError(
                code="ACCOUNT_EXISTS_LINK_REQUIRED",
                status_code=status.HTTP_409_CONFLICT,
                details={"link_endpoint": "/api/v1/auth/google/link"},
            )

        is_new = existing is None
        if existing:
            user = existing
        else:
            user = User.objects.create_user(
                email=email,
                display_name=payload.get("name", "")[:120],
                avatar_url=payload.get("picture"),
                locale=serializer.validated_data.get("locale", Locale.TR),
                theme=serializer.validated_data.get("theme", Theme.SYSTEM),
                timezone=serializer.validated_data.get("timezone", "UTC"),
                auth_provider=AuthProvider.GOOGLE,
                email_verified=True,
            )

        SocialAccount.objects.get_or_create(
            user=user,
            provider=SocialProvider.GOOGLE,
            provider_user_id=sub,
            defaults={"extra_data": {"email": email}},
        )
        if payload.get("picture") and user.avatar_url != payload.get("picture"):
            user.avatar_url = payload.get("picture")
            user.save(update_fields=["avatar_url"])

        return auth_response(
            user,
            is_new_user=is_new,
            status_code=status.HTTP_201_CREATED if is_new else status.HTTP_200_OK,
        )


class GoogleLinkView(APIView):
    @transaction.atomic
    def post(self, request):
        token = request.data.get("id_token")
        if not token:
            raise APIError(
                code="VALIDATION_ERROR",
                message="id_token is required.",
                status_code=400,
            )
        payload = verify_google_id_token(token)
        sub = payload["sub"]

        if SocialAccount.objects.filter(
            provider=SocialProvider.GOOGLE, provider_user_id=sub
        ).exclude(user=request.user).exists():
            raise APIError(code="CONFLICT", status_code=status.HTTP_409_CONFLICT)

        SocialAccount.objects.get_or_create(
            user=request.user,
            provider=SocialProvider.GOOGLE,
            provider_user_id=sub,
            defaults={"extra_data": {"email": payload.get("email")}},
        )
        if request.user.auth_provider == AuthProvider.EMAIL:
            request.user.email_verified = bool(payload.get("email_verified"))
        if payload.get("picture"):
            request.user.avatar_url = payload.get("picture")
        request.user.save()
        return Response(UserSerializer(request.user).data)


class RefreshView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            refresh = RefreshToken(serializer.validated_data["refresh"])
            user = User.objects.get(pk=refresh["user_id"])
            refresh.blacklist()
            tokens = build_token_pair(user)
        except (TokenError, User.DoesNotExist) as exc:
            raise APIError(code="UNAUTHORIZED", status_code=status.HTTP_401_UNAUTHORIZED) from exc
        return Response(TokenPairSerializer(tokens).data)


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                RefreshToken(refresh_token).blacklist()
            except TokenError:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)

    def delete(self, request):
        serializer = AccountDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        delete_user_account(request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserDataExportView(APIView):
    def get(self, request):
        return Response(export_user_data(request.user))
