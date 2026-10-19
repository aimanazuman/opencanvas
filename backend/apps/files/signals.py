from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import File
from .security import delete_stored_file


@receiver(post_delete, sender=File)
def remove_stored_files(sender, instance, **kwargs):
    """Whenever a File row disappears (hard delete, board delete, user delete) its bytes go too."""
    stored = [f for f in (instance.file, instance.thumbnail) if f and f.name]
    if stored:
        transaction.on_commit(lambda: [delete_stored_file(f) for f in stored])
