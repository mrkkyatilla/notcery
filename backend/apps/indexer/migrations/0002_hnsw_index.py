# Optional production index — run when chunk volume justifies HNSW build time.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("indexer", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE INDEX IF NOT EXISTS indexer_chunk_embedding_hnsw
                ON indexer_chunk
                USING hnsw (embedding vector_cosine_ops)
                WITH (m = 16, ef_construction = 64);
            """,
            reverse_sql="DROP INDEX IF EXISTS indexer_chunk_embedding_hnsw;",
        ),
    ]
