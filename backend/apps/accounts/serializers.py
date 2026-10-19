import json
import re

from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from apps.files.security import KIND_AVATAR, signed_media_url, validate_image_upload
from .models import Notification, SystemSettings

User = get_user_model()

MAX_PREFERENCES_BYTES = 8 * 1024
MAX_STORAGE_QUOTA = 10 * 1024 ** 4  # 10 TiB, far above anything sensible, keeps the number sane


def sanitize_text(value):
    """Strip HTML tags and dangerous content from text input to prevent XSS."""
    if not value or not isinstance(value, str):
        return value
    # Remove HTML tags
    value = re.sub(r'<[^>]+>', '', value)
    # Remove javascript: protocol
    value = re.sub(r'javascript\s*:', '', value, flags=re.IGNORECASE)
    # Remove event handlers like onclick=, onload=, etc.
    value = re.sub(r'\bon\w+\s*=', '', value, flags=re.IGNORECASE)
    return value.strip()


def _int_setting(settings_dict, key, default):
    try:
        return int(settings_dict.get(key, default))
    except (TypeError, ValueError):
        return int(default)


def avatar_url(user, request=None):
    """Short-lived signed URL for a user's avatar (or None)."""
    if user and user.avatar:
        return signed_media_url(request, KIND_AVATAR, user.id)
    return None


def run_password_validators(password, user=None):
    """Run Django's password validators and turn the result into a DRF error."""
    try:
        validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages))


# ---------------------------------------------------------------------------------------------------------------------
# Reading users
# ---------------------------------------------------------------------------------------------------------------------
class PublicUserSerializer(serializers.ModelSerializer):
    """Minimal user data shown to other people (collaborators, instructors, course members).
    The e-mail address is included only for an administrator, for the user themself, or when the view passes
    context['show_email']=True (for example the board owner looking at the people they shared with)."""
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'avatar']
        read_only_fields = fields

    def get_avatar(self, obj):
        return avatar_url(obj, self.context.get('request'))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        viewer = getattr(request, 'user', None)
        show_email = bool(self.context.get('show_email'))
        if viewer is not None and viewer.is_authenticated:
            if viewer.id == instance.id or getattr(viewer, 'role', None) == 'admin':
                show_email = True
        if show_email:
            data['email'] = instance.email
        return data


class UserSerializer(serializers.ModelSerializer):
    """Everything about the signed-in user, read-only. Writes go through ProfileUpdateSerializer."""
    storage_used_mb = serializers.SerializerMethodField()
    storage_quota_mb = serializers.SerializerMethodField()
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    avatar = serializers.SerializerMethodField()

    username_change_info = serializers.SerializerMethodField()
    email_change_info = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_guest', 'guest_expires_at', 'email_verified', 'avatar', 'bio', 'institution', 'institution_name',
            'storage_used', 'storage_quota', 'storage_used_mb', 'storage_quota_mb',
            'preferences', 'date_joined', 'last_login',
            'username_change_info', 'email_change_info',
        ]
        read_only_fields = fields

    def get_avatar(self, obj):
        return avatar_url(obj, self.context.get('request'))

    def get_storage_used_mb(self, obj):
        return round(obj.storage_used / (1024 * 1024), 2)

    def get_storage_quota_mb(self, obj):
        return round(obj.storage_quota / (1024 * 1024), 2)

    def get_username_change_info(self, obj):
        settings = SystemSettings.get_all_settings()
        cooldown_days = _int_setting(settings, 'usernameChangeCooldownDays', 30)
        max_changes = _int_setting(settings, 'maxUsernameChanges', 5)
        allowed = settings.get('allowUsernameChange', 'true').lower() == 'true'
        days_remaining = 0
        if obj.last_username_change:
            elapsed = (timezone.now() - obj.last_username_change).days
            days_remaining = max(0, cooldown_days - elapsed)
        return {
            'allowed': allowed,
            'changes_used': obj.username_change_count,
            'max_changes': max_changes,
            'days_remaining': days_remaining,
        }

    def get_email_change_info(self, obj):
        settings = SystemSettings.get_all_settings()
        cooldown_days = _int_setting(settings, 'emailChangeCooldownDays', 30)
        max_changes = _int_setting(settings, 'maxEmailChanges', 5)
        allowed = settings.get('allowEmailChange', 'true').lower() == 'true'
        days_remaining = 0
        if obj.last_email_change:
            elapsed = (timezone.now() - obj.last_email_change).days
            days_remaining = max(0, cooldown_days - elapsed)
        return {
            'allowed': allowed,
            'changes_used': obj.email_change_count,
            'max_changes': max_changes,
            'days_remaining': days_remaining,
        }


