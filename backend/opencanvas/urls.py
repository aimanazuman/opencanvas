from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView

from apps.files.media_views import serve_signed_media
from opencanvas.throttling import with_defaults, TokenRefreshThrottle


def health_check(request):
    return JsonResponse({"status": "ok"})


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = with_defaults(TokenRefreshThrottle)


urlpatterns = [
    path('api/health/', health_check),
    path('admin/', admin.site.urls),
    # /api/token/ (password grant) was removed on purpose: sign in only through /api/accounts/login/, which
    # applies the lockout, the email-verification rule and writes the audit log.
    path('api/token/refresh/', ThrottledTokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/boards/', include('apps.boards.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/files/', include('apps.files.urls')),
    # User uploads are never served as plain static files. This route checks a signed, expiring token and the
    # requesting user's access, then streams the file with safe headers. Keeping the /media/ prefix means the
    # existing Traefik rule PathPrefix(/media) keeps working.
    path('media/f/<str:token>/', serve_signed_media, name='signed-media'),
]
