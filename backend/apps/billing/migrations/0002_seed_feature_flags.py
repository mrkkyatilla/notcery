from django.db import migrations


def seed_flags(apps, schema_editor):
    FeatureFlag = apps.get_model("billing", "FeatureFlag")
    defaults = (
        ("ai_grounding", False, "Gemini web grounding for chat"),
        ("closed_beta", False, "Require waitlist invite for registration"),
    )
    for key, enabled, description in defaults:
        FeatureFlag.objects.update_or_create(
            key=key,
            defaults={"enabled": enabled, "description": description},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_flags, migrations.RunPython.noop),
    ]
