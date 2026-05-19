import uuid

from django.conf import settings
from django.db import models


class PlanTier(models.TextChoices):
    FREE = "free", "Free"
    PRO = "pro", "Pro"


class SubscriptionStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    PAST_DUE = "past_due", "Past due"
    CANCELED = "canceled", "Canceled"


class Subscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    tier = models.CharField(max_length=16, choices=PlanTier.choices, default=PlanTier.FREE)
    status = models.CharField(
        max_length=16,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "billing_subscription"

    def __str__(self):
        return f"{self.user_id}:{self.tier}"


class UsageMetric(models.TextChoices):
    PLAN_GENERATE = "plan_generate", "Plan generate"
    CHAT_MESSAGE = "chat_message", "Chat message"
    STORAGE_BYTES = "storage_bytes", "Storage bytes"


class UsageRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="usage_records",
    )
    metric = models.CharField(max_length=32, choices=UsageMetric.choices)
    amount = models.PositiveBigIntegerField(default=1)
    period_date = models.DateField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_usage_record"
        indexes = [
            models.Index(fields=["user", "metric", "period_date"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.metric}:{self.period_date}"


class WaitlistEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    locale = models.CharField(max_length=5, default="tr")
    invited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "billing_waitlist_entry"
        ordering = ["created_at"]

    def __str__(self):
        return self.email


class FeatureFlag(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    enabled = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "billing_feature_flag"

    def __str__(self):
        return self.key
