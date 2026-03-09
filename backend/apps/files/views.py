from rest_framework import viewsets, permissions, parsers, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model
from .models import File
from .serializers import FileSerializer
from apps.accounts.audit import log_action
from apps.accounts.models import Notification

User = get_user_model()


class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        return File.objects.filter(uploaded_by=self.request.user, is_deleted=False)

    def perform_create(self, serializer):
        from apps.files.storage import check_quota, check_system_quota

        file_obj = serializer.validated_data.get('file')
        user = self.request.user
        file_size = file_obj.size if file_obj else 0

        # Check user quota (respects system-wide limit via get_effective_quota)
        ok, _ = check_quota(user, file_size)
        if not ok:
            raise ValidationError("Storage quota exceeded. Please free up space or contact an administrator.")

        # Check system-wide quota
        sys_ok, _ = check_system_quota(file_size)
        if not sys_ok:
            raise ValidationError("System storage limit reached. Please contact an administrator.")

        instance = serializer.save(uploaded_by=user, file_size=file_size)

        # Update user storage
        user.storage_used += instance.file_size
        user.save()

        # Check storage thresholds and create notifications
        from apps.files.storage import get_effective_quota
        effective_quota = get_effective_quota(user)
        if effective_quota > 0:
            pct = (user.storage_used / effective_quota) * 100
            warning_level = None
            if pct >= 100:
                warning_level = 100
            elif pct >= 90:
                warning_level = 90
            elif pct >= 80:
                warning_level = 80

            if warning_level:
                Notification.objects.create(
                    user=user,
                    type='storage_warning',
                    title=f'Storage {warning_level}% Full',
                    message=f'You are using {warning_level}% or more of your storage quota. '
                            f'Used: {round(user.storage_used / (1024**3), 2)} GB of {round(effective_quota / (1024**3), 2)} GB.',
                )
            self._storage_warning_pct = pct
        else:
            self._storage_warning_pct = None

        log_action(user, 'create', 'file', instance.id, {'name': instance.name, 'size': instance.file_size}, self.request)

    def create(self, request, *args, **kwargs):
        self._storage_warning_pct = None
        response = super().create(request, *args, **kwargs)
        if self._storage_warning_pct and self._storage_warning_pct >= 80:
            response.data['storage_warning'] = {
                'percentage': round(self._storage_warning_pct, 1),
                'message': f'Storage is {round(self._storage_warning_pct, 1)}% full.',
            }
        return response

    def perform_destroy(self, instance):
        # Soft delete and update storage usage
        instance.is_deleted = True
        instance.save()

        user = instance.uploaded_by
        user.storage_used -= instance.file_size
        if user.storage_used < 0:
            user.storage_used = 0
        user.save()

        log_action(self.request.user, 'delete', 'file', instance.id, {'name': instance.name}, self.request)

    @action(detail=False, methods=['get'])
    def usage(self, request):
        """Get storage usage for current user (quota capped by system limit)"""
        from apps.files.storage import get_effective_quota
        user = request.user
        effective_quota = get_effective_quota(user)
        return Response({
            'storage_used': user.storage_used,
            'storage_quota': effective_quota,
            'raw_storage_quota': user.storage_quota,
            'storage_used_mb': round(user.storage_used / (1024 * 1024), 3),
            'storage_quota_mb': round(effective_quota / (1024 * 1024), 3),
            'storage_used_bytes': user.storage_used,
            'storage_quota_bytes': effective_quota,
            'percentage_used': round((user.storage_used / effective_quota) * 100, 2) if effective_quota > 0 else 0
        })


