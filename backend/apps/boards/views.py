from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.utils import timezone
from .models import Board, BoardShare, StarredBoard, BoardVersion, BoardInviteLink
from .serializers import BoardSerializer, BoardShareSerializer, BoardVersionSerializer, BoardInviteLinkSerializer
from .permissions import IsBoardOwnerOrShared, IsBoardOwner
import copy
from apps.accounts.notifications import notify_board_shared, notify_invite_accepted
from apps.accounts.emails import send_board_shared_email
from apps.accounts.audit import log_action
from apps.files.storage import calculate_content_size, update_user_storage, check_quota, check_system_quota


class BoardViewSet(viewsets.ModelViewSet):
    serializer_class = BoardSerializer
    permission_classes = [permissions.IsAuthenticated, IsBoardOwnerOrShared]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'name']
    ordering = ['-updated_at']

    def get_queryset(self):
        user = self.request.user
        queryset = Board.objects.filter(
            Q(owner=user) | Q(shares__user=user) |
            Q(course__enrollments__student=user, course__enrollments__status='active') |
            Q(course__instructor=user)
        ).distinct().select_related('owner', 'course').prefetch_related('shares__user')

        # Scope filtering
        scope = self.request.query_params.get('scope')
        if scope == 'personal':
            queryset = queryset.filter(course__isnull=True, owner=user)
        elif scope == 'course':
            queryset = queryset.filter(course__isnull=False)

        # Manual filtering
        if self.request.query_params.get('starred'):
            queryset = queryset.filter(starred_by=user)

        if self.request.query_params.get('shared'):
            queryset = queryset.filter(shares__user=user).exclude(owner=user)

        if self.request.query_params.get('course'):
            queryset = queryset.filter(course_id=self.request.query_params.get('course'))

        if self.request.query_params.get('is_archived'):
            queryset = queryset.filter(is_archived=self.request.query_params.get('is_archived') == 'true')

        if self.request.query_params.get('is_template'):
            queryset = queryset.filter(is_template=self.request.query_params.get('is_template') == 'true')

        if self.request.query_params.get('board_type'):
            queryset = queryset.filter(board_type=self.request.query_params.get('board_type'))

        if self.request.query_params.get('section'):
            queryset = queryset.filter(section=self.request.query_params.get('section'))

        # Section-based access: if a board has a section set, only students in that section
        # (+ course instructor + admin) can see it
        if user.role == 'student':
            from apps.courses.models import Enrollment
            # Get student's sections per course
            student_enrollments = Enrollment.objects.filter(student=user, status='active')
            section_map = {e.course_id: e.section for e in student_enrollments}

            # Exclude boards with a section that doesn't match the student's section
            excluded_ids = []
            for board in queryset.filter(section__gt=''):
                if board.course_id and board.course_id in section_map:
                    if section_map[board.course_id] != board.section:
                        excluded_ids.append(board.id)
            if excluded_ids:
                queryset = queryset.exclude(id__in=excluded_ids)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        content = serializer.validated_data.get('content', {})
        size = calculate_content_size(content)

        ok, remaining = check_quota(user, size)
        if not ok:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Storage quota exceeded. Please free up space or contact an administrator.")

        sys_ok, _ = check_system_quota(size)
        if not sys_ok:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("System storage limit reached. Please contact an administrator.")

        instance = serializer.save(owner=user, content_size=size)
        update_user_storage(user, size)
        log_action(user, 'create', 'board', instance.id, {'name': instance.name}, self.request)

    def perform_update(self, serializer):
        user = self.request.user
        old_size = serializer.instance.content_size or 0

        if 'content' in serializer.validated_data:
            new_size = calculate_content_size(serializer.validated_data['content'])
            delta = new_size - old_size

            if delta > 0:
                ok, remaining = check_quota(user, delta)
                if not ok:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError("Storage quota exceeded. Please free up space or contact an administrator.")

                sys_ok, _ = check_system_quota(delta)
                if not sys_ok:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError("System storage limit reached. Please contact an administrator.")

            instance = serializer.save(content_size=new_size)
            update_user_storage(user, delta)
            self.create_version_snapshot(instance)
        else:
            instance = serializer.save()

        log_action(user, 'update', 'board', instance.id, {'name': instance.name}, self.request)

    def create_version_snapshot(self, board):
        """Create a version snapshot of the board"""
        latest_version = board.versions.first()
        version_number = (latest_version.version_number + 1) if latest_version else 1

        BoardVersion.objects.create(
            board=board,
            content=board.content,
            version_number=version_number,
            created_by=self.request.user,
            description=f"Auto-saved version {version_number}"
        )

    def perform_destroy(self, instance):
        log_action(self.request.user, 'delete', 'board', instance.id, {'name': instance.name}, self.request)
        size = instance.content_size or 0
        owner = instance.owner
        instance.delete()
        if size > 0:
            update_user_storage(owner, -size)

    @action(detail=False, methods=['get'])
    def starred(self, request):
        """Get all starred boards for current user"""
        boards = self.get_queryset().filter(starred_by=request.user, is_archived=False)
        serializer = self.get_serializer(boards, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def archived(self, request):
        """Get all archived boards"""
        boards = self.get_queryset().filter(is_archived=True)
        serializer = self.get_serializer(boards, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Get all template boards"""
        boards = Board.objects.filter(is_template=True)
        serializer = self.get_serializer(boards, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_star(self, request, pk=None):
        """Toggle star status for a board"""
        board = self.get_object()
        starred_board, created = StarredBoard.objects.get_or_create(
            user=request.user,
            board=board
        )

        if not created:
            starred_board.delete()
            is_starred = False
        else:
            is_starred = True

        return Response({
            'is_starred': is_starred,
            'message': 'Board starred' if is_starred else 'Board unstarred'
        })

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a board"""
        board = self.get_object()
        if board.owner != request.user:
            return Response(
                {'error': 'Only the owner can archive a board'},
                status=status.HTTP_403_FORBIDDEN
            )

        board.is_archived = True
        board.save()
        log_action(request.user, 'update', 'board', board.id, {'action': 'archive'}, request)
        return Response({'is_archived': True, 'message': 'Board archived'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore an archived board"""
        board = self.get_object()
        if board.owner != request.user:
            return Response(
                {'error': 'Only the owner can restore a board'},
                status=status.HTTP_403_FORBIDDEN
            )

        board.is_archived = False
        board.save()
        return Response({'is_archived': False, 'message': 'Board restored'})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def leave(self, request, pk=None):
        """Allow a shared user to remove themselves from a board"""
        board = self.get_object()
        if board.owner == request.user:
            return Response(
                {'error': 'The owner cannot leave their own board'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            share = BoardShare.objects.get(board=board, user=request.user)
            share.delete()
            return Response({'message': 'You have left the board'})
        except BoardShare.DoesNotExist:
            return Response(
                {'error': 'You are not a member of this board'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def duplicate(self, request, pk=None):
        """Create a duplicate of a board"""
        original_board = self.get_object()
        user = request.user
        content = copy.deepcopy(original_board.content)
        size = calculate_content_size(content)

        ok, remaining = check_quota(user, size)
        if not ok:
            return Response(
                {'error': 'Storage quota exceeded. Please free up space or contact an administrator.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_board = Board.objects.create(
            name=f"{original_board.name} (Copy)",
            description=original_board.description,
            owner=user,
            course=original_board.course,
            content=content,
            content_size=size,
            is_template=False,
            is_archived=False
        )
        update_user_storage(user, size)

        serializer = self.get_serializer(new_board)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Get all versions of a board"""
        board = self.get_object()
        versions = board.versions.all()
        serializer = BoardVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def restore_version(self, request, pk=None):
        """Restore a board to a specific version"""
        board = self.get_object()
        version_id = request.data.get('version_id')

        if not version_id:
            return Response(
                {'error': 'version_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            version = board.versions.get(id=version_id)
        except BoardVersion.DoesNotExist:
            return Response(
                {'error': 'Version not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create a new version before restoring
        self.create_version_snapshot(board)

        # Restore content from version
        old_size = board.content_size or 0
        new_size = calculate_content_size(version.content)
        delta = new_size - old_size

        board.content = version.content
        board.content_size = new_size
        board.save()

        if delta != 0:
            update_user_storage(board.owner, delta)

        serializer = self.get_serializer(board)
        return Response(serializer.data)


    @action(detail=True, methods=['post'], url_path='submit-quiz-response',
            permission_classes=[permissions.IsAuthenticated])
    def submit_quiz_response(self, request, pk=None):
        """
        Submit a quiz response for the current user.
        Allowed for ANY authenticated user who can view the board (including view-only students).
        Merges the response into board.content.responses server-side to avoid overwriting
        other students' responses.
        """
        # Fetch board directly — don't use get_object() because IsBoardOwnerOrShared
        # blocks POST for view-only users, but quiz submission must be allowed for anyone
        # who can access the board.
        try:
            board = Board.objects.get(pk=pk)
        except Board.DoesNotExist:
            return Response({'error': 'Board not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Verify the user has at least view access to this board
        user = request.user
        has_access = (
            board.owner == user
            or BoardShare.objects.filter(board=board, user=user).exists()
        )
        if not has_access and board.course:
            from apps.courses.models import Enrollment
            has_access = (
                board.course.instructor == user
                or Enrollment.objects.filter(student=user, course=board.course, status='active').exists()
            )
        if not has_access:
            return Response({'error': 'You do not have access to this board.'}, status=status.HTTP_403_FORBIDDEN)

        # Verify this is a quiz board
        if board.board_type != 'quiz':
            return Response({'error': 'This board is not a quiz.'}, status=status.HTTP_400_BAD_REQUEST)

        response_data = request.data.get('response')
        if not response_data or not isinstance(response_data, dict):
            return Response({'error': 'response is required and must be an object.'},
                            status=status.HTTP_400_BAD_REQUEST)

        user_id = str(request.user.id)
        content = board.content or {}
        settings = content.get('quizSettings', {})
        responses = content.get('responses', {})

        # Check if retake is allowed
        if user_id in responses and not settings.get('allowRetake', False):
            return Response({'error': 'You have already submitted this quiz and retakes are not allowed.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Merge the new response (server-side merge avoids race conditions)
        # Attach the student's display name so the lecturer leaderboard can show it
        display_name = f"{request.user.first_name} {request.user.last_name}".strip()
        if not display_name:
            display_name = request.user.username
        response_data['studentName'] = display_name
        responses[user_id] = response_data
        content['responses'] = responses

        old_size = board.content_size or 0
        new_size = calculate_content_size(content)
        delta = new_size - old_size

        board.content = content
        board.content_size = new_size
        board.save()

        if delta != 0:
            update_user_storage(board.owner, delta)

        log_action(request.user, 'create', 'quiz_response', board.id,
                   {'board_name': board.name, 'score': response_data.get('score')}, request)

        return Response({'status': 'ok', 'responses_count': len(responses)})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def create_invite(self, request, pk=None):
        """Create an invite link for a board"""
        board = self.get_object()
        if board.owner != request.user:
            return Response(
                {'error': 'Only the board owner can create invite links'},
                status=status.HTTP_403_FORBIDDEN
            )

        permission = request.data.get('permission', 'view')
        expires_in = request.data.get('expires_in')  # hours, null = never
        max_uses = request.data.get('max_uses')  # null = unlimited

        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timezone.timedelta(hours=int(expires_in))

        invite = BoardInviteLink.objects.create(
            board=board,
            permission=permission,
            expires_at=expires_at,
            max_uses=int(max_uses) if max_uses else None,
            created_by=request.user,
        )

        serializer = BoardInviteLinkSerializer(invite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def invites(self, request, pk=None):
        """List active invite links for a board"""
        board = self.get_object()
        if board.owner != request.user:
            return Response(
                {'error': 'Only the board owner can view invite links'},
                status=status.HTTP_403_FORBIDDEN
            )

        links = board.invite_links.filter(is_active=True).order_by('-created_at')
        serializer = BoardInviteLinkSerializer(links, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def revoke_invite(self, request, pk=None):
        """Revoke an invite link"""
        board = self.get_object()
        if board.owner != request.user:
            return Response(
                {'error': 'Only the board owner can revoke invite links'},
                status=status.HTTP_403_FORBIDDEN
            )

        invite_id = request.data.get('invite_id')
        try:
            invite = board.invite_links.get(id=invite_id)
            invite.is_active = False
            invite.save()
            return Response({'message': 'Invite link revoked'})
        except BoardInviteLink.DoesNotExist:
            return Response(
                {'error': 'Invite link not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class JoinBoardView(APIView):
    """Join a board via invite link token"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, token):
        """Get board info from invite token (preview before joining)"""
        try:
            invite = BoardInviteLink.objects.select_related('board', 'board__owner').get(token=token)
        except BoardInviteLink.DoesNotExist:
            return Response({'error': 'Invalid invite link'}, status=status.HTTP_404_NOT_FOUND)

        if not invite.is_valid:
            return Response({'error': 'This invite link has expired or reached its usage limit'}, status=status.HTTP_410_GONE)

        already_member = (
            invite.board.owner == request.user or
            BoardShare.objects.filter(board=invite.board, user=request.user).exists()
        )

        return Response({
            'board_name': invite.board.name,
            'board_type': invite.board.board_type,
            'owner_name': invite.board.owner.username,
            'permission': invite.permission,
            'already_member': already_member,
        })

    def post(self, request, token):
        """Join a board using an invite token"""
        try:
            invite = BoardInviteLink.objects.select_related('board', 'board__owner').get(token=token)
        except BoardInviteLink.DoesNotExist:
            return Response({'error': 'Invalid invite link'}, status=status.HTTP_404_NOT_FOUND)

        if not invite.is_valid:
            return Response({'error': 'This invite link has expired or reached its usage limit'}, status=status.HTTP_410_GONE)

        # Check if already owner
        if invite.board.owner == request.user:
            return Response({'error': 'You are the owner of this board'}, status=status.HTTP_400_BAD_REQUEST)

        # Create or update share
        share, created = BoardShare.objects.update_or_create(
            board=invite.board,
            user=request.user,
            defaults={'permission': invite.permission}
        )

        # Increment use count
        invite.use_count += 1
        invite.save()

        # Notify board owner
        if created:
            notify_invite_accepted(invite.board, request.user)

        return Response({
            'message': 'Successfully joined the board',
            'board_id': invite.board.id,
            'board_name': invite.board.name,
            'permission': invite.permission,
            'created': created,
        })


class BoardShareViewSet(viewsets.ModelViewSet):
    serializer_class = BoardShareSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Only show shares for boards owned by the current user"""
        return BoardShare.objects.filter(
            board__owner=self.request.user
        ).select_related('board', 'user')

    def perform_create(self, serializer):
        """Only board owner can create shares"""
        board = serializer.validated_data['board']
        if board.owner != self.request.user:
            raise permissions.PermissionDenied('Only the board owner can share the board')
        instance = serializer.save()
        notify_board_shared(board, instance.user, self.request.user)
        send_board_shared_email(instance.user, board, self.request.user)
        log_action(self.request.user, 'share', 'board', board.id, {'shared_with': instance.user.username, 'permission': instance.permission}, self.request)

    def perform_destroy(self, instance):
        """Only board owner can remove shares"""
        if instance.board.owner != self.request.user:
            raise permissions.PermissionDenied('Only the board owner can remove shares')
        log_action(self.request.user, 'unshare', 'board', instance.board.id, {'removed_user': instance.user.username}, self.request)
        instance.delete()
