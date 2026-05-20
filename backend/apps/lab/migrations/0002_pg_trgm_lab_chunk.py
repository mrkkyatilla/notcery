from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("lab", "0001_initial"),
    ]

    operations = [
        TrigramExtension(),
        migrations.AddIndex(
            model_name="labchunk",
            index=GinIndex(
                fields=["text"],
                name="lab_chunk_text_trgm_gin",
                opclasses=["gin_trgm_ops"],
            ),
        ),
    ]
