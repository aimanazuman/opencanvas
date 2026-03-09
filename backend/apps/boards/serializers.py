from rest_framework import serializers
from .models import Board, BoardShare, StarredBoard, BoardVersion, BoardInviteLink
from apps.accounts.serializers import UserSerializer


class BoardShareSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = BoardShare
        fields = ['id', 'board', 'user', 'username', 'user_details', 'permission', 'created_at']
        read_only_fields = ['id', 'created_at']


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

    class Meta:
        model = Board
        fields = [
            'id', 'name', 'description', 'owner', 'owner_name', 'owner_details',
            'course', 'course_name', 'section', 'content', 'content_size', 'thumbnail', 'is_archived',
            'is_template', 'board_type', 'is_starred', 'can_edit', 'can_comment', 'permission',
            'collaborators', 'starred_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'content_size', 'created_at', 'updated_at']

    def get_owner_details(self, obj):
        return {
            'id': obj.owner.id,
            'username': obj.owner.username,
            'email': obj.owner.email,
            'avatar': obj.owner.avatar.url if obj.owner.avatar else None,
        }

    def get_is_starred(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_starred_by(request.user)
        return False

    def _get_user_permission(self, obj):
        """Get the effective permission level for the current user on this board."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        # Owner has full access
        if obj.owner == request.user:
            return 'owner'

        # Check share permission
        try:
            share = BoardShare.objects.get(board=obj, user=request.user)
            return share.permission  # 'view', 'comment', or 'edit'
        except BoardShare.DoesNotExist:
            pass

        # Course instructor can edit all course boards
        if obj.course and obj.course.instructor == request.user:
            return 'edit'

        # Enrolled student gets view access
        if obj.course:
            from apps.courses.models import Enrollment
            if Enrollment.objects.filter(
                student=request.user, course=obj.course, status='active'
            ).exists():
                return 'view'

        return None

    def get_can_edit(self, obj):
        perm = self._get_user_permission(obj)
        return perm in ('owner', 'edit')

    def get_can_comment(self, obj):
        perm = self._get_user_permission(obj)
        return perm in ('owner', 'edit', 'comment')

    def get_permission(self, obj):
        return self._get_user_permission(obj)

    def get_collaborators(self, obj):
        shares = obj.shares.select_related('user').all()
        return BoardShareSerializer(shares, many=True).data

    def get_starred_count(self, obj):
        return obj.starred_by.count()


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
        read_only_fields = ['id', 'created_at']


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
