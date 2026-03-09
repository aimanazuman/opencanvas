# OpenCanvas Backend Documentation

Comprehensive documentation for the OpenCanvas Django backend, covering all apps, models, API endpoints, authentication, permissions, and infrastructure.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Infrastructure & Configuration](#infrastructure--configuration)
3. [Authentication & Authorization](#authentication--authorization)
4. [App: accounts](#app-accounts)
5. [App: boards](#app-boards)
6. [App: courses](#app-courses)
7. [App: files](#app-files)
8. [Permissions Reference](#permissions-reference)
9. [API Endpoint Summary](#api-endpoint-summary)
10. [Database Schema Overview](#database-schema-overview)

---

## Architecture Overview

```
backend/
├── opencanvas/              # Django project root
│   ├── settings.py          # Configuration (DB, JWT, CORS, apps)
│   ├── urls.py              # Root URL routing
│   └── wsgi.py / asgi.py    # Entry points
├── apps/
│   ├── accounts/            # Users, auth, admin, audit, notifications, bulk import
│   ├── boards/              # Board CRUD, sharing, versioning, invite links, quiz responses
│   ├── courses/             # Course & enrollment management, invite codes
│   └── files/               # File uploads, storage tracking, admin stats
├── manage.py
├── requirements.txt
└── Dockerfile
```

**Stack**: Django 4.2.7 / Django REST Framework 3.14.0 / MySQL 8.x / JWT (simplejwt 5.3.0)

---

## Infrastructure & Configuration

### Docker Compose Services

| Service | Port | Purpose |
|---------|------|---------|
| backend | 8000 | Django API server |
| frontend | 3000 | React dev server |
| mailhog | 1025 / 8025 | Email testing (SMTP / Web UI) |

MySQL runs **locally** (not in Docker) on `localhost:3306`. The backend container connects to it via `host.docker.internal`.

- **Database**: MySQL 8.x
- **Schema**: `opencanvas_db`
- **Credentials** (dev only): root / letmein

### Environment Variables (via docker-compose)

```
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-in-production
DB_NAME=opencanvas_db
DB_USER=root
DB_PASSWORD=letmein
DB_HOST=host.docker.internal
DB_PORT=3306
EMAIL_HOST=mailhog
EMAIL_PORT=1025
```

### Dependencies (requirements.txt)

```
Django==4.2.7
djangorestframework==3.14.0
django-cors-headers==4.3.0
django-filter==23.5
mysqlclient==2.2.1
python-decouple==3.8
Pillow==10.1.0
djangorestframework-simplejwt==5.3.0
openpyxl==3.1.2
```

### Main URL Router (`opencanvas/urls.py`)

```
/admin/                → Django admin
/api/token/            → TokenObtainPairView (JWT obtain)
/api/token/refresh/    → TokenRefreshView (JWT refresh)
/api/accounts/         → accounts app urls
/api/boards/           → boards app urls
/api/courses/          → courses app urls
/api/files/            → files app urls
```

---

## Authentication & Authorization

### JWT Configuration

| Setting | Value |
|---------|-------|
| Access token lifetime | 60 minutes |
| Refresh token lifetime | 7 days |
| Token rotation | Enabled |
| Token blacklisting | Enabled |
| Default permission | `IsAuthenticated` (globally) |
| Default authentication | `JWTAuthentication` (globally) |
| Custom user model | `accounts.User` |

### CORS

- Allowed origins: `http://localhost:3000`, `http://127.0.0.1:3000`
- Credentials: allowed

### Token Flow

```
1. Login:    POST /api/accounts/login/  →  { user, tokens: { access, refresh } }
2. Requests: Authorization: Bearer <access_token>
3. Refresh:  POST /api/token/refresh/   →  { access: <new_token> }
4. Logout:   POST /api/accounts/logout/ →  blacklists refresh token
```

---

## App: accounts

### Models

#### User (extends AbstractUser)

| Field | Type | Notes |
|-------|------|-------|
| role | CharField(20) | 'student' (default), 'lecturer', 'admin' |
| is_guest | BooleanField | default=False |
| avatar | ImageField | upload_to='avatars/', nullable |
| bio | TextField | blank |
| institution | FK → Institution | SET_NULL, nullable |
| storage_quota | BigIntegerField | default=5368709120 (5 GB) |
| storage_used | BigIntegerField | default=0 |
| preferences | JSONField | default=dict |
| last_username_change | DateTimeField | nullable |
| username_change_count | IntegerField | default=0 |
| last_email_change | DateTimeField | nullable |
| email_change_count | IntegerField | default=0 |

Indexes: `(role)`, `(institution)`

#### Institution

| Field | Type | Notes |
|-------|------|-------|
| name | CharField(255) | |
| domain | CharField(255) | unique |
| code | CharField(50) | unique |
| logo | ImageField | nullable |
| is_active | BooleanField | default=True |
| created_at / updated_at | DateTimeField | auto |

#### AuditLog

| Field | Type | Notes |
|-------|------|-------|
| user | FK → User | SET_NULL, nullable |
| action | CharField | create / read / update / delete / share / unshare / login / logout |
| resource_type | CharField(50) | |
| resource_id | CharField(100) | nullable |
| details | JSONField | default=dict |
| ip_address | GenericIPAddressField | nullable |
| user_agent | TextField | blank |
| created_at | DateTimeField | auto |

Indexes: `(user, -created_at)`, `(resource_type, resource_id)`, `(action)`, `(-created_at)`

#### SystemSettings

| Field | Type | Notes |
|-------|------|-------|
| key | CharField(100) | unique |
| value | TextField | blank |
| updated_at | DateTimeField | auto |
| updated_by | FK → User | SET_NULL, nullable |

Class methods: `get_all_settings()`, `set_setting(key, value, user)`

Known settings keys: `siteName`, `siteUrl`, `adminEmail`, `backupFrequency`, `allowRegistration`, `requireEmailVerification`, `sessionTimeout`, `maintenanceMode`, `enableNotifications`, `enableAnalytics`, `defaultStorageQuota`, `systemStorageLimit`, `usernameChangeCooldown`, `usernameMaxChanges`, `emailChangeCooldown`, `emailMaxChanges`

#### Notification

| Field | Type | Notes |
|-------|------|-------|
| user | FK → User | CASCADE |
| type | CharField | board_shared / course_enrolled / system_announcement / invite_accepted / quota_changed / storage_warning |
| title | CharField(255) | |
| message | TextField | |
| is_read | BooleanField | default=False |
| related_board | FK → Board | SET_NULL, nullable |
| related_user | FK → User | SET_NULL, nullable |
| created_at | DateTimeField | auto |

Indexes: `(user, -created_at)`, `(user, is_read)`

### API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/api/accounts/register/` | AllowAny | Register user (applies default quota from settings) |
| POST | `/api/accounts/login/` | AllowAny | Login, returns JWT tokens + user data |
| POST | `/api/accounts/logout/` | Authenticated | Blacklists refresh token |
| GET/PATCH | `/api/accounts/profile/` | Authenticated | Get / update own profile |
| POST | `/api/accounts/change-password/` | Authenticated | Change password (validates old) |
| POST | `/api/accounts/password/reset/` | AllowAny | Request password reset email (via MailHog) |
| POST | `/api/accounts/password/reset/confirm/` | AllowAny | Confirm reset with uid + token |
| POST | `/api/accounts/guest/` | AllowAny | Create temp guest account |
| POST | `/api/accounts/convert-guest/` | Authenticated | Convert guest → full account |
| GET | `/api/accounts/export/` | Authenticated | Export user data as JSON |
| DELETE | `/api/accounts/me/` | Authenticated | Deactivate account |
| GET | `/api/accounts/users/` | Admin | List users (filter: `role`, `search`) |
| POST | `/api/accounts/users/create/` | Admin | Create user |
| GET/PATCH/PUT/DELETE | `/api/accounts/users/<id>/` | Admin | User detail CRUD (quota change creates notification) |
| GET | `/api/accounts/users/search/?q=` | Authenticated | Search users by name/email (min 2 chars) |
| POST | `/api/accounts/bulk-import/` | LecturerOrAdmin | CSV/XLSX bulk student import |
| GET | `/api/accounts/dashboard-stats/` | Admin | System-wide stats |
| GET/PUT | `/api/accounts/settings/` | Admin | Get / update system settings |
| GET | `/api/accounts/audit-logs/` | Admin | List audit logs (filter: `user_id`, `limit`) |
| GET | `/api/accounts/notifications/` | Authenticated | List own notifications (last 100) |
| PATCH | `/api/accounts/notifications/<id>/read/` | Authenticated | Mark notification read |
| POST | `/api/accounts/notifications/mark-all-read/` | Authenticated | Mark all read |
| GET | `/api/accounts/notifications/unread-count/` | Authenticated | Get unread count |

### Utility Modules

| Module | Description |
|--------|-------------|
| `accounts/audit.py` | `log_action()` — creates AuditLog entries. Wired to login, logout, register, profile update, password change, board CRUD/share/archive, course CRUD/enroll/unenroll, file upload/delete, quiz responses |
| `accounts/emails.py` | HTML email templates for welcome email (bulk import), password reset, board shared notification |
| `accounts/bulk_import.py` | CSV/XLSX parser, row validation, user creation with auto-generated credentials, course enrollment, welcome email via MailHog |
| `accounts/notifications.py` | `notify_board_shared()`, `notify_invite_accepted()` — create Notification records |

### Middleware

**MaintenanceMiddleware**: Checks `SystemSettings` key `maintenanceMode`. If `'true'`, returns 503 for all requests except admin users and auth endpoints.

---

## App: boards

### Models

#### Board

| Field | Type | Notes |
|-------|------|-------|
| name | CharField(255) | |
| description | TextField | blank |
| owner | FK → User | CASCADE |
| course | FK → Course | SET_NULL, nullable |
| content | JSONField | default=dict — stores all board data |
| content_size | BigIntegerField | default=0 — byte size of content JSON |
| thumbnail | ImageField | nullable |
| is_archived | BooleanField | default=False |
| is_template | BooleanField | default=False |
| board_type | CharField(20) | course-material / student-notes / study-planner / kanban / quiz |
| section | CharField(50) | blank, for course section filtering |
| starred_by | M2M → User | through StarredBoard |
| created_at / updated_at | DateTimeField | auto |

Indexes: `(owner, -updated_at)`, `(course)`, `(is_archived)`, `(is_template)`

#### Board Content JSON Structure

The `content` field stores all board-specific data. Structure varies by `board_type`:

**Course Material / Student Notes:**
```json
{
  "id": "...", "name": "...", "type": "course-material",
  "sections": [
    { "id": "s1", "title": "Section Title", "blocks": [
      { "id": "b1", "type": "text", "content": "...", "updatedAt": "..." }
    ]}
  ],
  "comments": { "blockId": [{ "id": "c1", "text": "...", "user": {...}, "createdAt": "..." }] },
  "personalNotes": { "userId_blockId": "note text" },
  "bookmarks": { "userId": ["blockId1", "blockId2"] },
  "interactions": { "userId": { "name": "...", "actions": [...], "lastAction": "..." } }
}
```

**Kanban:**
```json
{
  "id": "...", "name": "...", "type": "kanban",
  "columns": [
    { "id": "col1", "title": "To Do", "cards": [
      { "id": "card1", "title": "...", "description": "...", "files": [...], "createdBy": "userId" }
    ]}
  ]
}
```

**Quiz:**
```json
{
  "id": "...", "name": "...", "type": "quiz",
  "questions": [
    { "id": "q1", "text": "...", "type": "mcq|true-false|fill-blank", "options": [...], "correctAnswer": 0, "points": 10, "timeLimit": 30 }
  ],
  "quizSettings": { "shuffleQuestions": false, "showResults": true, "allowRetake": false },
  "responses": {
    "userId": { "answers": { "q1": 2 }, "score": 30, "totalPoints": 40, "completedAt": "...", "studentName": "John Doe" }
  }
}
```

**Study Planner:**
```json
{
  "id": "...", "name": "...", "type": "study-planner",
  "schedule": { "YYYY-MM-DD_HH": { "day_hour": [...] } },
  "weeklyGoals": { "YYYY-MM-DD": ["goal1", "goal2"] }
}
```

#### BoardShare

| Field | Type | Notes |
|-------|------|-------|
| board | FK → Board | CASCADE |
| user | FK → User | CASCADE |
| permission | CharField | 'view', 'comment', or 'edit' |
| created_at | DateTimeField | auto |

unique_together: `(board, user)`

#### StarredBoard

| Field | Type | Notes |
|-------|------|-------|
| user | FK → User | CASCADE |
| board | FK → Board | CASCADE |
| created_at | DateTimeField | auto |

unique_together: `(user, board)`

#### BoardVersion

| Field | Type | Notes |
|-------|------|-------|
| board | FK → Board | CASCADE |
| content | JSONField | snapshot of board content |
| version_number | IntegerField | |
| created_by | FK → User | SET_NULL, nullable |
| description | TextField | blank |
| created_at | DateTimeField | auto |

unique_together: `(board, version_number)`

#### BoardInviteLink

| Field | Type | Notes |
|-------|------|-------|
| board | FK → Board | CASCADE |
| token | UUIDField | unique, auto-generated |
| permission | CharField | view / comment / edit |
| expires_at | DateTimeField | nullable |
| max_uses | IntegerField | nullable (null = unlimited) |
| use_count | IntegerField | default=0 |
| created_by | FK → User | CASCADE |
| is_active | BooleanField | default=True |
| created_at | DateTimeField | auto |

Property: `is_valid` → checks `is_active`, expiry, and use count

### API Endpoints

#### BoardViewSet (ModelViewSet)

Permission: `IsAuthenticated` + `IsBoardOwnerOrShared`

Queryset filters: `scope` (personal/course), `starred`, `shared`, `course`, `is_archived`, `is_template`, `board_type`, `section`. Students filtered by their enrolled section per course.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/` | List boards (owner + shared + course enrolled) |
| POST | `/api/boards/` | Create board (checks user + system quota) |
| GET | `/api/boards/<id>/` | Get board detail (includes `can_edit`, `can_comment`, `permission`, `collaborators`) |
| PATCH/PUT | `/api/boards/<id>/` | Update board (creates version snapshot on content change, tracks `content_size`) |
| DELETE | `/api/boards/<id>/` | Delete board (reclaims storage from owner) |
| GET | `/api/boards/starred/` | List starred boards |
| GET | `/api/boards/archived/` | List archived boards |
| GET | `/api/boards/templates/` | List template boards |
| POST | `/api/boards/<id>/toggle-star/` | Toggle star |
| POST | `/api/boards/<id>/archive/` | Archive (owner only) |
| POST | `/api/boards/<id>/restore/` | Restore from archive (owner only) |
| POST | `/api/boards/<id>/leave/` | Shared user leaves board |
| POST | `/api/boards/<id>/duplicate/` | Duplicate board (checks quota) |
| GET | `/api/boards/<id>/versions/` | List version history |
| POST | `/api/boards/<id>/restore-version/` | Restore to specific version |
| POST | `/api/boards/<id>/submit-quiz-response/` | Submit quiz response (see below) |
| POST | `/api/boards/<id>/create-invite/` | Create invite link (owner only) |
| GET | `/api/boards/<id>/invites/` | List active invite links (owner only) |
| POST | `/api/boards/<id>/revoke-invite/` | Deactivate invite link (owner only) |

#### Quiz Response Submission

`POST /api/boards/<id>/submit-quiz-response/`

This endpoint has special permission handling:
- **Bypasses** `IsBoardOwnerOrShared` write restriction — allows **any** user with view access (including enrolled students) to submit
- Verifies `board_type == 'quiz'`
- Checks `allowRetake` setting before allowing re-submission
- **Server-side merge**: reads existing `responses`, adds the new one, saves — prevents race conditions when multiple students submit concurrently
- Attaches student's display name (`studentName`) to the response
- Updates `content_size` and board owner's `storage_used`
- Creates audit log entry

#### BoardShareViewSet

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/boards/shares/` | List / create shares |
| GET/PATCH/PUT/DELETE | `/api/boards/shares/<id>/` | Share detail CRUD |

#### JoinBoardView

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/join/<token>/` | Preview board from invite token |
| POST | `/api/boards/join/<token>/` | Join board via invite token |

### Board Serializer Computed Fields

The `BoardSerializer` adds these read-only fields:
- `can_edit` — true if user is owner or has edit share permission
- `can_comment` — true if owner, edit, or comment permission
- `permission` — effective permission string: 'owner', 'edit', 'comment', 'view', or null
- `collaborators` — list of BoardShare entries with user details
- `starred_count` — total stars on the board
- `is_starred` — whether current user has starred it

---

## App: courses

### Models

#### Course

| Field | Type | Notes |
|-------|------|-------|
| name | CharField(255) | |
| code | CharField(50) | unique |
| description | TextField | blank |
| instructor | FK → User | CASCADE |
| students | M2M → User | through Enrollment |
| sections | JSONField | default=list — list of section names |
| invite_code | CharField(20) | unique, auto-generated 8-char hex |
| is_active | BooleanField | default=True |
| start_date / end_date | DateField | nullable |
| created_at / updated_at | DateTimeField | auto |

Indexes: `(instructor)`, `(code)`, `(is_active)`

#### Enrollment

| Field | Type | Notes |
|-------|------|-------|
| student | FK → User | CASCADE |
| course | FK → Course | CASCADE |
| status | CharField | 'active' (default), 'dropped', 'completed' |
| section | CharField(50) | blank |
| enrolled_at | DateTimeField | auto |
| completed_at | DateTimeField | nullable |

unique_together: `(student, course)`

### API Endpoints

#### CourseViewSet (ModelViewSet)

Permission: `IsAuthenticated` + `IsLecturerOrAdmin` (write) / `IsAuthenticated` (read)

Queryset scoping: admin = all courses, lecturer = taught + enrolled, student = active enrollments only.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/courses/courses/` | List / create courses |
| GET/PATCH/PUT/DELETE | `/api/courses/courses/<id>/` | Course CRUD |
| POST | `/api/courses/courses/<id>/enroll/` | Enroll current user |
| POST | `/api/courses/courses/<id>/unenroll/` | Set enrollment status to 'dropped' |
| POST | `/api/courses/courses/<id>/regenerate-invite/` | Regenerate invite code (instructor/admin) |
| POST | `/api/courses/courses/join-by-code/` | Join course via invite code |
| GET | `/api/courses/courses/invite-info/<code>/` | Preview course from invite code |
| GET | `/api/courses/courses/<id>/analytics/` | Course analytics |

#### EnrollmentViewSet (ModelViewSet)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/courses/enrollments/` | List / create enrollments |
| GET/PATCH/PUT/DELETE | `/api/courses/enrollments/<id>/` | Enrollment detail CRUD |

Supports `?course=<id>` filter. Queryset: admin = all, lecturer = for their courses, student = own enrollments.

---

## App: files

### Models

#### File

| Field | Type | Notes |
|-------|------|-------|
| name | CharField(255) | optional on upload (auto-populated from file) |
| file | FileField | upload_to='uploads/' |
| file_type | CharField | image / video / document / other (auto-detected from MIME) |
| file_size | BigIntegerField | default=0 |
| mime_type | CharField(100) | blank |
| thumbnail | ImageField | nullable |
| uploaded_by | FK → User | CASCADE |
| board | FK → Board | CASCADE, nullable |
| is_deleted | BooleanField | default=False (soft delete) |
| created_at / updated_at | DateTimeField | auto |

Max upload size: 50 MB. Properties: `size_mb`, `get_file_extension()`

Indexes: `(uploaded_by, -created_at)`, `(board)`, `(file_type)`, `(is_deleted)`

### API Endpoints

#### FileViewSet (ModelViewSet)

Permission: `IsAuthenticated`. Parser: `MultiPartParser`, `FormParser`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files/` | List user's files (excludes soft-deleted) |
| POST | `/api/files/` | Upload file (validates 50 MB max, checks effective quota via `check_quota`) |
| GET/PATCH/PUT | `/api/files/<id>/` | File detail |
| DELETE | `/api/files/<id>/` | Soft delete + reclaim storage |
| GET | `/api/files/usage/` | Storage usage (effective quota, raw quota, bytes, MB, percentage) |

Upload response includes `storage_warning` object at 80% / 90% / 100% thresholds.

#### Admin-Only Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files/storage-stats/` | System-wide storage by type (includes board content as category) |
| GET | `/api/files/large-files/` | Top 20 largest files |
| GET | `/api/files/user-storage/` | Per-user storage breakdown with file-type detail, sortable |

### Storage Utility Module (`files/storage.py`)

| Function | Description |
|----------|-------------|
| `calculate_content_size(content)` | Byte size of board JSON content (includes base64 embeds) |
| `update_user_storage(user, delta)` | Adjust `user.storage_used` by delta bytes, clamped ≥ 0 |
| `get_effective_quota(user)` | `min(user.storage_quota, systemStorageLimit)` |
| `check_quota(user, additional_bytes)` | Returns `(ok, remaining)` using effective quota |
| `check_system_quota(additional_bytes)` | Check system-wide limit across all users' `storage_used` |
| `get_user_storage_breakdown(user)` | Returns file uploads + board content totals for a user |

### Storage Architecture

- **File uploads**: tracked via `File.file_size`, updates `user.storage_used` in `FileViewSet.perform_create`
- **Board content**: tracked via `Board.content_size`, updates `user.storage_used` in `BoardViewSet.perform_update`
- **Effective quota**: `min(user.storage_quota, systemStorageLimit setting)` — enforced on both file upload and board content save
- **System-wide limit**: `systemStorageLimit` in SystemSettings, checked via `check_system_quota()`
- **Media files**: stored at `backend/media/` (bind-mounted via Docker, persists on host)

---

## Permissions Reference

| Class | Location | Logic |
|-------|----------|-------|
| `IsOwner` | accounts/permissions.py | `obj == request.user` |
| `IsAdminUser` | accounts/permissions.py | `user.role == 'admin'` |
| `IsLecturerOrAdmin` | accounts/permissions.py | `user.role in ['lecturer', 'admin']` |
| `IsStudentUser` | accounts/permissions.py | `user.role == 'student'` |
| `IsBoardOwnerOrShared` | boards/permissions.py | Owner: full access; Shared 'view': read-only; Shared 'comment'/'edit': read + write; Course instructor: full; Enrolled student: read-only |
| `IsBoardOwner` | boards/permissions.py | `obj.owner == request.user` |
| `IsOwnerOrReadOnly` | boards/permissions.py | Read: all authenticated; Write: owner only |
| `IsLecturerOrAdmin` | courses/permissions.py | Safe methods: all authenticated; Write: lecturers/admins only |
| `IsCourseInstructorOrAdmin` | courses/permissions.py | Safe methods: all; Modifications: course instructor or admin |

---

## API Endpoint Summary

### Authentication (`/api/`)

| Method | Endpoint | Permission |
|--------|----------|-----------|
| POST | `/api/token/` | AllowAny |
| POST | `/api/token/refresh/` | AllowAny |
| POST | `/api/accounts/register/` | AllowAny |
| POST | `/api/accounts/login/` | AllowAny |
| POST | `/api/accounts/logout/` | Authenticated |
| GET/PATCH | `/api/accounts/profile/` | Authenticated |
| POST | `/api/accounts/change-password/` | Authenticated |
| POST | `/api/accounts/password/reset/` | AllowAny |
| POST | `/api/accounts/password/reset/confirm/` | AllowAny |
| POST | `/api/accounts/guest/` | AllowAny |
| POST | `/api/accounts/convert-guest/` | Authenticated |

### Admin (`/api/accounts/`)

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/api/accounts/users/` | Admin |
| POST | `/api/accounts/users/create/` | Admin |
| GET/PATCH/PUT/DELETE | `/api/accounts/users/<id>/` | Admin |
| GET | `/api/accounts/users/search/?q=` | Authenticated |
| POST | `/api/accounts/bulk-import/` | LecturerOrAdmin |
| GET | `/api/accounts/dashboard-stats/` | Admin |
| GET/PUT | `/api/accounts/settings/` | Admin |
| GET | `/api/accounts/audit-logs/` | Admin |

### Notifications (`/api/accounts/`)

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/api/accounts/notifications/` | Authenticated |
| PATCH | `/api/accounts/notifications/<id>/read/` | Authenticated |
| POST | `/api/accounts/notifications/mark-all-read/` | Authenticated |
| GET | `/api/accounts/notifications/unread-count/` | Authenticated |

### Boards (`/api/boards/`)

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET/POST | `/api/boards/` | Authenticated + IsBoardOwnerOrShared |
| GET/PATCH/PUT/DELETE | `/api/boards/<id>/` | Authenticated + IsBoardOwnerOrShared |
| GET | `/api/boards/starred/` | Authenticated |
| GET | `/api/boards/archived/` | Authenticated |
| GET | `/api/boards/templates/` | Authenticated |
| POST | `/api/boards/<id>/toggle-star/` | Authenticated |
| POST | `/api/boards/<id>/archive/` | Authenticated (owner) |
| POST | `/api/boards/<id>/restore/` | Authenticated (owner) |
| POST | `/api/boards/<id>/leave/` | Authenticated |
| POST | `/api/boards/<id>/duplicate/` | Authenticated |
| GET | `/api/boards/<id>/versions/` | Authenticated |
| POST | `/api/boards/<id>/restore-version/` | Authenticated |
| POST | `/api/boards/<id>/submit-quiz-response/` | Authenticated (any access) |
| POST | `/api/boards/<id>/create-invite/` | Authenticated (owner) |
| GET | `/api/boards/<id>/invites/` | Authenticated (owner) |
| POST | `/api/boards/<id>/revoke-invite/` | Authenticated (owner) |
| GET/POST | `/api/boards/shares/` | Authenticated |
| GET/PATCH/PUT/DELETE | `/api/boards/shares/<id>/` | Authenticated |
| GET/POST | `/api/boards/join/<token>/` | Authenticated |

### Courses (`/api/courses/`)

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET/POST | `/api/courses/courses/` | Authenticated / LecturerOrAdmin (write) |
| GET/PATCH/PUT/DELETE | `/api/courses/courses/<id>/` | Authenticated / InstructorOrAdmin (write) |
| POST | `/api/courses/courses/<id>/enroll/` | Authenticated |
| POST | `/api/courses/courses/<id>/unenroll/` | Authenticated |
| POST | `/api/courses/courses/<id>/regenerate-invite/` | InstructorOrAdmin |
| POST | `/api/courses/courses/join-by-code/` | Authenticated |
| GET | `/api/courses/courses/invite-info/<code>/` | Authenticated |
| GET | `/api/courses/courses/<id>/analytics/` | Authenticated |
| GET/POST | `/api/courses/enrollments/` | Authenticated |
| GET/PATCH/PUT/DELETE | `/api/courses/enrollments/<id>/` | Authenticated |

### Files (`/api/files/`)

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET/POST | `/api/files/` | Authenticated |
| GET/PATCH/PUT/DELETE | `/api/files/<id>/` | Authenticated |
| GET | `/api/files/usage/` | Authenticated |
| GET | `/api/files/storage-stats/` | Admin |
| GET | `/api/files/large-files/` | Admin |
| GET | `/api/files/user-storage/` | Admin |

---

## Database Schema Overview

### Unique Constraints

| Model | Unique Fields |
|-------|--------------|
| User | (username), (email) |
| Institution | (domain), (code) |
| Course | (code), (invite_code) |
| Enrollment | (student, course) |
| BoardShare | (board, user) |
| StarredBoard | (user, board) |
| BoardVersion | (board, version_number) |
| SystemSettings | (key) |
| BoardInviteLink | (token) |

### Cascade Behavior

| Deleted Entity | Cascaded Deletions |
|---------------|-------------------|
| User | Owned boards, files, notifications, enrollments |
| Board | Shares, versions, invite links, starred entries |
| Course | Enrollments |
| Institution | Users' institution set to NULL |

### Migrations (Latest per App)

| App | Latest Migration |
|-----|-----------------|
| accounts | `0007_remove_assignment_notification_types` |
| boards | `0006_alter_board_board_type` |
| courses | `0003_course_invite_code` |
| files | `0001_initial` |

---

*Backend documentation updated for OpenCanvas — March 2026*
