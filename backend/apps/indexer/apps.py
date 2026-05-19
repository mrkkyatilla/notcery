from django.apps import AppConfig


class IndexerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.indexer"

    def ready(self):
        import apps.indexer.signals  # noqa: F401
