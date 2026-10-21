# Deployment

This describes how OpenCanvas runs in production: one VPS, Docker Compose, behind a Traefik that is shared with other apps, with the domain proxied by Cloudflare. Commands are run on the VPS, in the project folder (the clone of this repository), unless they say otherwise.

## What runs

| Container | Image | Network(s) | Purpose |
|---|---|---|---|
| `oc-frontend` | nginx (unprivileged, port 8080) with the React build | `proxy` | Serves the web app and the Django admin CSS/JS |
| `oc-backend` | Django + gunicorn (port 8000), user uid 10001 | `proxy`, `data` | The API, the admin, uploaded files |
| `oc-db` | MySQL 8.4 (user uid 999) | `data` only | The database. Never published, never on `proxy` |

- `proxy` is the Docker network of the shared Traefik, also used by other apps on the server. Only the frontend and backend join it. The names `oc-frontend`, `oc-backend` and `oc-db` and the Traefik routers `opencanvas-*` are unique on purpose, so they cannot clash with the other apps (Docker resolves a service name as a DNS name on every network it joins).
- `data` is a private network declared `internal`: no route to the internet. Only `oc-db` and `oc-backend` are on it.
- No container publishes a port on the host. Traefik reaches the containers over `proxy`.
- Every container runs with `no-new-privileges`, all Linux capabilities dropped, a read-only root filesystem, memory / CPU / process limits, and rotated logs (10 MB x 3 files).

Files: `docker-compose.prod.yml` (the stack), `docker-compose.traefik.yml` (optional, see below), `db/init/10-create-app-user.sh` (creates the database user), `.env.prod.example` (settings template).

## Routing and protection (Traefik labels)

| Router | Rule | Protection |
|---|---|---|
| `opencanvas-frontend` | the domain, everything else | security headers (HSTS etc.) |
| `opencanvas-backend` | `/api` | security headers, rate limit 20 req/s (burst 50) per visitor |
| `opencanvas-auth` | `/api/token`, `/api/accounts/login`, `register`, `guest`, `convert-guest`, `password`, `resend-verification`, `verify-email` | security headers, strict rate limit 5 req/s (burst 10) |
| `opencanvas-admin` | `/admin` | **IP allow-list** `OPENCANVAS_ADMIN_ALLOWED_IPS`, strict rate limit, security headers |
| `opencanvas-media` | `/media` | security headers, rate limit 50 req/s (burst 100) |

The visitor for the rate limits is taken from the `CF-Connecting-IP` header set by Cloudflare. Rates can be changed in `.env.prod` (`OPENCANVAS_RL_*`). Many students can share one network address, so raise a limit before lowering it.

### The admin page is closed by default

`/admin` answers `403` to everyone until you put your public IP address in `OPENCANVAS_ADMIN_ALLOWED_IPS` in `.env.prod`:

```bash
# find your address from your own computer, then on the VPS:
nano .env.prod        # OPENCANVAS_ADMIN_ALLOWED_IPS=203.0.113.7/32
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Several addresses are separated by commas. Set it back to empty to close it again. The check uses the visitor address that Cloudflare puts at the end of `X-Forwarded-For`, which only works when the shared Traefik trusts Cloudflare's forwarded headers. If it does not, nobody matches and the admin stays closed (it fails safe). Test after opening it: from an allowed address `curl -sI https://<domain>/admin/login/` returns `200`; from anywhere else `403`. A Cloudflare Access policy or WAF rule on `/admin*` is a good second layer.

### Client address and Cloudflare

Anything that can reach the server directly (not through Cloudflare) can send a fake `CF-Connecting-IP` header and dodge the rate limits. Close that gap with the server firewall: allow ports 80 and 443 only from Cloudflare's published address ranges (https://www.cloudflare.com/ips/). Only after that is done set `TRUST_CLOUDFLARE_HEADER=True` in `.env.prod`, so the backend also trusts that header for its own throttling and logs.

### Uploaded files (`/media`)

The backend serves `/media/...` without checking who is asking, so **anyone who knows or guesses the exact URL of an uploaded file can download it**. Treat uploaded files as unlisted, not private, until the application is changed. (This is an application matter; the infrastructure only forwards the request.)

## Prerequisites on the server (once)

1. Docker Engine with the Compose plugin.
2. The shared Traefik is running and has: a Docker network named `proxy`, entrypoint `websecure`, certificate resolver `letsencrypt`. Check (read only):
   ```bash
   docker network ls | grep -w proxy
   docker ps --format 'table {{.Names}}\t{{.Image}}' | grep -i traefik
   ```
   The labels assume Traefik v3 (`ipallowlist` is the v3 name). If your network, entrypoint or resolver have other names, change only the labels in `docker-compose.prod.yml` (and the `proxy` network name). Never edit Traefik's own configuration for this.
