import os
from pathlib import Path
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# ---------------------------------------------------------------------------------------------------------------------
# Small helpers to read the environment
# ---------------------------------------------------------------------------------------------------------------------
def _read_secret(file_env, env_var, default=''):
    """Read a Docker secret from the file named by `file_env`, else the plain env var, else `default`."""
    file_path = os.environ.get(file_env, '')
    if file_path and os.path.isfile(file_path):
        with open(file_path) as f:
            return f.read().strip()
    return os.environ.get(env_var, default)


def _env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None or value == '':
        return default
    return value.strip().lower() in ('true', '1', 'yes', 'on')


def _env_int(name, default):
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _env_list(name, default=''):
    return [item.strip() for item in os.environ.get(name, default).split(',') if item.strip()]


# ---------------------------------------------------------------------------------------------------------------------
# Core security settings
# ---------------------------------------------------------------------------------------------------------------------
# DEBUG defaults to False. Local development turns it on explicitly (docker-compose.yml sets DEBUG=True).
DEBUG = _env_bool('DEBUG', False)

_INSECURE_SECRET_KEYS = {
    '',
    'django-insecure-dev-key-change-in-production',
    'changeme',
    'change-me',
    'secret',
}
_DEV_SECRET_KEY = 'django-insecure-dev-key-change-in-production'

SECRET_KEY = _read_secret('SECRET_KEY_FILE', 'SECRET_KEY', '')
if DEBUG:
    if not SECRET_KEY:
        SECRET_KEY = _DEV_SECRET_KEY
else:
    if SECRET_KEY in _INSECURE_SECRET_KEYS or SECRET_KEY.startswith('django-insecure-') or len(SECRET_KEY) < 32:
        raise ImproperlyConfigured(
            'SECRET_KEY is missing, too short or an insecure development value. '
            'Provide a long random value with SECRET_KEY_FILE (or SECRET_KEY) when DEBUG is off.'
        )

ALLOWED_HOSTS = _env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1,backend')

# Set BEHIND_PROXY=True only when the app is reached through a reverse proxy that strips and rewrites
# X-Forwarded-Proto (Traefik in production). Never turn it on when the app is reachable directly.
BEHIND_PROXY = _env_bool('BEHIND_PROXY', False)
if BEHIND_PROXY:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Client IP detection (see opencanvas/clientip.py).
TRUST_CLOUDFLARE_HEADER = _env_bool('TRUST_CLOUDFLARE_HEADER', False)
# Number of reverse proxies in front of Django that append to X-Forwarded-For (Traefik = 1). With BEHIND_PROXY on and
# no explicit value, one proxy is assumed; otherwise X-Forwarded-For is ignored and REMOTE_ADDR is used.
TRUSTED_PROXY_COUNT = _env_int('TRUSTED_PROXY_COUNT', 1 if BEHIND_PROXY else 0)

# Cookies and transport security (active when DEBUG is off, each one can be overridden).
_secure_default = not DEBUG
SESSION_COOKIE_SECURE = _env_bool('SESSION_COOKIE_SECURE', _secure_default)
CSRF_COOKIE_SECURE = _env_bool('CSRF_COOKIE_SECURE', _secure_default)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
# The redirect to HTTPS is done by Traefik/Cloudflare; turn this on only if Django must do it too.
SECURE_SSL_REDIRECT = _env_bool('SECURE_SSL_REDIRECT', False)
# HSTS is sent by Cloudflare/Traefik; keep 0 here so it is not doubled, unless HSTS_SECONDS is set explicitly.
SECURE_HSTS_SECONDS = _env_int('HSTS_SECONDS', 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = _env_bool('HSTS_INCLUDE_SUBDOMAINS', False) and SECURE_HSTS_SECONDS > 0
SECURE_HSTS_PRELOAD = _env_bool('HSTS_PRELOAD', False) and SECURE_HSTS_SECONDS > 0
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'
CSRF_TRUSTED_ORIGINS = _env_list('CSRF_TRUSTED_ORIGINS', '')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party
    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',

    # Local apps
    'apps.accounts',
    'apps.boards',
    'apps.courses',
    'apps.files',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'opencanvas.middleware.MaintenanceMiddleware',
]

ROOT_URLCONF = 'opencanvas.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'opencanvas.wsgi.application'

