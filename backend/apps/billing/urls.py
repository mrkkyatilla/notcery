from django.urls import path

from .views import (
    BillingCheckoutView,
    BillingMeView,
    BillingPortalView,
    FeatureFlagsView,
    StripeWebhookView,
    WaitlistCreateView,
)

urlpatterns = [
    path("billing/me", BillingMeView.as_view(), name="billing-me"),
    path("billing/checkout", BillingCheckoutView.as_view(), name="billing-checkout"),
    path("billing/portal", BillingPortalView.as_view(), name="billing-portal"),
    path("billing/webhooks/stripe", StripeWebhookView.as_view(), name="stripe-webhook"),
    path("waitlist", WaitlistCreateView.as_view(), name="waitlist-create"),
    path("config/features", FeatureFlagsView.as_view(), name="feature-flags"),
]
