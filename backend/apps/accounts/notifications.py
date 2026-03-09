from .models import Notification


def notify_board_shared(board, shared_with, shared_by):
    Notification.objects.create(
        user=shared_with,
        type='board_shared',
        title='Board Shared',
        message=f'{shared_by.username} shared "{board.name}" with you',
        related_board=board,
        related_user=shared_by,
    )


def notify_course_enrolled(enrollment):
    Notification.objects.create(
        user=enrollment.student,
        type='course_enrolled',
        title='Course Enrolled',
        message=f'You have been enrolled in "{enrollment.course.name}"',
    )


def notify_invite_accepted(board, user):
    Notification.objects.create(
        user=board.owner,
        type='invite_accepted',
        title='Invite Accepted',
        message=f'{user.username} joined your board "{board.name}"',
        related_board=board,
        related_user=user,
    )


