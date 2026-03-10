from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('api/health/', health_check),
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/boards/', include('apps.boards.urls')),
    path('api/courses/', include('apps.courses.urls')),
    path('api/files/', include('apps.files.urls')),
]

# In production, media is served via WhiteNoise or the reverse proxy.
# In development, Django serves media files directly.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Serve media via Django when behind Traefik (no separate media server)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
