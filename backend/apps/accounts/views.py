import csv as csv_module
import json
import logging
from datetime import timedelta
from uuid import uuid4

from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from opencanvas.clientip import get_client_ip
from opencanvas.middleware import clear_maintenance_cache
from opencanvas.throttling import (
    with_defaults, LoginThrottle, RegisterThrottle, PasswordResetThrottle, ResendVerificationThrottle,
    VerifyEmailThrottle, GuestCreateThrottle,
)
from .audit import log_action
from .bulk_import import parse_csv, parse_xlsx, validate_rows, process_bulk_import, BulkImportError
from .emails import (
    send_password_reset_email, send_password_reset_confirmation_email, send_verification_email,
    send_welcome_email, build_set_password_url,
)
from .models import AuditLog, SystemSettings, Notification
from .permissions import IsAdminUser, IsLecturerOrAdmin
from .security import (
    lockout_seconds_left, record_login_failure, clear_login_failures, blacklist_user_tokens,
)
from .serializers import (
    UserSerializer, ProfileUpdateSerializer, AdminUserSerializer, RegisterSerializer,
    LoginSerializer, ChangePasswordSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    ConvertGuestSerializer, NotificationSerializer, UserSearchResultSerializer, run_password_validators,
)

User = get_user_model()
logger = logging.getLogger(__name__)

# System settings an administrator may write. Unknown keys are rejected so the table cannot be filled with junk.
ALLOWED_SETTING_KEYS = {
    'siteName', 'siteUrl', 'adminEmail', 'backupFrequency', 'allowRegistration', 'requireEmailVerification',
    'sessionTimeout', 'maintenanceMode', 'enableNotifications', 'enableAnalytics', 'allowUsernameChange',
    'usernameChangeCooldownDays', 'maxUsernameChanges', 'allowEmailChange', 'emailChangeCooldownDays',
    'maxEmailChanges', 'defaultStorageQuota', 'systemStorageLimit',
}
MAX_SETTING_VALUE_LENGTH = 500
EMAIL_VERIFICATION_MAX_AGE_DAYS = 7


