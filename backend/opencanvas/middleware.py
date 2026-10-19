from django.core.cache import cache
from django.http import JsonResponse

MAINTENANCE_CACHE_KEY = 'oc:maintenance-mode'
MAINTENANCE_CACHE_SECONDS = 10


def clear_maintenance_cache():
    """Called when system settings change so the flag is re-read immediately."""
    try:
        cache.delete(MAINTENANCE_CACHE_KEY)
    except Exception:
        pass


class MaintenanceMiddleware:
    """
    Middleware that checks if maintenance mode is enabled.
    Lets sign-in, token refresh and the Django admin through, plus anything an admin JWT asks for (so the admin can
    switch maintenance off again). Returns 503 for all other requests.
    """

    ALLOWED_PATHS = [
        '/api/token/refresh/',
        '/api/accounts/login/',
        '/admin/',
        '/api/health/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._is_maintenance_mode():
            if any(request.path.startswith(path) for path in self.ALLOWED_PATHS):
                return self.get_response(request)

            # Try to authenticate via JWT to check admin role
            if self._is_admin_jwt(request):
                return self.get_response(request)

            return JsonResponse(
                {
                    'error': 'maintenance_mode',
                    'message': 'The system is currently under maintenance. Please try again later.',
                },
                status=503,
            )

        return self.get_response(request)

    def _is_admin_jwt(self, request):
        """Attempt to decode JWT from Authorization header and check admin role."""
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            jwt_auth = JWTAuthentication()
            result = jwt_auth.authenticate(request)
            if result is not None:
                user, _ = result
                return getattr(user, 'role', None) == 'admin'
        except Exception:
            pass
        return False

    def _is_maintenance_mode(self):
        try:
            value = cache.get(MAINTENANCE_CACHE_KEY)
            if value is None:
                from apps.accounts.models import SystemSettings
                settings = SystemSettings.get_all_settings()
                value = settings.get('maintenanceMode', 'false').lower() == 'true'
                cache.set(MAINTENANCE_CACHE_KEY, value, MAINTENANCE_CACHE_SECONDS)
            return bool(value)
        except Exception:
            return False
