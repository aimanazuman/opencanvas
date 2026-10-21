"""Operator account provisioning, shared by the management commands create_admin and seed_dev_users.

The rules live here so that the commands stay thin and the tests exercise the same code.

Passwords are never read from the environment, with one exception: the DEV_SEED_* variables that the dev-only
seed_dev_users command reads (its own help text says so). create_admin takes its password from a file or a hidden
prompt. Nothing in this module prints or logs a password.
"""
import getpass
import os
import sys

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import CommandError

# Variables that only the production deployment sets (docker-compose.prod.yml reads every one of them from a secret file).
# Their presence means "this is production", whatever DEBUG says.
PRODUCTION_FILE_VARIABLES = ('DB_PASSWORD_FILE', 'SECRET_KEY_FILE', 'JWT_SIGNING_KEY_FILE', 'EMAIL_HOST_PASSWORD_FILE')
PRODUCTION_ENVIRONMENT_VALUES = ('production', 'prod')

PASSWORD_PROMPT = 'Password for the admin account (typed hidden, not shown): '
PASSWORD_REPEAT_PROMPT = 'Type the same password again: '


def production_markers():
    """Return the reasons this process must be treated as production. An empty list means local development."""
    markers = []
    if not settings.DEBUG:
        markers.append('DEBUG is off')
    for name in PRODUCTION_FILE_VARIABLES:
        if os.environ.get(name, '').strip():
            markers.append(f'{name} is set')
    if os.environ.get('OC_ENVIRONMENT', '').strip().lower() in PRODUCTION_ENVIRONMENT_VALUES:
        markers.append('OC_ENVIRONMENT says production')
    return markers


def apply_role(user, role):
    """Set the application role and the Django staff and superuser flags that belong to it (admin only)."""
    is_admin = role == 'admin'
    user.role = role
    user.is_staff = is_admin
    user.is_superuser = is_admin


def email_taken_by_other_account(model, email, username):
    """True when an account other than `username` already uses this email (case-insensitive).

    Both create_admin and seed_dev_users check this before they write anything, so one email never ends up on two
    accounts through provisioning.
    """
    return model.objects.filter(email__iexact=email).exclude(username=username).exists()


def validate_new_password(password, user):
    """Run the project's AUTH_PASSWORD_VALIDATORS. Django's messages never contain the password itself."""
    try:
        validate_password(password, user=user)
    except ValidationError as error:
        raise CommandError('The password is not accepted: ' + ' '.join(error.messages))


def read_password(password_file=''):
    """Return a password from a file (for example a Docker secret) or from a hidden prompt typed twice.

    The password is never taken from argv or from an environment variable, and it is never printed.
    """
    if password_file:
        if not os.path.isfile(password_file):
            raise CommandError(f'The password file {password_file} does not exist or is not a regular file.')
        with open(password_file, encoding='utf-8') as handle:
            password = handle.read().rstrip('\r\n')
        if not password:
            raise CommandError('The password file is empty.')
        return password
    if not sys.stdin.isatty():
        raise CommandError(
            'No terminal to type the password in. Run the command with a terminal (docker compose run without -T), '
            'or give --password-file.'
        )
    first = getpass.getpass(PASSWORD_PROMPT)
    second = getpass.getpass(PASSWORD_REPEAT_PROMPT)
    if first != second:
        raise CommandError('The two passwords do not match. Nothing was changed.')
    return first


def upsert_dev_user(model, role, username, email, password):
    """Create or update one local demo account. Returns True when it was created.

    Idempotent: a second run with the same values changes nothing. The password is only written when it differs.
    """
    user = model.objects.filter(username=username).first()
    created = user is None
    if created:
        user = model(username=username)
    user.email = email
    apply_role(user, role)
    user.email_verified = True
    user.is_active = True
    if created or not user.check_password(password):
        user.set_password(password)
    user.save()
    return created