def _token_payload(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


def _verification_required():
    return SystemSettings.get_all_settings().get('requireEmailVerification', 'true').lower() == 'true'


def _issue_verification_token(user):
    user.email_verification_token = uuid4().hex
    user.email_verification_sent_at = timezone.now()
    user.save(update_fields=['email_verification_token', 'email_verification_sent_at'])


def _make_uid_and_token(user):
    return urlsafe_base64_encode(force_bytes(user.pk)), default_token_generator.make_token(user)


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account. The role is always "student"; staff accounts are created by an administrator.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = with_defaults(RegisterThrottle)

    def create(self, request, *args, **kwargs):
        all_settings = SystemSettings.get_all_settings()
        if all_settings.get('allowRegistration', 'true').lower() == 'false':
            return Response({'error': 'Registration is currently disabled.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Apply default storage quota from system settings
        try:
            default_gb = float(all_settings.get('defaultStorageQuota', '5'))
            user.storage_quota = int(default_gb * (1024 ** 3))
        except (ValueError, TypeError):
            pass

        require_verification = all_settings.get('requireEmailVerification', 'true').lower() == 'true'

        if require_verification:
            user.email_verification_token = uuid4().hex
            user.email_verification_sent_at = timezone.now()
            user.email_verified = False
            user.save(update_fields=['storage_quota', 'email_verification_token',
                                     'email_verification_sent_at', 'email_verified'])
            send_verification_email(user)

            log_action(user, 'create', 'user', user.id, {'username': user.username}, request)

            # Return user data but no tokens — user must verify first
            return Response({
                'user': UserSerializer(user, context={'request': request}).data,
                'requires_verification': True,
                'message': 'Account created. Please check your email to verify your account.'
            }, status=status.HTTP_201_CREATED)
        else:
            user.email_verified = True
            user.save(update_fields=['storage_quota', 'email_verified'])

            log_action(user, 'create', 'user', user.id, {'username': user.username}, request)

            return Response({
                'user': UserSerializer(user, context={'request': request}).data,
                'tokens': _token_payload(user),
                'message': 'User registered successfully'
            }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    Login with username and password, returns JWT tokens.
    After LOGIN_MAX_FAILURES failures inside LOGIN_FAILURE_WINDOW seconds, the same username from the same IP is
    refused (HTTP 429) until the window ends.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = with_defaults(LoginThrottle)

    def post(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        username = str(data.get('username') or '')[:254]
        ip = get_client_ip(request)

        wait = lockout_seconds_left(username, ip)
        if wait:
            response = Response(
                {'error': 'Too many failed login attempts. Please try again later.', 'retry_after': wait},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
            response['Retry-After'] = str(wait)
            return response

        serializer = LoginSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            if username and data.get('password'):
                record_login_failure(username, ip)
                target = User.objects.filter(username__iexact=username).first()
                log_action(target, 'login', 'user', target.id if target else None,
                           {'success': False, 'username': username[:150]}, request)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        clear_login_failures(username, ip)

        # Check if email verification is required and user hasn't verified
        if _verification_required() and not user.email_verified and not user.is_guest:
            return Response({
                'requires_verification': True,
                'email': user.email,
                'message': 'Please verify your email address before logging in.'
            }, status=status.HTTP_403_FORBIDDEN)

        log_action(user, 'login', 'user', user.id, {'username': user.username}, request)

        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'tokens': _token_payload(user),
            'message': 'Login successful'
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    Logout by blacklisting the refresh token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh_token') if isinstance(request.data, dict) else None
        if not refresh_token:
            return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response({'error': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        log_action(request.user, 'logout', 'user', request.user.id, {}, request)
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update current user profile. Only username, email, names, bio, avatar and preferences can be changed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, 'update', 'user', instance.id,
                   {'fields': sorted(serializer.validated_data.keys())}, self.request)


class ChangePasswordView(APIView):
    """
    Change password for the current user. Every refresh token is revoked and fresh tokens are returned, so the
    current browser stays signed in while stolen tokens stop working.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            try:
                run_password_validators(serializer.validated_data['new_password'], user)
            except Exception as exc:
                detail = getattr(exc, 'detail', None)
                return Response({'new_password': detail or ['Invalid password.']}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            blacklist_user_tokens(user)
            log_action(user, 'update', 'user', user.id, {'action': 'password_change'}, request)
            return Response({'message': 'Password changed successfully', 'tokens': _token_payload(user)},
                            status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    """
    Request a password reset. Sends a reset link via email (MailHog in development).
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = with_defaults(PasswordResetThrottle)

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            for user in User.objects.filter(email__iexact=email, is_active=True)[:3]:
                uid, token = _make_uid_and_token(user)
                send_password_reset_email(user, uid, token)
            # Always return a generic message to avoid email enumeration
            return Response({
                'message': 'If an account exists with this email, a reset link has been sent.',
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    """
    Confirm password reset (also used by the "set your password" link in welcome emails) with uid + token.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = with_defaults(PasswordResetThrottle)

    INVALID = {'error': 'Invalid or expired link. Please request a new one.'}

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        uid = serializer.validated_data.get('uid', '')
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)))
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is None or not user.is_active or not default_token_generator.check_token(user, token):
            return Response(self.INVALID, status=status.HTTP_400_BAD_REQUEST)

        try:
            run_password_validators(new_password, user)
        except Exception as exc:
            return Response({'new_password': getattr(exc, 'detail', ['Invalid password.'])},
                            status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        # The link was delivered to the account's mailbox, so following it proves control of that address.
        user.email_verified = True
        user.email_verification_token = None
        user.save()
        blacklist_user_tokens(user)
        log_action(user, 'update', 'user', user.id, {'action': 'password_reset'}, request)
        send_password_reset_confirmation_email(user)
        return Response({'message': 'Password reset successful.'}, status=status.HTTP_200_OK)


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
        before = {f: getattr(serializer.instance, f) for f in ('role', 'storage_quota', 'is_active', 'email')}
        instance = serializer.save()
        changes = {}
        for field, old in before.items():
            new = getattr(instance, field)
            if new != old:
                changes[field] = {'from': old, 'to': new}
        if 'password' in serializer.validated_data and serializer.validated_data.get('password'):
            changes['password'] = 'changed'
            blacklist_user_tokens(instance)
        if 'role' in changes or ('is_active' in changes and not instance.is_active):
            blacklist_user_tokens(instance)

        if 'storage_quota' in changes:
            old_gb = round(before['storage_quota'] / (1024 ** 3), 2)
            new_gb = round(instance.storage_quota / (1024 ** 3), 2)
            Notification.objects.create(
                user=instance,
                type='quota_changed',
                title='Storage Quota Updated',
                message=f'Your storage quota has been changed from {old_gb} GB to {new_gb} GB by an administrator.',
            )
        log_action(self.request.user, 'update', 'user', instance.id,
                   {'action': 'admin_update', 'target': instance.username, 'changes': changes}, self.request)

    def perform_destroy(self, instance):
        if instance.id == self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You cannot delete your own account here.')
        log_action(self.request.user, 'delete', 'user', instance.id,
                   {'action': 'admin_delete', 'target': instance.username, 'role': instance.role}, self.request)
        instance.delete()


class UserCreateView(generics.CreateAPIView):
    """
    Create a new user (Admin only). The welcome email contains a one-time, time-limited link to choose a password;
    it never contains a password. The address counts as verified once that link has been used.
    """
    queryset = User.objects.all()
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        # An account without an e-mail address has nothing to verify.
        instance = serializer.save(email_verified=not bool(serializer.validated_data.get('email')))
        if instance.email:
            uid, token = _make_uid_and_token(instance)
            send_welcome_email(instance, build_set_password_url(uid, token))
        log_action(self.request.user, 'create', 'user', instance.id,
                   {'action': 'admin_create', 'target': instance.username, 'role': instance.role}, self.request)


class UserSearchView(generics.ListAPIView):
    """
    Search users by name or username, for the share and invite dialogs. Needs 3+ characters, never returns guests
    or e-mail addresses (a masked hint is returned instead). Staff may also find a person by exact e-mail address.
    """
    permission_classes = [permissions.IsAuthenticated]
    MIN_QUERY_LENGTH = 3

    serializer_class = UserSearchResultSerializer

    def get_queryset(self):
        q = (self.request.query_params.get('q', '') or '').strip()
        if len(q) < self.MIN_QUERY_LENGTH:
            return User.objects.none()
        match = Q(first_name__icontains=q) | Q(last_name__icontains=q) | Q(username__icontains=q)
        if self.request.user.role in ('lecturer', 'admin'):
            match |= Q(email__iexact=q)
        return User.objects.filter(match, is_guest=False, is_active=True).exclude(
            id=self.request.user.id).order_by('username')[:10]


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
        if not isinstance(data, dict):
            return Response({'error': 'A JSON object is expected.'}, status=status.HTTP_400_BAD_REQUEST)
        unknown = sorted(k for k in data.keys() if k not in ALLOWED_SETTING_KEYS)
        if unknown:
            return Response({'error': 'Unknown setting(s): ' + ', '.join(str(k)[:50] for k in unknown)},
                            status=status.HTTP_400_BAD_REQUEST)
        for key, value in data.items():
            if isinstance(value, (dict, list)) or len(str(value)) > MAX_SETTING_VALUE_LENGTH:
                return Response({'error': f'Invalid value for {key}.'}, status=status.HTTP_400_BAD_REQUEST)
        changed = {}
        for key, value in data.items():
            SystemSettings.set_setting(key, value, user=request.user)
            changed[key] = str(value)[:100]
        clear_maintenance_cache()
        log_action(request.user, 'update', 'settings', None, {'action': 'settings_change', 'changed': changed}, request)
        return Response({'message': 'Settings updated successfully'})


def _clamp_limit(request, default, maximum=None):
    maximum = maximum or int(django_settings.AUDIT_LOG_MAX_LIMIT)
    try:
        value = int(request.query_params.get('limit', default))
    except (TypeError, ValueError):
        value = default
    return max(1, min(value, maximum))


def _csv_cell(value):
    """Neutralise spreadsheet formulas: a cell starting with = + - @ (or a tab/CR) is prefixed with an apostrophe."""
    if isinstance(value, str) and value[:1] in ('=', '+', '-', '@', '\t', '\r'):
        return "'" + value
    return value


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

        if action == 'login' and details.get('success') is False:
            return f"Failed login attempt for '{username}'"
        if details.get('action') in ('admin_update', 'admin_create', 'admin_delete'):
            verb = {'admin_update': 'updated', 'admin_create': 'created', 'admin_delete': 'deleted'}[details['action']]
            return f"{user_display} {verb} user '{details.get('target', '')}'"
        if resource == 'settings':
            return f"{user_display} changed system settings"
        if resource == 'audit_logs':
            return f"{user_display} {'exported' if action == 'read' else 'cleared'} audit logs"

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
            if sub_action == 'password_reset':
                return f"{user_display} reset their password"
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

    def _get_log_type(self, log):
        if (log.details or {}).get('success') is False:
            return 'warning'
        if log.action in ['delete', 'unshare']:
            return 'warning'
        elif log.action in ['create', 'share']:
            return 'success'
        return 'info'

    def _serialize_log(self, log):
        return {
            'id': log.id,
            'type': self._get_log_type(log),
            'action': log.action,
            'message': self._format_audit_message(log),
            'user': f"{log.user.first_name} {log.user.last_name}" if log.user else None,
            'user_id': log.user_id,
            'details': log.details,
            'time': log.created_at.isoformat(),
            'ip_address': log.ip_address,
        }

    def get(self, request):
        queryset = AuditLog.objects.select_related('user').order_by('-created_at')

        # Filter by user
        user_id = request.query_params.get('user_id')
        if user_id:
            try:
                queryset = queryset.filter(user_id=int(user_id))
            except (TypeError, ValueError):
                return Response({'error': 'user_id must be a number'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = queryset[:_clamp_limit(request, 50)]

        data = [self._serialize_log(log) for log in queryset]
        return Response(data)

    def delete(self, request):
        """Delete audit logs older than a minimum age (Admin only). Recent entries can never be erased from here, so
        an attacker holding an admin token cannot wipe the evidence of what they just did."""
        minimum = max(1, int(django_settings.AUDIT_LOG_CLEAR_MIN_AGE_DAYS))
        try:
            days = int(request.query_params.get('older_than_days', minimum))
        except (TypeError, ValueError):
            days = minimum
        days = max(days, minimum)
        cutoff = timezone.now() - timedelta(days=days)
        old_logs = AuditLog.objects.filter(created_at__lt=cutoff)
        count = old_logs.count()
        old_logs.delete()
        # Log the deletion itself
        log_action(request.user, 'delete', 'audit_logs', None,
                   {'deleted_count': count, 'older_than_days': days}, request)
        return Response({'message': f'{count} audit log(s) older than {days} days deleted', 'deleted_count': count,
                         'older_than_days': days})


class AuditLogExportView(APIView):
    """Export audit logs as CSV (Admin only)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = AuditLog.objects.select_related('user').order_by('-created_at')
        queryset = queryset[:_clamp_limit(request, 1000)]

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="audit_logs.csv"'

        writer = csv_module.writer(response)
        writer.writerow(['ID', 'Action', 'Resource Type', 'Resource ID', 'User', 'IP Address', 'Details', 'Timestamp'])

        for log in queryset:
            user_display = f"{log.user.first_name} {log.user.last_name}".strip() if log.user else 'Unknown'
            writer.writerow([_csv_cell(cell) for cell in [
                log.id,
                log.action,
                log.resource_type,
                log.resource_id or '',
                user_display,
                log.ip_address or '',
                json.dumps(log.details) if log.details else '',
                log.created_at.isoformat(),
            ]])

        log_action(request.user, 'read', 'audit_logs', None, {'action': 'export'}, request)
        return response


class GuestLoginView(APIView):
    """
    Create a temporary guest account and return JWT tokens.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = with_defaults(GuestCreateThrottle)

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

        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'tokens': _token_payload(user),
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
        blacklist_user_tokens(user)

        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'tokens': _token_payload(user),
            'message': 'Account converted successfully'
        }, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    """Verify a user's email address using the token sent to their email. A token works once and expires."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = with_defaults(VerifyEmailThrottle)

    def post(self, request):
        token = request.data.get('token', '') if isinstance(request.data, dict) else ''
        token = token.strip() if isinstance(token, str) else ''
        if not token:
            return Response({'error': 'Verification token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email_verification_token=token, is_active=True).first()
        invalid = Response({'error': 'Invalid or expired verification link.'}, status=status.HTTP_400_BAD_REQUEST)
        if user is None:
            return invalid
        sent_at = user.email_verification_sent_at
        if sent_at is None or timezone.now() - sent_at > timedelta(days=EMAIL_VERIFICATION_MAX_AGE_DAYS):
            return invalid

        user.email_verified = True
        user.email_verification_token = None
        user.email_verification_sent_at = None
        user.save(update_fields=['email_verified', 'email_verification_token', 'email_verification_sent_at'])

        log_action(user, 'update', 'user', user.id, {'action': 'email_verified'}, request)

        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'tokens': _token_payload(user),
            'message': 'Email verified successfully.'
        })


class ResendVerificationView(APIView):
    """Resend the verification email."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = with_defaults(ResendVerificationThrottle)

    GENERIC = {'message': 'If an account exists with this email, a verification link has been sent.'}

    def post(self, request):
        email = request.data.get('email', '') if isinstance(request.data, dict) else ''
        email = email.strip() if isinstance(email, str) else ''
        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email, is_active=True, email_verified=False).first()
        if user is not None:
            _issue_verification_token(user)
            send_verification_email(user)

        # Same answer whether or not the address exists or is already verified
        return Response(self.GENERIC)


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
        blacklist_user_tokens(user)
        log_action(user, 'delete', 'user', user.id, {'action': 'self_deactivate'}, request)
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
    Creates user accounts, enrolls in course, and emails each new account a one-time link to set its password.
    A lecturer can only import into a course they teach.
    """
    permission_classes = [IsLecturerOrAdmin]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > django_settings.BULK_IMPORT_MAX_BYTES:
            return Response({'error': 'The import file is too large.'}, status=status.HTTP_400_BAD_REQUEST)

        course = None
        course_id = request.data.get('course_id')
        if course_id not in (None, '', 'null'):
            from apps.courses.models import Course
            try:
                course = Course.objects.filter(id=int(course_id)).first()
            except (TypeError, ValueError):
                course = None
            if course is None:
                return Response({'error': 'Course not found'}, status=status.HTTP_404_NOT_FOUND)
            if course.instructor_id != request.user.id and request.user.role != 'admin':
                return Response({'error': 'You can only import students into your own courses.'},
                                status=status.HTTP_403_FORBIDDEN)

        send_emails = str(request.data.get('send_emails', 'true')).lower() != 'false'

        # Parse file based on extension
        filename = (file.name or '').lower()
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
        except BulkImportError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.warning('Bulk import file could not be parsed', exc_info=False)
            return Response(
                {'error': 'Failed to parse file. Check that it is a valid CSV or XLSX file.'},
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
            course=course,
            send_emails=send_emails,
            created_by=request.user,
            reveal_existing=request.user.role == 'admin',
        )

        if isinstance(results, dict) and results.get('success') is False:
            resp = {'error': results['error']}
            if results.get('section_errors'):
                resp['validation_errors'] = results['section_errors']
            return Response(resp, status=status.HTTP_400_BAD_REQUEST)

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
