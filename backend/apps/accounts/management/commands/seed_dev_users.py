import os

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import transaction

from apps.accounts.provisioning import (
    email_taken_by_other_account, production_markers, upsert_dev_user, validate_new_password,
)

# Environment variables read by this command, one set per demo role (see .env.dev.example). Empty means "skip".
DEMO_ROLES = ('admin', 'lecturer', 'student')
FIELDS = ('username', 'email', 'password')


def _variable_name(role, field):
    return f'DEV_SEED_{role.upper()}_{field.upper()}'


class Command(BaseCommand):
    help = (
        'Create or update the local demo accounts named in DEV_SEED_ADMIN_*, DEV_SEED_LECTURER_* and DEV_SEED_STUDENT_* '
        '(username, email, password each). Idempotent. Does nothing when the variables are empty. Refuses to run unless '
        'DEBUG is on and no production setting is present. Development only: never run it in production.'
    )

    def handle(self, *args, **options):
        markers = production_markers()
        if markers:
            raise CommandError(
                'Refusing to create demo accounts: ' + '; '.join(markers) + '. seed_dev_users is for local development only.'
            )

        User = get_user_model()
        plans = []
        for role in DEMO_ROLES:
            values = {field: os.environ.get(_variable_name(role, field), '') for field in FIELDS}
            values['username'] = values['username'].strip()
            values['email'] = values['email'].strip()
            filled = [field for field in FIELDS if values[field]]
            if not filled:
                continue
            if len(filled) < len(FIELDS):
                missing = [_variable_name(role, field) for field in FIELDS if not values[field]]
                raise CommandError(
                    f'The {role} demo account is incomplete. Set all three of its variables or none. '
                    f'Missing: {", ".join(missing)}. Nothing was created.'
                )
            try:
                validate_email(values['email'])
            except ValidationError:
                raise CommandError(f'{_variable_name(role, "email")} is not a valid email address. Nothing was created.')
            username_field = User._meta.get_field('username')
            try:
                username_field.run_validators(values['username'])
            except ValidationError as error:
                raise CommandError(
                    f'{_variable_name(role, "username")} is not a valid username: {" ".join(error.messages)} '
                    'Nothing was created.'
                )
            validate_new_password(values['password'], User(username=values['username'], email=values['email']))
            # The same check create_admin makes: no second account may use this email, checked before any write.
            if email_taken_by_other_account(User, values['email'], values['username']):
                raise CommandError(
                    f'{_variable_name(role, "email")} is already used by another account. Nothing was created.'
                )
            plans.append((role, values))

        if not plans:
            self.stdout.write('No DEV_SEED_* demo account variables are set, so no demo accounts were created.')
            return

        usernames = [values['username'] for _, values in plans]
        if len(set(usernames)) != len(usernames):
            raise CommandError('Two demo accounts use the same username. Nothing was created.')
        emails = [values['email'].lower() for _, values in plans]
        if len(set(emails)) != len(emails):
            raise CommandError('Two demo accounts use the same email address. Nothing was created.')

        with transaction.atomic():
            for role, values in plans:
                created = upsert_dev_user(User, role, values['username'], values['email'], values['password'])
                self.stdout.write(
                    f"{role}: account '{values['username']}' {'created' if created else 'updated'} "
                    '(role set, email marked verified).'
                )
