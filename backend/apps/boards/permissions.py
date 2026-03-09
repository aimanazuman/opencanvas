from rest_framework import permissions


class IsBoardOwnerOrShared(permissions.BasePermission):
    """
    Permission to check if user is board owner or has been shared the board.
    - Owners have full access
    - Shared users have access based on their permission level (view/comment/edit)
    - Comment permission: read access + limited writes (adding cards, comments)
    """
    def has_object_permission(self, request, view, obj):
        # Owner has full access
        if obj.owner == request.user:
            return True

        # Check if board is shared with user
        from apps.boards.models import BoardShare
        try:
            share = BoardShare.objects.get(board=obj, user=request.user)
            # For safe methods (GET, HEAD, OPTIONS), any permission level is enough
            if request.method in permissions.SAFE_METHODS:
                return True
            # For modification methods, need comment or edit permission
            return share.permission in ('edit', 'comment')
        except BoardShare.DoesNotExist:
            pass

        # Course-based access
        if obj.course:
            from apps.courses.models import Enrollment
            # Course instructor: full access
            if obj.course.instructor == request.user:
                return True
            # Enrolled student: read-only access
            if request.method in permissions.SAFE_METHODS:
                if Enrollment.objects.filter(
                    student=request.user, course=obj.course, status='active'
                ).exists():
                    return True

        return False


class IsBoardOwner(permissions.BasePermission):
    """
    Permission to only allow board owners.
    """
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission to only allow owners to edit, but everyone (authenticated) can read.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions are only allowed to the owner
        return obj.owner == request.user
