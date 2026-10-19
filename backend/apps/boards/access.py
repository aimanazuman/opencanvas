"""One place that decides what a user may do with a board.

Levels, strongest first: owner, instructor (instructor of the board's course), edit, comment, view.
Enrolled students of the board's course get view. None means no access.
"""
LEVEL_RANK = {'view': 1, 'comment': 2, 'edit': 3, 'instructor': 4, 'owner': 5}


def get_board_access(user, board):
    if not user or not user.is_authenticated:
        return None
    if board.owner_id == user.id:
        return 'owner'

    from .models import BoardShare
    share_level = None
    share = BoardShare.objects.filter(board=board, user=user).values_list('permission', flat=True).first()
    if share:
        share_level = share

    course_level = None
    if board.course_id:
        course = board.course
        if course.instructor_id == user.id:
            course_level = 'instructor'
        else:
            from apps.courses.models import Enrollment
            if Enrollment.objects.filter(student=user, course=course, status='active').exists():
                course_level = 'view'

    levels = [lvl for lvl in (share_level, course_level) if lvl]
    if not levels:
        return None
    return max(levels, key=lambda lvl: LEVEL_RANK[lvl])


def can_view_board(user, board):
    return get_board_access(user, board) is not None


def can_edit_board(user, board):
    return get_board_access(user, board) in ('owner', 'instructor', 'edit')


def sees_all_quiz_responses(level, user=None):
    """Who may see every student's quiz response."""
    return level in ('owner', 'instructor', 'edit') or bool(user and getattr(user, 'role', None) == 'admin')


def content_for_user(board, user, level=None):
    """Board content as the given user may see it. For quizzes, readers below edit level only get their own response."""
    content = board.content
    if board.board_type != 'quiz' or not isinstance(content, dict) or 'responses' not in content:
        return content
    if level is None:
        level = get_board_access(user, board)
    if sees_all_quiz_responses(level, user):
        return content
    responses = content.get('responses')
    own = {}
    if isinstance(responses, dict) and user and user.is_authenticated:
        key = str(user.id)
        if key in responses:
            own[key] = responses[key]
    stripped = dict(content)
    stripped['responses'] = own
    return stripped