# ---------------------------------------------------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------------------------------------------------
# In production the app connects with a dedicated least-privilege user (DB_USER) and the password comes from
# DB_PASSWORD_FILE. The development fallbacks only apply when DEBUG is on.
_DB_PASSWORD = _read_secret('DB_PASSWORD_FILE', 'DB_PASSWORD', '')
if not _DB_PASSWORD:
    if DEBUG:
        _DB_PASSWORD = 'letmein'
    else:
        raise ImproperlyConfigured('DB_PASSWORD_FILE (or DB_PASSWORD) is required when DEBUG is off.')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'opencanvas_db'),
        'USER': os.environ.get('DB_USER', 'root' if DEBUG else 'opencanvas'),
        'PASSWORD': _DB_PASSWORD,
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '3306'),
        'CONN_MAX_AGE': _env_int('DB_CONN_MAX_AGE', 60),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    }
}

# ---------------------------------------------------------------------------------------------------------------------
# Cache (used by throttling, login lockout and the maintenance flag)
# ---------------------------------------------------------------------------------------------------------------------
# CACHE_BACKEND=db  -> shared between gunicorn workers through the database table "oc_cache" (created by the accounts
#                      migrations). Default when DEBUG is off.
# CACHE_BACKEND=locmem -> per-process memory. With N gunicorn workers each worker counts on its own, so a throttle of
#                      "10/min" can allow up to N * 10 requests per minute. Default in development.
_cache_backend = os.environ.get('CACHE_BACKEND', 'locmem' if DEBUG else 'db').strip().lower()
if _cache_backend == 'db':
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
            'LOCATION': 'oc_cache',
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'opencanvas-default',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Password reset / set-password links stay valid this many seconds (default 3 days).
PASSWORD_RESET_TIMEOUT = _env_int('PASSWORD_RESET_TIMEOUT', 3 * 24 * 3600)

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files. Uploads are NOT served as plain static files any more: every download goes through the signed,
# access-checked route /media/f/<token>/ (apps/files/media_views.py).
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
# How long a signed media URL stays valid, in seconds.
MEDIA_SIGNING_MAX_AGE = _env_int('MEDIA_SIGNING_MAX_AGE', 3600)

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------------------------------------------------
# Upload and request size limits
# ---------------------------------------------------------------------------------------------------------------------
_MB = 1024 * 1024
# Size of a request body without files (board JSON content). Larger bodies are rejected with HTTP 400.
DATA_UPLOAD_MAX_MEMORY_SIZE = _env_int('DATA_UPLOAD_MAX_MEMORY_SIZE', 10 * _MB)
DATA_UPLOAD_MAX_NUMBER_FIELDS = _env_int('DATA_UPLOAD_MAX_NUMBER_FIELDS', 1000)
# Uploaded files above this size are streamed to a temporary file instead of memory.
FILE_UPLOAD_MAX_MEMORY_SIZE = _env_int('FILE_UPLOAD_MAX_MEMORY_SIZE', 5 * _MB)
# Application limits (checked in the serializers).
MAX_UPLOAD_SIZE = _env_int('MAX_UPLOAD_SIZE', 50 * _MB)          # one uploaded file
MAX_IMAGE_UPLOAD_SIZE = _env_int('MAX_IMAGE_UPLOAD_SIZE', 10 * _MB)  # avatar / logo / thumbnail images
BOARD_CONTENT_MAX_BYTES = _env_int('BOARD_CONTENT_MAX_BYTES', 10 * _MB)
QUIZ_RESPONSE_MAX_BYTES = _env_int('QUIZ_RESPONSE_MAX_BYTES', 64 * 1024)
BULK_IMPORT_MAX_BYTES = _env_int('BULK_IMPORT_MAX_BYTES', 2 * _MB)
BULK_IMPORT_MAX_ROWS = _env_int('BULK_IMPORT_MAX_ROWS', 2000)
# Plain-array list endpoints never return more rows than this (the frontend expects arrays, so no page envelope).
MAX_LIST_RESULTS = _env_int('MAX_LIST_RESULTS', 1000)
# Audit logs: the largest limit a client may ask for, and the youngest entries "clear" may delete.
AUDIT_LOG_MAX_LIMIT = _env_int('AUDIT_LOG_MAX_LIMIT', 1000)
AUDIT_LOG_CLEAR_MIN_AGE_DAYS = _env_int('AUDIT_LOG_CLEAR_MIN_AGE_DAYS', 30)

