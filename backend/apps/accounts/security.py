"""Login lockout and token revocation helpers."""
import hashlib
import time

from django.conf import settings
from django.core.cache import cache


# --- failed-login lockout ---------------------------------------------------------------------------------------------
# One bucket per (username, client IP). A locked bucket only blocks that username from that IP, so an attacker cannot
# lock an administrator out of the site by guessing from somewhere else.
def _bucket_key(username, ip):
    digest = hashlib.sha256(('%s|%s' % ((username or '').strip().lower(), ip or '')).encode('utf-8')).hexdigest()
    return 'oc:login-fail:' + digest


def _limits():
    return int(settings.LOGIN_MAX_FAILURES), int(settings.LOGIN_FAILURE_WINDOW)


def lockout_seconds_left(username, ip):
    """Seconds until the bucket unlocks, 0 when the login may be attempted."""
    max_failures, window = _limits()
    state = cache.get(_bucket_key(username, ip))
    if not state or state['n'] < max_failures:
        return 0
    return max(0, int(state['start'] + window - time.time()) + 1)


def record_login_failure(username, ip):
    _, window = _limits()
    key = _bucket_key(username, ip)
    now = time.time()
    state = cache.get(key)
    if not state or state['start'] + window <= now:
        state = {'n': 0, 'start': now}
    state['n'] += 1
    cache.set(key, state, timeout=max(1, int(state['start'] + window - now) + 1))


def clear_login_failures(username, ip):
    cache.delete(_bucket_key(username, ip))


# --- tokens -----------------------------------------------------------------------------------------------------------
def blacklist_user_tokens(user):
    """Revoke every outstanding refresh token of the user (password change/reset, account disabled)."""
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
    already = BlacklistedToken.objects.filter(token__user=user).values_list('token_id', flat=True)
    tokens = OutstandingToken.objects.filter(user=user).exclude(id__in=list(already))
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=t) for t in tokens], ignore_conflicts=True
    )
