import json
import math

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Q, Sum, Value
from django.db.models.functions import Greatest

GB = 1024 ** 3
# The largest quota or system limit an administrator may set, in GB (10 TiB).
MAX_STORAGE_GB = 10 * 1024


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


# Storage accounting rules (keep every path in step with these):
# - A board's content_size is paid for by the board owner, and only while the board is not archived.
# - A file is paid for by the user who uploaded it, and only while the file is not deleted and its board (if any)
#   is not archived. Uploads to an archived board are refused, so a file is never charged while it is not counted.
# - Archiving refunds the board's content and files; restoring charges them again; deleting a non-archived board
#   refunds them. Deleting a file on an archived board refunds nothing (it was already refunded at archive time).

def live_file_q():
    """Filter for files that count towards their uploader's storage_used."""
    return Q(board__isnull=True) | Q(board__is_archived=False)


def file_counts_toward_storage(file_obj):
    """True when a (non-deleted) file is currently paid for by its uploader."""
    return file_obj.board_id is None or not file_obj.board.is_archived


def storage_gb_setting(raw):
    """Read a GB value from SystemSettings. Returns a float in (0, MAX_STORAGE_GB], or None when the value is missing,
    not a number, not finite or not positive. Larger values are capped at MAX_STORAGE_GB."""
    try:
        gb = float(raw)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(gb) or gb <= 0:
        return None
    return min(gb, MAX_STORAGE_GB)


def gb_to_bytes(gb):
    return int(gb * GB)


def validate_storage_gb(key, value):
    """Admin input check for defaultStorageQuota and systemStorageLimit. Returns an error message, or None when valid.
    For systemStorageLimit an empty value or 0 means "no system-wide limit", as it always has."""
    text = str(value).strip()
    error = f'{key} must be a number of GB greater than 0 and at most {MAX_STORAGE_GB} (10 TiB).'
    if key == 'systemStorageLimit' and text == '':
        return None
    try:
        gb = float(text)
    except ValueError:
        return error
    if key == 'systemStorageLimit' and gb == 0:
        return None
    if not math.isfinite(gb) or gb <= 0 or gb > MAX_STORAGE_GB:
        return error
    return None


def model_default_quota():
    return get_user_model()._meta.get_field('storage_quota').default


def quota_bytes_from_setting(raw, fallback):
    """Default quota for a new account from the defaultStorageQuota setting. An unusable value gives `fallback`."""
    gb = storage_gb_setting(raw)
    if gb is None:
        return fallback
    try:
        return gb_to_bytes(gb)
    except OverflowError:
        return fallback


def get_system_limit_gb():
    """The systemStorageLimit setting in GB, or None when no usable limit is set."""
    from apps.accounts.models import SystemSettings
    raw = SystemSettings.objects.filter(key='systemStorageLimit').values_list('value', flat=True).first()
    return storage_gb_setting(raw)


def get_system_limit_bytes():
    gb = get_system_limit_gb()
    if gb is None:
        return None
    try:
        return gb_to_bytes(gb)
    except OverflowError:
        return None


def _apply_storage_delta(user_pk, delta):
    """Change storage_used by delta in one UPDATE (no read-modify-write), clamped at 0."""
    User = get_user_model()
    User.objects.filter(pk=user_pk).update(storage_used=Greatest(F('storage_used') + delta, Value(0)))


def update_user_storage(user, delta):
    """Adjust user.storage_used by delta bytes, clamped to >= 0. The change is made by the database in a single
    UPDATE (no read-modify-write), so two requests at the same time cannot overwrite each other."""
    _apply_storage_delta(user.pk, delta)
    user.refresh_from_db(fields=['storage_used'])


def _lock_and_charge(user_pk, delta):
    """Must run inside transaction.atomic(). Locks the user row, checks the quotas for a positive delta, then applies
    the delta. Returns the locked user with a fresh storage_used. Raises QuotaExceeded."""
    User = get_user_model()
    locked = User.objects.select_for_update().get(pk=user_pk)
    if delta > 0:
        ok, _ = check_quota(locked, delta)
        if not ok:
            raise QuotaExceeded('user')
        sys_ok, _ = check_system_quota(delta)
        if not sys_ok:
            raise QuotaExceeded('system')
    _apply_storage_delta(user_pk, delta)
    locked.refresh_from_db(fields=['storage_used'])
    return locked


