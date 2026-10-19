"""DRF throttles whose rates are read from settings.OC_THROTTLE_RATES at request time, so tests can change them with
override_settings and THROTTLING_ENABLED=False switches everything off.

Counters live in the default cache. With the LocMem cache each gunicorn worker counts separately; the production
default is the database cache (CACHE_BACKEND=db) which is shared between workers.
"""
from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle

from .clientip import get_client_ip


class _OCThrottle(SimpleRateThrottle):
    scope = None

    def get_rate(self):
        return getattr(settings, 'OC_THROTTLE_RATES', {}).get(self.scope)

    def get_ident(self, request):
        return get_client_ip(request) or 'unknown'

    def allow_request(self, request, view):
        if not getattr(settings, 'THROTTLING_ENABLED', True):
            return True
        return super().allow_request(request, view)


class OCAnonThrottle(_OCThrottle):
    scope = 'anon'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class OCUserThrottle(_OCThrottle):
    scope = 'user'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class _IPScopeThrottle(_OCThrottle):
    """One bucket per client IP for a named scope."""

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class LoginThrottle(_IPScopeThrottle):
    scope = 'login'


class RegisterThrottle(_IPScopeThrottle):
    scope = 'register'


class PasswordResetThrottle(_IPScopeThrottle):
    scope = 'password_reset'


class ResendVerificationThrottle(_IPScopeThrottle):
    scope = 'resend_verification'


class VerifyEmailThrottle(_IPScopeThrottle):
    scope = 'verify_email'


class GuestCreateThrottle(_IPScopeThrottle):
    scope = 'guest'


class TokenRefreshThrottle(_IPScopeThrottle):
    scope = 'token_refresh'


class JoinByCodeThrottle(_OCThrottle):
    """Per signed-in user (falls back to the client IP for anonymous callers)."""
    scope = 'join_by_code'

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = 'u%s' % request.user.pk
        else:
            ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}




# Convenience lists used by views: keep the global anon/user throttles AND add the scoped one.
def with_defaults(*extra):
    return [OCAnonThrottle, OCUserThrottle, *extra]
