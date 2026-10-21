"""Operator provisioning: seed_dev_users (local demo accounts) and create_admin (the first real admin)."""
import io
import os
import tempfile
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.provisioning import email_taken_by_other_account, production_markers
from apps.testutils import PASSWORD, make_user

User = get_user_model()

ADMIN_PASSWORD = 'DemoAdmin-Pass-2719!'
LECTURER_PASSWORD = 'DemoLecturer-Pass-4826!'
STUDENT_PASSWORD = 'DemoStudent-Pass-9053!'

DEMO_ENV = {
    'DEV_SEED_ADMIN_USERNAME': 'dev_admin',
    'DEV_SEED_ADMIN_EMAIL': 'dev-admin@example.test',
    'DEV_SEED_ADMIN_PASSWORD': ADMIN_PASSWORD,
    'DEV_SEED_LECTURER_USERNAME': 'dev_lecturer',
    'DEV_SEED_LECTURER_EMAIL': 'dev-lecturer@example.test',
    'DEV_SEED_LECTURER_PASSWORD': LECTURER_PASSWORD,
    'DEV_SEED_STUDENT_USERNAME': 'dev_student',
    'DEV_SEED_STUDENT_EMAIL': 'dev-student@example.test',
    'DEV_SEED_STUDENT_PASSWORD': STUDENT_PASSWORD,
}
EMPTY_ENV = {name: '' for name in DEMO_ENV}
ALL_SECRETS = (ADMIN_PASSWORD, LECTURER_PASSWORD, STUDENT_PASSWORD)


