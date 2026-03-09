from django.contrib import admin
from .models import Board, BoardShare, StarredBoard, BoardVersion


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'course', 'is_archived', 'is_template', 'updated_at']
    list_filter = ['is_archived', 'is_template', 'course']
    search_fields = ['name', 'owner__username', 'description']
    date_hierarchy = 'updated_at'


@admin.register(BoardShare)
class BoardShareAdmin(admin.ModelAdmin):
    list_display = ['board', 'user', 'permission', 'created_at']
    list_filter = ['permission', 'created_at']
    search_fields = ['board__name', 'user__username']


@admin.register(StarredBoard)
class StarredBoardAdmin(admin.ModelAdmin):
    list_display = ['user', 'board', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'board__name']
    date_hierarchy = 'created_at'


@admin.register(BoardVersion)
class BoardVersionAdmin(admin.ModelAdmin):
    list_display = ['board', 'version_number', 'created_by', 'created_at']
    list_filter = ['created_at']
    search_fields = ['board__name', 'created_by__username', 'description']
    readonly_fields = ['content', 'created_at']
    date_hierarchy = 'created_at'
