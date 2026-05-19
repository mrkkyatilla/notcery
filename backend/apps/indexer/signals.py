from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.indexer.tasks import index_note_task
from apps.notes.models import Note


@receiver(post_save, sender=Note)
def schedule_note_indexing(sender, instance: Note, **kwargs):
    if instance.content_plain:
        index_note_task.delay(str(instance.id))
