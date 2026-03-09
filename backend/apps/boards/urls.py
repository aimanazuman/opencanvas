from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.BoardViewSet, basename='board')

# BoardShareViewSet is registered with explicit paths BEFORE the router
# to avoid the empty-prefix router catching 'shares/' as a board pk
share_list = views.BoardShareViewSet.as_view({'get': 'list', 'post': 'create'})
share_detail = views.BoardShareViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'})

urlpatterns = [
    path('join/<str:token>/', views.JoinBoardView.as_view(), name='join-board'),
    path('shares/', share_list, name='board-share-list'),
    path('shares/<int:pk>/', share_detail, name='board-share-detail'),
    path('', include(router.urls)),
]
