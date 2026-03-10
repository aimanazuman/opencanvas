from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from .serializers import (
    UserSerializer, AdminUserSerializer, RegisterSerializer, LoginSerializer,
    ChangePasswordSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, ConvertGuestSerializer, NotificationSerializer
)
from .permissions import IsAdminUser, IsLecturerOrAdmin
from .models import AuditLog, SystemSettings, Notification
from .audit import log_action
from .bulk_import import parse_csv, parse_xlsx, validate_rows, process_bulk_import
from .emails import send_password_reset_email, send_password_reset_confirmation_email, send_verification_email
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from uuid import uuid4
import json
import re

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Apply default storage quota from system settings
        try:
            default_gb = float(SystemSettings.get_all_settings().get('defaultStorageQuota', '5'))
            user.storage_quota = int(default_gb * (1024 ** 3))
        except (ValueError, TypeError):
            pass

        # Check if email verification is required
        all_settings = SystemSettings.get_all_settings()
        require_verification = all_settings.get('requireEmailVerification', 'true').lower() == 'true'

        if require_verification:
            user.email_verification_token = uuid4().hex
            user.email_verified = False
            user.save(update_fields=['storage_quota', 'email_verification_token', 'email_verified'])
            send_verification_email(user)

            log_action(user, 'create', 'user', user.id, {'username': user.username}, request)

            # Return user data but no tokens — user must verify first
            return Response({
                'user': UserSerializer(user).data,
                'requires_verification': True,
                'message': 'Account created. Please check your email to verify your account.'
            }, status=status.HTTP_201_CREATED)
        else:
            user.email_verified = True
            user.save(update_fields=['storage_quota', 'email_verified'])

            # Generate JWT tokens for the new user
            refresh = RefreshToken.for_user(user)

            log_action(user, 'create', 'user', user.id, {'username': user.username}, request)

            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'message': 'User registered successfully'
            }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    Login with username and password, returns JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']

        # Check if email verification is required and user hasn't verified
        all_settings = SystemSettings.get_all_settings()
        require_verification = all_settings.get('requireEmailVerification', 'true').lower() == 'true'

        if require_verification and not user.email_verified and not user.is_guest:
            return Response({
                'requires_verification': True,
                'email': user.email,
                'message': 'Please verify your email address before logging in.'
            }, status=status.HTTP_403_FORBIDDEN)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        log_action(user, 'login', 'user', user.id, {'username': user.username}, request)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Logout by blacklisting the refresh token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                log_action(request.user, 'logout', 'user', request.user.id, {}, request)
                return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
            return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update current user profile.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'update', 'user', instance.id, {'fields': list(serializer.validated_data.keys())}, self.request)


class ChangePasswordView(APIView):
    """
    Change password for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            log_action(user, 'update', 'user', user.id, {'action': 'password_change'}, request)
            return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    Request a password reset. Sends a reset link via email (MailHog in development).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                send_password_reset_email(user, uid, token)
            except User.DoesNotExist:
                pass
            # Always return a generic message to avoid email enumeration
            return Response({
                'message': 'If an account exists with this email, a reset link has been sent.',
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with uid + token.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if serializer.is_valid():
            uid = serializer.validated_data.get('uid', '')
            token = serializer.validated_data['token']
            new_password = serializer.validated_data['new_password']

            try:
                user_id = force_str(urlsafe_base64_decode(uid))
                user = User.objects.get(pk=user_id)
            except (TypeError, ValueError, OverflowError, User.DoesNotExist):
                return Response(
                    {'error': 'Invalid reset link. The link may have expired.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if not default_token_generator.check_token(user, token):
                return Response(
                    {'error': 'Invalid or expired token. Please request a new reset.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.set_password(new_password)
            user.save()
            send_password_reset_confirmation_email(user)
            return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListAPIView):
    """
    List all users (Admin only).
    """
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = User.objects.all().order_by('-date_joined')
        role = self.request.query_params.get('role')
        search = self.request.query_params.get('search')
        if role == 'guest':
            queryset = queryset.filter(is_guest=True)
        elif role and role != 'all':
            queryset = queryset.filter(role=role.lower())
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )
        return queryset


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a user (Admin only).
    """
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    def perform_update(self, serializer):
        old_quota = serializer.instance.storage_quota
        instance = serializer.save()
        new_quota = instance.storage_quota
        if new_quota != old_quota:
            old_gb = round(old_quota / (1024 ** 3), 2)
            new_gb = round(new_quota / (1024 ** 3), 2)
            Notification.objects.create(
                user=instance,
                type='quota_changed',
                title='Storage Quota Updated',
                message=f'Your storage quota has been changed from {old_gb} GB to {new_gb} GB by an administrator.',
            )


