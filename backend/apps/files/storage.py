import json

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Sum, Value
from django.db.models.functions import Greatest


class QuotaExceeded(Exception):
    """Raised by charge_storage. `scope` is 'user' or 'system'."""

    def __init__(self, scope):
        self.scope = scope
        super().__init__(scope)

    @property
    def message(self):
        if self.scope == 'system':
            return "System storage limit reached. Please contact an administrator."
        return "Storage quota exceeded. Please free up space or contact an administrator."


def calculate_content_size(content):
    """Calculate the byte size of board JSON content (includes base64-embedded files)."""
    if not content:
        return 0
    return len(json.dumps(content).encode('utf-8'))


def update_user_storage(user, delta):
    """Adjust user.storage_used by delta bytes, clamped to >= 0. The change is made by the database in a single
    UPDATE (no read-modify-write), so two requests at the same time cannot overwrite each other."""
    User = get_user_model()
    User.objects.filter(pk=user.pk).update(storage_used=Greatest(F('storage_used') + delta, Value(0)))
    user.refresh_from_db(fields=['storage_used'])


def charge_storage(user, delta):
    """Atomically check the quotas and charge `delta` bytes to `user`.

    The user row is locked (SELECT ... FOR UPDATE) while the quota is checked and the counter changes, so two uploads
    at the same time cannot both squeeze under the limit. Raises QuotaExceeded. A negative delta only frees space.
    """
    User = get_user_model()
    with transaction.atomic():
        locked = User.objects.select_for_update().get(pk=user.pk)
        if delta > 0:
            ok, _ = check_quota(locked, delta)
            if not ok:
                raise QuotaExceeded('user')
            sys_ok, _ = check_system_quota(delta)
            if not sys_ok:
                raise QuotaExceeded('system')
        update_user_storage(locked, delta)
    user.storage_used = locked.storage_used


def get_effective_quota(user):
    """Get the effective quota for a user, capped by system-wide storage limit if set."""
    from apps.accounts.models import SystemSettings

    user_quota = user.storage_quota

    limit_str = SystemSettings.objects.filter(key='systemStorageLimit').values_list('value', flat=True).first()
    if limit_str:
        try:
            limit_gb = float(limit_str)
            if limit_gb > 0:
                limit_bytes = int(limit_gb * (1024 ** 3))
                # Each user's effective quota is capped at the system limit
                user_quota = min(user_quota, limit_bytes)
        except (ValueError, TypeError):
            pass

    return user_quota


def check_quota(user, additional_bytes):
    """Check if user has enough quota for additional_bytes.
    User quota is capped by the system-wide storage limit.
    Returns (ok, remaining)."""
    effective_quota = get_effective_quota(user)
    remaining = effective_quota - user.storage_used
    return (additional_bytes <= remaining, remaining)


def check_system_quota(additional_bytes):
    """Check if adding additional_bytes would exceed the system-wide storage limit.
    Returns (ok, remaining). If no limit is set, always returns ok."""
    from apps.accounts.models import SystemSettings
    from django.contrib.auth import get_user_model
    from django.db.models import Sum

    limit_str = SystemSettings.objects.filter(key='systemStorageLimit').values_list('value', flat=True).first()
    if not limit_str:
        return (True, None)

    try:
        limit_gb = float(limit_str)
    except (ValueError, TypeError):
        return (True, None)

    if limit_gb <= 0:
        return (True, None)

    limit_bytes = int(limit_gb * (1024 ** 3))

    User = get_user_model()
    total_used = User.objects.aggregate(total=Sum('storage_used'))['total'] or 0
    remaining = limit_bytes - total_used
    return (additional_bytes <= remaining, remaining)


def get_user_storage_breakdown(user):
    """Get storage breakdown for a user: File model files + Board content sizes."""
    from apps.files.models import File
    from apps.boards.models import Board

    file_total = File.objects.filter(
        uploaded_by=user, is_deleted=False
    ).aggregate(total=Sum('file_size'))['total'] or 0

    board_content_total = Board.objects.filter(
        owner=user, is_archived=False
    ).aggregate(total=Sum('content_size'))['total'] or 0

    return {
        'file_uploads': file_total,
        'board_content': board_content_total,
        'total': file_total + board_content_total,
    }
