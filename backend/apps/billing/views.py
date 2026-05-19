import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models import FeatureFlag, WaitlistEntry
from apps.billing.quota import get_subscription, get_usage_snapshot
from apps.billing.serializers import (
    BillingSummarySerializer,
    WaitlistEntrySerializer,
    WaitlistSerializer,
)
from apps.billing.services.stripe_billing import (
    create_billing_portal_session,
    create_checkout_session,
    handle_webhook_payload,
)
from apps.core.exceptions import APIError

logger = logging.getLogger(__name__)


class BillingMeView(APIView):
    def get(self, request):
        subscription = get_subscription(request.user)
        snapshot = get_usage_snapshot(request.user)
        payload = {
            "tier": snapshot["tier"],
            "status": subscription.status,
            "current_period_end": subscription.current_period_end,
            "limits": snapshot["limits"],
            "usage": snapshot["usage"],
        }
        return Response(BillingSummarySerializer(payload).data)


class BillingCheckoutView(APIView):
    def post(self, request):
        subscription = get_subscription(request.user)
        session = create_checkout_session(subscription)
        return Response(session, status=status.HTTP_201_CREATED)


class BillingPortalView(APIView):
    def post(self, request):
        subscription = get_subscription(request.user)
        session = create_billing_portal_session(subscription)
        return Response(session)


class StripeWebhookView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        signature = request.headers.get("Stripe-Signature")
        try:
            handle_webhook_payload(request.body, signature)
        except Exception as exc:
            logger.exception("Stripe webhook failed")
            raise APIError(
                code="VALIDATION_ERROR",
                message="Webhook processing failed.",
                status_code=status.HTTP_400_BAD_REQUEST,
                details={"reason": str(exc)[:200]},
            ) from exc
        return Response({"received": True})


class WaitlistCreateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = WaitlistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        entry, created = WaitlistEntry.objects.get_or_create(
            email=data["email"].lower(),
            defaults={"locale": data.get("locale", "tr")},
        )
        if not created:
            return Response(
                WaitlistEntrySerializer(entry).data,
                status=status.HTTP_200_OK,
            )
        return Response(
            WaitlistEntrySerializer(entry).data,
            status=status.HTTP_201_CREATED,
        )


class FeatureFlagsView(APIView):
    def get(self, request):
        flags = {flag.key: flag.enabled for flag in FeatureFlag.objects.all()}
        return Response({"flags": flags})


def get_public_feature_flags() -> dict[str, bool]:
    return {flag.key: flag.enabled for flag in FeatureFlag.objects.all()}
