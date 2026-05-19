import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.billing.models import PlanTier, Subscription, SubscriptionStatus

logger = logging.getLogger(__name__)


def stripe_configured() -> bool:
    return bool(getattr(settings, "STRIPE_SECRET_KEY", ""))


def _stripe():
    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def ensure_stripe_customer(subscription: Subscription) -> str:
    if subscription.stripe_customer_id:
        return subscription.stripe_customer_id
    if not stripe_configured():
        subscription.stripe_customer_id = f"mock_cus_{subscription.user_id}"
        subscription.save(update_fields=["stripe_customer_id", "updated_at"])
        return subscription.stripe_customer_id

    stripe = _stripe()
    customer = stripe.Customer.create(
        email=subscription.user.email,
        metadata={"user_id": str(subscription.user_id)},
    )
    subscription.stripe_customer_id = customer["id"]
    subscription.save(update_fields=["stripe_customer_id", "updated_at"])
    return customer["id"]


def create_checkout_session(subscription: Subscription) -> dict:
    customer_id = ensure_stripe_customer(subscription)
    success_url = settings.STRIPE_CHECKOUT_SUCCESS_URL
    cancel_url = settings.STRIPE_CHECKOUT_CANCEL_URL

    if not stripe_configured():
        return {
            "checkout_url": f"{success_url}?mock_checkout=1&customer={customer_id}",
            "session_id": f"mock_cs_{subscription.user_id}",
        }

    stripe = _stripe()
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": settings.STRIPE_PRO_PRICE_ID, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": str(subscription.user_id)},
    )
    return {"checkout_url": session["url"], "session_id": session["id"]}


def create_billing_portal_session(subscription: Subscription) -> dict:
    customer_id = ensure_stripe_customer(subscription)
    if not stripe_configured():
        return {"portal_url": f"{settings.STRIPE_CHECKOUT_SUCCESS_URL}?mock_portal=1"}

    stripe = _stripe()
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=settings.STRIPE_CHECKOUT_SUCCESS_URL,
    )
    return {"portal_url": session["url"]}


def apply_subscription_pro(subscription: Subscription, *, stripe_subscription_id: str = "") -> None:
    subscription.tier = PlanTier.PRO
    subscription.status = SubscriptionStatus.ACTIVE
    if stripe_subscription_id:
        subscription.stripe_subscription_id = stripe_subscription_id
    subscription.current_period_end = timezone.now() + timedelta(days=30)
    subscription.save(
        update_fields=[
            "tier",
            "status",
            "stripe_subscription_id",
            "current_period_end",
            "updated_at",
        ]
    )


def apply_subscription_free(subscription: Subscription) -> None:
    subscription.tier = PlanTier.FREE
    subscription.status = SubscriptionStatus.CANCELED
    subscription.stripe_subscription_id = ""
    subscription.save(
        update_fields=["tier", "status", "stripe_subscription_id", "updated_at"]
    )


def handle_webhook_payload(payload: bytes, signature: str | None) -> None:
    if not stripe_configured():
        logger.info("Stripe webhook ignored (not configured).")
        return

    stripe = _stripe()
    event = stripe.Webhook.construct_event(
        payload, signature, settings.STRIPE_WEBHOOK_SECRET
    )
    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        user_id = data.get("metadata", {}).get("user_id")
        if user_id:
            subscription = Subscription.objects.get(user_id=user_id)
            apply_subscription_pro(
                subscription,
                stripe_subscription_id=data.get("subscription", "") or "",
            )
    elif event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
        customer_id = data.get("customer")
        subscription = Subscription.objects.filter(stripe_customer_id=customer_id).first()
        if not subscription:
            return
        status = data.get("status", "")
        if status in ("active", "trialing"):
            apply_subscription_pro(subscription, stripe_subscription_id=data.get("id", ""))
        elif status in ("canceled", "unpaid", "incomplete_expired"):
            apply_subscription_free(subscription)