class UserCreateView(generics.CreateAPIView):
    """
    Create a new user (Admin only). Sends a welcome email with credentials.
    """
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        # Grab the plain-text password before the serializer hashes it
        password = self.request.data.get('password', '')
        # Admin-created users are automatically email-verified
        instance = serializer.save(email_verified=True)
        if password and instance.email:
            from apps.accounts.emails import send_welcome_email
            send_welcome_email(instance, password)


class UserSearchView(generics.ListAPIView):
    """
    Search users by name or email. For share/invite functionality.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        q = self.request.query_params.get('q', '')
        if len(q) < 2:
            return User.objects.none()
        return User.objects.filter(
            Q(first_name__icontains=q) |
            Q(last_name__icontains=q) |
            Q(email__icontains=q) |
            Q(username__icontains=q)
        ).filter(is_guest=False).exclude(id=self.request.user.id)[:10]


class SystemSettingsView(APIView):
    """
    Get or update system settings (Admin only).
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        settings_dict = SystemSettings.get_all_settings()
        # Provide defaults for expected settings
        defaults = {
            'siteName': 'OpenCanvas',
            'siteUrl': 'https://opencanvas.uptm.edu.my',
            'adminEmail': 'admin@uptm.edu.my',
            'backupFrequency': 'daily',
            'allowRegistration': 'true',
            'requireEmailVerification': 'true',
            'sessionTimeout': '30',
            'maintenanceMode': 'false',
            'enableNotifications': 'true',
            'enableAnalytics': 'true',
            'allowUsernameChange': 'true',
            'usernameChangeCooldownDays': '30',
            'maxUsernameChanges': '5',
            'allowEmailChange': 'true',
            'emailChangeCooldownDays': '30',
            'maxEmailChanges': '5',
            'defaultStorageQuota': '5',
        }
        for key, default_value in defaults.items():
            if key not in settings_dict:
                settings_dict[key] = default_value
        return Response(settings_dict)

    def put(self, request):
        data = request.data
        for key, value in data.items():
            SystemSettings.set_setting(key, value, user=request.user)
        return Response({'message': 'Settings updated successfully'})


class AuditLogListView(generics.ListAPIView):
    """
    List audit logs (Admin only).
    """
    permission_classes = [IsAdminUser]

    def _format_audit_message(self, log):
        """Build a descriptive message from the log's details field."""
        details = log.details or {}
        action = log.action
        resource = log.resource_type
        name = details.get('name', '')
        username = details.get('username', '')
        user_display = log.user.first_name or log.user.username if log.user else 'Unknown'

        if action == 'login':
            return f"{user_display} logged in"
        elif action == 'logout':
            return f"{user_display} logged out"
        elif action == 'create' and resource == 'user':
            return f"{username or user_display} registered"
        elif action == 'create' and resource == 'board':
            return f"{user_display} created board '{name}'" if name else f"{user_display} created a board"
        elif action == 'update' and resource == 'board':
            sub_action = details.get('action', '')
            if sub_action == 'archive':
                return f"{user_display} archived a board"
            return f"{user_display} updated board '{name}'" if name else f"{user_display} updated a board"
        elif action == 'delete' and resource == 'board':
            return f"{user_display} deleted board '{name}'" if name else f"{user_display} deleted a board"
        elif action == 'share' and resource == 'board':
            shared_with = details.get('shared_with', '')
            return f"{user_display} shared board with {shared_with}" if shared_with else f"{user_display} shared a board"
        elif action == 'unshare' and resource == 'board':
            removed = details.get('removed_user', '')
            return f"{user_display} removed {removed} from board" if removed else f"{user_display} unshared a board"
        elif action == 'create' and resource == 'file':
            size = details.get('size', 0)
            size_display = f" ({round(size / (1024 * 1024), 1)} MB)" if size else ""
            return f"{user_display} uploaded file '{name}'{size_display}" if name else f"{user_display} uploaded a file"
        elif action == 'delete' and resource == 'file':
            return f"{user_display} deleted file '{name}'" if name else f"{user_display} deleted a file"
        elif action == 'update' and resource == 'user':
            sub_action = details.get('action', '')
            if sub_action == 'password_change':
                return f"{user_display} changed their password"
            return f"{user_display} updated their profile"
        elif resource == 'course':
            course_name = details.get('name', details.get('course_name', ''))
            return f"{user_display} {action}d course '{course_name}'" if course_name else f"{user_display} {action}d a course"
        elif resource == 'assignment':
            return f"{user_display} {action}d assignment '{name}'" if name else f"{user_display} {action}d an assignment"
        elif resource == 'submission':
            return f"{user_display} {action}d a submission"

        # Fallback
        if name:
            return f"{user_display} {action}d {resource} '{name}'"
        return f"{user_display} {action}d {resource}" + (f" (ID: {log.resource_id})" if log.resource_id else "")

    def get(self, request):
        queryset = AuditLog.objects.select_related('user').order_by('-created_at')

        # Filter by user
        user_id = request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Limit
        limit = int(request.query_params.get('limit', 50))
        queryset = queryset[:limit]

        data = []
        for log in queryset:
            log_type = 'info'
            if log.action in ['delete', 'unshare']:
                log_type = 'warning'
            elif log.action in ['create', 'share']:
                log_type = 'success'
            elif log.action == 'login':
                log_type = 'info'

            data.append({
                'id': log.id,
                'type': log_type,
                'action': log.action,
                'message': self._format_audit_message(log),
                'user': f"{log.user.first_name} {log.user.last_name}" if log.user else None,
                'user_id': log.user_id,
                'details': log.details,
                'time': log.created_at.isoformat(),
                'ip_address': log.ip_address,
            })
        return Response(data)


