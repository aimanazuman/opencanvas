from rest_framework import permissions

from .access import get_board_access

# Actions any user who can see the board may call (they only touch the caller's own data or make a private copy).
VIEWER_ACTIONS = {'toggle_star', 'leave', 'duplicate'}
# Actions that change the shared board itself.
CONTENT_EDIT_ACTIONS = {'update', 'partial_update'}


class IsBoardOwnerOrShared(permissions.BasePermission):
    """
    Object-level access to a board, by access level (see boards/access.py):
    - owner: everything
    - instructor of the board's course: everything, including delete
    - edit share: read, update (content, name, description) and restore_version; no delete
    - comment share: read and update of the content only (field limits are enforced by the serializer)
    - view share / enrolled student: read, star, leave and duplicate
    DELETE is only for the owner and the course instructor.
    """
    def has_object_permission(self, request, view, obj):
        level = get_board_access(request.user, obj)
        if level is None:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        if level in ('owner', 'instructor'):
            return True

        action = getattr(view, 'action', None)
        if action in VIEWER_ACTIONS:
            return True
        if action in CONTENT_EDIT_ACTIONS:
            return level in ('edit', 'comment')
        if action == 'restore_version':
            return level == 'edit'
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
