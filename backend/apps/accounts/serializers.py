import re
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework.validators import UniqueValidator
from .models import Notification, SystemSettings

User = get_user_model()


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


class UserSerializer(serializers.ModelSerializer):
    storage_used_mb = serializers.SerializerMethodField()
    storage_quota_mb = serializers.SerializerMethodField()
    institution_name = serializers.CharField(source='institution.name', read_only=True)

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
        read_only_fields = ['id', 'date_joined', 'last_login', 'storage_used', 'is_guest', 'guest_expires_at', 'email_verified']

    def get_storage_used_mb(self, obj):
        return round(obj.storage_used / (1024 * 1024), 2)

    def get_storage_quota_mb(self, obj):
        return round(obj.storage_quota / (1024 * 1024), 2)

    def get_username_change_info(self, obj):
        settings = SystemSettings.get_all_settings()
        cooldown_days = int(settings.get('usernameChangeCooldownDays', '30'))
        max_changes = int(settings.get('maxUsernameChanges', '5'))
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
        cooldown_days = int(settings.get('emailChangeCooldownDays', '30'))
        max_changes = int(settings.get('maxEmailChanges', '5'))
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
            max_changes = int(settings.get('maxUsernameChanges', '5'))
            if instance.username_change_count >= max_changes:
                raise serializers.ValidationError({'username': f'Maximum username changes ({max_changes}) reached.'})
            cooldown_days = int(settings.get('usernameChangeCooldownDays', '30'))
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
            max_changes = int(settings.get('maxEmailChanges', '5'))
            if instance.email_change_count >= max_changes:
                raise serializers.ValidationError({'email': f'Maximum email changes ({max_changes}) reached.'})
            cooldown_days = int(settings.get('emailChangeCooldownDays', '30'))
            if instance.last_email_change:
                elapsed = (timezone.now() - instance.last_email_change).days
                if elapsed < cooldown_days:
                    remaining = cooldown_days - elapsed
                    raise serializers.ValidationError({'email': f'You must wait {remaining} more day(s) before changing your email.'})
            if User.objects.filter(email=new_email).exclude(id=instance.id).exists():
                raise serializers.ValidationError({'email': 'This email is already in use.'})
            instance.last_email_change = timezone.now()
            instance.email_change_count += 1

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin to create and manage users."""
    password = serializers.CharField(write_only=True, required=False)
    storage_used_mb = serializers.SerializerMethodField()
    storage_quota_mb = serializers.SerializerMethodField()
    boards_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_guest', 'guest_expires_at', 'is_active', 'avatar', 'bio',
            'storage_used', 'storage_quota', 'storage_used_mb', 'storage_quota_mb',
            'boards_count', 'date_joined', 'last_login', 'password',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'storage_used']

    def get_storage_used_mb(self, obj):
        return round(obj.storage_used / (1024 * 1024), 2)

    def get_storage_quota_mb(self, obj):
        return round(obj.storage_quota / (1024 * 1024), 2)

    def get_boards_count(self, obj):
        return obj.boards.count() if hasattr(obj, 'boards') else 0

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
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name', 'role']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        # Sanitize text fields to prevent XSS
        for field in ['username', 'first_name', 'last_name']:
            if attrs.get(field):
                attrs[field] = sanitize_text(attrs[field])

        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            user = authenticate(username=username, password=password)

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
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
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
        read_only_fields = ['id', 'created_at']


class ConvertGuestSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    password2 = serializers.CharField(required=True, write_only=True)

    def validate_username(self, value):
        current_user = self.context['request'].user
        if User.objects.filter(username=value).exclude(id=current_user.id).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value):
        current_user = self.context['request'].user
        if User.objects.filter(email=value).exclude(id=current_user.id).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        if attrs.get('username'):
            attrs['username'] = sanitize_text(attrs['username'])
        return attrs
