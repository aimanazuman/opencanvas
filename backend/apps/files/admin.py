from django.contrib import admin
from .models import File


@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ['name', 'file_type', 'size_mb', 'uploaded_by', 'board', 'is_deleted', 'created_at']
    list_filter = ['file_type', 'is_deleted', 'created_at']
    search_fields = ['name', 'uploaded_by__username']
    readonly_fields = ['file_size', 'mime_type', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
