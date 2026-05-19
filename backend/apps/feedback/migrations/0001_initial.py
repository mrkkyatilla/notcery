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
            name="AIFeedback",
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
                    "target_type",
                    models.CharField(
                        choices=[
                            ("plan_version", "Plan version"),
                            ("chat_message", "Chat message"),
                        ],
                        max_length=32,
                    ),
                ),
                ("target_id", models.UUIDField()),
                (
                    "rating",
                    models.CharField(
                        choices=[("up", "Thumbs up"), ("down", "Thumbs down")],
                        max_length=8,
                    ),
                ),
                ("comment", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ai_feedbacks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "feedback_ai",
                "constraints": [
                    models.UniqueConstraint(
                        fields=("user", "target_type", "target_id"),
                        name="unique_feedback_per_target",
                    )
                ],
            },
        ),
    ]
