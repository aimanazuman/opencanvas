#!/bin/sh
# Production entrypoint. Runs as the non-root app user (uid 10001).
# Secrets are NOT copied into environment variables here: Django reads the files named by DB_PASSWORD_FILE,
# SECRET_KEY_FILE and EMAIL_HOST_PASSWORD_FILE itself. This script only checks that each declared file is readable
# and not empty, and never prints a value.
set -eu

check_secret_file() {
    # $1 = name of the variable that holds the path
    eval "path=\${$1:-}"
    if [ -n "$path" ]; then
        if [ ! -r "$path" ]; then
            echo "FATAL: $1 points to $path, which is missing or not readable." >&2
            exit 1
        fi
        if [ ! -s "$path" ]; then
            echo "FATAL: the file named by $1 is empty." >&2
            exit 1
        fi
    fi
}

check_secret_file DB_PASSWORD_FILE
check_secret_file SECRET_KEY_FILE
check_secret_file EMAIL_HOST_PASSWORD_FILE

echo "Applying database migrations..."
python manage.py migrate --noinput

# A failure here must stop the container, not be hidden.
echo "Collecting static files..."
python manage.py collectstatic --noinput --verbosity 0

echo "Starting gunicorn..."
# --forwarded-allow-ips: only these sources may set X-Forwarded-* headers. Default is the Docker private range; narrow
# it to the subnet of the "proxy" network (docs/DEPLOYMENT.md). Never use "*".
# --worker-tmp-dir /dev/shm: keeps the worker heartbeat file in memory (works with a read-only root filesystem).
exec gunicorn opencanvas.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-2}" \
    --threads "${GUNICORN_THREADS:-4}" \
    --timeout "${GUNICORN_TIMEOUT:-120}" \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --worker-tmp-dir /dev/shm \
    --no-control-socket \
    --forwarded-allow-ips "${GUNICORN_FORWARDED_ALLOW_IPS:-172.16.0.0/12}" \
    --limit-request-line 4094 \
    --limit-request-fields 50 \
    --limit-request-field_size 8190 \
    --access-logfile - \
    --error-logfile -
