from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.FileViewSet, basename='file')

urlpatterns = [
    path('storage-stats/', views.StorageStatsView.as_view(), name='storage-stats'),
    path('large-files/', views.LargeFilesView.as_view(), name='large-files'),
    path('user-storage/', views.UserStorageBreakdownView.as_view(), name='user-storage'),
    path('admin-delete/<int:pk>/', views.AdminFileDeleteView.as_view(), name='admin-file-delete'),
    path('', include(router.urls)),
]
