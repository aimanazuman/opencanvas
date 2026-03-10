from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('guest/', views.GuestLoginView.as_view(), name='guest-login'),
    path('convert-guest/', views.ConvertGuestView.as_view(), name='convert-guest'),
    path('guests/', views.GuestAccountsView.as_view(), name='guest-accounts'),
    path('guests/cleanup/', views.GuestCleanupView.as_view(), name='guest-cleanup'),

    # Email Verification
    path('verify-email/', views.VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', views.ResendVerificationView.as_view(), name='resend-verification'),

    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('me/', views.AccountDeleteView.as_view(), name='account-delete'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('export/', views.DataExportView.as_view(), name='data-export'),

    # Password Reset
    path('password/reset/', views.PasswordResetRequestView.as_view(), name='password-reset'),
    path('password/reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # Admin - User Management
    path('users/', views.UserListView.as_view(), name='user-list'),
    path('users/create/', views.UserCreateView.as_view(), name='user-create'),
    path('users/search/', views.UserSearchView.as_view(), name='user-search'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),

    # Bulk Import
    path('bulk-import/', views.BulkStudentImportView.as_view(), name='bulk-import'),

    # Admin - Dashboard Stats
    path('dashboard-stats/', views.AdminDashboardStatsView.as_view(), name='dashboard-stats'),

    # Admin - System Settings
    path('settings/', views.SystemSettingsView.as_view(), name='system-settings'),

    # Admin - Audit Logs
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit-logs'),

    # Notifications
    path('notifications/', views.NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/read/', views.NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/mark-all-read/', views.NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    path('notifications/unread-count/', views.NotificationUnreadCountView.as_view(), name='notification-unread-count'),
]
