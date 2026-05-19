from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import AuthProvider, Locale, SocialAccount, Theme, User
from apps.users.services.google import verify_google_id_token


class SocialAccountSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialAccount
        fields = ("provider", "linked_at")


class UserSerializer(serializers.ModelSerializer):
    social_accounts = SocialAccountSummarySerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "display_name",
            "avatar_url",
            "locale",
            "theme",
            "timezone",
            "auth_provider",
            "email_verified",
            "onboarding_completed",
            "study_preferences",
            "social_accounts",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "email",
            "auth_provider",
            "email_verified",
            "social_accounts",
            "created_at",
            "updated_at",
        )


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "display_name",
            "locale",
            "theme",
            "timezone",
            "study_preferences",
            "onboarding_completed",
        )

    def validate_locale(self, value):
        if value not in Locale.values:
            raise serializers.ValidationError("Unsupported locale.")
        return value

    def validate_theme(self, value):
        if value not in Theme.values:
            raise serializers.ValidationError("Unsupported theme.")
        return value


class TokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    access_expires_in = serializers.IntegerField()


def build_token_pair(user: User) -> dict:
    refresh = RefreshToken.for_user(user)
    from django.conf import settings

    access_lifetime = settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "access_expires_in": int(access_lifetime.total_seconds()),
    }


class AuthResponseSerializer(serializers.Serializer):
    user = UserSerializer()
    tokens = TokenPairSerializer()
    is_new_user = serializers.BooleanField(required=False)


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    locale = serializers.ChoiceField(choices=Locale.choices, required=False)
    theme = serializers.ChoiceField(choices=Theme.choices, required=False)
    timezone = serializers.CharField(required=False, max_length=64)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, validated_data):
        locale = validated_data.pop("locale", Locale.TR)
        theme = validated_data.pop("theme", Theme.SYSTEM)
        timezone = validated_data.pop("timezone", "UTC")
        display_name = validated_data.pop("display_name", "")
        password = validated_data.pop("password")
        email = validated_data["email"]

        user = User.objects.create_user(
            email=email,
            password=password,
            display_name=display_name,
            locale=locale,
            theme=theme,
            timezone=timezone,
            auth_provider=AuthProvider.EMAIL,
            email_verified=False,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].lower()
        user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=attrs["password"],
        )
        if user is None:
            raise serializers.ValidationError("Invalid credentials.")
        attrs["user"] = user
        return attrs


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField()
    locale = serializers.ChoiceField(choices=Locale.choices, required=False)
    theme = serializers.ChoiceField(choices=Theme.choices, required=False)
    timezone = serializers.CharField(required=False, max_length=64)

    def validate_id_token(self, value):
        self.context["google_payload"] = verify_google_id_token(value)
        return value


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class AccountDeleteSerializer(serializers.Serializer):
    confirm = serializers.CharField()

    def validate_confirm(self, value):
        if value != "DELETE":
            raise serializers.ValidationError('Type "DELETE" to confirm account removal.')
        return value
