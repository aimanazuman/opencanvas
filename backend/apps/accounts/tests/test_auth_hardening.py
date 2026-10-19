"""OC-06 (token route, throttling, lockout), OC-12 (client IP), OC-13/OC-14 (settings, size limits)."""
import os
import subprocess
import sys
from pathlib import Path

from django.test import RequestFactory, SimpleTestCase, override_settings

from apps.accounts.models import AuditLog
from apps.testutils import BaseAPITestCase, PASSWORD, make_user
from opencanvas.clientip import get_client_ip, get_user_agent

BACKEND_DIR = Path(__file__).resolve().parents[3]

TEST_RATES = {
    'anon': '1000/min', 'user': '1000/min', 'login': '1000/min', 'register': '1000/min', 'password_reset': '1000/min',
    'resend_verification': '1000/min', 'verify_email': '1000/min', 'guest': '1000/min', 'join_by_code': '1000/min',
    'token_refresh': '1000/min',
}


class TokenRouteTests(BaseAPITestCase):
    def test_attack_password_grant_route_is_gone(self):
        make_user('someone')
        response = self.client.post('/api/token/', {'username': 'someone', 'password': PASSWORD}, format='json')
        self.assertEqual(response.status_code, 404)

    def test_login_route_and_refresh_still_work(self):
        make_user('someone')
        login = self.client.post('/api/accounts/login/', {'username': 'someone', 'password': PASSWORD}, format='json')
        self.assertEqual(login.status_code, 200)
        refresh = self.client.post('/api/token/refresh/', {'refresh': login.data['tokens']['refresh']}, format='json')
        self.assertEqual(refresh.status_code, 200)
        self.assertIn('access', refresh.data)


@override_settings(THROTTLING_ENABLED=True)
class ThrottleTests(BaseAPITestCase):
    def _rates(self, **overrides):
        return override_settings(OC_THROTTLE_RATES=dict(TEST_RATES, **overrides))

    def test_attack_login_is_throttled_per_ip(self):
        with self._rates(login='3/min'):
            codes = [self.client.post('/api/accounts/login/', {'username': f'u{i}', 'password': 'x'}, format='json',
                                      REMOTE_ADDR='203.0.113.5').status_code for i in range(5)]
            self.assertEqual(codes[:3], [400, 400, 400])
            self.assertEqual(codes[3:], [429, 429])
            other = self.client.post('/api/accounts/login/', {'username': 'u', 'password': 'x'}, format='json',
                                     REMOTE_ADDR='203.0.113.99')
            self.assertEqual(other.status_code, 400)  # a different address is not throttled

    def test_normal_login_below_the_limit_works(self):
        make_user('someone')
        with self._rates(login='3/min'):
            response = self.client.post('/api/accounts/login/', {'username': 'someone', 'password': PASSWORD}, format='json')
            self.assertEqual(response.status_code, 200)

    def test_each_scope_is_throttled(self):
        cases = [
            ('/api/accounts/register/', 'register', {'username': 'a', 'email': 'a@example.test', 'password': 'x', 'password2': 'x'}),
            ('/api/accounts/password/reset/', 'password_reset', {'email': 'a@example.test'}),
            ('/api/accounts/resend-verification/', 'resend_verification', {'email': 'a@example.test'}),
            ('/api/accounts/verify-email/', 'verify_email', {'token': 'abc'}),
            ('/api/accounts/guest/', 'guest', {}),
        ]
        for url, scope, body in cases:
            from django.core.cache import cache
            cache.clear()
            with self._rates(**{scope: '2/min'}):
                codes = [self.client.post(url, body, format='json', REMOTE_ADDR='198.51.100.7').status_code for _ in range(4)]
            self.assertEqual(codes[2:], [429, 429], f'{scope}: {codes}')
            self.assertNotIn(429, codes[:2], f'{scope}: {codes}')

    def test_join_by_code_is_throttled_per_user(self):
        user = make_user('joiner')
        client = self.as_user(user)
        with self._rates(join_by_code='2/min'):
            codes = [client.post('/api/courses/courses/join-by-code/', {'invite_code': 'NOPE'}, format='json').status_code
                     for _ in range(4)]
        self.assertEqual(codes, [404, 404, 429, 429])