3. A DNS record for the domain pointing at the VPS (through Cloudflare, SSL mode Full (strict)).

If the server has no Traefik at all, see "Standalone Traefik" at the end. Do not use that on a server that already has one.

## 1. Data folders

Data lives in plain folders on the VPS, not in Docker volumes, so `docker compose down -v` or `docker system prune` cannot delete it, and a backup is a copy of a folder.

```bash
sudo mkdir -p /srv/opencanvas/mysql /srv/opencanvas/media /srv/opencanvas/static
sudo chown 999:999     /srv/opencanvas/mysql    # the database user in the mysql container
sudo chown 10001:10001 /srv/opencanvas/media    # the app user in the backend container
sudo chown 10001:10001 /srv/opencanvas/static
sudo chmod 750 /srv/opencanvas/mysql /srv/opencanvas/media
sudo chmod 755 /srv/opencanvas /srv/opencanvas/static   # static holds only public admin CSS/JS; nginx (uid 101) must read it
ls -ln /srv/opencanvas                                  # mysql 999 999, media 10001 10001, static 10001 10001
```

What each folder is: `mysql` the database files (back up), `media` uploaded files (back up), `static` the Django admin CSS/JS that the backend regenerates on every start (no backup needed; the frontend serves it read-only). To use another location set `OPENCANVAS_DATA_DIR` in `.env.prod`.

## 2. Secret files

Secrets are files in `~/secrets` (outside the repository), mounted into the containers as Docker secrets. They are never in `.env.prod`, in git, or in a chat. Create the folder and the files:

```bash
mkdir -p ~/secrets && chmod 700 ~/secrets
openssl rand -hex 24      > ~/secrets/db_password.txt          # MySQL root password (admin only; the app does not use it)
openssl rand -hex 24      > ~/secrets/db_app_password.txt      # password of the database user "opencanvas_app" (used by Django)
openssl rand -base64 60 | tr -d '\n' > ~/secrets/django_secret_key.txt   # Django SECRET_KEY
read -rs -p "Mail account password or app password: " K; echo; printf '%s' "$K" > ~/secrets/smtp_password.txt; unset K
chmod 644 ~/secrets/*.txt      # see the note below
ls -l ~/secrets
```

| File | Contains | Used by |
|---|---|---|
| `db_password.txt` | MySQL root password | `oc-db` (set on first start; used for dumps and admin work) |
| `db_app_password.txt` | password of the least-privilege database user `opencanvas_app` | `oc-db` (creates the user on first start), `oc-backend` |
| `django_secret_key.txt` | Django `SECRET_KEY` (at least 32 characters) | `oc-backend` |
| `smtp_password.txt` | password for the mail account in `SMTP_USER` | `oc-backend` |

Why mode 644 and not 600: the containers run as other users (uid 999 and 10001), and Docker bind-mounts secret files with their host owner and mode, so a 600 file owned by your login would be unreadable inside the container. The folder `~/secrets` is mode 700, so other users on the server still cannot reach the files. Keep a separate, safe copy of all four files (a password manager): the database password is not recoverable from the database.

`db_app_password.txt` may only contain letters, digits and `_ . + = / @ % : , -` (the output of `openssl rand -hex` is fine) and must be at least 24 characters; the init script refuses anything else.

## 3. Settings

```bash
cp .env.prod.example .env.prod
nano .env.prod       # set DOMAIN and SMTP_USER at least; every line is explained in the file
```

## 4. Start

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

On the first start MySQL creates the database `opencanvas_db`, and the script `db/init/10-create-app-user.sh` creates the user `opencanvas_app`, which can reach `opencanvas_db` only (no other database, no administration rights). The backend then applies the migrations and starts. The first start takes a minute or two.

Create the first admin user once the backend has started and migrated, with the reviewed command described in "First admin" below. Do not use `createsuperuser` (it leaves the role at `student`).

Shortcut for the commands below (add it to `~/.bashrc` to keep it):

```bash
alias occ='docker compose --env-file .env.prod -f docker-compose.prod.yml'
```

## 5. Check that it works

```bash
occ ps                                   # all three: Up ... (healthy)
occ logs --tail 30 oc-backend            # "Starting gunicorn", then health check lines
docker network inspect proxy --format '{{range .Containers}}{{.Name}} {{end}}'     # oc-frontend and oc-backend are there, oc-db is not
curl -sI https://<domain>/ | head -20               # 200 and the security headers
curl -s  https://<domain>/api/health/               # {"status": "ok"}
curl -sI https://<domain>/admin/ | head -1          # 403 until you open it (see above)
docker ps --format '{{.Names}} {{.Ports}}'          # no 0.0.0.0 ports for the oc-* containers
```

