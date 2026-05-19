from datetime import date, timedelta

import pytest
from apps.billing.models import PlanTier, Subscription, SubscriptionStatus, UsageMetric
from apps.billing.quota import enforce_quota, get_subscription, record_usage
from apps.billing.services.stripe_billing import apply_subscription_pro, create_checkout_session
from apps.feedback.models import AIFeedback, FeedbackTargetType
from apps.planner.models import PlanGeneratedBy, PlanVersion, Workspace

pytestmark = pytest.mark.django_db


def test_subscription_created_for_user(user):
    subscription = get_subscription(user)
    assert subscription.tier == PlanTier.FREE


def test_billing_me(auth_client, user):
    response = auth_client.get("/api/v1/billing/me")
    assert response.status_code == 200
    assert response.data["tier"] == PlanTier.FREE
    assert response.data["limits"]["plan_generate_per_week"] == 3


def test_free_plan_weekly_quota(auth_client, user):
    workspace = Workspace.objects.create(owner=user, name="Quota WS")
    start = date.today()
    end = start + timedelta(days=2)
    for _ in range(3):
        record_usage(user, UsageMetric.PLAN_GENERATE)
    response = auth_client.post(
        f"/api/v1/workspaces/{workspace.id}/plans/generate",
        {"range_start": start.isoformat(), "range_end": end.isoformat(), "use_rag": False},
        format="json",
    )
    assert response.status_code == 403
    assert response.data["error"]["code"] == "QUOTA_EXCEEDED"


def test_pro_tier_skips_plan_quota(user):
    subscription = get_subscription(user)
    apply_subscription_pro(subscription)
    for _ in range(5):
        enforce_quota(user, UsageMetric.PLAN_GENERATE)


def test_mock_checkout_session(user):
    subscription = get_subscription(user)
    session = create_checkout_session(subscription)
    assert "checkout_url" in session


def test_waitlist_create(api_client):
    response = api_client.post(
        "/api/v1/waitlist",
        {"email": "beta@example.com", "locale": "tr"},
        format="json",
    )
    assert response.status_code == 201
    duplicate = api_client.post(
        "/api/v1/waitlist",
        {"email": "beta@example.com"},
        format="json",
    )
    assert duplicate.status_code == 200


def test_ai_feedback_on_plan(auth_client, user):
    workspace = Workspace.objects.create(owner=user, name="Feedback WS")
    plan = PlanVersion.objects.create(
        workspace=workspace,
        generated_by=PlanGeneratedBy.AI,
    )
    response = auth_client.post(
        "/api/v1/feedback/ai",
        {
            "target_type": FeedbackTargetType.PLAN_VERSION,
            "target_id": str(plan.id),
            "rating": "up",
            "comment": "Helpful schedule",
        },
        format="json",
    )
    assert response.status_code == 201
    assert AIFeedback.objects.filter(user=user, target_id=plan.id).exists()


def test_feature_flags_in_public_config(api_client):
    response = api_client.get("/api/v1/config/public")
    assert response.status_code == 200
    assert "feature_flags" in response.data


def test_upgrade_subscription_via_admin_flow(user):
    subscription = Subscription.objects.get(user=user)
    subscription.tier = PlanTier.PRO
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.save()
    assert get_subscription(user).tier == PlanTier.PRO
