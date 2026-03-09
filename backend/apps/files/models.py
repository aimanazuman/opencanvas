from django.db import models
from django.conf import settings
import os


class File(models.Model):
    FILE_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('document', 'Document'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='uploads/')
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES, default='other')
    file_size = models.BigIntegerField(default=0, help_text="File size in bytes")
    mime_type = models.CharField(max_length=100, blank=True)
    thumbnail = models.ImageField(upload_to='file_thumbnails/', null=True, blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='files')
    board = models.ForeignKey('boards.Board', on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['uploaded_by', '-created_at']),
            models.Index(fields=['board']),
            models.Index(fields=['file_type']),
            models.Index(fields=['is_deleted']),
        ]

    def __str__(self):
        return self.name

    @property
    def size_mb(self):
        """Return file size in megabytes"""
        return round(self.file_size / (1024 * 1024), 2)

    def get_file_extension(self):
        """Get file extension"""
        return os.path.splitext(self.name)[1].lower()
