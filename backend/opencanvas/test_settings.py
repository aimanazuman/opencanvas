"""Settings for the automated tests: in-memory SQLite, local-memory cache, no throttling, mail kept in memory.

Run with:  python manage.py test --settings=opencanvas.test_settings
Nothing here is used in production.
"""
import os
import tempfile

# The real settings refuse to start without these when DEBUG is off; the tests use fixed throw-away values.
os.environ.setdefault('DEBUG', 'True')
os.environ.setdefault('SECRET_KEY', 'test-only-secret-key-not-used-anywhere-else-0123456789')

from .settings import *  # noqa: E402,F401,F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'opencanvas-tests',
    }
}

# Tests switch throttling on explicitly where they test it.
THROTTLING_ENABLED = False
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
EMAIL_ASYNC = False
FRONTEND_URL = 'https://app.example.test'
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
MEDIA_ROOT = tempfile.mkdtemp(prefix='oc-test-media-')
ALLOWED_HOSTS = ['testserver', 'localhost']
LOGGING = {'version': 1, 'disable_existing_loggers': True, 'handlers': {'null': {'class': 'logging.NullHandler'}},
           'root': {'handlers': ['null'], 'level': 'CRITICAL'}}
