import logging
import os
import threading
from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import send_mail
from django.db import close_old_connections
from django.utils.html import escape

logger = logging.getLogger(__name__)


def get_frontend_url():
    """Get the frontend URL from environment or settings."""
    return (os.environ.get('FRONTEND_URL') or getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')).rstrip('/')


# --- helpers ----------------------------------------------------------------------------------------------------------
def _clean_header(value):
    """Subjects must be a single line (a newline would raise BadHeaderError or inject headers)."""
    return ' '.join(str(value).split())


def _display_name(user):
    return user.first_name or user.username


def _deliver(subject, plain_message, html_message, recipient):
    try:
        send_mail(
            subject=_clean_header(subject),
            message=plain_message,
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
    except Exception as exc:  # never break a request because of the mail server, but do not hide it either
        logger.error('Could not send email "%s": %s', _clean_header(subject)[:80], exc.__class__.__name__)
    finally:
        close_old_connections()


def _send(subject, plain_message, html_message, recipient):
    """Send in a background thread (EMAIL_ASYNC) so response time does not depend on the mail server."""
    if not recipient:
        return
    if getattr(settings, 'EMAIL_ASYNC', True):
        threading.Thread(
            target=_deliver, args=(subject, plain_message, html_message, recipient), daemon=True
        ).start()
    else:
        _deliver(subject, plain_message, html_message, recipient)


_FOOTER = """
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                This is an automated message from OpenCanvas. Do not reply to this email.
            </p>"""


def _page(title, inner):
    """Common HTML shell. `title` is a fixed string; `inner` is HTML whose dynamic values are already escaped."""
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">{escape(title)}</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            {inner}{_FOOTER}
        </div>
    </body>
    </html>
    """


def _button(url, label):
    return (
        f'<div style="text-align: center; margin: 30px 0;">'
        f'<a href="{escape(url)}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 32px; '
        f'border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">{escape(label)}</a></div>'
    )


def _link_fallback(url):
    return (
        '<p style="font-size: 12px; color: #9CA3AF;">Or copy this link into your browser:<br />'
        f'<a href="{escape(url)}" style="color: #4F46E5; word-break: break-all;">{escape(url)}</a></p>'
    )


def build_set_password_url(uid, token):
    return f"{get_frontend_url()}/forgot-password?{urlencode({'uid': uid, 'token': token})}"


# --- emails -----------------------------------------------------------------------------------------------------------
def send_verification_email(user):
    """Send an email verification link to a newly registered user."""
    verify_url = f"{get_frontend_url()}/verify-email?{urlencode({'token': user.email_verification_token or ''})}"
    name = _display_name(user)
    inner = (
        f'<p style="font-size: 16px; color: #374151;">Hi {escape(name)},</p>'
        '<p style="font-size: 14px; color: #6B7280;">Thanks for signing up for OpenCanvas! '
        'Please verify your email address by clicking the button below.</p>'
        + _button(verify_url, 'Verify Email Address')
        + '<p style="font-size: 13px; color: #6B7280;">If you didn\'t create an account on OpenCanvas, '
          'you can safely ignore this email.</p>'
        + _link_fallback(verify_url)
    )
    plain = (
        f"Hi {name},\n\n"
        f"Thanks for signing up! Please verify your email:\n{verify_url}\n\n"
        f"If you didn't create this account, ignore this email.\n"
    )
    _send("Verify Your Email - OpenCanvas", plain, _page('Verify Your Email', inner), user.email)


def send_welcome_email(user, set_password_url, course=None):
    """Welcome a newly created account. The email carries a one-time, time-limited link to choose a password.
    It never contains a password."""
    name = _display_name(user)
    course_html = ''
    course_plain = ''
    if course:
        course_html = f' and enrolled in {escape(course.code)} - {escape(course.name)}'
        course_plain = f' and enrolled in {course.code} - {course.name}'
    hours = int(getattr(settings, 'PASSWORD_RESET_TIMEOUT', 259200)) // 3600
    inner = (
        f'<p style="font-size: 16px; color: #374151;">Hi {escape(name)},</p>'
        f'<p style="font-size: 14px; color: #6B7280;">An OpenCanvas account has been created for you{course_html}. '
        f'Your username is <strong>{escape(user.username)}</strong>.</p>'
        '<p style="font-size: 14px; color: #6B7280;">Click the button below to choose your password. '
        f'The link works once and expires in {hours} hours.</p>'
        + _button(set_password_url, 'Set Your Password')
        + _link_fallback(set_password_url)
    )
    plain = (
        f"Welcome to OpenCanvas!\n\n"
        f"Hi {name},\n\n"
        f"An account has been created for you{course_plain}.\n"
        f"Username: {user.username}\n\n"
        f"Choose your password with this one-time link (valid for {hours} hours):\n{set_password_url}\n"
    )
    _send("Welcome to OpenCanvas", plain, _page('Welcome to OpenCanvas', inner), user.email)


def send_password_reset_email(user, uid, token):
    """Email a password reset link to the user."""
    reset_url = build_set_password_url(uid, token)
    name = _display_name(user)
    inner = (
        f'<p style="font-size: 16px; color: #374151;">Hi {escape(name)},</p>'
        '<p style="font-size: 14px; color: #6B7280;">We received a request to reset your OpenCanvas password. '
        'Click the button below to choose a new password.</p>'
        + _button(reset_url, 'Reset Password')
        + '<p style="font-size: 13px; color: #6B7280;">If you didn\'t request a password reset, you can safely '
          'ignore this email. Your password will not change.</p>'
        + _link_fallback(reset_url)
    )
    plain = (
        f"Hi {name},\n\n"
        f"We received a request to reset your OpenCanvas password.\n\n"
        f"Click the link below to reset your password:\n{reset_url}\n\n"
        f"If you didn't request this, you can safely ignore this email.\n"
    )
    _send("Reset Your Password - OpenCanvas", plain, _page('Password Reset', inner), user.email)


def send_board_shared_email(shared_with, board, shared_by):
    """Notify a user that a board was shared with them."""
    board_url = f"{get_frontend_url()}/workspace?{urlencode({'board': board.id})}"
    sharer_name = _display_name(shared_by)
    name = _display_name(shared_with)
    inner = (
        f'<p style="font-size: 16px; color: #374151;">Hi {escape(name)},</p>'
        f'<p style="font-size: 14px; color: #6B7280;"><strong>{escape(sharer_name)}</strong> has shared the board '
        f'<strong>"{escape(board.name)}"</strong> with you on OpenCanvas.</p>'
        + _button(board_url, 'Open Board')
    )
    plain = (
        f"Hi {name},\n\n"
        f"{sharer_name} has shared the board \"{board.name}\" with you on OpenCanvas.\n\n"
        f"Open it here: {board_url}\n"
    )
    _send(f"{sharer_name} shared a board with you - OpenCanvas", plain, _page('Board Shared With You', inner),
          shared_with.email)


def send_course_enrolled_email(user, course):
    """Notify a user they have been enrolled in a course."""
    courses_url = f"{get_frontend_url()}/courses"
    name = _display_name(user)
    inner = (
        f'<p style="font-size: 16px; color: #374151;">Hi {escape(name)},</p>'
        '<p style="font-size: 14px; color: #6B7280;">You have been successfully enrolled in the following course:</p>'
        '<div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">'
        f'<p style="margin: 5px 0; font-size: 14px;"><strong>Course Code:</strong> {escape(course.code)}</p>'
        f'<p style="margin: 5px 0; font-size: 14px;"><strong>Course Name:</strong> {escape(course.name)}</p>'
        '</div>'
        + _button(courses_url, 'View My Courses')
    )
    plain = (
        f"Hi {name},\n\n"
        f"You have been successfully enrolled in:\n"
        f"Course Code: {course.code}\n"
        f"Course Name: {course.name}\n\n"
        f"View your courses at: {courses_url}\n"
    )
    _send(f"Enrollment Confirmed: {course.code} - OpenCanvas", plain,
          _page('Course Enrollment Confirmed', inner), user.email)


def send_password_reset_confirmation_email(user):
    """Notify a user that their password was successfully changed or reset."""
    login_url = f"{get_frontend_url()}/login"
    name = _display_name(user)
    inner = (
        f'<p style="font-size: 16px; color: #374151;">Hi {escape(name)},</p>'
        '<p style="font-size: 14px; color: #6B7280;">Your OpenCanvas password has been successfully reset. '
        'You can now log in with your new password.</p>'
        + _button(login_url, 'Log In Now')
        + '<p style="font-size: 13px; color: #6B7280;">If you did not make this change, '
          'please contact support immediately.</p>'
    )
    plain = (
        f"Hi {name},\n\n"
        f"Your OpenCanvas password has been successfully reset.\n\n"
        f"Log in at: {login_url}\n\n"
        f"If you did not make this change, please contact support immediately.\n"
    )
    _send("Your Password Has Been Reset - OpenCanvas", plain, _page('Password Reset Successful', inner), user.email)
