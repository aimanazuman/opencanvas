# OpenCanvas - Comprehensive Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Authentication & Authorization](#authentication--authorization)
9. [Board System](#board-system)
10. [User Roles & Permissions](#user-roles--permissions)
11. [Features Overview](#features-overview)
12. [Docker Configuration](#docker-configuration)
13. [Demo Mode](#demo-mode)
14. [Data Flows](#data-flows)

---

## Overview

**OpenCanvas** is an educational collaborative whiteboard platform designed for academic institutions. It enables students, lecturers, and administrators to create, manage, and collaborate on digital boards tailored for educational use.

### Key Features

- 5 board templates: Course Material, Student Notes, Study Planner, Kanban, Quiz
- Board management: create, share, star, archive, duplicate, version history
- Role-based access control: Student, Lecturer, Admin
- Course and enrollment management with invite codes
- File uploads with storage quota management
- Board sharing with view / comment / edit permissions and invite links
- Quiz system with builder, player, and results modes
- Bulk student import via CSV/XLSX
- Notification system
- Guest access with account conversion

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI Framework |
| React Router DOM | 6.20.0 | Client-side routing |
| Konva | 9.2.0 | 2D canvas rendering (legacy) |
| React Konva | 18.2.10 | React bindings for Konva |
| Axios | 1.6.2 | HTTP client |
| Lucide React | 0.294.0 | Icon library |
| Tailwind CSS | 3.3.5 | Utility-first CSS |
| UUID | 9.0.1 | Unique ID generation |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Django | 4.2.7 | Web framework |
| Django REST Framework | 3.14.0 | REST API |
| djangorestframework-simplejwt | 5.3.0 | JWT authentication |
| MySQL | 8.x | Database (local, port 3306) |
| mysqlclient | 2.2.1 | MySQL adapter |
| django-cors-headers | 4.3.0 | CORS handling |
| django-filter | 23.5 | Queryset filtering |
| Pillow | 10.1.0 | Image processing |
| python-decouple | 3.8 | Environment management |
| openpyxl | 3.1.2 | Excel file parsing (bulk import) |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker & Docker Compose | Containerization (backend + frontend + MailHog) |
| MySQL 8.x (local) | Database on host machine, port 3306 |
| MailHog | Email testing (SMTP 1025, Web UI 8025) |

---

## Project Structure

```
opencanvas/
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx                    # Main routing (35 routes)
│       ├── index.js                   # Entry point
│       ├── index.css                  # Global styles + animations
│       ├── components/                # 39 components
│       │   ├── BulkImportModal.jsx
│       │   ├── GuestRegistrationModal.jsx
│       │   ├── LecturerLayout.jsx
│       │   ├── Navigation.jsx
│       │   ├── NotificationDropdown.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── SkeletonLoader.jsx
│       │   ├── Toast.jsx
│       │   ├── board/                 # Board components (13)
│       │   │   ├── AddBlockMenu.jsx
│       │   │   ├── BlockRenderer.jsx
│       │   │   ├── BoardHeader.jsx
│       │   │   ├── CommentThread.jsx
│       │   │   ├── DocumentPreviewModal.jsx
│       │   │   ├── InteractionPanel.jsx
│       │   │   ├── KanbanBoard.jsx
│       │   │   ├── LectureNotesBoard.jsx
│       │   │   ├── QuizBoard.jsx
│       │   │   ├── ShareModal.jsx
│       │   │   ├── StudentNotesBoard.jsx
│       │   │   ├── StudyPlannerBoard.jsx
│       │   │   ├── VersionHistoryPanel.jsx
│       │   │   ├── blocks/            # Content blocks (11)
│       │   │   └── kanban/            # Kanban sub-components (3)
│       │   └── ui/                    # Reusable UI (4)
│       ├── contexts/
│       │   ├── AuthContext.jsx
│       │   └── BoardContext.jsx
│       ├── hooks/
│       │   ├── useAutoSave.js
│       │   ├── useLecturerData.js
│       │   └── useStorageWarning.js
│       ├── pages/                     # 35 page files
│       │   ├── lecturer/              # 9 lecturer sub-pages
│       │   ├── student/               # 3 student sub-pages
│       │   └── templates/             # 6 template sub-pages
│       ├── services/
│       │   └── api.js                 # Axios API client
│       └── utils/
│           ├── boardHelpers.js
│           ├── fileUpload.js
│           ├── guestStorage.js
│           ├── mockData.js
│           └── templateDefinitions.js
│
├── backend/
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements.txt
│   ├── opencanvas/                    # Django project settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   └── apps/
│       ├── accounts/                  # Users, auth, admin, audit, notifications, bulk import
│       │   ├── models.py              # User, Institution, AuditLog, SystemSettings, Notification
│       │   ├── views.py
│       │   ├── serializers.py
│       │   ├── permissions.py
│       │   ├── urls.py
│       │   ├── audit.py               # Audit logging utility
│       │   ├── emails.py              # Email templates
│       │   ├── bulk_import.py          # CSV/XLSX import
│       │   └── notifications.py        # Notification helpers
│       ├── boards/                    # Board CRUD, sharing, versioning, invites, quiz
│       │   ├── models.py              # Board, BoardShare, StarredBoard, BoardVersion, BoardInviteLink
│       │   ├── views.py
│       │   ├── serializers.py
│       │   ├── permissions.py
│       │   └── urls.py
│       ├── courses/                   # Course & enrollment management
│       │   ├── models.py              # Course, Enrollment
│       │   ├── views.py
│       │   ├── serializers.py
│       │   ├── permissions.py
│       │   └── urls.py
│       └── files/                     # File uploads, storage
│           ├── models.py              # File
│           ├── views.py
│           ├── serializers.py
│           ├── storage.py              # Storage utility functions
│           └── urls.py
│
└── docs/
    ├── DOCUMENTATION.md               # This file
    └── BACKEND_DOCUMENTATION.md       # Detailed backend docs
```

---

## Frontend Architecture

### Routes (35 total)

| Path | Component | Auth | Role |
|------|-----------|------|------|
| `/` | HomePage | No | Any |
| `/login` | LoginPage | No | Any |
| `/lecturer-login` | LecturerLoginPage | No | Any |
| `/admin-login` | AdminLoginPage | No | Any |
| `/forgot-password` | ForgotPasswordPage | No | Any |
| `/dashboard` | DashboardPage (role router) | Yes | Any |
| `/workspace` | WorkspacePage | Yes | Any |
| `/admin` | AdminPage | Yes | Admin |
| `/lecturer` | LecturerDashboardPage | Yes | Lecturer |
| `/lecturer/boards` | LecturerBoardsPage | Yes | Lecturer |
| `/lecturer/courses` | LecturerCoursesPage | Yes | Lecturer |
| `/lecturer/students` | LecturerStudentsPage | Yes | Lecturer |
| `/lecturer/analytics` | LecturerAnalyticsPage | Yes | Lecturer |
| `/lecturer/settings` | LecturerSettingsPage | Yes | Lecturer |
| `/lecturer/shared` | LecturerSharedPage | Yes | Lecturer |
| `/lecturer/archive` | LecturerArchivePage | Yes | Lecturer |
| `/lecturer/profile` | LecturerProfilePage | Yes | Lecturer |
| `/lecturer/templates` | TemplatesPage | Yes | Lecturer |
| `/lecturer/notifications` | NotificationsPage | Yes | Lecturer |
| `/courses` | StudentCoursesPage | Yes | Any |
| `/courses/:courseId` | StudentCoursePage | Yes | Any |
| `/profile` | ProfilePage | Yes | Any |
| `/archive` | ArchivePage | Yes | Any |
| `/shared` | SharedPage | Yes | Any |
| `/templates` | TemplatesPage | Yes | Any |
| `/templates/course-material` | CourseMaterialTemplatePage | Yes | Lecturer |
| `/templates/student-notes` | StudentNotesTemplatePage | Yes | Any |
| `/templates/study-planner` | StudyPlannerTemplatePage | Yes | Any |
| `/templates/kanban` | KanbanTemplatePage | Yes | Any |
| `/templates/quiz` | QuizTemplatePage | Yes | Lecturer |
| `/settings` | SettingsPage | Yes | Any |
| `/notifications` | NotificationsPage | Yes | Any |
| `/join/:token` | JoinBoardPage | Yes | Any |
| `/join-course/:inviteCode` | JoinCoursePage | Yes | Any |

### State Management

#### AuthContext

Manages user authentication state:

```javascript
{
  user: { id, username, email, first_name, last_name, role, avatar, is_guest,
          storage_used, storage_quota, preferences, ... },
  isAuthenticated: boolean,
  loading: boolean,
  isGuest: boolean,
}
```

Provides: `login`, `loginAsGuest`, `register`, `logout`, `convertGuest`, `updateProfile`, `refreshUser`

#### BoardContext

Manages board editing state via `useReducer`:

```javascript
{
  board: { id, name, type, sections, columns, questions, responses, ... },
  isDirty: boolean,
  canEdit: boolean,
  canComment: boolean,
  history: Board[],         // up to 50 entries
  historyIndex: number,
}
```

Actions: `LOAD_BOARD`, `UPDATE_BOARD`, `SET_BOARD_NAME`, `UPDATE_SECTIONS`, `UPDATE_COLUMNS`, `UPDATE_SCHEDULE`, `UPDATE_WEEKLY_GOALS`, `ADD_COMMENT`, `UNDO`, `REDO`, `MARK_SAVED`, `ADD_PERSONAL_NOTE`, `REMOVE_PERSONAL_NOTE`, `TOGGLE_BOOKMARK`, `RECORD_INTERACTION`, `SET_TRACK_INTERACTIONS`, `SET_CAN_EDIT`, `SET_CAN_COMMENT`

Provides: `loadBoard`, `updateBoard`, `setBoardName`, `updateSections`, `updateColumns`, `addComment`, `addBlockToSection`, `updateBlockInSection`, `removeBlockFromSection`, `addPersonalNote`, `removePersonalNote`, `toggleBookmark`, `recordInteraction`, `undo`, `redo`, `markSaved`, and more.

### Hooks

| Hook | Purpose |
|------|---------|
| `useAutoSave` | Debounced auto-save (30s default) — triggers `handleSave` when `isDirty` |
| `useLecturerData` | Fetches courses, enrollments, stats for lecturer dashboard |
| `useStorageWarning` | Shows toast once per session if storage usage ≥ 80% |

### Components (39 total)

#### Root-Level (8)

| Component | Purpose |
|-----------|---------|
| BulkImportModal | 4-step CSV/XLSX bulk student import (upload → preview → import → results) |
| GuestRegistrationModal | Convert guest account to full account |
| LecturerLayout | Sidebar layout wrapper for all `/lecturer/*` routes |
| Navigation | Top nav bar with role-based links, notification dropdown |
| NotificationDropdown | Bell icon with unread badge, dropdown list, mark-all-read |
| ProtectedRoute | Route guard (auth required + optional role check) |
| SkeletonLoader | Loading placeholder states |
| Toast / ToastProvider | Toast notification system (success, error, warning, info) |

#### Board Components (13)

| Component | Purpose |
|-----------|---------|
| AddBlockMenu | Dropdown to add content blocks to sections |
| BlockRenderer | Renders block by type (text, image, video, file, etc.) |
| BoardHeader | Top bar: board name, save status, undo/redo, back, share, version history |
| CommentThread | Comment thread on blocks (gated by `canComment`) |
| DocumentPreviewModal | Preview uploaded documents |
| InteractionPanel | Right-side panel for lecturer (interaction tracking) |
| KanbanBoard | Full Kanban with flexible columns, media cards, role-based column management |
| LectureNotesBoard | Course Material template layout |
| QuizBoard | Quiz with Builder/Player/Results modes, immediate auto-save on submit |
| ShareModal | Board sharing: members tab + invite links tab, permission selector |
| StudentNotesBoard | Student Notes template (My Ideas, Questions, Key Points, etc.) |
| StudyPlannerBoard | Date-aware weekly timetable, week/month navigation, goals |
| VersionHistoryPanel | Slide-out panel, fetch/restore board versions |

#### Block Components (11)

AnnouncementBlock, AudioBlock, FileBlock, GoogleMeetBlock, ImageBlock, LinkEmbedBlock, PersonalNoteBlock, ProgressTrackerBlock, ResourceLibraryBlock, TextBlock, VideoBlock

#### Kanban Sub-Components (3)

KanbanAddCard, KanbanCard, KanbanCardDetail

#### UI Components (4)

ConfirmModal, EmptyState, SearchBar, StatCard

### CSS Animations

| Animation | Usage |
|-----------|-------|
| `animate-fadeIn` | Page transitions |
| `animate-scaleIn` | Modals, confirmation dialogs |
| `animate-slideDown` | Dropdowns, menus |
| `animate-slideUp` | Toast notifications |
| `animate-slideRight` | Version history panel |
| `animate-backdropFade` | Modal backdrops |
| Skeleton shimmer | Loading states |

### Accessibility

- `aria-label` on icon-only buttons
- `role="dialog"` on modals
- Escape key closes modals
- `focus-visible` ring styles

---

## Backend Architecture

See [BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md) for detailed backend documentation including all models, fields, API endpoints, and permissions.

### Django Apps (4)

| App | Purpose |
|-----|---------|
| accounts | Users, institutions, auth, admin tools, audit logs, notifications, system settings, bulk import |
| boards | Board CRUD, sharing, versioning, invite links, quiz response submission |
| courses | Course management, enrollment, invite codes |
| files | File uploads, storage tracking, admin storage stats |

---

## Database Schema

### Models Summary

| App | Model | Key Fields |
|-----|-------|------------|
| accounts | **User** | role, is_guest, avatar, bio, institution, storage_quota, storage_used, preferences |
| accounts | **Institution** | name, domain (unique), code (unique), is_active |
| accounts | **AuditLog** | user, action, resource_type, resource_id, details, ip_address |
| accounts | **SystemSettings** | key (unique), value, updated_by |
| accounts | **Notification** | user, type, title, message, is_read, related_board, related_user |
| boards | **Board** | name, owner, course, content (JSON), content_size, board_type, is_archived, section |
| boards | **BoardShare** | board, user, permission (view/comment/edit) |
| boards | **StarredBoard** | user, board |
| boards | **BoardVersion** | board, content, version_number, created_by |
| boards | **BoardInviteLink** | board, token, permission, expires_at, max_uses, use_count, is_active |
| courses | **Course** | name, code (unique), instructor, sections, invite_code (unique), is_active |
| courses | **Enrollment** | student, course, status, section |
| files | **File** | name, file, file_type, file_size, mime_type, uploaded_by, board, is_deleted |

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
| Institution | Users' institution field set to NULL |

---

## API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/token/` | No | Obtain JWT tokens |
| POST | `/api/token/refresh/` | No | Refresh access token |
| POST | `/api/accounts/register/` | No | Register new user |
| POST | `/api/accounts/login/` | No | Login (returns tokens + user) |
| POST | `/api/accounts/logout/` | Yes | Logout (blacklists refresh) |
| GET/PATCH | `/api/accounts/profile/` | Yes | Get / update profile |
| POST | `/api/accounts/change-password/` | Yes | Change password |
| POST | `/api/accounts/password/reset/` | No | Request password reset |
| POST | `/api/accounts/password/reset/confirm/` | No | Confirm reset |
| POST | `/api/accounts/guest/` | No | Create guest account |
| POST | `/api/accounts/convert-guest/` | Yes | Convert guest → full |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/users/` | List users (filter: role, search) |
| POST | `/api/accounts/users/create/` | Create user |
| GET/PATCH/PUT/DELETE | `/api/accounts/users/<id>/` | User CRUD |
| GET | `/api/accounts/users/search/?q=` | Search users |
| POST | `/api/accounts/bulk-import/` | Bulk student import |
| GET | `/api/accounts/dashboard-stats/` | System stats |
| GET/PUT | `/api/accounts/settings/` | System settings |
| GET | `/api/accounts/audit-logs/` | Audit logs |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts/notifications/` | List notifications |
| PATCH | `/api/accounts/notifications/<id>/read/` | Mark read |
| POST | `/api/accounts/notifications/mark-all-read/` | Mark all read |
| GET | `/api/accounts/notifications/unread-count/` | Unread count |

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/boards/` | List / create boards |
| GET/PATCH/PUT/DELETE | `/api/boards/<id>/` | Board CRUD |
| GET | `/api/boards/starred/` | Starred boards |
| GET | `/api/boards/archived/` | Archived boards |
| GET | `/api/boards/templates/` | Template boards |
| POST | `/api/boards/<id>/toggle-star/` | Toggle star |
| POST | `/api/boards/<id>/archive/` | Archive board |
| POST | `/api/boards/<id>/restore/` | Restore from archive |
| POST | `/api/boards/<id>/leave/` | Leave shared board |
| POST | `/api/boards/<id>/duplicate/` | Duplicate board |
| GET | `/api/boards/<id>/versions/` | Version history |
| POST | `/api/boards/<id>/restore-version/` | Restore version |
| POST | `/api/boards/<id>/submit-quiz-response/` | Submit quiz response |
| POST | `/api/boards/<id>/create-invite/` | Create invite link |
| GET | `/api/boards/<id>/invites/` | List invite links |
| POST | `/api/boards/<id>/revoke-invite/` | Revoke invite link |
| GET/POST | `/api/boards/shares/` | List / create shares |
| GET/PATCH/PUT/DELETE | `/api/boards/shares/<id>/` | Share CRUD |
| GET/POST | `/api/boards/join/<token>/` | Preview / join via invite |

### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/courses/courses/` | List / create courses |
| GET/PATCH/PUT/DELETE | `/api/courses/courses/<id>/` | Course CRUD |
| POST | `/api/courses/courses/<id>/enroll/` | Enroll |
| POST | `/api/courses/courses/<id>/unenroll/` | Unenroll |
| POST | `/api/courses/courses/<id>/regenerate-invite/` | Regenerate invite code |
| POST | `/api/courses/courses/join-by-code/` | Join via invite code |
| GET | `/api/courses/courses/invite-info/<code>/` | Preview from invite code |
| GET | `/api/courses/courses/<id>/analytics/` | Course analytics |
| GET/POST | `/api/courses/enrollments/` | List / create enrollments |
| GET/PATCH/PUT/DELETE | `/api/courses/enrollments/<id>/` | Enrollment CRUD |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/files/` | List / upload files |
| GET/PATCH/PUT/DELETE | `/api/files/<id>/` | File CRUD (delete = soft delete) |
| GET | `/api/files/usage/` | Storage usage |
| GET | `/api/files/storage-stats/` | System storage stats (admin) |
| GET | `/api/files/large-files/` | Top 20 largest files (admin) |
| GET | `/api/files/user-storage/` | Per-user storage breakdown (admin) |

---

## Authentication & Authorization

### JWT Token Flow

```
1. User Login
   POST /api/accounts/login/
   Request:  { username, password }
   Response: { user, tokens: { access, refresh } }

2. Authenticated Requests
   Header: Authorization: Bearer <access_token>

3. Token Refresh (when access token expires)
   POST /api/token/refresh/
   Request:  { refresh: <refresh_token> }
   Response: { access: <new_access_token> }

4. Logout
   POST /api/accounts/logout/
   Request:  { refresh_token }
   (Blacklists the refresh token)
```

### Token Lifetimes

- Access Token: 60 minutes
- Refresh Token: 7 days
- Token Rotation: Enabled
- Token Blacklisting: Enabled

### Permission Classes

| Permission | Description |
|------------|-------------|
| `IsAuthenticated` | User must be logged in |
| `IsAdminUser` | User must have admin role |
| `IsLecturerOrAdmin` | User must be lecturer or admin |
| `IsStudentUser` | User must be student |
| `IsBoardOwnerOrShared` | User owns board or has share/course access |
| `IsBoardOwner` | User must own the board |
| `IsCourseInstructorOrAdmin` | User teaches course or is admin |

---

## Board System

### Board Types

| Template | `board_type` | Create Permission | Description |
|----------|-------------|-------------------|-------------|
| Course Material | `course-material` | Lecturer, Admin | Structured sections with content blocks (text, image, video, file, etc.) |
| Student Notes | `student-notes` | Student | Brainstorming: My Ideas, Questions, Key Points, References, Shared Notes |
| Study Planner | `study-planner` | All | Date-aware weekly timetable, week/month navigation, per-week goals, copy-to-next-week |
| Kanban Board | `kanban` | All | Flexible columns, media cards (files, images, links), role-based column management |
| Quiz | `quiz` | Lecturer, Admin | MCQ, True/False, Fill-in-blank; Builder/Player/Results modes |

### Board Sharing

- **Permission levels**: view, comment, edit
- **Invite links**: token-based, with optional expiration and max uses
- **Comment users**: read access + can add cards/comments, delete own cards
- **Course-based access**: instructor gets full access, enrolled students get view access

### Kanban Column Permissions

- Board creator and users with edit permission can manage columns (add/rename/delete)
- Comment-permission users can add cards and delete own cards
- Students with view-only access can only view

### Quiz Architecture

- Questions, settings, and responses all stored in `board.content` JSON (no separate model)
- Question types: MCQ (multiple choice), True/False, Fill-in-the-blank
- Per-question time limit and point value
- Overall timer across all questions
- Settings: shuffle questions, show results, allow retake
- Response submission via dedicated `POST /submit-quiz-response/` endpoint
- Server-side merge prevents race conditions between concurrent student submissions
- View-only students can submit responses (bypasses normal edit permission)
- Auto-saves immediately on completion — no unsaved changes prompt
- Leaderboard shows student names (attached server-side)

### Board Saving

- **Auto-save**: 30-second debounced timer via `useAutoSave` hook
- **Manual save**: Ctrl+S keyboard shortcut
- **Version snapshots**: created automatically on every content save
- **Unsaved changes guard**: `beforeunload` browser warning + in-app modal on back button
- **Quiz exception**: quiz responses save immediately and clear `isDirty`

### Version History

- Auto-created on every board content save
- Slide-out panel shows all versions with timestamps
- Restore to any previous version (creates new snapshot before restoring)

---

## User Roles & Permissions

### Role Hierarchy

```
Admin
  └── Lecturer
        └── Student
              └── Guest (limited, convertible)
```

### Permissions by Role

| Feature | Student | Lecturer | Admin |
|---------|---------|----------|-------|
| Create boards | Yes | Yes | Yes |
| View own boards | Yes | Yes | Yes |
| View shared boards | Yes | Yes | Yes |
| Share boards | Yes | Yes | Yes |
| Take quizzes | Yes | Yes | Yes |
| Create quizzes | No | Yes | Yes |
| Create courses | No | Yes | Yes |
| Manage courses | No | Own only | All |
| Manage users | No | No | Yes |
| System settings | No | No | Yes |
| View analytics | No | Course only | All |
| Storage management | No | No | Yes |
| Bulk import students | No | Yes | Yes |

### Admin Panel Sections

| Section | Description |
|---------|-------------|
| Dashboard | System stats, health indicators, monthly operations, activity feed |
| User Management | CRUD users, search, role filter, bulk import |
| Storage Management | Stats by type, large files, per-user breakdown with progress bars, system limit |
| System Settings | General (site name, default quota, system limit), security, toggles |
| Logs & Audit | Filterable activity log viewer |

---

## Features Overview

### Board Management

| Feature | Description |
|---------|-------------|
| Create | New board from template or blank |
| Edit | Full board editor with type-specific UI |
| Star | Mark favorites for quick access |
| Archive | Soft-delete, recoverable |
| Share | View / comment / edit permissions + invite links |
| Duplicate | Create copy of board |
| Versions | Auto-saved history, restore any version |

### File Upload & Storage

- Upload via Files API (50 MB max per file)
- Auto-detected file types: image, video, document, other
- Storage quota per user (default 5 GB, configurable by admin)
- System-wide storage limit (optional)
- Effective quota = min(user quota, system limit)
- Storage threshold notifications at 80% / 90% / 100%
- Login-time toast warning for high storage usage
- Soft delete with storage reclamation
- Board content size tracked separately

### Notifications

| Type | Trigger |
|------|---------|
| board_shared | Board shared with user |
| course_enrolled | Enrolled in course |
| invite_accepted | Someone joined via your invite |
| quota_changed | Admin changed user's quota |
| storage_warning | Storage threshold reached |
| system_announcement | Admin broadcast |

### Bulk Student Import

- CSV or XLSX file upload
- 4-step flow: upload → preview → importing → results
- Auto-generates usernames and passwords
- Optional course enrollment
- Welcome email via MailHog
- Available to lecturers and admins

---

## Docker Configuration

### Services

```yaml
services:
  backend:
    build: ./backend
    ports: "8000:8000"
    command: python manage.py migrate && python manage.py runserver 0.0.0.0:8000
    environment:
      - DB_HOST=host.docker.internal
      - DB_PORT=3306
      - EMAIL_HOST=mailhog
      - EMAIL_PORT=1025

  frontend:
    build: ./frontend
    ports: "3000:3000"
    command: npm install && npm start
    environment:
      - REACT_APP_API_URL=http://localhost:8000/api

  mailhog:
    image: mailhog/mailhog
    ports: "1025:1025" / "8025:8025"
```

MySQL runs locally on the host (not containerized).

### Running

```bash
docker-compose up          # Start all services
docker-compose up -d       # Start in background
docker-compose logs -f     # View logs
docker-compose down        # Stop services
docker-compose up --build  # Rebuild after changes
```

### Port Mapping

| Service | Port |
|---------|------|
| MySQL (local) | 3306 |
| Backend (Django) | 8000 |
| Frontend (React) | 3000 |
| MailHog SMTP | 1025 |
| MailHog Web UI | 8025 |

---

## Demo Mode

### Enabling

In `frontend/src/contexts/AuthContext.jsx`:
```javascript
const DEMO_MODE = true;  // Set to false for production
```

### Features

- Accepts any credentials for login
- Creates demo user in localStorage
- Uses `demo_token` instead of real JWT
- Frontend fully functional without backend
- Role determined by username: 'admin' → admin, 'lecturer' → lecturer, others → student

---

## Data Flows

### Login Flow

```
User enters credentials → LoginPage → AuthContext.login()
  → POST /api/accounts/login/
  → Store tokens in localStorage
  → Set user state
  → Redirect to role-appropriate dashboard
    (student → /dashboard, lecturer → /lecturer, admin → /admin)
```

### Board Editing Flow

```
Open board → WorkspacePage loads via boardsApi.get(id)
  → BoardContext.loadBoard(data) → isDirty = false
  → User edits → updateBoard/updateSections/etc. → isDirty = true
  → Auto-save (30s) or Ctrl+S → boardsApi.update() → markSaved() → isDirty = false
  → Backend creates version snapshot on content change
```

### Quiz Submission Flow

```
Student opens quiz → Player mode (start screen → questions → finish)
  → Score calculated client-side
  → POST /api/boards/<id>/submit-quiz-response/ (server-side merge)
  → updateBoard({ responses }) + markSaved() → isDirty stays false
  → Student sees results, can leave without save prompt
  → Lecturer opens board → Results tab → sees all responses in leaderboard
```

### File Upload Flow

```
Select file → FormData (file + name + board)
  → POST /api/files/ (multipart)
  → Backend validates (50MB max, quota check)
  → File saved to backend/media/uploads/
  → user.storage_used updated
  → Threshold notification at 80%/90%/100%
  → Returns { id, url, name, file_size, file_type, mime_type }
```

---

## Environment Variables

### Backend (via Docker Compose)

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

### Frontend

```
REACT_APP_API_URL=http://localhost:8000/api
```

---

## Security Notes

1. JWT tokens stored in localStorage (consider httpOnly cookies for production)
2. CORS configured for localhost only
3. File uploads validated by size (50 MB), storage quota enforced
4. Django ORM prevents SQL injection
5. Role-based permissions at view and object level
6. Maintenance mode middleware blocks non-admin access
7. Username/email change cooldowns and limits
8. HTTPS not configured (required for production)
9. Rate limiting not implemented (recommended for production)

---

## Migrations (Latest per App)

| App | Latest Migration |
|-----|-----------------|
| accounts | `0007_remove_assignment_notification_types` |
| boards | `0006_alter_board_board_type` |
| courses | `0003_course_invite_code` |
| files | `0001_initial` |

---

*Documentation updated for OpenCanvas — March 2026*