def charge_storage(user, delta):
    """Atomically check the quotas and charge `delta` bytes to `user`.

    The user row is locked (SELECT ... FOR UPDATE) while the quota is checked and the counter changes, so two uploads
    at the same time cannot both squeeze under the limit. Raises QuotaExceeded. A negative delta only frees space.
    """
    with transaction.atomic():
        locked = _lock_and_charge(user.pk, delta)
    user.storage_used = locked.storage_used


def board_storage_by_user(board):
    """Bytes a board holds, grouped by the user who pays for them: the content goes to the owner and each non-deleted
    file goes to its uploader. Returns {user_id: bytes}."""
    from apps.files.models import File
    totals = {}
    content = board.content_size or 0
    if content:
        totals[board.owner_id] = content
    rows = File.objects.filter(board=board, is_deleted=False).order_by().values('uploaded_by_id').annotate(
        total=Sum('file_size'))
    for row in rows:
        totals[row['uploaded_by_id']] = totals.get(row['uploaded_by_id'], 0) + (row['total'] or 0)
    return totals


def refund_board_storage(board):
    """Give a board's storage back to the users who paid for it (archive, delete). Returns the bytes returned.
    Call it before a board is deleted: the delete removes its files."""
    freed = 0
    for user_id, amount in board_storage_by_user(board).items():
        if amount:
            _apply_storage_delta(user_id, -amount)
            freed += amount
    return freed


def charge_board_storage(board):
    """Charge a board's storage again (restore). Payers are locked and checked in id order, so two restores cannot
    deadlock. Raises QuotaExceeded on the first payer who is over quota; nothing is kept in that case."""
    charged = 0
    with transaction.atomic():
        for user_id, amount in sorted(board_storage_by_user(board).items()):
            if amount:
                _lock_and_charge(user_id, amount)
                charged += amount
    return charged


def check_quota(user, additional_bytes):
    """Check if user has enough quota for additional_bytes.
    User quota is capped by the system-wide storage limit.
    Returns (ok, remaining)."""
    effective_quota = get_effective_quota(user)
    remaining = effective_quota - user.storage_used
    return (additional_bytes <= remaining, remaining)


def get_effective_quota(user):
    """Get the effective quota for a user, capped by system-wide storage limit if set."""
    user_quota = user.storage_quota
    limit_bytes = get_system_limit_bytes()
    if limit_bytes is not None:
        user_quota = min(user_quota, limit_bytes)
    return user_quota


def check_system_quota(additional_bytes):
    """Check if adding additional_bytes would exceed the system-wide storage limit.
    Returns (ok, remaining). If no limit is set, always returns ok."""
    limit_bytes = get_system_limit_bytes()
    if limit_bytes is None:
        return (True, None)

    User = get_user_model()
    total_used = User.objects.aggregate(total=Sum('storage_used'))['total'] or 0
    remaining = limit_bytes - total_used
    return (additional_bytes <= remaining, remaining)


def storage_truth_for_user(user_id):
    """What storage_used should be, computed from the rows: the live files the user uploaded plus the content of the
    non-archived boards the user owns."""
    from apps.files.models import File
    from apps.boards.models import Board
    file_total = File.objects.filter(
        uploaded_by_id=user_id, is_deleted=False).filter(live_file_q()).aggregate(total=Sum('file_size'))['total'] or 0
    board_total = Board.objects.filter(
        owner_id=user_id, is_archived=False).aggregate(total=Sum('content_size'))['total'] or 0
    return file_total + board_total


def get_user_storage_breakdown(user):
    """Get storage breakdown for a user: File model files + Board content sizes (archived boards are excluded)."""
    from apps.files.models import File
    from apps.boards.models import Board

    file_total = File.objects.filter(
        uploaded_by=user, is_deleted=False
    ).filter(live_file_q()).aggregate(total=Sum('file_size'))['total'] or 0

    board_content_total = Board.objects.filter(
        owner=user, is_archived=False
    ).aggregate(total=Sum('content_size'))['total'] or 0

    return {
        'file_uploads': file_total,
        'board_content': board_content_total,
        'total': file_total + board_content_total,
    }
