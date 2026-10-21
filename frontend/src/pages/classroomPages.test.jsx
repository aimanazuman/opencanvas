/**
 * Render checks for the classroom-restyled pages: notifications (list, filter, empty, error), join board,
 * join course, profile (ID card, storage status, edit) and settings (switch rows, password dialog with
 * show/hide, delete confirmation). API and auth are mocked; the test checks states, names and handlers.
 */
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { notificationsApi, inviteApi, coursesApi, boardsApi, authApi, filesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import NotificationsPage from './NotificationsPage';
import JoinBoardPage from './JoinBoardPage';
import JoinCoursePage from './JoinCoursePage';
import ProfilePage from './ProfilePage';
import SettingsPage from './SettingsPage';

jest.mock('../services/api', () => ({
  notificationsApi: { getAll: jest.fn(), markAllRead: jest.fn(), markRead: jest.fn() },
  inviteApi: { getInfo: jest.fn(), join: jest.fn() },
  coursesApi: { getInviteInfo: jest.fn(), joinByCode: jest.fn() },
  boardsApi: { getAll: jest.fn() },
  filesApi: { getUsage: jest.fn() },
  authApi: { updateProfile: jest.fn(), changePassword: jest.fn(), exportData: jest.fn(), deleteAccount: jest.fn() },
}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/Navigation', () => () => null);

function makeUser(overrides = {}) {
  return {
    role: 'student',
    first_name: 'Ada',
    last_name: 'Lovelace',
    username: 'ada',
    email: 'ada@example.com',
    bio: '',
    date_joined: '2024-01-15T00:00:00Z',
    storage_used: 0,
    storage_quota: 1000,
    institution_name: 'Demo University',
    ...overrides,
  };
}

const NOW = new Date().toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  filesApi.getUsage.mockRejectedValue(new Error('offline')); // fall back to the figures on the user object
  useAuth.mockReturnValue({ user: makeUser(), refreshUser: jest.fn(), logout: jest.fn() });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// React's own warnings (keys, unknown props, invalid nesting) fail the test. App-level console.error logs are
// expected in the error-state tests and are not React warnings, so they are not counted. The act() notices are
// harness timing: a mocked promise can settle after a test's last await.
afterEach(() => {
  const reactWarnings = console.error.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => t.startsWith('Warning:') && !/not wrapped in act|ReactDOMTestUtils\.act/.test(t));
  console.error.mockRestore();
  expect(reactWarnings).toEqual([]);
});

describe('NotificationsPage', () => {
  test('lists notifications with the static type label and marks an unread one read', async () => {
    notificationsApi.getAll.mockResolvedValue({
      data: [
        { id: 1, type: 'board_shared', message: 'Ada shared Lab notes', is_read: false, created_at: NOW },
        { id: 2, type: 'file_deleted', message: 'A file was removed', is_read: true, created_at: NOW },
      ],
    });
    notificationsApi.markRead.mockResolvedValue({});
    render(<MemoryRouter><NotificationsPage onNavigate={jest.fn()} hideNav /></MemoryRouter>);

    expect(await screen.findByText('Ada shared Lab notes')).toBeInTheDocument();
    // "Shared" and "File Removed" are also filter labels, so query inside the list.
    const list = screen.getByRole('list', { name: 'Notifications' });
    expect(within(list).getByText('File Removed')).toBeInTheDocument();
    expect(within(list).getByText('Shared')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ada shared Lab notes/ }));
    await waitFor(() => expect(notificationsApi.markRead).toHaveBeenCalledWith(1));
  });

  test('a filter with no matches shows the empty state with its own label', async () => {
    notificationsApi.getAll.mockResolvedValue({
      data: [{ id: 1, type: 'board_shared', message: 'Shared item', is_read: true, created_at: NOW }],
    });
    render(<MemoryRouter><NotificationsPage onNavigate={jest.fn()} hideNav /></MemoryRouter>);
    await screen.findByText('Shared item');

    const storage = screen.getByRole('button', { name: 'Storage' });
    expect(storage).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(storage);
    expect(storage).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No storage notifications to show.')).toBeInTheDocument();
  });

  test('a failed load shows an alert with a retry control', async () => {
    notificationsApi.getAll.mockRejectedValueOnce(new Error('offline'));
    notificationsApi.getAll.mockResolvedValueOnce({ data: [] });
    render(<MemoryRouter><NotificationsPage onNavigate={jest.fn()} hideNav /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your notifications.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No notifications')).toBeInTheDocument();
  });
});

describe('JoinBoardPage', () => {
  function renderAt(path, props = {}) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/join/:token" element={<JoinBoardPage onNavigate={props.onNavigate || jest.fn()} />} />
        </Routes>
      </MemoryRouter>
    );
  }

  test('shows the invite, the board type tag and joins the board', async () => {
    inviteApi.getInfo.mockResolvedValue({
      data: { board_name: 'Week 1 notes', owner_name: 'Dr Lee', permission: 'edit', board_type: 'student-notes', already_member: false },
    });
    inviteApi.join.mockResolvedValue({ data: { board_id: 9 } });
    const onNavigate = jest.fn();
    renderAt('/join/abc', { onNavigate });

    expect(await screen.findByRole('heading', { level: 1, name: "You're invited" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Week 1 notes' })).toBeInTheDocument();
    expect(screen.getByText('Student Notes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Join Board' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Joined successfully' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Board' }));
    expect(onNavigate).toHaveBeenCalledWith('workspace', { boardId: 9 });
  });

  test('an invalid invite shows the error as an alert', async () => {
    inviteApi.getInfo.mockRejectedValue({ response: { status: 404 } });
    renderAt('/join/missing');

    expect(await screen.findByRole('alert')).toHaveTextContent('This invite link is invalid.');
    expect(screen.getByRole('heading', { level: 1, name: 'Invalid invite' })).toBeInTheDocument();
  });
});

describe('JoinCoursePage', () => {
  test('shows the course, sends the chosen section and confirms enrolment', async () => {
    coursesApi.getInviteInfo.mockResolvedValue({
      data: {
        code: 'CS101', name: 'Intro to Computing', description: 'Basics', instructor_name: 'Dr Lee',
        student_count: 30, sections: ['A', 'B'], is_enrolled: false,
      },
    });
    coursesApi.joinByCode.mockResolvedValue({});
    render(
      <MemoryRouter initialEntries={['/join-course/XYZ']}>
        <Routes>
          <Route path="/join-course/:inviteCode" element={<JoinCoursePage onNavigate={jest.fn()} />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('CS101')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Select section (optional)'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join Course' }));
    await waitFor(() => expect(coursesApi.joinByCode).toHaveBeenCalledWith({ invite_code: 'XYZ', section: 'B' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Successfully enrolled' })).toBeInTheDocument();
  });
});

describe('ProfilePage', () => {
  test('shows the ID card, a storage warning with text and icon, and an empty boards state', async () => {
    boardsApi.getAll.mockResolvedValue({ data: [] });
    useAuth.mockReturnValue({ user: makeUser({ storage_used: 950 }), refreshUser: jest.fn() });
    render(<MemoryRouter><ProfilePage onNavigate={jest.fn()} hideNav /></MemoryRouter>);

    expect(await screen.findByRole('heading', { level: 2, name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByText('Demo University')).toBeInTheDocument();
    expect(await screen.findByText('Almost full')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Storage used' })).toHaveAttribute('aria-valuenow', '95');
    expect(screen.getByText('No boards yet')).toBeInTheDocument();
  });

  test('edit mode shows labelled fields and saves the changed names', async () => {
    boardsApi.getAll.mockResolvedValue({ data: [] });
    authApi.updateProfile.mockResolvedValue({});
    render(<MemoryRouter><ProfilePage onNavigate={jest.fn()} hideNav /></MemoryRouter>);
    await screen.findByRole('heading', { level: 2, name: 'Ada Lovelace' });

    fireEvent.click(screen.getByRole('button', { name: 'Edit Profile' }));
    const first = screen.getByLabelText('First name');
    fireEvent.change(first, { target: { value: 'Augusta' } });
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(authApi.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: 'Augusta', last_name: 'Lovelace' })
    ));
  });
});

describe('SettingsPage', () => {
  function renderSettings() {
    return render(<MemoryRouter><SettingsPage onNavigate={jest.fn()} /></MemoryRouter>);
  }

  test('switch rows are named checkboxes that toggle', () => {
    renderSettings();
    const push = screen.getByRole('checkbox', { name: /Push Notifications/ });
    expect(push).not.toBeChecked();
    fireEvent.click(push);
    expect(push).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Email Notifications/ })).toBeChecked();
  });

  test('the password dialog labels its fields and the show control reveals the value', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    const dialog = screen.getByRole('dialog', { name: 'Change Password' });
    const current = within(dialog).getByLabelText('Current Password');
    expect(current).toHaveAttribute('type', 'password');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Show current password' }));
    expect(current).toHaveAttribute('type', 'text');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Hide current password' }));
    expect(current).toHaveAttribute('type', 'password');
  });

  test('account deletion stays disabled until DELETE is typed', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Account' });
    const confirm = within(dialog).getByRole('button', { name: 'Delete Account' });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('Type DELETE to confirm'), { target: { value: 'DELETE' } });
    expect(confirm).toBeEnabled();
  });
});
