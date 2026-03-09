import uuid

from django.db import models
from django.conf import settings


class Board(models.Model):
    BOARD_TYPE_CHOICES = [
        ('course-material', 'Course Material'),
        ('student-notes', 'Student Notes'),
        ('study-planner', 'Study Planner'),
        ('kanban', 'Kanban'),
        ('quiz', 'Quiz'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_boards')
    course = models.ForeignKey('courses.Course', on_delete=models.SET_NULL, null=True, blank=True, related_name='boards')
    content = models.JSONField(default=dict, blank=True)
    content_size = models.BigIntegerField(default=0)
    thumbnail = models.ImageField(upload_to='board_thumbnails/', null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    is_template = models.BooleanField(default=False)
    board_type = models.CharField(max_length=20, choices=BOARD_TYPE_CHOICES, default='course-material', blank=True)
    section = models.CharField(max_length=50, blank=True, default='')
    starred_by = models.ManyToManyField(settings.AUTH_USER_MODEL, through='StarredBoard', related_name='starred_boards')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['owner', '-updated_at']),
            models.Index(fields=['course']),
            models.Index(fields=['is_archived']),
            models.Index(fields=['is_template']),
        ]

    def __str__(self):
        return self.name

    def is_starred_by(self, user):
        """Check if board is starred by a specific user"""
        return self.starred_by.filter(id=user.id).exists()


class BoardShare(models.Model):
    PERMISSION_CHOICES = [
        ('view', 'View Only'),
        ('comment', 'Can Comment'),
        ('edit', 'Can Edit'),
    ]

    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='shares')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shared_with_boards')
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='view')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['board', 'user']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['board']),
        ]

    def __str__(self):
        return f"{self.board.name} shared with {self.user.username}"


class StarredBoard(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    board = models.ForeignKey(Board, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'board']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} starred {self.board.name}"


class BoardVersion(models.Model):
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='versions')
    content = models.JSONField()
    version_number = models.IntegerField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ['board', 'version_number']
        indexes = [
            models.Index(fields=['board', '-version_number']),
        ]

    def __str__(self):
        return f"{self.board.name} - v{self.version_number}"


class BoardInviteLink(models.Model):
    PERMISSION_CHOICES = [
        ('view', 'View Only'),
        ('comment', 'Can Comment'),
        ('edit', 'Can Edit'),
    ]

    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name='invite_links')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='view')
    expires_at = models.DateTimeField(null=True, blank=True)
    max_uses = models.IntegerField(null=True, blank=True, help_text="Null = unlimited uses")
    use_count = models.IntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_invite_links')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['board', 'is_active']),
        ]

    def __str__(self):
        return f"Invite for {self.board.name} ({self.permission})"

    @property
    def is_valid(self):
        from django.utils import timezone
        if not self.is_active:
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return False
        if self.max_uses is not None and self.use_count >= self.max_uses:
            return False
        return True
