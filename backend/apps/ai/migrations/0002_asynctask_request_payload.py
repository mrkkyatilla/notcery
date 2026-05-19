from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="asynctask",
            name="request_payload",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
