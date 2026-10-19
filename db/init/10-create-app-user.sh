#!/bin/bash
# Creates (or refreshes) the least-privilege MySQL user the backend uses.
#
# Runs automatically ONCE, on the first start with an empty data folder (the mysql image runs everything in
# /docker-entrypoint-initdb.d). It can also be run by hand against an existing database, see docs/DEPLOYMENT.md:
#   docker exec oc-db bash /docker-entrypoint-initdb.d/10-create-app-user.sh
#
# The application password is read from the Docker secret file /run/secrets/db_app_password. It is never an
# environment variable and is never printed. The root password comes from MYSQL_ROOT_PASSWORD_FILE.
#
# The whole script runs in a subshell so that it behaves the same whether the image executes it or sources it.
(
    set -eu

    APP_USER="${OPENCANVAS_DB_APP_USER:-opencanvas_app}"
    APP_DB="${MYSQL_DATABASE:-opencanvas_db}"
    APP_PW_FILE="${OPENCANVAS_DB_APP_PASSWORD_FILE:-/run/secrets/db_app_password}"

    if [ ! -r "$APP_PW_FILE" ] || [ ! -s "$APP_PW_FILE" ]; then
        echo "init: $APP_PW_FILE is missing or empty; create the secret file db_app_password.txt first." >&2
        exit 1
    fi
    APP_PW="$(tr -d '\r\n' < "$APP_PW_FILE")"

    # Only characters that are safe inside a quoted SQL string (what "openssl rand -hex" or -base64 style output gives,
    # without quotes or backslashes). Refuse anything else instead of trying to escape it.
    case "$APP_PW" in
        *[!A-Za-z0-9_.+=/@%:,-]*)
            echo "init: the app password contains characters other than A-Z a-z 0-9 _ . + = / @ % : , -; generate it with: openssl rand -hex 24" >&2
            exit 1 ;;
    esac
    if [ "${#APP_PW}" -lt 24 ]; then
        echo "init: the app password is shorter than 24 characters." >&2
        exit 1
    fi
    case "$APP_USER$APP_DB" in
        *[!A-Za-z0-9_]*) echo "init: user and database names may only use letters, digits and underscore." >&2; exit 1 ;;
    esac

    if [ -n "${MYSQL_ROOT_PASSWORD:-}" ]; then
        ROOT_PW="$MYSQL_ROOT_PASSWORD"
    else
        ROOT_PW="$(tr -d '\r\n' < "${MYSQL_ROOT_PASSWORD_FILE:?root password file not set}")"
    fi

    # MYSQL_PWD keeps the root password off the command line.
    MYSQL_PWD="$ROOT_PW" mysql --protocol=socket --socket="${MYSQL_SOCKET:-/var/run/mysqld/mysqld.sock}" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${APP_DB}\` CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${APP_PW}';
ALTER USER '${APP_USER}'@'%' IDENTIFIED BY '${APP_PW}';
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${APP_USER}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES
    ON \`${APP_DB}\`.* TO '${APP_USER}'@'%';
FLUSH PRIVILEGES;
SQL
    echo "init: database user ${APP_USER} is ready (access to ${APP_DB} only)."
)
