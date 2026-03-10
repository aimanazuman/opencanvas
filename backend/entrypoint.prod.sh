#!/bin/sh
set -e

# Read secrets from files into env vars
if [ -f "$DB_PASSWORD_FILE" ]; then
    export DB_PASSWORD=$(cat "$DB_PASSWORD_FILE")
fi
if [ -f "$SECRET_KEY_FILE" ]; then
    export SECRET_KEY=$(cat "$SECRET_KEY_FILE")
fi
if [ -f "$EMAIL_HOST_PASSWORD_FILE" ]; then
    export EMAIL_HOST_PASSWORD=$(cat "$EMAIL_HOST_PASSWORD_FILE")
fi

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
python manage.py collectstatic --noinput 2>/dev/null || true

# Start gunicorn (production WSGI server)
echo "Starting Gunicorn..."
exec gunicorn opencanvas.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
