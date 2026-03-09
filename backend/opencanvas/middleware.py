from django.http import JsonResponse


class MaintenanceMiddleware:
    """
    Middleware that checks if maintenance mode is enabled.
    Allows admin users and auth endpoints through.
    Returns 503 for all other requests.
    """

    ALLOWED_PATHS = [
        '/api/token/',
        '/api/token/refresh/',
        '/api/accounts/login/',
        '/api/accounts/settings/',
        '/admin/',
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._is_maintenance_mode():
            # Allow certain paths through (auth endpoints + admin settings so admin can toggle it off)
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
            from apps.accounts.models import SystemSettings
            settings = SystemSettings.get_all_settings()
            return settings.get('maintenanceMode', 'false').lower() == 'true'
        except Exception:
            return False
