from opencanvas.clientip import get_client_ip, get_user_agent
from .models import AuditLog


def log_action(user, action, resource_type, resource_id=None, details=None, request=None):
    """
    Create an audit log entry.

    Args:
        user: The user performing the action (None for anonymous events such as failed logins)
        action: One of 'create', 'read', 'update', 'delete', 'share', 'unshare', 'login', 'logout'
        resource_type: Type of resource (e.g., 'board', 'course', 'user', 'file')
        resource_id: ID of the resource (optional)
        details: Dict of additional details (optional)
        request: HTTP request object for IP/user-agent extraction (optional)
    """
    ip_address = None
    user_agent = ''

    if request is not None:
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)

    AuditLog.objects.create(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id)[:100] if resource_id is not None and resource_id != '' else None,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )


def _get_client_ip(request):
    """Kept for backwards compatibility with older imports."""
    return get_client_ip(request)
