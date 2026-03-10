import os
from django.core.mail import send_mail
from django.conf import settings


def get_frontend_url():
    """Get the frontend URL from environment or settings."""
    return os.environ.get('FRONTEND_URL', 'http://localhost:3000')


def send_verification_email(user):
    """Send an email verification link to a newly registered user."""
    frontend_url = get_frontend_url()
    verify_url = f"{frontend_url}/verify-email?token={user.email_verification_token}"
    subject = "Verify Your Email — OpenCanvas"
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Verify Your Email</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #374151;">Hi {user.first_name or user.username},</p>
            <p style="font-size: 14px; color: #6B7280;">
                Thanks for signing up for OpenCanvas! Please verify your email address by clicking the button below.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verify_url}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                    Verify Email Address
                </a>
            </div>
            <p style="font-size: 13px; color: #6B7280;">
                If you didn't create an account on OpenCanvas, you can safely ignore this email.
            </p>
            <p style="font-size: 12px; color: #9CA3AF;">
                Or copy this link into your browser:<br />
                <a href="{verify_url}" style="color: #4F46E5; word-break: break-all;">{verify_url}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                This is an automated message from OpenCanvas. Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    plain_message = (
        f"Hi {user.first_name or user.username},\n\n"
        f"Thanks for signing up! Please verify your email:\n{verify_url}\n\n"
        f"If you didn't create this account, ignore this email.\n"
    )

    send_mail(
        subject=subject,
        message=plain_message,
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_welcome_email(user, password, course=None):
    """Send a welcome email to a newly created student with their credentials."""
    course_info = f" and enrolled in {course.code} - {course.name}" if course else ""
    subject = f"Welcome to OpenCanvas"
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to OpenCanvas</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #374151;">Hi {user.first_name or user.username},</p>
            <p style="font-size: 14px; color: #6B7280;">
                Your account has been created on OpenCanvas{course_info}. Here are your login credentials:
            </p>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0; font-size: 14px;"><strong>Username:</strong> {user.username}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Password:</strong> {password}</p>
            </div>
            <p style="font-size: 14px; color: #6B7280;">
                Please log in and change your password as soon as possible.
            </p>
            <a href="{get_frontend_url()}/login" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
                Log In Now
            </a>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                This is an automated message from OpenCanvas. Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    plain_message = (
        f"Welcome to OpenCanvas!\n\n"
        f"Hi {user.first_name or user.username},\n\n"
        f"Your account has been created{course_info}.\n\n"
        f"Username: {user.username}\n"
        f"Password: {password}\n\n"
        f"Please log in at {get_frontend_url()}/login and change your password.\n"
    )

    send_mail(
        subject=subject,
        message=plain_message,
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_password_reset_email(user, uid, token):
    """Email a password reset link to the user."""
    reset_url = f"{get_frontend_url()}/forgot-password?uid={uid}&token={token}"
    subject = "Reset Your Password — OpenCanvas"
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #374151;">Hi {user.first_name or user.username},</p>
            <p style="font-size: 14px; color: #6B7280;">
                We received a request to reset your OpenCanvas password. Click the button below to choose a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                    Reset Password
                </a>
            </div>
            <p style="font-size: 13px; color: #6B7280;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not change.
            </p>
            <p style="font-size: 12px; color: #9CA3AF;">
                Or copy this link into your browser:<br />
                <a href="{reset_url}" style="color: #4F46E5; word-break: break-all;">{reset_url}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                This is an automated message from OpenCanvas. Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    plain_message = (
        f"Hi {user.first_name or user.username},\n\n"
        f"We received a request to reset your OpenCanvas password.\n\n"
        f"Click the link below to reset your password:\n{reset_url}\n\n"
        f"If you didn't request this, you can safely ignore this email.\n"
    )

    send_mail(
        subject=subject,
        message=plain_message,
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_board_shared_email(shared_with, board, shared_by):
    """Notify a user that a board was shared with them."""
    board_url = f"{get_frontend_url()}/workspace?board={board.id}"
    sharer_name = shared_by.first_name or shared_by.username
    subject = f"{sharer_name} shared a board with you — OpenCanvas"
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Board Shared With You</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #374151;">Hi {shared_with.first_name or shared_with.username},</p>
            <p style="font-size: 14px; color: #6B7280;">
                <strong>{sharer_name}</strong> has shared the board <strong>"{board.name}"</strong> with you on OpenCanvas.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{board_url}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                    Open Board
                </a>
            </div>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                This is an automated message from OpenCanvas. Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    plain_message = (
        f"Hi {shared_with.first_name or shared_with.username},\n\n"
        f"{sharer_name} has shared the board \"{board.name}\" with you on OpenCanvas.\n\n"
        f"Open it here: {board_url}\n"
    )

    send_mail(
        subject=subject,
        message=plain_message,
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[shared_with.email],
        fail_silently=True,
    )


def send_course_enrolled_email(user, course):
    """Notify a user they have been enrolled in a course."""
    courses_url = f"{get_frontend_url()}/courses"
    subject = f"Enrollment Confirmed: {course.code} — OpenCanvas"
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Course Enrollment Confirmed</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #374151;">Hi {user.first_name or user.username},</p>
            <p style="font-size: 14px; color: #6B7280;">
                You have been successfully enrolled in the following course:
            </p>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0; font-size: 14px;"><strong>Course Code:</strong> {course.code}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Course Name:</strong> {course.name}</p>
            </div>
            <a href="{courses_url}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
                View My Courses
            </a>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                This is an automated message from OpenCanvas. Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    plain_message = (
        f"Hi {user.first_name or user.username},\n\n"
        f"You have been successfully enrolled in:\n"
        f"Course Code: {course.code}\n"
        f"Course Name: {course.name}\n\n"
        f"View your courses at: {courses_url}\n"
    )

    send_mail(
        subject=subject,
        message=plain_message,
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


def send_password_reset_confirmation_email(user):
    """Notify a user that their password was successfully reset."""
    subject = "Your Password Has Been Reset — OpenCanvas"
    html_message = f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Successful</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #374151;">Hi {user.first_name or user.username},</p>
            <p style="font-size: 14px; color: #6B7280;">
                Your OpenCanvas password has been successfully reset. You can now log in with your new password.
            </p>
            <a href="{get_frontend_url()}/login" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
                Log In Now
            </a>
            <p style="font-size: 13px; color: #6B7280; margin-top: 20px;">
                If you did not make this change, please contact support immediately.
            </p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 25px 0;" />
            <p style="font-size: 12px; color: #9CA3AF; text-align: center;">
                This is an automated message from OpenCanvas. Do not reply to this email.
            </p>
        </div>
    </body>
    </html>
    """
    plain_message = (
        f"Hi {user.first_name or user.username},\n\n"
        f"Your OpenCanvas password has been successfully reset.\n\n"
        f"Log in at: {get_frontend_url()}/login\n\n"
        f"If you did not make this change, please contact support immediately.\n"
    )

    send_mail(
        subject=subject,
        message=plain_message,
        html_message=html_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )


