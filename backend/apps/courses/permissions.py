from rest_framework import permissions


class IsLecturerOrAdmin(permissions.BasePermission):
    """
    Permission to only allow lecturers and admins to create courses.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.role in ['lecturer', 'admin']


class IsCourseInstructorOrAdmin(permissions.BasePermission):
    """
    Permission to only allow course instructor or admin to modify the course.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.instructor == request.user or request.user.role == 'admin'
