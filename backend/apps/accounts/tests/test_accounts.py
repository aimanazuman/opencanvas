"""OC-01, OC-02, OC-10, OC-16 (accounts part), OC-17, OC-18, OC-19 (accounts part)."""
import csv
import io
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken

from django.test import SimpleTestCase

from apps.accounts.models import AuditLog, Institution, SystemSettings
from apps.files.storage import GB, MAX_STORAGE_GB, quota_bytes_from_setting, storage_gb_setting, validate_storage_gb
from apps.testutils import BaseAPITestCase, PASSWORD, make_user, png_bytes

User = get_user_model()


class RegistrationRoleTests(BaseAPITestCase):
    """OC-01: nobody can register as lecturer or admin."""

    payload = {
        'username': 'newbie', 'email': 'newbie@example.test', 'first_name': 'New', 'last_name': 'Bie',
        'password': PASSWORD, 'password2': PASSWORD,
    }

    def test_attack_role_in_registration_is_ignored(self):
        for role in ('admin', 'lecturer'):
            body = dict(self.payload, role=role, username=f'evil_{role}', email=f'{role}@example.test')
            response = self.client.post('/api/accounts/register/', body, format='json')
            self.assertEqual(response.status_code, 201, response.content)
            self.assertEqual(User.objects.get(username=f'evil_{role}').role, 'student')
            self.assertFalse(User.objects.get(username=f'evil_{role}').is_staff)

    def test_register_verify_and_login_still_work(self):
        response = self.client.post('/api/accounts/register/', self.payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['requires_verification'])
        self.assertEqual(len(mail.outbox), 1)
        token = User.objects.get(username='newbie').email_verification_token
        self.assertIn(token, mail.outbox[0].body)
        # cannot sign in before verifying
        login = self.client.post('/api/accounts/login/', {'username': 'newbie', 'password': PASSWORD}, format='json')
        self.assertEqual(login.status_code, 403)
        verify = self.client.post('/api/accounts/verify-email/', {'token': token}, format='json')
        self.assertEqual(verify.status_code, 200)
        self.assertIn('access', verify.data['tokens'])
        login = self.client.post('/api/accounts/login/', {'username': 'newbie', 'password': PASSWORD}, format='json')
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data['user']['role'], 'student')

    def test_registration_can_be_switched_off(self):
        SystemSettings.set_setting('allowRegistration', 'false')
        response = self.client.post('/api/accounts/register/', self.payload, format='json')
        self.assertEqual(response.status_code, 403)

    def test_weak_password_is_refused(self):
        body = dict(self.payload, password='12345678', password2='12345678')
        response = self.client.post('/api/accounts/register/', body, format='json')
        self.assertEqual(response.status_code, 400)


