# Generated manually for Faz 7

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FeatureFlag",
            fields=[
                ("key", models.CharField(max_length=64, primary_key=True, serialize=False)),
                ("enabled", models.BooleanField(default=False)),
                ("description", models.TextField(blank=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "billing_feature_flag",
            },
        ),
        migrations.CreateModel(
            name="WaitlistEntry",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("locale", models.CharField(default="tr", max_length=5)),
                ("invited", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "billing_waitlist_entry",
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="Subscription",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "tier",
                    models.CharField(
                        choices=[("free", "Free"), ("pro", "Pro")],
                        default="free",
                        max_length=16,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("past_due", "Past due"),
                            ("canceled", "Canceled"),
                        ],
                        default="active",
                        max_length=16,
                    ),
                ),
                ("stripe_customer_id", models.CharField(blank=True, max_length=255)),
                ("stripe_subscription_id", models.CharField(blank=True, max_length=255)),
                ("current_period_end", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subscription",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "billing_subscription",
            },
        ),
        migrations.CreateModel(
            name="UsageRecord",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "metric",
                    models.CharField(
                        choices=[
                            ("plan_generate", "Plan generate"),
                            ("chat_message", "Chat message"),
                            ("storage_bytes", "Storage bytes"),
                        ],
                        max_length=32,
                    ),
                ),
                ("amount", models.PositiveBigIntegerField(default=1)),
                ("period_date", models.DateField()),
                ("recorded_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="usage_records",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "billing_usage_record",
                "indexes": [
                    models.Index(
                        fields=["user", "metric", "period_date"],
                        name="billing_usa_user_id_0bb8f1_idx",
                    )
                ],
            },
        ),
    ]
