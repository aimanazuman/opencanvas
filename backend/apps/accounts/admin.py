from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Institution, AuditLog


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'domain', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'domain']


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'institution', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_active', 'institution']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'avatar', 'bio', 'institution', 'storage_quota', 'storage_used')}),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'resource_type', 'resource_id', 'ip_address', 'created_at']
    list_filter = ['action', 'resource_type', 'created_at']
    search_fields = ['user__username', 'resource_type', 'resource_id', 'ip_address']
    readonly_fields = ['user', 'action', 'resource_type', 'resource_id', 'details', 'ip_address', 'user_agent', 'created_at']
    date_hierarchy = 'created_at'