class GuestLoginView(APIView):
    """
    Create a temporary guest account and return JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = f"guest_{uuid4().hex[:8]}"
        user = User(username=username, is_guest=True, role='student')
        user.set_unusable_password()
        user.guest_expires_at = timezone.now() + timedelta(days=30)

        # Apply default storage quota from system settings
        try:
            default_gb = float(SystemSettings.get_all_settings().get('defaultStorageQuota', '5'))
            user.storage_quota = int(default_gb * (1024 ** 3))
        except (ValueError, TypeError):
            pass

        user.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Guest account created'
        }, status=status.HTTP_201_CREATED)


class ConvertGuestView(APIView):
    """
    Convert a guest account to a full account.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.is_guest:
            return Response(
                {'error': 'Only guest accounts can be converted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ConvertGuestSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user.username = serializer.validated_data['username']
        user.email = serializer.validated_data['email']
        user.set_password(serializer.validated_data['password'])
        user.is_guest = False
        user.guest_expires_at = None
        user.save()

        # Generate new tokens for the converted account
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Account converted successfully'
        }, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    """Verify a user's email address using the token sent to their email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'error': 'Verification token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email_verification_token=token)
        except User.DoesNotExist:
            return Response({'error': 'Invalid or expired verification link.'}, status=status.HTTP_400_BAD_REQUEST)

        user.email_verified = True
        user.email_verification_token = None
        user.save(update_fields=['email_verified', 'email_verification_token'])

        # Generate JWT tokens so user is logged in after verification
        refresh = RefreshToken.for_user(user)

        log_action(user, 'update', 'user', user.id, {'action': 'email_verified'}, request)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Email verified successfully.'
        })


class ResendVerificationView(APIView):
    """Resend the verification email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal whether email exists
            return Response({'message': 'If an account exists with this email, a verification link has been sent.'})

        if user.email_verified:
            return Response({'message': 'Email is already verified.'})

        # Regenerate token and resend
        user.email_verification_token = uuid4().hex
        user.save(update_fields=['email_verification_token'])
        send_verification_email(user)

        return Response({'message': 'If an account exists with this email, a verification link has been sent.'})


class DataExportView(APIView):
    """Export all user data as JSON."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        from apps.boards.models import Board, BoardShare
        from apps.courses.models import Enrollment

        boards = Board.objects.filter(owner=user).values(
            'id', 'name', 'board_type', 'created_at', 'updated_at', 'is_archived'
        )
        shared_boards = BoardShare.objects.filter(user=user).select_related('board').values(
            'board__id', 'board__name', 'permission', 'created_at'
        )
        enrollments = Enrollment.objects.filter(student=user).select_related('course').values(
            'course__name', 'course__code', 'status', 'enrolled_at'
        )

        data = {
            'user': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'bio': user.bio,
                'date_joined': user.date_joined.isoformat(),
            },
            'boards': list(boards),
            'shared_boards': list(shared_boards),
            'enrollments': list(enrollments),
        }
        return Response(data)


class AccountDeleteView(APIView):
    """Deactivate user account."""
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.is_active = False
        user.save()
        return Response({'message': 'Account deactivated successfully'})


class NotificationListView(generics.ListAPIView):
    """List notifications for the current user."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')[:100]


class NotificationMarkReadView(APIView):
    """Mark a single notification as read."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.is_read = True
            notification.save()
            return Response({'message': 'Notification marked as read'})
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


class NotificationMarkAllReadView(APIView):
    """Mark all notifications as read for the current user."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': f'{count} notifications marked as read'})


class NotificationUnreadCountView(APIView):
    """Get the unread notification count for the current user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})


class AdminDashboardStatsView(APIView):
    """Admin dashboard statistics."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.boards.models import Board
        from apps.courses.models import Course
        from django.db.models import Sum

        total_users = User.objects.count()
        users_by_role = {
            'students': User.objects.filter(role='student').count(),
            'lecturers': User.objects.filter(role='lecturer').count(),
            'admins': User.objects.filter(role='admin').count(),
        }
        active_users = User.objects.filter(is_active=True).count()
        guest_users = User.objects.filter(is_guest=True).count()
        expired_guests = User.objects.filter(is_guest=True, guest_expires_at__lte=timezone.now()).count()
        total_boards = Board.objects.filter(is_archived=False).count()
        total_courses = Course.objects.filter(is_active=True).count()

        total_storage = User.objects.aggregate(total=Sum('storage_used'))['total'] or 0
        total_quota = User.objects.aggregate(total=Sum('storage_quota'))['total'] or 0

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'users_by_role': users_by_role,
            'total_boards': total_boards,
            'total_courses': total_courses,
            'storage_used_gb': round(total_storage / (1024 ** 3), 2),
            'storage_quota_gb': round(total_quota / (1024 ** 3), 2),
            'storage_percentage': round((total_storage / total_quota) * 100, 2) if total_quota > 0 else 0,
            'guest_users': guest_users,
            'expired_guests': expired_guests,
        })