# Django's test runner forces DEBUG off, so the development tests switch it on explicitly (a dev run has DEBUG on).
@override_settings(DEBUG=True)
class SeedDevUsersTests(TestCase):
    """Local demo accounts come from the environment, never from manual commands, and never in production."""

    def run_seed(self, env):
        out, err = io.StringIO(), io.StringIO()
        with mock.patch.dict(os.environ, env):
            call_command('seed_dev_users', stdout=out, stderr=err)
        return out.getvalue() + err.getvalue()

    def test_creates_three_users_with_the_right_roles(self):
        output = self.run_seed(DEMO_ENV)

        admin = User.objects.get(username='dev_admin')
        self.assertEqual(admin.role, 'admin')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.check_password(ADMIN_PASSWORD))

        lecturer = User.objects.get(username='dev_lecturer')
        self.assertEqual(lecturer.role, 'lecturer')
        self.assertFalse(lecturer.is_staff)
        self.assertFalse(lecturer.is_superuser)
        self.assertTrue(lecturer.check_password(LECTURER_PASSWORD))

        student = User.objects.get(username='dev_student')
        self.assertEqual(student.role, 'student')
        self.assertFalse(student.is_staff)
        self.assertFalse(student.is_superuser)
        self.assertTrue(student.check_password(STUDENT_PASSWORD))

        for user in (admin, lecturer, student):
            self.assertTrue(user.email_verified)
            self.assertTrue(user.is_active)
        self.assertEqual(admin.email, 'dev-admin@example.test')
        self.assertIn('admin: account', output)

    def test_rerun_is_idempotent_and_fixes_drift(self):
        self.run_seed(DEMO_ENV)
        # Drift: the student was promoted by hand and lost its verification.
        User.objects.filter(username='dev_student').update(role='admin', is_superuser=True, email_verified=False)

        output = self.run_seed(DEMO_ENV)

        self.assertEqual(User.objects.filter(username__in=['dev_admin', 'dev_lecturer', 'dev_student']).count(), 3)
        student = User.objects.get(username='dev_student')
        self.assertEqual(student.role, 'student')
        self.assertFalse(student.is_superuser)
        self.assertTrue(student.email_verified)
        self.assertTrue(student.check_password(STUDENT_PASSWORD))
        self.assertIn("'dev_admin' updated", output)

    def test_no_op_when_variables_are_empty(self):
        before = User.objects.count()
        output = self.run_seed(EMPTY_ENV)
        self.assertEqual(User.objects.count(), before)
        self.assertIn('no demo accounts were created', output)

    def test_no_op_when_variables_are_not_set_at_all(self):
        before = User.objects.count()
        with mock.patch.dict(os.environ, {}, clear=False):
            for name in DEMO_ENV:
                os.environ.pop(name, None)
            call_command('seed_dev_users', stdout=io.StringIO())
        self.assertEqual(User.objects.count(), before)

    def test_refuses_when_debug_is_off_and_creates_nothing(self):
        before = User.objects.count()
        with override_settings(DEBUG=False), mock.patch.dict(os.environ, DEMO_ENV):
            with self.assertRaises(CommandError) as raised:
                call_command('seed_dev_users', stdout=io.StringIO())
        self.assertIn('DEBUG is off', str(raised.exception))
        self.assertEqual(User.objects.count(), before)

    def test_refuses_when_a_production_setting_is_present(self):
        before = User.objects.count()
        for extra in ({'DB_PASSWORD_FILE': '/run/secrets/db_app_password'},
                      {'SECRET_KEY_FILE': '/run/secrets/django_secret_key'},
                      {'OC_ENVIRONMENT': 'production'}):
            with self.subTest(extra=list(extra)), mock.patch.dict(os.environ, dict(DEMO_ENV, **extra)):
                with self.assertRaises(CommandError):
                    call_command('seed_dev_users', stdout=io.StringIO())
        self.assertEqual(User.objects.count(), before)

    def test_production_markers_are_empty_in_development(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            for name in ('DB_PASSWORD_FILE', 'SECRET_KEY_FILE', 'JWT_SIGNING_KEY_FILE', 'EMAIL_HOST_PASSWORD_FILE',
                         'OC_ENVIRONMENT'):
                os.environ.pop(name, None)
            self.assertEqual(production_markers(), [])

    def test_partial_role_is_refused_and_nothing_is_created(self):
        env = dict(DEMO_ENV, DEV_SEED_LECTURER_EMAIL='', DEV_SEED_LECTURER_PASSWORD='')
        before = User.objects.count()
        with self.assertRaises(CommandError) as raised:
            self.run_seed(env)
        self.assertIn('DEV_SEED_LECTURER_EMAIL', str(raised.exception))
        self.assertEqual(User.objects.count(), before)

    def test_weak_password_is_refused_before_any_write(self):
        env = dict(DEMO_ENV, DEV_SEED_STUDENT_PASSWORD='12345678')
        before = User.objects.count()
        with self.assertRaises(CommandError) as raised:
            self.run_seed(env)
        self.assertIn('not accepted', str(raised.exception))
        self.assertNotIn('12345678', str(raised.exception))
        self.assertEqual(User.objects.count(), before)

    def test_refuses_an_email_that_another_account_already_uses_and_creates_nothing(self):
        make_user('someone', email='DEV-ADMIN@example.test')
        before = User.objects.count()
        with self.assertRaises(CommandError) as raised:
            self.run_seed(DEMO_ENV)
        self.assertIn('already used by another account', str(raised.exception))
        self.assertIn('DEV_SEED_ADMIN_EMAIL', str(raised.exception))
        self.assertEqual(User.objects.count(), before)
        self.assertFalse(User.objects.filter(username__in=['dev_admin', 'dev_lecturer', 'dev_student']).exists())

    def test_two_demo_accounts_sharing_an_email_are_refused_and_nothing_is_created(self):
        env = dict(DEMO_ENV, DEV_SEED_STUDENT_EMAIL='DEV-LECTURER@example.test')
        before = User.objects.count()
        with self.assertRaises(CommandError) as raised:
            self.run_seed(env)
        self.assertIn('same email address', str(raised.exception))
        self.assertEqual(User.objects.count(), before)

    def test_rerun_keeps_the_demo_account_own_email_without_a_conflict(self):
        self.run_seed(DEMO_ENV)
        output = self.run_seed(DEMO_ENV)
        self.assertIn("'dev_admin' updated", output)
        self.assertEqual(User.objects.filter(email__iexact='dev-admin@example.test').count(), 1)

    def test_output_and_errors_never_contain_a_password(self):
        output = self.run_seed(DEMO_ENV)
        for secret in ALL_SECRETS:
            self.assertNotIn(secret, output)


class EmailTakenByOtherAccountTests(TestCase):
    """The shared duplicate-email rule used by create_admin and seed_dev_users."""

    def test_free_email_is_not_taken(self):
        self.assertFalse(email_taken_by_other_account(User, 'free@example.test', 'newcomer'))

    def test_the_account_keeping_its_own_email_is_not_a_conflict(self):
        make_user('owner', email='owner@example.test')
        self.assertFalse(email_taken_by_other_account(User, 'owner@example.test', 'owner'))

    def test_another_account_with_the_email_is_a_conflict_in_any_case(self):
        make_user('owner', email='owner@example.test')
        self.assertTrue(email_taken_by_other_account(User, 'OWNER@Example.test', 'someone_else'))


class CreateAdminTests(TestCase):
    """The first real admin: password from a file or a hidden prompt, idempotent, never printed."""

    NEW_PASSWORD = 'Fresh-Admin-Pass-8421!'

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)

    def password_file(self, content=NEW_PASSWORD + '\n', name='admin_password.txt'):
        path = os.path.join(self._tmp.name, name)
        with open(path, 'w', encoding='utf-8') as handle:
            handle.write(content)
        return path

    def run_admin(self, *args):
        out, err = io.StringIO(), io.StringIO()
        call_command('create_admin', *args, stdout=out, stderr=err)
        return out.getvalue() + err.getvalue()

    def test_creates_admin_from_password_file(self):
        output = self.run_admin('--email', 'owner@example.test', '--password-file', self.password_file())

        admin = User.objects.get(username='oc_admin')
        self.assertEqual(admin.role, 'admin')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.email_verified)
        self.assertEqual(admin.email, 'owner@example.test')
        self.assertTrue(admin.check_password(self.NEW_PASSWORD))
        self.assertNotIn(self.NEW_PASSWORD, output)

    def test_second_run_is_idempotent_and_needs_no_password(self):
        self.run_admin('--email', 'owner@example.test', '--password-file', self.password_file())
        before = User.objects.count()

        # No password file and no terminal: a second run must not ask for a password at all.
        with mock.patch('sys.stdin', io.StringIO('')):
            output = self.run_admin('--email', 'owner@example.test')

        self.assertEqual(User.objects.count(), before)
        self.assertIn('Nothing was changed', output)
        self.assertTrue(User.objects.get(username='oc_admin').check_password(self.NEW_PASSWORD))

    def test_hidden_prompt_must_be_typed_twice_identically(self):
        with mock.patch('sys.stdin') as stdin, mock.patch('getpass.getpass',
                                                           side_effect=[self.NEW_PASSWORD, 'Different-Pass-0000!']):
            stdin.isatty.return_value = True
            with self.assertRaises(CommandError) as raised:
                self.run_admin('--email', 'owner@example.test')
        self.assertIn('do not match', str(raised.exception))
        self.assertFalse(User.objects.filter(username='oc_admin').exists())

    def test_hidden_prompt_creates_the_admin(self):
        with mock.patch('sys.stdin') as stdin, mock.patch('getpass.getpass',
                                                           side_effect=[self.NEW_PASSWORD, self.NEW_PASSWORD]):
            stdin.isatty.return_value = True
            output = self.run_admin('--email', 'owner@example.test')
        self.assertTrue(User.objects.get(username='oc_admin').check_password(self.NEW_PASSWORD))
        self.assertNotIn(self.NEW_PASSWORD, output)

    def test_without_terminal_or_file_nothing_is_created(self):
        with mock.patch('sys.stdin', io.StringIO('')):
            with self.assertRaises(CommandError) as raised:
                self.run_admin('--email', 'owner@example.test')
        self.assertIn('No terminal', str(raised.exception))
        self.assertFalse(User.objects.filter(username='oc_admin').exists())

    def test_weak_password_is_refused(self):
        with self.assertRaises(CommandError) as raised:
            self.run_admin('--email', 'owner@example.test', '--password-file', self.password_file('12345678\n'))
        self.assertIn('not accepted', str(raised.exception))
        self.assertFalse(User.objects.filter(username='oc_admin').exists())

    def test_empty_or_missing_password_file_is_refused(self):
        with self.assertRaises(CommandError):
            self.run_admin('--email', 'owner@example.test', '--password-file', self.password_file('\n'))
        with self.assertRaises(CommandError):
            self.run_admin('--email', 'owner@example.test', '--password-file',
                           os.path.join(self._tmp.name, 'missing.txt'))
        self.assertFalse(User.objects.filter(username='oc_admin').exists())

    def test_existing_lecturer_is_promoted_only_with_a_new_password(self):
        teacher = make_user('teach', role='lecturer', email='teach@example.test')

        # Without a password source nothing may change, so the lecturer keeps the old role.
        with mock.patch('sys.stdin', io.StringIO('')):
            with self.assertRaises(CommandError):
                self.run_admin('--email', 'teach@example.test', '--username', 'teach')
        teacher.refresh_from_db()
        self.assertEqual(teacher.role, 'lecturer')

        self.run_admin('--email', 'teach@example.test', '--username', 'teach',
                       '--password-file', self.password_file())
        teacher.refresh_from_db()
        self.assertEqual(teacher.role, 'admin')
        self.assertTrue(teacher.is_staff)
        self.assertTrue(teacher.is_superuser)
        self.assertTrue(teacher.email_verified)
        self.assertTrue(teacher.check_password(self.NEW_PASSWORD))
        self.assertFalse(teacher.check_password(PASSWORD))

    def test_reset_password_revokes_existing_sign_ins(self):
        admin = make_user('oc_admin', role='admin', email='owner@example.test')
        RefreshToken.for_user(admin)
        self.assertFalse(BlacklistedToken.objects.filter(token__user=admin).exists())

        self.run_admin('--email', 'owner@example.test', '--reset-password', '--password-file', self.password_file())

        admin.refresh_from_db()
        self.assertTrue(admin.check_password(self.NEW_PASSWORD))
        self.assertTrue(BlacklistedToken.objects.filter(token__user=admin).exists())

    def test_rerun_on_existing_admin_keeps_password_and_sessions(self):
        admin = make_user('oc_admin', role='admin', email='owner@example.test', is_staff=True, is_superuser=True)
        RefreshToken.for_user(admin)

        output = self.run_admin('--email', 'owner@example.test')

        admin.refresh_from_db()
        self.assertTrue(admin.check_password(PASSWORD))
        self.assertFalse(BlacklistedToken.objects.filter(token__user=admin).exists())
        self.assertIn('Nothing was changed', output)

    def test_email_used_by_another_account_is_refused(self):
        make_user('someone', email='owner@example.test')
        with self.assertRaises(CommandError) as raised:
            self.run_admin('--email', 'owner@example.test', '--password-file', self.password_file())
        self.assertIn('already uses this email', str(raised.exception))
        self.assertFalse(User.objects.filter(username='oc_admin').exists())

    def test_invalid_email_and_username_are_refused(self):
        with self.assertRaises(CommandError):
            self.run_admin('--email', 'not-an-email', '--password-file', self.password_file())
        with self.assertRaises(CommandError):
            self.run_admin('--email', 'owner@example.test', '--username', 'bad name!',
                           '--password-file', self.password_file())