# ---------------------------------------------------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = _env_list('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------------------------------------------------
# REST framework
# ---------------------------------------------------------------------------------------------------------------------
_renderers = ['rest_framework.renderers.JSONRenderer']
if DEBUG:
    _renderers.append('rest_framework.renderers.BrowsableAPIRenderer')

# Throttle rates ("<number>/<sec|min|hour|day>"). Override a single scope with THROTTLE_RATE_<SCOPE>, for example
# THROTTLE_RATE_LOGIN=20/min. THROTTLING_ENABLED=False switches throttling off (tests, load tests).
THROTTLING_ENABLED = _env_bool('THROTTLING_ENABLED', True)
_DEFAULT_THROTTLE_RATES = {
    'anon': '120/min',
    'user': '1200/min',
    'login': '30/min',
    'register': '60/hour',
    'password_reset': '10/hour',
    'resend_verification': '10/hour',
    'verify_email': '30/min',
    'guest': '120/hour',
    'join_by_code': '10/min',
    'token_refresh': '60/min',
}
OC_THROTTLE_RATES = {
    scope: os.environ.get('THROTTLE_RATE_' + scope.upper(), rate)
    for scope, rate in _DEFAULT_THROTTLE_RATES.items()
}

# Failed-login lockout: LOGIN_MAX_FAILURES failures inside LOGIN_FAILURE_WINDOW seconds block further attempts for
# the same username from the same IP until the window ends. Other IPs are not affected.
LOGIN_MAX_FAILURES = _env_int('LOGIN_MAX_FAILURES', 5)
LOGIN_FAILURE_WINDOW = _env_int('LOGIN_FAILURE_WINDOW', 15 * 60)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': _renderers,
    'DEFAULT_THROTTLE_CLASSES': [
        'opencanvas.throttling.OCAnonThrottle',
        'opencanvas.throttling.OCUserThrottle',
    ],
    'DEFAULT_PAGINATION_CLASS': 'opencanvas.pagination.CappedListPagination',
}

# ---------------------------------------------------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------------------------------------------------
# A separate signing key is optional: set JWT_SIGNING_KEY_FILE to rotate token signing independently of SECRET_KEY.
JWT_SIGNING_KEY = _read_secret('JWT_SIGNING_KEY_FILE', 'JWT_SIGNING_KEY', '') or SECRET_KEY

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=_env_int('JWT_ACCESS_MINUTES', 60)),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=_env_int('JWT_REFRESH_DAYS', 3)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': JWT_SIGNING_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# ---------------------------------------------------------------------------------------------------------------------
# Email
# ---------------------------------------------------------------------------------------------------------------------
# Development: uses MailHog (EMAIL_HOST=mailhog, EMAIL_PORT=1025)
# Production: set EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD_FILE, EMAIL_USE_TLS=True
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'mailhog')
EMAIL_PORT = _env_int('EMAIL_PORT', 1025)
EMAIL_USE_TLS = _env_bool('EMAIL_USE_TLS', False)
EMAIL_USE_SSL = _env_bool('EMAIL_USE_SSL', False)
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = _read_secret('EMAIL_HOST_PASSWORD_FILE', 'EMAIL_HOST_PASSWORD', '')
EMAIL_TIMEOUT = _env_int('EMAIL_TIMEOUT', 10)
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@opencanvas.local')
# Emails are sent from a background thread so the response time does not reveal whether an address exists.
EMAIL_ASYNC = _env_bool('EMAIL_ASYNC', True)

# Frontend URL (used in email links)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# ---------------------------------------------------------------------------------------------------------------------
# Logging: console only, never request bodies, headers, passwords or tokens.
# ---------------------------------------------------------------------------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'plain': {'format': '%(asctime)s %(levelname)s %(name)s %(message)s'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'plain'},
    },
    'root': {'handlers': ['console'], 'level': os.environ.get('LOG_LEVEL', 'INFO')},
    'loggers': {
        'django.request': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
        'django.security': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
        'django.db.backends': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
    },
}
