// Fake axios for render smoke tests. Used through: jest.mock('axios', () => require('./testUtils/axiosMock').axiosModule)
// Answers every request from in-memory fixtures; nothing touches the network.
// Lists are arrays that also carry `results` and `count`, so both `res.data.map` and `res.data.results` work.
const { DEMO_BOARDS, DEMO_COURSES, DEMO_USERS } = require('../utils/mockData');

const state = { role: null };

const USERS = {
  student: { id: 2, username: 'ahmad', email: 'ahmad@student.example.com', first_name: 'Ahmad', last_name: 'Razak', role: 'student', student_id: 'STU1', is_guest: false },
  lecturer: { id: 1, username: 'lecturer', email: 'lecturer@example.com', first_name: 'Sarah', last_name: 'Johnson', role: 'lecturer', staff_id: 'STF1', is_guest: false },
  guest: { id: 5, username: 'guest_1', email: '', first_name: 'Guest', last_name: 'One', role: 'student', is_guest: true, guest_expires_at: new Date(Date.now() + 2 * 86400000).toISOString() },
  admin: { id: 9, username: 'admin', email: 'admin@example.com', first_name: 'Ad', last_name: 'Min', role: 'admin', staff_id: 'STF9', is_guest: false },
};

function list(items) {
  const arr = [...items];
  arr.results = items;
  arr.count = items.length;
  return arr;
}

const COURSES = DEMO_COURSES.map((c) => ({
  ...c,
  lecturer_name: 'Sarah Johnson',
  enrolled_count: 2,
  student_count: 2,
  invite_code: 'ABC123',
  description: 'Course',
  is_enrolled: true,
}));

const BOARDS = DEMO_BOARDS.map((b, i) => ({
  id: i + 1,
  name: b.name,
  board_type: b.type === 'lecture-notes' ? 'course-material' : b.type,
  course: 1,
  course_name: b.course_name,
  is_starred: !!b.is_starred,
  is_archived: false,
  can_edit: true,
  can_comment: true,
  owner: DEMO_USERS.lecturer,
  owner_name: 'Sarah Johnson',
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  content: { ...b },
}));

const NOTIFICATIONS = [
  { id: 1, title: 'Hello', message: 'A message', is_read: false, created_at: new Date().toISOString(), notification_type: 'info' },
];

function respond(method, url) {
  const path = String(url).split('?')[0];
  let m;
  if (path.includes('/accounts/profile')) return USERS[state.role] || USERS.student;
  if (path.includes('/accounts/notifications/unread-count')) return { count: 1, unread_count: 1 };
  if (path.includes('/accounts/notifications')) return list(NOTIFICATIONS);
  if (path.includes('/accounts/dashboard-stats')) {
    return {
      total_users: 3, total_boards: 3, total_courses: 3, total_files: 0, active_users: 2,
      users_by_role: { student: 2, lecturer: 1, admin: 0 }, recent_activity: [], storage_used: 0,
    };
  }
  if (path.includes('/accounts/settings')) return { maintenance_mode: false, allow_registration: true };
  if (path.includes('/accounts/audit-logs')) return list([]);
  if (path.includes('/accounts/guests')) return list([]);
  if (path.includes('/accounts/users')) return list(Object.values(USERS));
  if (path.includes('/files/usage')) return { storage_used: 0, storage_quota: 1000, raw_storage_quota: 1000, storage_used_bytes: 0, storage_quota_bytes: 1000, percentage_used: 0 };
  if (path.includes('/files/storage-stats')) return { total_used: 0, total_files: 0, by_type: {}, users: [] };
  if (path.includes('/files')) return list([]);
  if (path.includes('/courses/enrollments')) return list([]);
  if ((m = path.match(/\/courses\/courses\/invite-info\//))) return { id: 1, name: 'Web', code: 'CS301', lecturer_name: 'Sarah' };
  if ((m = path.match(/\/courses\/courses\/(\d+)\//))) return COURSES.find((c) => c.id === Number(m[1])) || COURSES[0];
  if (path.includes('/courses/courses')) return list(COURSES);
  if (path.match(/\/boards\/join\//)) return { board_name: 'Shared board', board_id: 1, permission: 'view', expired: false, board: BOARDS[0] };
  if (path.includes('/boards/shares')) return list([]);
  if (path.match(/\/boards\/\d+\/versions/)) return list([]);
  if (path.match(/\/boards\/\d+\/invites/)) return list([]);
  if ((m = path.match(/\/boards\/(\d+)\/$/)) && method === 'get') return BOARDS.find((b) => b.id === Number(m[1])) || BOARDS[0];
  if (path.includes('/boards')) return list(BOARDS);
  return {};
}

function makeInstance() {
  const call = (method) => (url) => Promise.resolve({ data: respond(method, url), status: 200, headers: {} });
  return {
    get: call('get'),
    post: call('post'),
    put: call('put'),
    patch: call('patch'),
    delete: call('delete'),
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
    defaults: { headers: { common: {} } },
  };
}

const instance = makeInstance();
const axiosModule = {
  __esModule: true,
  default: { create: () => instance, post: instance.post, get: instance.get, isAxiosError: () => false },
  ...{ create: () => instance },
};

module.exports = {
  axiosModule,
  USERS,
  state,
  setRole(role) { state.role = role; },
};
