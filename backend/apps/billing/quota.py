from dataclasses import dataclass
from datetime import date, timedelta

from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status

from apps.billing.models import (
    PlanTier,
    Subscription,
    SubscriptionStatus,
    UsageMetric,
    UsageRecord,
)
from apps.core.exceptions import APIError
from apps.indexer.models import Document


@dataclass(frozen=True)
class QuotaLimits:
    plan_generate_per_week: int | None
    chat_messages_per_day: int | None
    storage_mb: int


QUOTA_BY_TIER: dict[str, QuotaLimits] = {
    PlanTier.FREE: QuotaLimits(
        plan_generate_per_week=3,
        chat_messages_per_day=50,
        storage_mb=500,
    ),
    PlanTier.PRO: QuotaLimits(
        plan_generate_per_week=None,
        chat_messages_per_day=None,
        storage_mb=5_000,
    ),
}


def get_subscription(user) -> Subscription:
    subscription, _created = Subscription.objects.get_or_create(user=user)
    return subscription


def get_user_tier(user) -> str:
    subscription = get_subscription(user)
    if (
        subscription.tier == PlanTier.PRO
        and subscription.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE)
    ):
        return PlanTier.PRO
    return PlanTier.FREE


def _limits_for_user(user) -> QuotaLimits:
    tier = get_user_tier(user)
    return QUOTA_BY_TIER.get(tier, QUOTA_BY_TIER[PlanTier.FREE])


def _week_start(day: date) -> date:
    return day - timedelta(days=day.weekday())


def count_plan_generations_this_week(user) -> int:
    start = _week_start(timezone.localdate())
    return UsageRecord.objects.filter(
        user=user,
        metric=UsageMetric.PLAN_GENERATE,
        period_date__gte=start,
    ).aggregate(total=Sum("amount"))["total"] or 0


def count_chat_messages_today(user) -> int:
    today = timezone.localdate()
    return UsageRecord.objects.filter(
        user=user,
        metric=UsageMetric.CHAT_MESSAGE,
        period_date=today,
    ).aggregate(total=Sum("amount"))["total"] or 0


def get_storage_bytes_used(user) -> int:
    total = (
        Document.objects.filter(workspace__owner=user).aggregate(total=Sum("size_bytes"))["total"]
        or 0
    )
    return int(total)


def get_usage_snapshot(user) -> dict:
    limits = _limits_for_user(user)
    tier = get_user_tier(user)
    plan_used = count_plan_generations_this_week(user)
    chat_used = count_chat_messages_today(user)
    storage_used = get_storage_bytes_used(user)
    storage_mb_used = round(storage_used / (1024 * 1024), 2)

    return {
        "tier": tier,
        "limits": {
            "plan_generate_per_week": limits.plan_generate_per_week,
            "chat_messages_per_day": limits.chat_messages_per_day,
            "storage_mb": limits.storage_mb,
        },
        "usage": {
            "plan_generate_this_week": plan_used,
            "chat_messages_today": chat_used,
            "storage_mb": storage_mb_used,
        },
    }


def enforce_quota(user, metric: str, *, extra_bytes: int = 0) -> None:
    if not getattr(settings, "BILLING_ENFORCE_QUOTAS", True):
        return

    limits = _limits_for_user(user)

    if metric == UsageMetric.PLAN_GENERATE:
        if limits.plan_generate_per_week is None:
            return
        used = count_plan_generations_this_week(user)
        if used >= limits.plan_generate_per_week:
            raise APIError(
                code="QUOTA_EXCEEDED",
                message="Weekly AI plan limit reached. Upgrade to Pro for more.",
                status_code=status.HTTP_403_FORBIDDEN,
                details={
                    "metric": metric,
                    "limit": limits.plan_generate_per_week,
                    "used": used,
                },
            )

    if metric == UsageMetric.CHAT_MESSAGE:
        if limits.chat_messages_per_day is None:
            return
        used = count_chat_messages_today(user)
        if used >= limits.chat_messages_per_day:
            raise APIError(
                code="QUOTA_EXCEEDED",
                message="Daily chat message limit reached.",
                status_code=status.HTTP_403_FORBIDDEN,
                details={
                    "metric": metric,
                    "limit": limits.chat_messages_per_day,
                    "used": used,
                },
            )

    if metric == UsageMetric.STORAGE_BYTES:
        limit_bytes = limits.storage_mb * 1024 * 1024
        used = get_storage_bytes_used(user)
        if used + extra_bytes > limit_bytes:
            raise APIError(
                code="QUOTA_EXCEEDED",
                message="Storage quota exceeded.",
                status_code=status.HTTP_403_FORBIDDEN,
                details={
                    "metric": metric,
                    "limit_mb": limits.storage_mb,
                    "used_mb": round(used / (1024 * 1024), 2),
                },
            )


def record_usage(user, metric: str, amount: int = 1) -> None:
    UsageRecord.objects.create(
        user=user,
        metric=metric,
        amount=amount,
        period_date=timezone.localdate(),
    )
