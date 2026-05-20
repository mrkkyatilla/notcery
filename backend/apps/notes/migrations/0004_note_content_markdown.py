from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("notes", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="note",
            name="content_markdown",
            field=models.TextField(blank=True, default=""),
        ),
    ]