If a container shows `unhealthy`, `occ logs oc-backend` (or `oc-db`, `oc-frontend`) says why. Traefik does not route to an unhealthy container, so a failing health check shows up as 404 from Traefik.

## Backups

What to back up: the database (a dump), `/srv/opencanvas/media`, and the four secret files (separately and safely).

```bash
mkdir -p ~/backups
# database dump (root runs inside the db container; the password is read from the secret file there)
docker exec oc-db sh -c 'MYSQL_PWD="$(cat /run/secrets/db_root_password)" mysqldump -uroot --single-transaction --routines --no-tablespaces opencanvas_db' \
  | gzip > ~/backups/opencanvas-db-$(date +%F).sql.gz
# uploaded files
sudo rsync -a /srv/opencanvas/media/ ~/backups/media/
```

Copy `~/backups` off the server regularly. A dump is the safe way to move or restore data; copying the live `mysql` folder is only consistent when `oc-db` is stopped.

Restore into an empty database (after the stack is up):

```bash
gunzip -c ~/backups/opencanvas-db-YYYY-MM-DD.sql.gz | docker exec -i oc-db sh -c 'MYSQL_PWD="$(cat /run/secrets/db_root_password)" mysql -uroot opencanvas_db'
```

## Storage counters

Each user's `storage_used` is a stored counter. Files count against the user who uploaded them, and a board's content counts against its owner, unless the board is archived. The `recalculate_storage` command recomputes every counter from the rows. Without `--apply` it only prints the users whose stored value differs (old, new, delta) and changes nothing.

```bash
# 1. dry run: lists the users whose stored value differs. Changes nothing.
docker compose --env-file .env.prod -f docker-compose.prod.yml exec oc-backend python manage.py recalculate_storage
# 2. write the recalculated values (one locked transaction per user)
docker compose --env-file .env.prod -f docker-compose.prod.yml exec oc-backend python manage.py recalculate_storage --apply
# 3. optional: list board files that no board content or version refers to. Listing only, nothing is deleted.
docker compose --env-file .env.prod -f docker-compose.prod.yml exec oc-backend python manage.py recalculate_storage --report-orphans
```

- Take a database dump first (see Backups) before `--apply`, and run it when few people are editing: the per-user lock protects each counter, but a board edit that commits while the command reads that user's boards is only counted on the next run.
- The orphan report looks for each stored file name in the content and versions of every board. A file that a board refers to in another form shows up in the list, so check each file before removing anything. Files that are not attached to a board are never listed.
- Storage limits set in the admin settings are in GB. `defaultStorageQuota` must be above 0 and at most 10240 (10 TiB). `systemStorageLimit` is optional: an empty value or 0 means no system-wide limit. Other values are refused with HTTP 400.

## Updating

```bash
git pull
# keep the running images as a fallback
docker tag opencanvas-backend:prod opencanvas-backend:previous
docker tag opencanvas-frontend:prod opencanvas-frontend:previous
# take a database dump first (see Backups), then:
occ up -d --build
occ ps
```

Base image versions are pinned in the Dockerfiles; to take security updates of the base images, change the tag on purpose and rebuild. `docker image prune -f` removes dangling old images (it is the only prune this server needs).

## Rollback

Code only (no database change in the update): go back to the previous commit (`git checkout <previous-commit>`) and run `occ up -d --build`. For a quick rollback without rebuilding, retag the saved images: `docker tag opencanvas-backend:previous opencanvas-backend:prod` (same for the frontend), then `occ up -d --no-build`.

If the update applied database migrations, an older version of the code may not work with the newer schema, and migrations are not undone automatically. Restore the dump taken before the update (see Backups; empty the database first: `occ down`, move `/srv/opencanvas/mysql` aside, recreate it as in step 1, `occ up -d`, restore).

## Moving from /var/data/opencanvas to /srv/opencanvas

Older versions kept data in `/var/data/opencanvas/{mysql,media,static}`, ran the database as root and had their own Traefik. If there is nothing worth keeping, start fresh: stop the old containers (`docker ps` shows them; `docker compose -f <old file> down` from the old checkout), do steps 1 to 4 and leave the old folders alone until you are sure.

To keep the data:

1. Dump the old database while the old database container is still running (find its name with `docker ps`): `docker exec <old-db-container> sh -c 'MYSQL_PWD="$(cat /run/secrets/db_password)" mysqldump -uroot --single-transaction opencanvas_db' | gzip > ~/backups/old-opencanvas.sql.gz`
2. Stop the old stack (`down`, without `-v`). Make sure nothing else uses ports 80/443 other than the shared Traefik.
3. Do steps 1 to 4 above (new folders, secrets, `.env.prod`, start). Use the same value as before in `db_password.txt` if you like; it only has to exist.
4. Restore the dump (see Backups, "Restore").
5. Copy the uploads: `sudo cp -a /var/data/opencanvas/media/. /srv/opencanvas/media/ && sudo chown -R 10001:10001 /srv/opencanvas/media`
6. Check the site, then keep `/var/data/opencanvas` for a week as a second copy before removing it.

