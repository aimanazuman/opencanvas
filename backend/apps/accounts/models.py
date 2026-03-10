from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class Institution(models.Model):
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, unique=True, help_text="Email domain for institutional emails (e.g., 'university.edu')")
    code = models.CharField(max_length=50, unique=True)
    logo = models.ImageField(upload_to='institution_logos/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['domain']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_CHOICES = [
        ('student', 'Student'),
        ('lecturer', 'Lecturer'),
        ('admin', 'Admin'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    is_guest = models.BooleanField(default=False)
    guest_expires_at = models.DateTimeField(null=True, blank=True, help_text="When this guest account will be auto-deleted")
    email_verified = models.BooleanField(default=False, help_text="Whether the user has verified their email address")
    email_verification_token = models.CharField(max_length=64, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(blank=True)
    institution = models.ForeignKey(Institution, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    storage_quota = models.BigIntegerField(default=5368709120, help_text="Storage quota in bytes (default: 5GB)")
    storage_used = models.BigIntegerField(default=0, help_text="Storage used in bytes")
    preferences = models.JSONField(default=dict, blank=True, help_text="User preferences (theme, language, notification toggles)")
    last_username_change = models.DateTimeField(null=True, blank=True)
    username_change_count = models.IntegerField(default=0)
    last_email_change = models.DateTimeField(null=True, blank=True)
    email_change_count = models.IntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['institution']),
        ]

    def __str__(self):
        return f"{self.username} ({self.role})"


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('read', 'Read'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('share', 'Share'),
        ('unshare', 'Unshare'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=100, null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['action']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} {self.resource_type} at {self.created_at}"


class SystemSettings(models.Model):
    """Key-value store for system-wide settings."""
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        verbose_name_plural = 'System settings'

    def __str__(self):
        return f"{self.key}: {self.value[:50]}"

    @classmethod
    def get_all_settings(cls):
        """Return all settings as a dictionary."""
        return {s.key: s.value for s in cls.objects.all()}

    @classmethod
    def set_setting(cls, key, value, user=None):
        """Set a single setting."""
        obj, _ = cls.objects.update_or_create(
            key=key,
            defaults={'value': str(value), 'updated_by': user}
        )
        return obj


class Notification(models.Model):
    TYPE_CHOICES = [
        ('board_shared', 'Board Shared'),
        ('course_enrolled', 'Course Enrolled'),
        ('system_announcement', 'System Announcement'),
        ('invite_accepted', 'Invite Accepted'),
        ('quota_changed', 'Quota Changed'),
        ('storage_warning', 'Storage Warning'),
        ('guest_account_expiry', 'Guest Account Expiry'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_board = models.ForeignKey('boards.Board', on_delete=models.SET_NULL, null=True, blank=True)
    related_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='triggered_notifications')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f"{self.type}: {self.title} -> {self.user.username}"