class StorageStatsView(APIView):
    """
    Admin-only endpoint for system-wide storage statistics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.accounts.permissions import IsAdminUser
        from apps.boards.models import Board

        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        all_files = File.objects.filter(is_deleted=False)
        file_total_size = all_files.aggregate(total=Sum('file_size'))['total'] or 0
        total_count = all_files.count()

        # Board content sizes
        board_content_size = Board.objects.aggregate(total=Sum('content_size'))['total'] or 0

        total_size = file_total_size + board_content_size

        # Storage by type
        type_stats = []
        for file_type, label in File.FILE_TYPE_CHOICES:
            type_files = all_files.filter(file_type=file_type)
            type_size = type_files.aggregate(total=Sum('file_size'))['total'] or 0
            type_count = type_files.count()
            type_stats.append({
                'type': label,
                'file_type': file_type,
                'size_bytes': type_size,
                'size_gb': round(type_size / (1024 ** 3), 2),
                'files': type_count,
            })

        # Add board content as a storage category
        board_count = Board.objects.filter(content_size__gt=0).count()
        type_stats.append({
            'type': 'Board Content',
            'file_type': 'board_content',
            'size_bytes': board_content_size,
            'size_gb': round(board_content_size / (1024 ** 3), 2),
            'files': board_count,
        })

        # Total quota across all users
        total_quota = User.objects.aggregate(total=Sum('storage_quota'))['total'] or 0

        # System-wide storage limit
        from apps.accounts.models import SystemSettings
        system_limit_bytes = None
        system_limit_gb = None
        limit_str = SystemSettings.objects.filter(key='systemStorageLimit').values_list('value', flat=True).first()
        if limit_str:
            try:
                limit_gb = float(limit_str)
                if limit_gb > 0:
                    system_limit_bytes = int(limit_gb * (1024 ** 3))
                    system_limit_gb = limit_gb
            except (ValueError, TypeError):
                pass

        # Effective limit: system limit if set, otherwise sum of all user quotas
        effective_limit = system_limit_bytes if system_limit_bytes else total_quota

        return Response({
            'total_used_bytes': total_size,
            'total_used_gb': round(total_size / (1024 ** 3), 3),
            'total_quota_bytes': total_quota,
            'total_quota_gb': round(total_quota / (1024 ** 3), 3),
            'system_limit_bytes': system_limit_bytes,
            'system_limit_gb': system_limit_gb,
            'effective_limit_bytes': effective_limit,
            'effective_limit_gb': round(effective_limit / (1024 ** 3), 3) if effective_limit else None,
            'percentage_used': round((total_size / effective_limit) * 100, 2) if effective_limit > 0 else 0,
            'total_files': total_count + board_count,
            'by_type': type_stats,
        })


class LargeFilesView(APIView):
    """
    Admin-only endpoint to list largest files in the system.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        large_files = File.objects.filter(is_deleted=False).order_by('-file_size')[:20]
        data = []
        for f in large_files:
            data.append({
                'id': f.id,
                'name': f.name,
                'size_bytes': f.file_size,
                'size_display': f'{f.size_mb:.1f} MB' if f.size_mb < 1024 else f'{f.size_mb / 1024:.1f} GB',
                'file_type': f.file_type,
                'owner': f'{f.uploaded_by.first_name} {f.uploaded_by.last_name}' if f.uploaded_by else 'Unknown',
                'owner_id': f.uploaded_by_id,
                'created_at': f.created_at.isoformat() if hasattr(f, 'created_at') else None,
            })
        return Response(data)


class UserStorageBreakdownView(APIView):
    """
    Admin-only endpoint for per-user storage usage with file-type breakdown.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        from apps.boards.models import Board
        from apps.accounts.models import SystemSettings

        sort_by = request.query_params.get('sort', 'storage_used')
        order = request.query_params.get('order', 'desc')

        # Get system storage limit for capping user quotas
        system_limit_bytes = None
        limit_str = SystemSettings.objects.filter(key='systemStorageLimit').values_list('value', flat=True).first()
        if limit_str:
            try:
                limit_gb = float(limit_str)
                if limit_gb > 0:
                    system_limit_bytes = int(limit_gb * (1024 ** 3))
            except (ValueError, TypeError):
                pass

        users = User.objects.all().values(
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'storage_used', 'storage_quota',
        )

        result = []
        for u in users:
            user_files = File.objects.filter(uploaded_by_id=u['id'], is_deleted=False)
            breakdown = {}
            for file_type, label in File.FILE_TYPE_CHOICES:
                type_size = user_files.filter(file_type=file_type).aggregate(total=Sum('file_size'))['total'] or 0
                type_count = user_files.filter(file_type=file_type).count()
                if type_count > 0:
                    breakdown[file_type] = {'size_bytes': type_size, 'count': type_count}

            # Include board content storage
            board_content_size = Board.objects.filter(
                owner_id=u['id']
            ).aggregate(total=Sum('content_size'))['total'] or 0
            board_count = Board.objects.filter(owner_id=u['id'], content_size__gt=0).count()
            if board_count > 0:
                breakdown['board_content'] = {'size_bytes': board_content_size, 'count': board_count}

            display_name = f"{u['first_name']} {u['last_name']}".strip() or u['username']
            raw_quota = u['storage_quota'] or 1
            # Cap by system limit
            effective_quota = raw_quota
            if system_limit_bytes and system_limit_bytes > 0:
                effective_quota = min(raw_quota, system_limit_bytes)
            used = u['storage_used'] or 0
            result.append({
                'id': u['id'],
                'username': u['username'],
                'display_name': display_name,
                'email': u['email'],
                'role': u['role'],
                'storage_used': used,
                'storage_quota': effective_quota,
                'raw_storage_quota': raw_quota,
                'storage_used_gb': round(used / (1024 ** 3), 3),
                'storage_quota_gb': round(effective_quota / (1024 ** 3), 3),
                'percentage_used': round((used / effective_quota) * 100, 1) if effective_quota > 0 else 0,
                'file_count': user_files.count() + board_count,
                'breakdown': breakdown,
            })

        reverse = order == 'desc'
        if sort_by in ('storage_used', 'percentage_used', 'storage_quota', 'file_count'):
            result.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
        elif sort_by == 'display_name':
            result.sort(key=lambda x: x.get('display_name', '').lower(), reverse=reverse)

        return Response(result)