class LockoutTests(BaseAPITestCase):
    def _login(self, username, password, ip='203.0.113.5'):
        return self.client.post('/api/accounts/login/', {'username': username, 'password': password}, format='json',
                                REMOTE_ADDR=ip)

    def test_attack_repeated_failures_lock_the_username_on_that_ip(self):
        make_user('victim')
        for _ in range(5):
            self.assertEqual(self._login('victim', 'wrong').status_code, 400)
        locked = self._login('victim', PASSWORD)  # even the right password is refused during the lock
        self.assertEqual(locked.status_code, 429)
        self.assertIn('Retry-After', locked)

    def test_lockout_does_not_lock_the_real_owner_out_from_another_ip(self):
        make_user('victim')
        for _ in range(5):
            self._login('victim', 'wrong', ip='203.0.113.5')
        self.assertEqual(self._login('victim', PASSWORD, ip='198.51.100.20').status_code, 200)

    def test_success_resets_the_counter_and_the_lock_expires(self):
        make_user('victim')
        for _ in range(4):
            self._login('victim', 'wrong')
        self.assertEqual(self._login('victim', PASSWORD).status_code, 200)
        for _ in range(4):
            self._login('victim', 'wrong')
        self.assertEqual(self._login('victim', PASSWORD).status_code, 200)
        with override_settings(LOGIN_FAILURE_WINDOW=1):
            import time
            for _ in range(5):
                self._login('victim', 'wrong')
            self.assertEqual(self._login('victim', PASSWORD).status_code, 429)
            time.sleep(2.2)
            self.assertEqual(self._login('victim', PASSWORD).status_code, 200)

    def test_failed_attempts_are_audited_with_ip(self):
        make_user('victim')
        self._login('victim', 'wrong', ip='203.0.113.5')
        entry = AuditLog.objects.get(action='login', details__success=False)
        self.assertEqual(entry.ip_address, '203.0.113.5')


