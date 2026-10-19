"""Client IP and user agent helpers.

The real client address is decided here and nowhere else (audit log, throttling, login lockout).

Rules, in order:
1. TRUST_CLOUDFLARE_HEADER=True and a valid CF-Connecting-IP header: use it. Only turn this on when the app can be
   reached ONLY through Cloudflare (the proxy in front must drop the header on every other path).
2. TRUSTED_PROXY_COUNT > 0: the right-most untrusted entry of X-Forwarded-For (the entry added by the first trusted
   proxy). With TRUSTED_PROXY_COUNT=1 that is the last entry, with 2 it is the second from the right, and so on.
3. Otherwise REMOTE_ADDR.
Every candidate is validated with ipaddress.ip_address(); an invalid value is ignored.
"""
import ipaddress

from django.conf import settings

USER_AGENT_MAX_LENGTH = 255


def _valid_ip(value):
    if not value:
        return None
    value = value.strip()
    if not value or len(value) > 64:
        return None
    candidates = [value]
    # "1.2.3.4:5678" (IPv4 with a port) and "[::1]:80" (IPv6 with a port)
    if value.startswith('[') and ']' in value:
        candidates.append(value[1:value.index(']')])
    elif value.count(':') == 1:
        candidates.append(value.split(':', 1)[0])
    for candidate in candidates:
        try:
            return str(ipaddress.ip_address(candidate))
        except ValueError:
            continue
    return None


def get_client_ip(request):
    """Return the client IP as a string, or None when nothing valid is available."""
    meta = request.META

    if getattr(settings, 'TRUST_CLOUDFLARE_HEADER', False):
        ip = _valid_ip(meta.get('HTTP_CF_CONNECTING_IP'))
        if ip:
            return ip

    proxies = int(getattr(settings, 'TRUSTED_PROXY_COUNT', 0) or 0)
    if proxies > 0:
        forwarded = meta.get('HTTP_X_FORWARDED_FOR', '')
        parts = [p.strip() for p in forwarded.split(',') if p.strip()]
        if parts:
            ip = _valid_ip(parts[-min(proxies, len(parts))])
            if ip:
                return ip

    return _valid_ip(meta.get('REMOTE_ADDR'))


def get_user_agent(request):
    return (request.META.get('HTTP_USER_AGENT', '') or '')[:USER_AGENT_MAX_LENGTH]
