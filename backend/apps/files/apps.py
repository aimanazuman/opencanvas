from django.apps import AppConfig


class FilesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.files'

    def ready(self):
        from . import signals  # noqa: F401  (registers the post_delete handler that removes stored bytes)