Do not copy the old `mysql` folder into the new one: the database moved from MySQL 8.0 to 8.4 and from root to a dedicated user, and a dump and restore is the clean way across.

If you ever need to create the application user on an existing database by hand: `docker exec oc-db bash /docker-entrypoint-initdb.d/10-create-app-user.sh` (safe to repeat; it also resets the user's password to the current `db_app_password.txt`).

## First admin

The first admin is created by the management command `create_admin`, run once in a short-lived container. The password is never typed on the command line, never stored in a file of this repository and never in the environment: it is either read from a file you name with `--password-file`, or typed at a hidden prompt twice.

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm --no-deps \
  --label traefik.enable=false --entrypoint python oc-backend manage.py create_admin --email you@example.com
```

- `--entrypoint python` is needed because the production image starts `entrypoint.prod.sh` (migrations, then gunicorn) by default. `--label traefik.enable=false` keeps Traefik from sending public traffic to the one-off container.
- The username defaults to `oc_admin`; choose another with `--username your_name`.
- The account is created with role `admin`, staff and superuser flags, and a verified email.
- Running it again on the same admin changes nothing and says so. An existing account with another role is promoted only together with a new password (the hidden prompt again).
- Lost admin password: add `--reset-password`. It replaces the password and signs that account out everywhere.
- A password file also works (`--password-file /path/in/the/container`), but the production compose file does not mount one. Mount it only if you add the secret yourself, and keep it outside the repository.

## Standalone Traefik (only for a server WITHOUT a shared Traefik)

For people who clone this repository onto a server that has no Traefik. **Not for the owner's VPS**, where the shared Traefik already owns ports 80 and 443.

```bash
docker network create proxy       # once
# set ACME_EMAIL in .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml -f docker-compose.traefik.yml up -d --build
```

The overlay adds a Traefik container with the Docker socket mounted read-only. That is still powerful access to the Docker host, so keep the Traefik image current and consider a Docker socket proxy.

## Development

`docker-compose.yml` is for a local computer: all ports are bound to `127.0.0.1`, the database is a throwaway MySQL with a dev-only password (see `.env.dev.example`), and nothing in it is used in production.

### Local database and uploads

The development database is a bind mount: its files live in `./data/dev/mysql` on your PC, and uploads live in `./data/dev/uploads`. The `data/` folder is git-ignored. Before this change the database was in the Docker named volume `dev_db_data`. The stack no longer uses that volume: MySQL starts on the empty `./data/dev/mysql` folder, so the old data is not visible until you restore it.

To keep the old data, dump it while the previous `docker-compose.yml` still runs, before you start this version. Run these two commands in a POSIX shell such as Git Bash: the `<` and `>` redirects are written for that shell, and PowerShell handles them differently. The dump goes into `data/`, which is git-ignored (`.gitignore` does not cover `*.sql`, so do not write it anywhere else in the repository):

```bash
docker compose exec -T db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" opencanvas_db' > data/dev-backup.sql
```

To load it into the new database, once the new stack has started and the database is up:

```bash
docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" opencanvas_db' < data/dev-backup.sql
```

The old volume is not removed by this change. `docker volume ls` shows it, and you can delete it yourself once you have checked the restore.

### Demo accounts for local development

The variables `DEV_SEED_ADMIN_*`, `DEV_SEED_LECTURER_*` and `DEV_SEED_STUDENT_*` (username, email, password each) in `.env.dev` describe demo accounts. Every backend start runs `python manage.py seed_dev_users`, which creates or updates them: the role is set, the email is marked verified, and the password is written only when it changed. Re-running changes nothing else. The values in `.env.dev.example` are throwaway and marked DEV ONLY.

```bash
cp .env.dev.example .env.dev         # the demo accounts are on by default; clear a role's three values to skip it
docker compose --env-file .env.dev up
```

Without `--env-file .env.dev` the variables are empty and nothing is created. The command refuses to run when `DEBUG` is off or when a production setting is present (`DB_PASSWORD_FILE`, `SECRET_KEY_FILE`, `JWT_SIGNING_KEY_FILE`, `EMAIL_HOST_PASSWORD_FILE`, or `OC_ENVIRONMENT=production`). The production compose file sets those, so the demo accounts cannot be created there. Passwords are never printed.
