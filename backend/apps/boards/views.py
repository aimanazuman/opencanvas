import copy
import json
from datetime import timedelta

from django.conf import settings as django_settings
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.audit import log_action
from apps.accounts.emails import send_board_shared_email
from apps.accounts.notifications import notify_board_shared, notify_invite_accepted
from apps.files.storage import (
    calculate_content_size, update_user_storage, charge_storage, charge_board_storage, refund_board_storage,
    QuotaExceeded,
)
from .access import (
    LEVEL_RANK, get_board_access, content_for_user,
)
from .models import Board, BoardShare, StarredBoard, BoardVersion, BoardInviteLink
from .permissions import IsBoardOwnerOrShared
from .serializers import BoardSerializer, BoardShareSerializer, BoardVersionSerializer, BoardInviteLinkSerializer

# Shown when a quiz answer cannot be saved because the storage of the quiz's owner is full (see submit_quiz_response).
QUIZ_QUOTA_MESSAGES = {
    'user': "This quiz cannot take answers right now because the lecturer's storage is full. "
            "Please ask the lecturer to free up space, then try again.",
    'system': "The system storage limit has been reached, so this quiz cannot take answers right now. "
              "Please contact an administrator.",
}


def _int_or_none(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _charge(owner, delta):
    """charge_storage that speaks DRF: an exceeded quota becomes HTTP 400."""
    try:
        charge_storage(owner, delta)
    except QuotaExceeded as exc:
        raise ValidationError(exc.message)


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

        course_param = self.request.query_params.get('course')
        if course_param:
            course_id = _int_or_none(course_param)
            queryset = queryset.filter(course_id=course_id) if course_id is not None else queryset.none()

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
                if board.course_id and board.course_id in section_map and board.owner_id != user.id:
                    if section_map[board.course_id] != board.section:
                        excluded_ids.append(board.id)
            if excluded_ids:
                queryset = queryset.exclude(id__in=excluded_ids)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        content = serializer.validated_data.get('content', {})
        size = calculate_content_size(content)

        with transaction.atomic():
            _charge(user, size)
            instance = serializer.save(owner=user, content_size=size)
        log_action(user, 'create', 'board', instance.id, {'name': instance.name}, self.request)

    def perform_update(self, serializer):
        user = self.request.user
        board = serializer.instance
        owner = board.owner  # the board's size always belongs to its owner, whoever edits it

        with transaction.atomic():
            if 'content' in serializer.validated_data:
                new_size = calculate_content_size(serializer.validated_data['content'])
                delta = new_size - (board.content_size or 0)
                # Archived boards are not counted in the owner's usage (it was returned when they were archived).
                if delta != 0 and not board.is_archived:
                    _charge(owner, delta)
                instance = serializer.save(content_size=new_size)
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

        with transaction.atomic():
            # An archived board already gave its storage back when it was archived. Otherwise the owner gets the content
            # back and each uploader gets their files back. This runs before the delete, which removes the files.
            if not instance.is_archived:
                refund_board_storage(instance)
            instance.delete()  # a post_delete signal removes the attached files from disk

    def _capped(self, queryset):
        return queryset[:int(django_settings.MAX_LIST_RESULTS)]

    @action(detail=False, methods=['get'])
    def starred(self, request):
        """Get all starred boards for current user"""
        boards = self.get_queryset().filter(starred_by=request.user, is_archived=False)
        serializer = self.get_serializer(self._capped(boards), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def archived(self, request):
        """Get all archived boards"""
        boards = self.get_queryset().filter(is_archived=True)
        serializer = self.get_serializer(self._capped(boards), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """Template boards: the ones an administrator published, plus templates the user owns or can already see."""
        visible_ids = self.get_queryset().values('id')
        boards = Board.objects.filter(is_template=True, is_archived=False).filter(
            Q(owner__role='admin') | Q(id__in=visible_ids)
        ).select_related('owner', 'course').distinct()
        serializer = self.get_serializer(self._capped(boards), many=True)
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
        """Archive a board — moves to cold storage and returns quota to user"""
        board = self.get_object()
        if board.owner != request.user:
            return Response(
                {'error': 'Only the owner can archive a board'},
                status=status.HTTP_403_FORBIDDEN
            )
        if board.is_archived:
            return Response({'error': 'This board is already archived'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            board.is_archived = True
            board.save()
            # Give the board back to cold storage: the content goes back to the owner, each file to its uploader.
            freed = refund_board_storage(board)

        log_action(request.user, 'update', 'board', board.id, {'action': 'archive', 'storage_freed': freed}, request)
        return Response({'is_archived': True, 'message': 'Board archived', 'storage_freed': freed})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore an archived board — re-charges storage quota"""
        board = self.get_object()
        if board.owner != request.user:
            return Response(
                {'error': 'Only the owner can restore a board'},
                status=status.HTTP_403_FORBIDDEN
            )
        if not board.is_archived:
            return Response({'error': 'This board is not archived'}, status=status.HTTP_400_BAD_REQUEST)

        # Charge the content back to the owner and each live file back to its uploader. The board row is written first
        # (same lock order as archive). Any payer over quota rolls the whole restore back.
        try:
            with transaction.atomic():
                board.is_archived = False
                board.save()
                charge_board_storage(board)
        except QuotaExceeded:
            return Response(
                {'error': 'Not enough storage quota to restore this board. Please free up space first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

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
        """Create a private copy of a board for the current user"""
        original_board = self.get_object()
        user = request.user
        level = get_board_access(user, original_board)
        # Copy only what this user may see (other students' quiz answers are not copied).
        content = copy.deepcopy(content_for_user(original_board, user, level))
        size = calculate_content_size(content)

        # The copy belongs to the course only when the person copying teaches it; otherwise it is a personal board.
        course = original_board.course if (level in ('owner', 'instructor') or user.role == 'admin') else None

        try:
            with transaction.atomic():
                charge_storage(user, size)
                new_board = Board.objects.create(
                    name=f"{original_board.name} (Copy)"[:255],
                    description=original_board.description,
                    owner=user,
                    course=course,
                    board_type=original_board.board_type,
                    content=content,
                    content_size=size,
                    is_template=False,
                    is_archived=False
                )
        except QuotaExceeded as exc:
            return Response({'error': exc.message}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(new_board)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Get all versions of a board"""
        board = self.get_object()
        versions = board.versions.all()[:100]
        serializer = BoardVersionSerializer(versions, many=True, context={'request': request})
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
        except (BoardVersion.DoesNotExist, ValueError, TypeError):
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

        with transaction.atomic():
            if delta != 0 and not board.is_archived:
                _charge(board.owner, delta)
            board.content = version.content
            board.content_size = new_size
            board.save()

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
        # The board is fetched directly instead of with get_object(): IsBoardOwnerOrShared blocks POST for view-only
        # users, but a quiz submission must be allowed for anyone who can access the board.
        user = request.user
        pk_int = _int_or_none(pk)
        if pk_int is None:
            return Response({'error': 'Board not found.'}, status=status.HTTP_404_NOT_FOUND)

        response_data = request.data.get('response') if isinstance(request.data, dict) else None
        if not response_data or not isinstance(response_data, dict):
            return Response({'error': 'response is required and must be an object.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if len(json.dumps(response_data).encode('utf-8')) > django_settings.QUIZ_RESPONSE_MAX_BYTES:
            return Response({'error': 'Your response is too large.'}, status=status.HTTP_400_BAD_REQUEST)

        # Quota rule for quizzes: the board owner pays for the answers, so an answer that would take the owner over their
        # quota (or the system limit) is REJECTED with HTTP 400 and {"error": ...}, the same style as duplicate. The
        # quota error is raised before the board row is written, so nothing is saved, the student's retake state is
        # unchanged and the student can try again once the owner has freed space. Shrinking an answer always succeeds.
        try:
            with transaction.atomic():
                # Lock the row so two students submitting at once cannot overwrite each other's answers.
                board = Board.objects.select_for_update().select_related('owner', 'course').filter(pk=pk_int).first()
                if board is None:
                    return Response({'error': 'Board not found.'}, status=status.HTTP_404_NOT_FOUND)

                # Verify the user has at least view access to this board
                if get_board_access(user, board) is None:
                    return Response({'error': 'You do not have access to this board.'},
                                    status=status.HTTP_403_FORBIDDEN)

                # Verify this is a quiz board
                if board.board_type != 'quiz':
                    return Response({'error': 'This board is not a quiz.'}, status=status.HTTP_400_BAD_REQUEST)

                user_id = str(user.id)
                content = board.content if isinstance(board.content, dict) else {}
                quiz_settings = content.get('quizSettings', {})
                responses = content.get('responses', {})
                if not isinstance(responses, dict):
                    responses = {}

                # Check if retake is allowed
                if user_id in responses and not quiz_settings.get('allowRetake', False):
                    return Response({'error': 'You have already submitted this quiz and retakes are not allowed.'},
                                    status=status.HTTP_400_BAD_REQUEST)

                # Attach the student's display name so the lecturer leaderboard can show it
                display_name = f"{user.first_name} {user.last_name}".strip() or user.username
                response_data['studentName'] = display_name
                responses[user_id] = response_data
                content['responses'] = responses

                old_size = board.content_size or 0
                new_size = calculate_content_size(content)
                delta = new_size - old_size

                if not board.is_archived:
                    if delta > 0:
                        # Checks the owner's quota and system limit under a row lock. Raises QuotaExceeded.
                        charge_storage(board.owner, delta)
                    elif delta < 0:
                        update_user_storage(board.owner, delta)

                board.content = content
                board.content_size = new_size
                board.save()
        except QuotaExceeded as exc:
            return Response({'error': QUIZ_QUOTA_MESSAGES.get(exc.scope, exc.message)},
                            status=status.HTTP_400_BAD_REQUEST)

        log_action(user, 'create', 'quiz_response', board.id,
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
        if permission not in ('view', 'comment', 'edit'):
            return Response({'error': 'permission must be view, comment or edit'},
                            status=status.HTTP_400_BAD_REQUEST)
        expires_in = request.data.get('expires_in')  # hours, null = never
        max_uses = request.data.get('max_uses')  # null = unlimited

        expires_at = None
        if expires_in:
            hours = _int_or_none(expires_in)
            if hours is None or hours < 1 or hours > 24 * 365:
                return Response({'error': 'expires_in must be a number of hours'}, status=status.HTTP_400_BAD_REQUEST)
            expires_at = timezone.now() + timedelta(hours=hours)
        uses = None
        if max_uses:
            uses = _int_or_none(max_uses)
            if uses is None or uses < 1 or uses > 100000:
                return Response({'error': 'max_uses must be a positive number'}, status=status.HTTP_400_BAD_REQUEST)

        invite = BoardInviteLink.objects.create(
            board=board,
            permission=permission,
            expires_at=expires_at,
            max_uses=uses,
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

        invite_id = _int_or_none(request.data.get('invite_id'))
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
        except (BoardInviteLink.DoesNotExist, ValueError, TypeError):
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
        with transaction.atomic():
            try:
                invite = BoardInviteLink.objects.select_for_update().select_related('board', 'board__owner').get(token=token)
            except (BoardInviteLink.DoesNotExist, ValueError, TypeError):
                return Response({'error': 'Invalid invite link'}, status=status.HTTP_404_NOT_FOUND)

            if not invite.is_valid:
                return Response({'error': 'This invite link has expired or reached its usage limit'}, status=status.HTTP_410_GONE)

            # Check if already owner
            if invite.board.owner == request.user:
                return Response({'error': 'You are the owner of this board'}, status=status.HTTP_400_BAD_REQUEST)

            # Create the share. An existing, higher permission is never lowered by joining through a weaker link.
            share = BoardShare.objects.filter(board=invite.board, user=request.user).first()
            created = share is None
            if created:
                share = BoardShare.objects.create(board=invite.board, user=request.user, permission=invite.permission)
            elif LEVEL_RANK[invite.permission] > LEVEL_RANK[share.permission]:
                share.permission = invite.permission
                share.save(update_fields=['permission'])

            BoardInviteLink.objects.filter(pk=invite.pk).update(use_count=F('use_count') + 1)

        # Notify board owner
        if created:
            notify_invite_accepted(invite.board, request.user)

        return Response({
            'message': 'Successfully joined the board',
            'board_id': invite.board.id,
            'board_name': invite.board.name,
            'permission': share.permission,
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

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['show_email'] = True  # the board owner sees the addresses of the people they shared with
        return context

    def perform_create(self, serializer):
        """Only board owner can create shares"""
        board = serializer.validated_data['board']
        if board.owner != self.request.user:
            raise PermissionDenied('Only the board owner can share the board')
        instance = serializer.save()
        notify_board_shared(board, instance.user, self.request.user)
        send_board_shared_email(instance.user, board, self.request.user)
        log_action(self.request.user, 'share', 'board', board.id, {'shared_with': instance.user.username, 'permission': instance.permission}, self.request)

    def perform_update(self, serializer):
        """Only the board owner can change a share, and only its permission level."""
        if serializer.instance.board.owner != self.request.user:
            raise PermissionDenied('Only the board owner can change shares')
        instance = serializer.save()
        log_action(self.request.user, 'share', 'board', instance.board_id,
                   {'shared_with': instance.user.username, 'permission': instance.permission}, self.request)

    def perform_destroy(self, instance):
        """Only board owner can remove shares"""
        if instance.board.owner != self.request.user:
            raise PermissionDenied('Only the board owner can remove shares')
        log_action(self.request.user, 'unshare', 'board', instance.board.id, {'removed_user': instance.user.username}, self.request)
        instance.delete()
