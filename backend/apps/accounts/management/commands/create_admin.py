from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import transaction

from apps.accounts.provisioning import apply_role, email_taken_by_other_account, read_password, validate_new_password
from apps.accounts.security import blacklist_user_tokens


class Command(BaseCommand):
    help = (
        'Create the first ADMIN account (or promote an existing account to ADMIN). The email is marked verified. '
        'The password comes from --password-file (for example a Docker secret) or from a hidden prompt typed twice; '
        'it is never taken from argv or the environment and never printed. Idempotent: running it again on an existing '
        'admin changes nothing unless --reset-password is given. Run it once the backend has started and migrated.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--email', required=True, help='Email address of the admin (marked verified).')
        parser.add_argument('--username', default='oc_admin', help='Username of the admin (default: oc_admin).')
        parser.add_argument(
            '--password-file', default='',
            help='Read the password from this file instead of the hidden prompt. The file must hold only the password.',
        )
        parser.add_argument(
            '--reset-password', action='store_true',
            help='Set a new password on an account that already exists. Its sign-ins are revoked. An existing account '
                 'that is not an admin always gets a new password when it is promoted.',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username'].strip()
        email = options['email'].strip()
        if not username:
            raise CommandError('The username is empty.')
        try:
            username_field = User._meta.get_field('username')
            username_field.run_validators(username)
        except ValidationError as error:
            raise CommandError('The username is not valid: ' + ' '.join(error.messages))
        try:
            validate_email(email)
        except ValidationError:
            raise CommandError('The email address is not valid.')

        existing = User.objects.filter(username=username).first()
        if email_taken_by_other_account(User, email, username):
            raise CommandError('Another account already uses this email address. Nothing was changed.')

        if existing is None:
            password = read_password(options['password_file'])
            user = User(username=username, email=email)
            validate_new_password(password, user)
            apply_role(user, 'admin')
            user.email_verified = True
            user.is_active = True
            user.set_password(password)
            user.save()
            self.stdout.write(f"OK: the admin account '{username}' was created and its email is marked verified.")
            return

        user = existing
        before = (user.role, user.is_staff, user.is_superuser, user.email_verified, user.is_active, user.email)
        apply_role(user, 'admin')
        user.email_verified = True
        user.is_active = True
        user.email = email
        needs_password = options['reset_password'] or before[0] != 'admin'

        with transaction.atomic():
            if needs_password:
                password = read_password(options['password_file'])
                validate_new_password(password, user)
                user.set_password(password)
                user.save()
                blacklist_user_tokens(user)
                self.stdout.write(
                    f"OK: the account '{username}' is an admin with a new password. Its existing sign-ins were revoked."
                )
                return

            after = (user.role, user.is_staff, user.is_superuser, user.email_verified, user.is_active, user.email)
            if before == after:
                self.stdout.write(f"OK: '{username}' is already an admin with a verified email. Nothing was changed.")
                return
            user.save()
            self.stdout.write(f"OK: the account '{username}' is an admin with a verified email. Its password is unchanged.")