class GuestAccountsView(APIView):
    """List guest accounts with expiry info (Admin only)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.boards.models import Board
        guests = User.objects.filter(is_guest=True).order_by('guest_expires_at')
        data = []
        for g in guests:
            days_remaining = None
            if g.guest_expires_at:
                delta = g.guest_expires_at - timezone.now()
                days_remaining = max(0, delta.days)
            boards_count = Board.objects.filter(owner=g).count()
            data.append({
                'id': g.id,
                'username': g.username,
                'date_joined': g.date_joined.isoformat(),
                'guest_expires_at': g.guest_expires_at.isoformat() if g.guest_expires_at else None,
                'days_remaining': days_remaining,
                'is_expired': days_remaining is not None and days_remaining <= 0,
                'boards_count': boards_count,
            })
        return Response({
            'total': len(data),
            'expired': sum(1 for d in data if d['is_expired']),
            'guests': data,
        })


class GuestCleanupView(APIView):
    """Delete expired guest accounts and their data (Admin only)."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        expired_guests = User.objects.filter(
            is_guest=True,
            guest_expires_at__lte=timezone.now()
        )
        count = expired_guests.count()
        expired_guests.delete()
        log_action(request.user, 'delete', 'guest_cleanup', None, {'deleted_count': count}, request)
        return Response({
            'message': f'{count} expired guest account(s) deleted',
            'deleted_count': count,
        })


class BulkStudentImportView(APIView):
    """
    Bulk import students from CSV or XLSX file.
    Creates user accounts, enrolls in course, sends welcome emails via MailHog.
    """
    permission_classes = [IsLecturerOrAdmin]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        course_id = request.data.get('course_id')
        send_emails = request.data.get('send_emails', 'true').lower() != 'false'

        # Parse file based on extension
        filename = file.name.lower()
        try:
            content = file.read()
            if filename.endswith('.csv'):
                rows = parse_csv(content)
            elif filename.endswith('.xlsx'):
                rows = parse_xlsx(content)
            else:
                return Response(
                    {'error': 'Unsupported file format. Use CSV or XLSX.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'Failed to parse file: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate
        valid_rows, validation_errors = validate_rows(rows)

        if not valid_rows and validation_errors:
            return Response({
                'error': 'Validation failed',
                'validation_errors': validation_errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        # Process import
        results = process_bulk_import(
            valid_rows,
            course_id=course_id,
            send_emails=send_emails,
            created_by=request.user,
        )

        if isinstance(results, dict) and results.get('success') is False:
            return Response({'error': results['error']}, status=status.HTTP_400_BAD_REQUEST)

        # Log the action
        log_action(
            request.user, 'create', 'bulk_import', None,
            {
                'created': len(results['created']),
                'existing': len(results['existing']),
                'enrolled': len(results['enrolled']),
                'errors': len(results['errors']),
                'emails_sent': results['emails_sent'],
            },
            request
        )

        return Response({
            'message': 'Bulk import completed',
            'summary': {
                'created': len(results['created']),
                'existing': len(results['existing']),
                'enrolled': len(results['enrolled']),
                'errors': len(results['errors']),
                'emails_sent': results['emails_sent'],
            },
            'details': results,
            'validation_errors': validation_errors,
        })
