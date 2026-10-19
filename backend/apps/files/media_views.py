"""The only way user uploads leave the server: /media/f/<signed token>/.

The token is signed and expires (MEDIA_SIGNING_MAX_AGE). It names the object and the user it was issued to, and
access is checked again on every request. Responses carry headers that stop a browser from ever running an upload
as a web page, even if a hostile file got through validation.
"""
import os

from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404
from django.views.decorators.http import require_http_methods

from apps.boards.access import can_view_board
from apps.boards.models import Board
from apps.accounts.models import Institution
from .access import can_access_file
from .models import File
from .security import (
    KIND_FILE, KIND_FILE_THUMB, KIND_AVATAR, KIND_BOARD_THUMB, KIND_LOGO,
    read_media_token, mime_for_name, is_inline_safe, safe_display_name,
)

User = get_user_model()


def _resolve(data):
    """Return (FieldFile, download name) for an authorised token payload, or raise Http404."""
    kind = data.get('k')
    object_id = data.get('i')
    viewer = None
    if data.get('u') is not None:
        viewer = User.objects.filter(pk=data['u'], is_active=True).first()

    if kind in (KIND_FILE, KIND_FILE_THUMB):
        file_obj = File.objects.select_related('board', 'uploaded_by').filter(pk=object_id, is_deleted=False).first()
        if file_obj is None or viewer is None:
            raise Http404
        board = None
        if data.get('b') is not None:
            board = Board.objects.select_related('owner', 'course').filter(pk=data['b']).first()
        if not can_access_file(viewer, file_obj, board):
            raise Http404
        field = file_obj.file if kind == KIND_FILE else file_obj.thumbnail
        return field, safe_display_name(file_obj.name if kind == KIND_FILE else os.path.basename(field.name or ''))

    if kind == KIND_AVATAR:
        user = User.objects.filter(pk=object_id, is_active=True).first()
        if user is None or not user.avatar:
            raise Http404
        return user.avatar, 'avatar'

    if kind == KIND_BOARD_THUMB:
        board = Board.objects.select_related('owner', 'course').filter(pk=object_id).first()
        if board is None or not board.thumbnail or viewer is None or not can_view_board(viewer, board):
            raise Http404
        return board.thumbnail, 'thumbnail'

    if kind == KIND_LOGO:
        inst = Institution.objects.filter(pk=object_id, is_active=True).first()
        if inst is None or not inst.logo:
            raise Http404
        return inst.logo, 'logo'

    raise Http404


@require_http_methods(['GET', 'HEAD'])
def serve_signed_media(request, token):
    data = read_media_token(token)
    if data is None:
        raise Http404

    field, download_name = _resolve(data)
    if not field or not field.name:
        raise Http404
    try:
        handle = field.storage.open(field.name, 'rb')
    except (FileNotFoundError, OSError):
        raise Http404

    stored_name = field.name
    inline = is_inline_safe(stored_name)
    response = FileResponse(
        handle,
        as_attachment=not inline,
        filename=download_name,
        content_type=mime_for_name(stored_name),
    )
    # Defence in depth: never sniff, never run anything, never leak the URL.
    response['X-Content-Type-Options'] = 'nosniff'
    response['Content-Security-Policy'] = "default-src 'none'; sandbox"
    response['Referrer-Policy'] = 'no-referrer'
    response['Cache-Control'] = 'private, max-age=300'
    return response