class InviteCodeTests(BaseAPITestCase):
    def test_new_invite_codes_are_long_and_random(self):
        from apps.courses.models import generate_invite_code, INVITE_CODE_ALPHABET
        codes = {generate_invite_code() for _ in range(200)}
        self.assertEqual(len(codes), 200)
        for code in codes:
            self.assertGreaterEqual(len(code), 16)
            self.assertTrue(set(code) <= set(INVITE_CODE_ALPHABET))

    def test_old_short_codes_keep_working(self):
        from apps.courses.models import Course
        teacher = make_user('teach', role='lecturer')
        course = Course.objects.create(name='Old', code='OLD1', instructor=teacher, invite_code='AB12CD34')
        student = make_user('stud')
        response = self.as_user(student).post('/api/courses/courses/join-by-code/', {'invite_code': 'ab12cd34'}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(course.enrollments.filter(student=student, status='active').exists())
        self.assertNotIn('invite_code', response.data['course'])  # students do not see the code


class ClientIpTests(SimpleTestCase):
    """OC-12."""

    def _request(self, **meta):
        return RequestFactory().get('/', **meta)

    def test_forged_forwarded_for_is_ignored_by_default(self):
        request = self._request(REMOTE_ADDR='10.0.0.2', HTTP_X_FORWARDED_FOR='1.2.3.4')
        self.assertEqual(get_client_ip(request), '10.0.0.2')

    @override_settings(TRUSTED_PROXY_COUNT=1)
    def test_rightmost_entry_added_by_the_trusted_proxy_is_used(self):
        request = self._request(REMOTE_ADDR='172.18.0.2', HTTP_X_FORWARDED_FOR='6.6.6.6, 198.51.100.9')
        self.assertEqual(get_client_ip(request), '198.51.100.9')

    @override_settings(TRUSTED_PROXY_COUNT=2)
    def test_two_trusted_proxies(self):
        request = self._request(REMOTE_ADDR='172.18.0.2', HTTP_X_FORWARDED_FOR='6.6.6.6, 198.51.100.9, 104.16.0.1')
        self.assertEqual(get_client_ip(request), '198.51.100.9')

    @override_settings(TRUSTED_PROXY_COUNT=1)
    def test_invalid_values_fall_back_to_remote_addr(self):
        request = self._request(REMOTE_ADDR='172.18.0.2', HTTP_X_FORWARDED_FOR='not-an-ip')
        self.assertEqual(get_client_ip(request), '172.18.0.2')

    def test_cloudflare_header_needs_the_switch(self):
        request = self._request(REMOTE_ADDR='172.18.0.2', HTTP_CF_CONNECTING_IP='203.0.113.77')
        self.assertEqual(get_client_ip(request), '172.18.0.2')
        with override_settings(TRUST_CLOUDFLARE_HEADER=True):
            self.assertEqual(get_client_ip(request), '203.0.113.77')
            bad = self._request(REMOTE_ADDR='172.18.0.2', HTTP_CF_CONNECTING_IP='<script>')
            self.assertEqual(get_client_ip(bad), '172.18.0.2')

    def test_ipv6_and_ports(self):
        with override_settings(TRUSTED_PROXY_COUNT=1):
            self.assertEqual(get_client_ip(self._request(REMOTE_ADDR='10.0.0.1', HTTP_X_FORWARDED_FOR='2001:db8::1')), '2001:db8::1')
            self.assertEqual(get_client_ip(self._request(REMOTE_ADDR='10.0.0.1', HTTP_X_FORWARDED_FOR='203.0.113.4:5555')), '203.0.113.4')

    def test_user_agent_is_truncated(self):
        request = self._request(HTTP_USER_AGENT='A' * 1000)
        self.assertEqual(len(get_user_agent(request)), 255)


class ClientIpAuditTests(BaseAPITestCase):
    def test_garbage_forwarded_header_does_not_crash_and_is_not_stored(self):
        make_user('someone')
        with override_settings(TRUSTED_PROXY_COUNT=1):
            response = self.client.post('/api/accounts/login/', {'username': 'someone', 'password': PASSWORD},
                                        format='json', HTTP_X_FORWARDED_FOR='<script>alert(1)</script>',
                                        HTTP_USER_AGENT='B' * 600, REMOTE_ADDR='192.0.2.8')
        self.assertEqual(response.status_code, 200)
        entry = AuditLog.objects.filter(action='login').latest('id')
        self.assertEqual(entry.ip_address, '192.0.2.8')
        self.assertEqual(len(entry.user_agent), 255)


class SizeLimitTests(BaseAPITestCase):
    """OC-13: request bodies are capped, list endpoints are capped but stay plain arrays."""

    def test_attack_oversized_json_body_is_rejected(self):
        user = make_user('writer')
        client = self.as_user(user)
        with override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=2000):
            response = client.post('/api/boards/', {'name': 'x', 'content': {'blob': 'A' * 5000}}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_board_content_cap(self):
        client = self.as_user(make_user('writer'))
        with override_settings(BOARD_CONTENT_MAX_BYTES=1000):
            too_big = client.post('/api/boards/', {'name': 'x', 'content': {'blob': 'A' * 2000}}, format='json')
            fine = client.post('/api/boards/', {'name': 'x', 'content': {'blob': 'A' * 100}}, format='json')
        self.assertEqual(too_big.status_code, 400)
        self.assertEqual(fine.status_code, 201)

    def test_lists_stay_arrays_and_are_capped(self):
        client = self.as_user(make_user('writer'))
        for i in range(5):
            client.post('/api/boards/', {'name': f'b{i}', 'content': {}}, format='json')
        full = client.get('/api/boards/')
        self.assertIsInstance(full.data, list)
        self.assertEqual(len(full.data), 5)
        with override_settings(MAX_LIST_RESULTS=3):
            self.assertEqual(len(client.get('/api/boards/').data), 3)
            self.assertEqual(len(client.get('/api/boards/?limit=2').data), 2)
            self.assertEqual(len(client.get('/api/boards/?limit=999').data), 3)
            self.assertEqual(len(client.get('/api/boards/?limit=abc').data), 3)


class ProductionSettingsTests(SimpleTestCase):
    """OC-13/OC-14: the real settings module in a clean process with production-like environments."""

    GOOD_KEY = 'k' * 60

    def _load(self, **env):
        base = {'PATH': os.environ.get('PATH', ''), 'PYTHONPATH': str(BACKEND_DIR), 'DJANGO_SETTINGS_MODULE': 'opencanvas.settings'}
        base.update(env)
        code = (
            "import json, django\n"
            "from django.conf import settings\n"
            "print(json.dumps({'debug': settings.DEBUG, 'hosts': settings.ALLOWED_HOSTS, "
            "'renderers': settings.REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'], 'cookie': settings.SESSION_COOKIE_SECURE, "
            "'csrf_cookie': settings.CSRF_COOKIE_SECURE, 'hsts': settings.SECURE_HSTS_SECONDS, "
            "'proxy_header': getattr(settings, 'SECURE_PROXY_SSL_HEADER', None), 'csrf_origins': settings.CSRF_TRUSTED_ORIGINS, "
            "'jwt_key_is_secret': settings.SIMPLE_JWT['SIGNING_KEY'] == settings.SECRET_KEY, 'db_user': settings.DATABASES['default']['USER']}))\n"
        )
        return subprocess.run([sys.executable, '-c', code], env=base, capture_output=True, text=True, cwd=str(BACKEND_DIR))

    def test_attack_production_refuses_to_start_without_a_real_secret_key(self):
        for env in ({}, {'SECRET_KEY': 'django-insecure-dev-key-change-in-production'}, {'SECRET_KEY': 'short'}):
            result = self._load(DB_PASSWORD='dbpass', **env)
            self.assertNotEqual(result.returncode, 0, env)
            self.assertIn('ImproperlyConfigured', result.stderr)

    def test_production_refuses_to_start_without_a_database_password(self):
        result = self._load(SECRET_KEY=self.GOOD_KEY)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('DB_PASSWORD', result.stderr)

    def test_production_defaults_are_safe(self):
        import json
        result = self._load(SECRET_KEY=self.GOOD_KEY, DB_PASSWORD='dbpass', DB_USER='oc_app')
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertFalse(data['debug'])  # DEBUG defaults to False
        self.assertNotIn('0.0.0.0', data['hosts'])
        self.assertEqual(data['renderers'], ['rest_framework.renderers.JSONRenderer'])
        self.assertTrue(data['cookie'] and data['csrf_cookie'])
        self.assertEqual(data['hsts'], 0)
        self.assertIsNone(data['proxy_header'])
        self.assertEqual(data['db_user'], 'oc_app')
        self.assertTrue(data['jwt_key_is_secret'])

    def test_switches_are_read_from_the_environment(self):
        import json
        result = self._load(SECRET_KEY=self.GOOD_KEY, DB_PASSWORD='dbpass', BEHIND_PROXY='True', HSTS_SECONDS='600',
                            CSRF_TRUSTED_ORIGINS='https://a.example, https://b.example', JWT_SIGNING_KEY='j' * 40)
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(result.stdout)
        self.assertEqual(data['proxy_header'], ['HTTP_X_FORWARDED_PROTO', 'https'])
        self.assertEqual(data['hsts'], 600)
        self.assertEqual(data['csrf_origins'], ['https://a.example', 'https://b.example'])
        self.assertFalse(data['jwt_key_is_secret'])

    def test_development_mode_still_starts_with_defaults(self):
        import json
        result = self._load(DEBUG='True')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(json.loads(result.stdout)['debug'])

    def test_secret_key_and_db_password_can_come_from_files(self):
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            key = Path(tmp, 'key.txt')
            pw = Path(tmp, 'pw.txt')
            key.write_text(self.GOOD_KEY + '\n')
            pw.write_text('dbpass\n')
            result = self._load(SECRET_KEY_FILE=str(key), DB_PASSWORD_FILE=str(pw))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(json.loads(result.stdout)['debug'])
