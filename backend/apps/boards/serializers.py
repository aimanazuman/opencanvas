
from django.conf import settings
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from apps.accounts.serializers import PublicUserSerializer, avatar_url
from apps.files.security import KIND_BOARD_THUMB, signed_media_url
from apps.files.storage import calculate_content_size
from .access import get_board_access, content_for_user, sees_all_quiz_responses
from .models import Board, BoardShare, StarredBoard, BoardVersion, BoardInviteLink

# What each access level may change on somebody else's board. Everything else must stay as it is.
EDIT_LEVEL_FIELDS = {'content', 'name', 'description'}
COMMENT_LEVEL_FIELDS = {'content'}
INSTRUCTOR_FIELDS = {'content', 'name', 'description', 'section', 'board_type'}


class BoardShareSerializer(serializers.ModelSerializer):
    user_details = PublicUserSerializer(source='user', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = BoardShare
        fields = ['id', 'board', 'user', 'username', 'user_details', 'permission', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_user(self, value):
        if not value.is_active:
            raise serializers.ValidationError('This user cannot be added.')
        return value

    def validate(self, attrs):
        if self.instance is not None:
            # A share can only change its permission level. Moving it to another board or user is refused.
            if 'board' in attrs and attrs['board'].pk != self.instance.board_id:
                raise serializers.ValidationError({'board': 'The board of a share cannot be changed.'})
            if 'user' in attrs and attrs['user'].pk != self.instance.user_id:
                raise serializers.ValidationError({'user': 'The user of a share cannot be changed.'})
        else:
            board = attrs.get('board')
            user = attrs.get('user')
            if board is not None and user is not None and board.owner_id == user.id:
                raise serializers.ValidationError({'user': 'You cannot share a board with its owner.'})
        return attrs


class BoardSerializer(serializers.ModelSerializer):
    owner_details = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True, allow_null=True)
    is_starred = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_comment = serializers.SerializerMethodField()
    permission = serializers.SerializerMethodField()
    collaborators = serializers.SerializerMethodField()
    starred_count = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    class Meta:
        model = Board
        fields = [
            'id', 'name', 'description', 'owner', 'owner_name', 'owner_details',
            'course', 'course_name', 'section', 'content', 'content_size', 'thumbnail', 'is_archived',
            'is_template', 'board_type', 'is_starred', 'can_edit', 'can_comment', 'permission',
            'collaborators', 'starred_count',
            'created_at', 'updated_at'
        ]
        # is_archived changes only through the archive/restore actions (they move storage quota).
        read_only_fields = ['id', 'owner', 'content_size', 'is_archived', 'created_at', 'updated_at']

    # --- access level helpers ----------------------------------------------------------------------------------
    def _viewer(self):
        request = self.context.get('request')
        return request.user if request is not None and request.user.is_authenticated else None

    def _level(self, obj):
        cache = self.context.setdefault('_board_levels', {})
        if obj.pk not in cache:
            cache[obj.pk] = get_board_access(self._viewer(), obj)
        return cache[obj.pk]

    # --- reading ----------------------------------------------------------------------------------------------
    def to_representation(self, instance):
        data = super().to_representation(instance)
        viewer = self._viewer()
        if viewer is not None:
            data['content'] = content_for_user(instance, viewer, self._level(instance))
        return data

    def get_thumbnail(self, obj):
        if not obj.thumbnail:
            return None
        viewer = self._viewer()
        return signed_media_url(self.context.get('request'), KIND_BOARD_THUMB, obj.id, viewer.id if viewer else None)

    def get_owner_details(self, obj):
        data = {
            'id': obj.owner.id,
            'username': obj.owner.username,
            'avatar': avatar_url(obj.owner, self.context.get('request')),
        }
        viewer = self._viewer()
        # The owner's e-mail address is only shown to the owner and to administrators.
        if viewer is not None and (viewer.id == obj.owner_id or viewer.role == 'admin'):
            data['email'] = obj.owner.email
        return data

    def get_is_starred(self, obj):
        viewer = self._viewer()
        if viewer is not None:
            return obj.is_starred_by(viewer)
        return False

    def _get_user_permission(self, obj):
        """Effective permission level for the current user ('instructor' is shown as 'edit' to the client)."""
        level = self._level(obj)
        return 'edit' if level == 'instructor' else level

    def get_can_edit(self, obj):
        return self._get_user_permission(obj) in ('owner', 'edit')

    def get_can_comment(self, obj):
        return self._get_user_permission(obj) in ('owner', 'edit', 'comment')

    def get_permission(self, obj):
        return self._get_user_permission(obj)

    def get_collaborators(self, obj):
        shares = obj.shares.select_related('user').all()
        context = {'request': self.context.get('request'), 'show_email': self._level(obj) == 'owner'}
        return BoardShareSerializer(shares, many=True, context=context).data

    def get_starred_count(self, obj):
        return obj.starred_by.count()

    # --- writing ----------------------------------------------------------------------------------------------
    def validate_content(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('Board content must be an object.')
        if calculate_content_size(value) > settings.BOARD_CONTENT_MAX_BYTES:
            limit_mb = settings.BOARD_CONTENT_MAX_BYTES // (1024 * 1024)
            raise serializers.ValidationError(f'Board content is too large (limit {limit_mb} MB).')
        return value

    def validate_is_template(self, value):
        viewer = self._viewer()
        if value and (viewer is None or viewer.role != 'admin'):
            raise serializers.ValidationError('Only an administrator can mark a board as a template.')
        return value

    def validate_course(self, value):
        if value is None:
            return value
        viewer = self._viewer()
        if viewer is None:
            raise serializers.ValidationError('Not allowed.')
        if self.instance is not None and value.pk == self.instance.course_id:
            return value  # unchanged
        if viewer.role == 'admin' or value.instructor_id == viewer.id:
            return value
        from apps.courses.models import Enrollment
        if Enrollment.objects.filter(student=viewer, course=value, status='active').exists():
            return value
        raise serializers.ValidationError('You can only attach a board to a course you teach or are enrolled in.')

    def validate(self, attrs):
        viewer = self._viewer()
        instance = self.instance
        if instance is None or viewer is None:
            return attrs

        level = self._level(instance)
        if level != 'owner':
            allowed = {
                'edit': EDIT_LEVEL_FIELDS,
                'comment': COMMENT_LEVEL_FIELDS,
                'instructor': INSTRUCTOR_FIELDS,
            }.get(level, set())
            for field, new_value in attrs.items():
                if field in allowed:
                    continue
                current = getattr(instance, field, None)
                if field == 'course':
                    current = instance.course
                if new_value != current:
                    raise PermissionDenied(f'You are not allowed to change "{field}" on this board.')
                # unchanged values (the client sends the whole object back) are ignored
            attrs = {k: v for k, v in attrs.items() if k in allowed}

            # People below edit level never overwrite the quiz answers of other students.
            if (instance.board_type == 'quiz' and 'content' in attrs and not sees_all_quiz_responses(level, viewer)
                    and isinstance(instance.content, dict)):
                content = dict(attrs['content'])
                if 'responses' in instance.content:
                    content['responses'] = instance.content['responses']
                else:
                    content.pop('responses', None)
                attrs['content'] = content
        return attrs


class StarredBoardSerializer(serializers.ModelSerializer):
    board_details = BoardSerializer(source='board', read_only=True)

    class Meta:
        model = StarredBoard
        fields = ['id', 'board', 'board_details', 'created_at']
        read_only_fields = ['id', 'created_at']


class BoardVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = BoardVersion
        fields = ['id', 'board', 'version_number', 'content', 'description', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request is not None and request.user.is_authenticated and instance.board.board_type == 'quiz':
            class _Shim:  # content_for_user only needs these attributes
                board_type = 'quiz'
                content = instance.content
            data['content'] = content_for_user(_Shim, request.user, get_board_access(request.user, instance.board))
        return data


class BoardInviteLinkSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    board_name = serializers.CharField(source='board.name', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = BoardInviteLink
        fields = [
            'id', 'board', 'board_name', 'token', 'permission', 'expires_at',
            'max_uses', 'use_count', 'created_by', 'created_by_name',
            'is_active', 'is_valid', 'created_at'
        ]
        read_only_fields = ['id', 'token', 'use_count', 'created_by', 'created_at']
