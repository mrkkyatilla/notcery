import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from apps.users.managers import UserManager


class Locale(models.TextChoices):
    TR = "tr", "Türkçe"
    EN = "en", "English"


class Theme(models.TextChoices):
    LIGHT = "light", "Light"
    DARK = "dark", "Dark"
    SYSTEM = "system", "System"


class AuthProvider(models.TextChoices):
    EMAIL = "email", "Email"
    GOOGLE = "google", "Google"


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=120, blank=True)
    avatar_url = models.URLField(blank=True, null=True)
    locale = models.CharField(max_length=5, choices=Locale.choices, default=Locale.TR)
    theme = models.CharField(max_length=10, choices=Theme.choices, default=Theme.SYSTEM)
    timezone = models.CharField(max_length=64, default="UTC")
    auth_provider = models.CharField(
        max_length=10, choices=AuthProvider.choices, default=AuthProvider.EMAIL
    )
    email_verified = models.BooleanField(default=False)
    onboarding_completed = models.BooleanField(default=False)
    study_preferences = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    username = None
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        db_table = "users_user"

    def __str__(self):
        return self.email


class SocialProvider(models.TextChoices):
    GOOGLE = "google", "Google"


class SocialAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="social_accounts")
    provider = models.CharField(max_length=20, choices=SocialProvider.choices)
    provider_user_id = models.CharField(max_length=255)
    extra_data = models.JSONField(default=dict, blank=True)
    linked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users_social_account"
        constraints = [
            models.UniqueConstraint(
                fields=["provider", "provider_user_id"],
                name="unique_social_provider_user",
            )
        ]

    def __str__(self):
        return f"{self.provider}:{self.provider_user_id}"
