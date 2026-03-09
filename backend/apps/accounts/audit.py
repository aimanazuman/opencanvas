from .models import AuditLog


def log_action(user, action, resource_type, resource_id=None, details=None, request=None):
    """
    Create an audit log entry.

    Args:
        user: The user performing the action
        action: One of 'create', 'read', 'update', 'delete', 'share', 'unshare', 'login', 'logout'
        resource_type: Type of resource (e.g., 'board', 'course', 'user', 'file')
        resource_id: ID of the resource (optional)
        details: Dict of additional details (optional)
        request: HTTP request object for IP/user-agent extraction (optional)
    """
    ip_address = None
    user_agent = ''

    if request:
        ip_address = _get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

    AuditLog.objects.create(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else None,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )


def _get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')
