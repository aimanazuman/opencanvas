"""Who may download a stored file."""
import json

from apps.boards.access import can_view_board, get_board_access


def file_embedded_in_board(file_obj, board):
    """True when the board content references this file's (random) stored name AND the file was put there by someone
    who is allowed to edit the board. The second condition stops a user from copying a file name into their own board
    to gain access to somebody else's file."""
    name = file_obj.file.name if file_obj.file else ''
    if not name:
        return False
    uploader_level = None
    if board.owner_id == file_obj.uploaded_by_id:
        uploader_level = 'owner'
    else:
        uploader_level = get_board_access(file_obj.uploaded_by, board)
    if uploader_level not in ('owner', 'instructor', 'edit'):
        return False
    try:
        text = json.dumps(board.content)
    except (TypeError, ValueError):
        return False
    return name in text


def can_access_file(user, file_obj, board=None):
    """Uploader, administrator, anyone who can view the board the file is attached to, or anyone who can view a
    board (passed in `board`) that embeds the file."""
    if not user or not user.is_active:
        return False
    if file_obj.is_deleted:
        return False
    if user.role == 'admin' or file_obj.uploaded_by_id == user.id:
        return True
    if file_obj.board_id and can_view_board(user, file_obj.board):
        return True
    if board is not None and can_view_board(user, board) and file_embedded_in_board(file_obj, board):
        return True
    return False