class ProfileUpdateSerializer(UserSerializer):
    """The ONLY serializer that writes the profile. Role, quota, institution, verification flags and every other
    system field are read-only here; a request that contains them is ignored and the values never change."""
    PROFILE_WRITABLE = ('username', 'email', 'first_name', 'last_name', 'bio', 'preferences')

    # Write-only upload field; the response is rendered by UserSerializer (avatar becomes a signed URL).
    avatar = serializers.ImageField(required=False, allow_null=True, write_only=True)

    class Meta(UserSerializer.Meta):
        read_only_fields = [f for f in UserSerializer.Meta.fields if f not in ('username', 'email', 'first_name',
                                                                                'last_name', 'bio', 'preferences',
                                                                                'avatar')]
        extra_kwargs = {
            'first_name': {'max_length': 150},
            'last_name': {'max_length': 150},
            'bio': {'max_length': 2000},
        }

    def to_representation(self, instance):
        return UserSerializer(instance, context=self.context).data

    def validate_avatar(self, value):
        if value is not None:
            try:
                validate_image_upload(value)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(list(exc.messages))
        return value

    def validate_preferences(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Preferences must be an object.')
        if len(json.dumps(value).encode('utf-8')) > MAX_PREFERENCES_BYTES:
            raise serializers.ValidationError('Preferences are too large.')
        return value

    def update(self, instance, validated_data):
        # Sanitize text fields to prevent XSS
        for field in ['first_name', 'last_name', 'bio']:
            if field in validated_data and validated_data[field]:
                validated_data[field] = sanitize_text(validated_data[field])

        settings = SystemSettings.get_all_settings()

        # Check username change restrictions
        new_username = validated_data.get('username')
        if new_username and new_username != instance.username:
            if settings.get('allowUsernameChange', 'true').lower() != 'true':
                raise serializers.ValidationError({'username': 'Username changes are currently disabled.'})
            max_changes = _int_setting(settings, 'maxUsernameChanges', 5)
            if instance.username_change_count >= max_changes:
                raise serializers.ValidationError({'username': f'Maximum username changes ({max_changes}) reached.'})
            cooldown_days = _int_setting(settings, 'usernameChangeCooldownDays', 30)
            if instance.last_username_change:
                elapsed = (timezone.now() - instance.last_username_change).days
                if elapsed < cooldown_days:
                    remaining = cooldown_days - elapsed
                    raise serializers.ValidationError({'username': f'You must wait {remaining} more day(s) before changing your username.'})
            # Check uniqueness
            if User.objects.filter(username=new_username).exclude(id=instance.id).exists():
                raise serializers.ValidationError({'username': 'This username is already taken.'})
            instance.last_username_change = timezone.now()
            instance.username_change_count += 1

        # Check email change restrictions
        new_email = validated_data.get('email')
        if new_email and new_email != instance.email:
            if settings.get('allowEmailChange', 'true').lower() != 'true':
                raise serializers.ValidationError({'email': 'Email changes are currently disabled.'})
            max_changes = _int_setting(settings, 'maxEmailChanges', 5)
            if instance.email_change_count >= max_changes:
                raise serializers.ValidationError({'email': f'Maximum email changes ({max_changes}) reached.'})
            cooldown_days = _int_setting(settings, 'emailChangeCooldownDays', 30)
            if instance.last_email_change:
                elapsed = (timezone.now() - instance.last_email_change).days
                if elapsed < cooldown_days:
                    remaining = cooldown_days - elapsed
                    raise serializers.ValidationError({'email': f'You must wait {remaining} more day(s) before changing your email.'})
            if User.objects.filter(email__iexact=new_email).exclude(id=instance.id).exists():
                raise serializers.ValidationError({'email': 'This email is already in use.'})
            instance.last_email_change = timezone.now()
            instance.email_change_count += 1

        for attr, value in validated_data.items():
            if attr in self.PROFILE_WRITABLE or attr == 'avatar':
                setattr(instance, attr, value)
        instance.save()
        return instance


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin to create and manage users."""
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    storage_used_mb = serializers.SerializerMethodField()
    storage_quota_mb = serializers.SerializerMethodField()
    boards_count = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_guest', 'guest_expires_at', 'is_active', 'avatar', 'bio',
            'storage_used', 'storage_quota', 'storage_used_mb', 'storage_quota_mb',
            'boards_count', 'date_joined', 'last_login', 'password',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'storage_used', 'is_guest', 'guest_expires_at']

    def get_avatar(self, obj):
        return avatar_url(obj, self.context.get('request'))

    def get_storage_used_mb(self, obj):
        return round(obj.storage_used / (1024 * 1024), 2)

    def get_storage_quota_mb(self, obj):
        return round(obj.storage_quota / (1024 * 1024), 2)

    def get_boards_count(self, obj):
        return obj.boards.count() if hasattr(obj, 'boards') else 0

    def validate_storage_quota(self, value):
        if value < 0 or value > MAX_STORAGE_QUOTA:
            raise serializers.ValidationError('Storage quota is out of range.')
        return value

    def validate_email(self, value):
        if value:
            qs = User.objects.filter(email__iexact=value)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError('A user with that email already exists.')
        return value

    def validate(self, attrs):
        for field in ('first_name', 'last_name', 'bio'):
            if attrs.get(field):
                attrs[field] = sanitize_text(attrs[field])

        request = self.context.get('request')
        if self.instance is not None and request is not None and request.user.id == self.instance.id:
            # An administrator must not lock themselves out or demote themselves by accident.
            if 'role' in attrs and attrs['role'] != self.instance.role:
                raise serializers.ValidationError({'role': 'You cannot change your own role.'})
            if attrs.get('is_active') is False:
                raise serializers.ValidationError({'is_active': 'You cannot deactivate your own account.'})

        password = attrs.get('password')
        if password:
            candidate = self.instance or User(
                username=attrs.get('username', ''), email=attrs.get('email', ''),
                first_name=attrs.get('first_name', ''), last_name=attrs.get('last_name', ''),
            )
            try:
                run_password_validators(password, candidate)
            except serializers.ValidationError as exc:
                raise serializers.ValidationError({'password': exc.detail})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    """Public sign-up. There is deliberately no role field: every self-registered account is a student."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'max_length': 150},
            'last_name': {'max_length': 150},
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        # Sanitize text fields to prevent XSS
        for field in ['username', 'first_name', 'last_name']:
            if attrs.get(field):
                attrs[field] = sanitize_text(attrs[field])

        candidate = User(username=attrs.get('username', ''), email=attrs.get('email', ''),
                         first_name=attrs.get('first_name', ''), last_name=attrs.get('last_name', ''))
        try:
            run_password_validators(attrs['password'], candidate)
        except serializers.ValidationError as exc:
            raise serializers.ValidationError({'password': exc.detail})

        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        # role is never taken from the request
        return User.objects.create_user(role='student', **validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=254)
    password = serializers.CharField(write_only=True, max_length=1024)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            user = authenticate(request=self.context.get('request'), username=username, password=password)

            if not user:
                raise serializers.ValidationError('Unable to log in with provided credentials.')

            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')

            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include "username" and "password".')


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True)
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password2']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    related_board_name = serializers.CharField(source='related_board.name', read_only=True, allow_null=True)
    related_user_name = serializers.CharField(source='related_user.username', read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'message', 'is_read',
            'related_board', 'related_board_name', 'related_user', 'related_user_name',
            'created_at'
        ]
        read_only_fields = fields


class ConvertGuestSerializer(serializers.Serializer):
    username = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    password2 = serializers.CharField(required=True, write_only=True)

    def validate_username(self, value):
        current_user = self.context['request'].user
        value = sanitize_text(value)
        if not re.match(r'^[\w.@+-]+$', value or ''):
            raise serializers.ValidationError('Enter a valid username.')
        if User.objects.filter(username=value).exclude(id=current_user.id).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        current_user = self.context['request'].user
        if User.objects.filter(email__iexact=value).exclude(id=current_user.id).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs


class UserSearchResultSerializer(PublicUserSerializer):
    """Search results: public data plus a masked e-mail hint (never the address itself)."""
    email_hint = serializers.SerializerMethodField()

    class Meta(PublicUserSerializer.Meta):
        fields = PublicUserSerializer.Meta.fields + ['role', 'email_hint']
        read_only_fields = fields

    def get_email_hint(self, obj):
        if not obj.email or '@' not in obj.email:
            return ''
        local, domain = obj.email.rsplit('@', 1)
        return f'{local[:1]}***@{domain}'

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data.pop('email', None)
        return data