class ProfileUpdateTests(BaseAPITestCase):
    """OC-02: a user can change their profile, never their privileges."""

    def setUp(self):
        super().setUp()
        self.user = make_user('student1')
        self.institution = Institution.objects.create(name='Uni', domain='uni.test', code='UNI')
        self.client = self.as_user(self.user)

    def test_attack_privileged_fields_cannot_be_written(self):
        quota = self.user.storage_quota
        for method in (self.client.patch, self.client.put):
            body = {
                'username': 'student1', 'role': 'admin', 'storage_quota': 10 ** 15, 'storage_used': 0,
                'institution': self.institution.id, 'is_staff': True, 'is_superuser': True, 'email_verified': False,
                'is_guest': True, 'is_active': True,
            }
            response = method('/api/accounts/profile/', body, format='json')
            self.assertEqual(response.status_code, 200, response.content)
            self.user.refresh_from_db()
            self.assertEqual(self.user.role, 'student')
            self.assertEqual(self.user.storage_quota, quota)
            self.assertIsNone(self.user.institution)
            self.assertFalse(self.user.is_staff)
            self.assertFalse(self.user.is_superuser)
            self.assertTrue(self.user.email_verified)
            self.assertFalse(self.user.is_guest)
            self.assertEqual(response.data['role'], 'student')

    def test_profile_fields_can_still_be_changed(self):
        response = self.client.patch('/api/accounts/profile/', {
            'first_name': 'Ada', 'bio': 'Hello there', 'preferences': {'theme': 'dark'},
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Ada')
        self.assertEqual(self.user.preferences, {'theme': 'dark'})
        self.assertEqual(self.client.get('/api/accounts/profile/').data['first_name'], 'Ada')

    def test_avatar_must_be_a_real_image(self):
        bad = SimpleUploadedFile('a.png', b'<html><script>alert(1)</script></html>', content_type='image/png')
        response = self.client.patch('/api/accounts/profile/', {'avatar': bad}, format='multipart')
        self.assertEqual(response.status_code, 400)
        good = SimpleUploadedFile('a.png', png_bytes(), content_type='image/png')
        response = self.client.patch('/api/accounts/profile/', {'avatar': good}, format='multipart')
        self.assertEqual(response.status_code, 200, response.content)
        self.user.refresh_from_db()
        self.assertRegex(self.user.avatar.name, r'^avatars/[0-9a-f]{32}\.png$')
        self.assertIn('/media/f/', response.data['avatar'])


class ReportPrivilegedUsersTests(BaseAPITestCase):
    def test_command_prints_privileged_users_and_changes_nothing(self):
        make_user('boss', role='admin')
        make_user('teach', role='lecturer')
        make_user('plain', role='student')
        before = list(User.objects.order_by('id').values_list('id', 'role', 'last_login', 'is_active'))
        out = io.StringIO()
        call_command('report_privileged_users', stdout=out)
        text = out.getvalue()
        self.assertIn('boss', text)
        self.assertIn('teach', text)
        self.assertNotIn('plain', text)
        self.assertEqual(before, list(User.objects.order_by('id').values_list('id', 'role', 'last_login', 'is_active')))


class AdminCreatedUserEmailTests(BaseAPITestCase):
    """OC-10: no plaintext password in mail, one-time link, escaped HTML, password rules."""

    def setUp(self):
        super().setUp()
        self.admin = make_user('admin1', role='admin')
        self.client = self.as_user(self.admin)

    def test_welcome_email_has_link_not_password(self):
        response = self.client.post('/api/accounts/users/create/', {
            'username': 'fresh', 'email': 'fresh@example.test', 'first_name': 'Fresh', 'role': 'student',
            'password': 'Admin-Chosen-Pw-77!',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        html = message.alternatives[0][0]
        self.assertNotIn('Admin-Chosen-Pw-77!', message.body)
        self.assertNotIn('Admin-Chosen-Pw-77!', html)
        self.assertIn('/forgot-password?uid=', message.body)
        user = User.objects.get(username='fresh')
        self.assertFalse(user.email_verified)

    def test_set_password_link_works_once_and_verifies_email(self):
        self.client.post('/api/accounts/users/create/', {
            'username': 'fresh', 'email': 'fresh@example.test', 'role': 'student', 'password': 'Admin-Chosen-Pw-77!',
        }, format='json')
        user = User.objects.get(username='fresh')
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        anon = self.client.__class__()
        body = {'uid': uid, 'token': token, 'new_password': 'My-Own-Pass-4455!', 'new_password2': 'My-Own-Pass-4455!'}
        first = anon.post('/api/accounts/password/reset/confirm/', body, format='json')
        self.assertEqual(first.status_code, 200, first.content)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)
        again = anon.post('/api/accounts/password/reset/confirm/', body, format='json')
        self.assertEqual(again.status_code, 400)  # the link is single use
        login = anon.post('/api/accounts/login/', {'username': 'fresh', 'password': 'My-Own-Pass-4455!'}, format='json')
        self.assertEqual(login.status_code, 200)

    def test_attack_weak_admin_set_password_is_refused(self):
        response = self.client.post('/api/accounts/users/create/', {
            'username': 'weak', 'email': 'weak@example.test', 'role': 'student', 'password': '12345678',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(username='weak').exists())

    def test_non_admin_cannot_create_users(self):
        response = self.as_user(make_user('s1')).post('/api/accounts/users/create/', {
            'username': 'x', 'email': 'x@example.test', 'role': 'admin', 'password': PASSWORD}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_html_in_names_is_escaped_in_emails(self):
        from apps.accounts.emails import send_course_enrolled_email
        from apps.courses.models import Course
        student = make_user('stud', first_name='<img src=x onerror=alert(1)>')
        teacher = make_user('teach', role='lecturer')
        course = Course.objects.create(name='Math <script>x</script>', code='M1', instructor=teacher)
        send_course_enrolled_email(student, course)
        html = mail.outbox[-1].alternatives[0][0]
        self.assertNotIn('<img src=x', html)
        self.assertNotIn('<script>x</script>', html)
        self.assertIn('&lt;script&gt;', html)

    def test_admin_cannot_demote_or_deactivate_self(self):
        response = self.client.patch(f'/api/accounts/users/{self.admin.id}/', {'role': 'student'}, format='json')
        self.assertEqual(response.status_code, 400)
        response = self.client.patch(f'/api/accounts/users/{self.admin.id}/', {'is_active': False}, format='json')
        self.assertEqual(response.status_code, 400)
        response = self.client.delete(f'/api/accounts/users/{self.admin.id}/')
        self.assertEqual(response.status_code, 403)


class TokenRevocationTests(BaseAPITestCase):
    """OC-16: changing or resetting a password revokes refresh tokens."""

    def test_password_change_blacklists_old_refresh_tokens_and_returns_new_ones(self):
        user = make_user('tokuser')
        stolen = RefreshToken.for_user(user)
        client = self.as_user(user)
        response = client.post('/api/accounts/change-password/', {
            'old_password': PASSWORD, 'new_password': 'Another-Pass-5566!', 'new_password2': 'Another-Pass-5566!'},
            format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn('refresh', response.data['tokens'])
        refresh = self.client.post('/api/token/refresh/', {'refresh': str(stolen)}, format='json')
        self.assertEqual(refresh.status_code, 401)
        fresh = self.client.post('/api/token/refresh/', {'refresh': response.data['tokens']['refresh']}, format='json')
        self.assertEqual(fresh.status_code, 200)

    def test_password_reset_blacklists_refresh_tokens(self):
        user = make_user('resetter')
        stolen = RefreshToken.for_user(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        response = self.client.post('/api/accounts/password/reset/confirm/', {
            'uid': uid, 'token': token, 'new_password': 'Reset-Pass-8899!', 'new_password2': 'Reset-Pass-8899!'},
            format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(self.client.post('/api/token/refresh/', {'refresh': str(stolen)}, format='json').status_code, 401)
        self.assertTrue(BlacklistedToken.objects.filter(token__user=user).exists())

    def test_reset_for_disabled_account_and_bad_link_give_the_same_answer(self):
        user = make_user('gone', is_active=False)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        body = {'new_password': 'Reset-Pass-8899!', 'new_password2': 'Reset-Pass-8899!'}
        disabled = self.client.post('/api/accounts/password/reset/confirm/', dict(body, uid=uid, token=token), format='json')
        bad_uid = self.client.post('/api/accounts/password/reset/confirm/', dict(body, uid='zzz', token=token), format='json')
        self.assertEqual(disabled.status_code, 400)
        self.assertEqual(disabled.data, bad_uid.data)

    def test_reset_request_answers_the_same_for_unknown_address(self):
        make_user('known', email='known@example.test')
        a = self.client.post('/api/accounts/password/reset/', {'email': 'known@example.test'}, format='json')
        b = self.client.post('/api/accounts/password/reset/', {'email': 'nobody@example.test'}, format='json')
        self.assertEqual((a.status_code, a.data), (b.status_code, b.data))
        self.assertEqual(len(mail.outbox), 1)


class VerificationTokenTests(BaseAPITestCase):
    """OC-15 (server part): verification tokens work once and expire."""

    def _pending_user(self, age_days=0):
        user = make_user('pending', email_verified=False)
        user.email_verification_token = 'a' * 32
        user.email_verification_sent_at = timezone.now() - timedelta(days=age_days)
        user.save()
        return user

    def test_token_works_once(self):
        self._pending_user()
        first = self.client.post('/api/accounts/verify-email/', {'token': 'a' * 32}, format='json')
        self.assertEqual(first.status_code, 200)
        second = self.client.post('/api/accounts/verify-email/', {'token': 'a' * 32}, format='json')
        self.assertEqual(second.status_code, 400)

    def test_attack_expired_token_is_refused(self):
        self._pending_user(age_days=30)
        response = self.client.post('/api/accounts/verify-email/', {'token': 'a' * 32}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.get(username='pending').email_verified)

    def test_resend_is_generic_and_issues_fresh_token(self):
        user = self._pending_user(age_days=30)
        known = self.client.post('/api/accounts/resend-verification/', {'email': user.email}, format='json')
        unknown = self.client.post('/api/accounts/resend-verification/', {'email': 'x@example.test'}, format='json')
        self.assertEqual(known.data, unknown.data)
        user.refresh_from_db()
        self.assertNotEqual(user.email_verification_token, 'a' * 32)
        ok = self.client.post('/api/accounts/verify-email/', {'token': user.email_verification_token}, format='json')
        self.assertEqual(ok.status_code, 200)


class UserSearchTests(BaseAPITestCase):
    """OC-16: search needs 3+ characters, skips guests, never shows e-mail addresses."""

    def setUp(self):
        super().setUp()
        self.me = make_user('searcher')
        make_user('alice_smith', first_name='Alice', email='alice.secret@example.test')
        make_user('guest_abc12345', is_guest=True)
        self.client = self.as_user(self.me)

    def test_short_query_returns_nothing(self):
        self.assertEqual(self.client.get('/api/accounts/users/search/?q=al').data, [])

    def test_results_have_no_email_and_no_guests(self):
        data = self.client.get('/api/accounts/users/search/?q=ali').data
        self.assertEqual([u['username'] for u in data], ['alice_smith'])
        self.assertNotIn('email', data[0])
        self.assertNotIn('alice.secret', str(data))
        self.assertEqual(self.client.get('/api/accounts/users/search/?q=guest').data, [])

    def test_email_search_is_not_an_oracle_for_students(self):
        self.assertEqual(self.client.get('/api/accounts/users/search/?q=alice.secret@example.test').data, [])
        lecturer = self.as_user(make_user('teach', role='lecturer'))
        data = lecturer.get('/api/accounts/users/search/?q=alice.secret@example.test').data
        self.assertEqual(len(data), 1)
        self.assertNotIn('email', data[0])


class SystemSettingsAndMaintenanceTests(BaseAPITestCase):
    """OC-17."""

    def setUp(self):
        super().setUp()
        self.admin = make_user('admin1', role='admin')

    def test_unknown_setting_keys_are_refused(self):
        response = self.as_user(self.admin).put('/api/accounts/settings/', {'evil_key': 'x'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(SystemSettings.objects.filter(key='evil_key').exists())

    def test_known_keys_can_be_saved_and_are_audited(self):
        response = self.as_user(self.admin).put('/api/accounts/settings/', {'siteName': 'My Canvas'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(SystemSettings.get_all_settings()['siteName'], 'My Canvas')
        self.assertTrue(AuditLog.objects.filter(resource_type='settings', user=self.admin).exists())

    def test_maintenance_blocks_normal_users_but_not_admin(self):
        student = make_user('stud')
        SystemSettings.set_setting('maintenanceMode', 'true')
        from opencanvas.middleware import clear_maintenance_cache
        clear_maintenance_cache()
        blocked = self.as_user(student)
        # force_authenticate does not send a JWT, so use a real token for the middleware
        token = str(RefreshToken.for_user(student).access_token)
        from rest_framework.test import APIClient
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        self.assertEqual(c.get('/api/accounts/settings/').status_code, 503)
        self.assertEqual(c.get('/api/boards/').status_code, 503)
        a = APIClient()
        a.credentials(HTTP_AUTHORIZATION='Bearer ' + str(RefreshToken.for_user(self.admin).access_token))
        self.assertEqual(a.get('/api/accounts/settings/').status_code, 200)
        del blocked


class StorageSettingValidationTests(BaseAPITestCase):
    """defaultStorageQuota and systemStorageLimit are GB numbers: finite, above zero, at most 10 TiB."""

    def setUp(self):
        super().setUp()
        self.admin = make_user('quotaadmin', role='admin')
        self.admin_client = self.as_user(self.admin)

    def test_invalid_default_quota_is_refused_and_not_saved(self):
        for bad in ('abc', '0', '-1', 'nan', 'inf', '1e400', '10241', '', True):
            response = self.admin_client.put('/api/accounts/settings/', {'defaultStorageQuota': bad}, format='json')
            self.assertEqual(response.status_code, 400, bad)
        self.assertFalse(SystemSettings.objects.filter(key='defaultStorageQuota').exists())

    def test_invalid_system_limit_is_refused(self):
        for bad in ('lots', '-5', 'nan', '10241', 'inf'):
            response = self.admin_client.put('/api/accounts/settings/', {'systemStorageLimit': bad}, format='json')
            self.assertEqual(response.status_code, 400, bad)
        self.assertFalse(SystemSettings.objects.filter(key='systemStorageLimit').exists())

    def test_valid_values_are_accepted(self):
        for key, good in (('defaultStorageQuota', '5'), ('defaultStorageQuota', '0.5'),
                          ('defaultStorageQuota', '10240'), ('systemStorageLimit', ''),
                          ('systemStorageLimit', '0'), ('systemStorageLimit', '100')):
            response = self.admin_client.put('/api/accounts/settings/', {key: good}, format='json')
            self.assertEqual(response.status_code, 200, (key, good, response.content))

    def test_a_bad_value_saves_none_of_the_settings_in_the_same_request(self):
        response = self.admin_client.put('/api/accounts/settings/',
                                         {'siteName': 'Changed', 'defaultStorageQuota': 'lots'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertNotEqual(SystemSettings.get_all_settings().get('siteName'), 'Changed')


class StorageSettingReaderTests(BaseAPITestCase):
    """Stored values that are unusable fall back to the model default (5 GB) and never overflow."""

    DEFAULT = 5368709120

    def _new_guest_quota(self):
        response = self.client.post('/api/accounts/guest/', {}, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        return User.objects.order_by('-id').first().storage_quota

    def test_guest_gets_the_model_default_when_the_setting_is_unusable(self):
        for raw in ('nan', 'inf', '-3', '0', 'abc', ''):
            SystemSettings.set_setting('defaultStorageQuota', raw)
            self.assertEqual(self._new_guest_quota(), self.DEFAULT, raw)

    def test_guest_gets_a_valid_setting(self):
        SystemSettings.set_setting('defaultStorageQuota', '2')
        self.assertEqual(self._new_guest_quota(), 2 * GB)

    def test_a_huge_stored_value_is_capped_at_the_ceiling_not_overflowed(self):
        SystemSettings.set_setting('defaultStorageQuota', '1e308')
        self.assertEqual(self._new_guest_quota(), MAX_STORAGE_GB * GB)


class StorageGbHelperTests(SimpleTestCase):
    def test_storage_gb_setting_rejects_unusable_values_and_caps_large_ones(self):
        for raw in (None, '', 'abc', 'nan', 'inf', '-1', '0'):
            self.assertIsNone(storage_gb_setting(raw), raw)
        self.assertEqual(storage_gb_setting('5'), 5.0)
        self.assertEqual(storage_gb_setting('1e9'), float(MAX_STORAGE_GB))

    def test_validate_storage_gb(self):
        self.assertIsNone(validate_storage_gb('systemStorageLimit', ''))
        self.assertIsNone(validate_storage_gb('systemStorageLimit', '0'))
        self.assertIsNone(validate_storage_gb('defaultStorageQuota', '10240'))
        for key, bad in (('defaultStorageQuota', ''), ('defaultStorageQuota', '0'), ('systemStorageLimit', '-1'),
                         ('systemStorageLimit', 'nan'), ('defaultStorageQuota', '10241')):
            self.assertIsNotNone(validate_storage_gb(key, bad), (key, bad))

    def test_quota_bytes_from_setting_falls_back(self):
        self.assertEqual(quota_bytes_from_setting('nan', 123), 123)
        self.assertEqual(quota_bytes_from_setting(None, 123), 123)
        self.assertEqual(quota_bytes_from_setting('2', 123), 2 * GB)
        self.assertEqual(quota_bytes_from_setting('1e308', 123), MAX_STORAGE_GB * GB)


class AuditLogTests(BaseAPITestCase):
    """OC-18 and the audit-log limits from OC-13."""

    def setUp(self):
        super().setUp()
        self.admin = make_user('admin1', role='admin')
        self.client = self.as_user(self.admin)

    def test_csv_export_neutralises_formulas(self):
        AuditLog.objects.create(user=self.admin, action='create', resource_type='board', details={'name': 'x'},
                                resource_id='=HYPERLINK("http://evil","click")')
        make_user('=cmd|calc', first_name='=1+1', last_name='@SUM(1)')
        evil = User.objects.get(username='=cmd|calc')
        AuditLog.objects.create(user=evil, action='login', resource_type='user')
        response = self.client.get('/api/accounts/audit-logs/export/')
        self.assertEqual(response.status_code, 200)
        rows = list(csv.reader(io.StringIO(response.content.decode())))
        for row in rows[1:]:
            for cell in row[:7]:
                self.assertFalse(cell[:1] in ('=', '+', '-', '@'), cell)
        self.assertTrue(any(cell.startswith("'=") for row in rows for cell in row))

    def test_failed_logins_admin_changes_and_exports_are_logged(self):
        make_user('victim')
        anon = self.client.__class__()
        anon.post('/api/accounts/login/', {'username': 'victim', 'password': 'wrong-password'}, format='json')
        failed = AuditLog.objects.filter(action='login', details__success=False)
        self.assertEqual(failed.count(), 1)
        target = make_user('promote_me')
        self.client.patch(f'/api/accounts/users/{target.id}/', {'role': 'lecturer', 'storage_quota': 1024}, format='json')
        entry = AuditLog.objects.filter(details__action='admin_update').first()
        self.assertEqual(entry.details['changes']['role'], {'from': 'student', 'to': 'lecturer'})
        self.client.get('/api/accounts/audit-logs/export/')
        self.assertTrue(AuditLog.objects.filter(resource_type='audit_logs', action='read').exists())
        listing = self.client.get('/api/accounts/audit-logs/?limit=50').data
        self.assertTrue(any('Failed login attempt' in row['message'] for row in listing))

    def test_limit_parameter_is_validated_and_capped(self):
        for i in range(5):
            AuditLog.objects.create(user=self.admin, action='read', resource_type='board')
        self.assertEqual(self.client.get('/api/accounts/audit-logs/?limit=abc').status_code, 200)
        self.assertEqual(self.client.get('/api/accounts/audit-logs/?limit=-5').status_code, 200)
        self.assertEqual(self.client.get('/api/accounts/audit-logs/?user_id=abc').status_code, 400)
        with override_settings(AUDIT_LOG_MAX_LIMIT=2):
            self.assertEqual(len(self.client.get('/api/accounts/audit-logs/?limit=100000').data), 2)
            self.assertEqual(len(self.client.get('/api/accounts/audit-logs/export/?limit=100000').content.decode().strip().splitlines()), 3)

    def test_attack_clearing_cannot_erase_recent_entries(self):
        AuditLog.objects.create(user=self.admin, action='update', resource_type='user', details={'x': 1})
        old = AuditLog.objects.create(user=self.admin, action='read', resource_type='board')
        AuditLog.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=90))
        response = self.client.delete('/api/accounts/audit-logs/?older_than_days=0')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['deleted_count'], 1)
        self.assertFalse(AuditLog.objects.filter(pk=old.pk).exists())
        self.assertTrue(AuditLog.objects.filter(resource_type='user').exists())

    def test_non_admin_cannot_read_logs(self):
        self.assertEqual(self.as_user(make_user('s')).get('/api/accounts/audit-logs/').status_code, 403)


class MiscHardeningTests(BaseAPITestCase):
    """OC-19."""

    def test_logout_does_not_leak_exception_text(self):
        user = make_user('logoutuser')
        response = self.as_user(user).post('/api/accounts/logout/', {'refresh_token': 'not-a-token'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error'], 'Invalid or expired token')

    def test_logout_still_works(self):
        user = make_user('logoutuser')
        refresh = RefreshToken.for_user(user)
        response = self.as_user(user).post('/api/accounts/logout/', {'refresh_token': str(refresh)}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(BlacklistedToken.objects.filter(token__jti=refresh['jti']).exists())

    def test_guest_login_works(self):
        response = self.client.post('/api/accounts/guest/', format='json')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data['user']['is_guest'])
