from django.contrib import admin

from apps.billing.models import FeatureFlag, Subscription, UsageRecord, WaitlistEntry


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "tier", "status", "stripe_customer_id", "updated_at")
    list_filter = ("tier", "status")


@admin.register(UsageRecord)
class UsageRecordAdmin(admin.ModelAdmin):
    list_display = ("user", "metric", "amount", "period_date", "recorded_at")
    list_filter = ("metric", "period_date")


@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(admin.ModelAdmin):
    list_display = ("email", "invited", "locale", "created_at")
    list_filter = ("invited",)


@admin.register(FeatureFlag)
class FeatureFlagAdmin(admin.ModelAdmin):
    list_display = ("key", "enabled", "updated_at")
