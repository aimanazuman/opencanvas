/**
 * Render checks for the lecturer shell and first pages: the rail and bottom bar (nine destinations, active item,
 * collapse, account menu), the dashboard (real data, empty, loading, error and retry), the settings page
 * (named switches, save, save error) and the profile page reusing ProfilePage without the layout chrome.
 * API, auth, the notification bell and the storage hook are mocked; the tests check states, names and handlers.
 */
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { boardsApi, coursesApi, enrollmentsApi, authApi, filesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { dateLabelFor } from './student/studentMappings';
import LecturerLayout from '../components/LecturerLayout';
import LecturerDashboardPage from './lecturer/LecturerDashboardPage';
import LecturerSettingsPage from './lecturer/LecturerSettingsPage';
import LecturerProfilePage from './lecturer/LecturerProfilePage';

jest.mock('../services/api', () => ({
  boardsApi: { getAll: jest.fn(), toggleStar: jest.fn() },
  coursesApi: { getAll: jest.fn() },
  enrollmentsApi: { getAll: jest.fn() },
  filesApi: { getUsage: jest.fn() },
  authApi: { updateProfile: jest.fn(), changePassword: jest.fn(), exportData: jest.fn(), deleteAccount: jest.fn() },
}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
// The notification bell has its own tests; here it is a plain button so the layout can be checked in isolation.
jest.mock('../components/NotificationDropdown', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('button', { type: 'button' }, 'Notifications stub') };
});
jest.mock('../hooks/useStorageWarning', () => ({ __esModule: true, default: () => undefined }));

const NOW = new Date().toISOString();

function makeUser(overrides = {}) {
  return {
    role: 'lecturer',
    first_name: 'Ada',
    last_name: 'Lovelace',
    username: 'ada',
    email: 'lecturer@example.com',
    bio: '',
    date_joined: '2024-01-15T00:00:00Z',
    storage_used: 0,
    storage_quota: 1000,
    institution_name: 'Demo University',
    ...overrides,
  };
}

// Shows the current path so tests can check where a control sent the user.
function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

const COURSE = {
  id: 1,
  code: 'CS101',
  name: 'Intro to Computing',
  student_count: 30,
  board_count: 4,
  is_active: true,
  created_at: '2026-01-10T00:00:00Z',
};

const ENROLMENT = {
  id: 7,
  student: 5,
  course: 1,
  status: 'active',
  section: 'A',
  enrolled_at: NOW,
  student_details: { id: 5, first_name: 'Grace', last_name: 'Hopper', username: 'grace' },
  course_details: { id: 1, code: 'CS101' },
};

const BOARDS = [
  { id: 10, name: 'Week 1 notes', board_type: 'course-material', course_name: 'CS101', is_starred: true, updated_at: NOW },
  { id: 11, name: 'Lab sheet', board_type: 'kanban', course_name: null, is_starred: false, updated_at: NOW },
];

beforeEach(() => {
  jest.clearAllMocks();
  filesApi.getUsage.mockRejectedValue(new Error('offline')); // fall back to the figures on the user object
  useAuth.mockReturnValue({ user: makeUser(), isGuest: false, refreshUser: jest.fn(), logout: jest.fn() });
  boardsApi.getAll.mockResolvedValue({ data: [] });
  coursesApi.getAll.mockResolvedValue({ data: [] });
  enrollmentsApi.getAll.mockResolvedValue({ data: [] });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// React's own warnings (keys, unknown props, invalid nesting) fail the test. Expected app-level error logs
// (failed loads) and act() notices are not counted.
afterEach(() => {
  const reactWarnings = console.error.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => t.startsWith('Warning:') && !/not wrapped in act|ReactDOMTestUtils\.act/.test(t));
  console.error.mockRestore();
  expect(reactWarnings).toEqual([]);
});

const LECTURER_LABELS = [
  'Overview', 'My Boards', 'My Courses', 'Students', 'Analytics', 'Templates', 'Shared', 'Archive', 'Settings',
];

describe('LecturerLayout', () => {
  function renderLayout(path = '/lecturer/boards', onNavigate = jest.fn()) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <LecturerLayout onNavigate={onNavigate}>
          <p>Page body</p>
        </LecturerLayout>
      </MemoryRouter>
    );
  }

  test('the rail and the bottom bar each list the nine destinations', () => {
    renderLayout();
    const rail = screen.getByRole('complementary', { name: 'Lecturer navigation' });
    const bottom = screen.getByRole('navigation', { name: 'Lecturer' });
    expect(within(rail).getAllByRole('button').filter((b) => LECTURER_LABELS.includes(b.getAttribute('aria-label')))).toHaveLength(9);
    LECTURER_LABELS.forEach((label) => {
      expect(within(bottom).getByRole('button', { name: label })).toBeInTheDocument();
    });
    expect(screen.getByText('Page body')).toBeInTheDocument();
  });

  test('the active destination is marked with aria-current in both bars', () => {
    renderLayout('/lecturer/boards');
    const rail = screen.getByRole('complementary', { name: 'Lecturer navigation' });
    const bottom = screen.getByRole('navigation', { name: 'Lecturer' });
    expect(within(rail).getByRole('button', { name: 'My Boards' })).toHaveAttribute('aria-current', 'page');
    expect(within(bottom).getByRole('button', { name: 'My Boards' })).toHaveAttribute('aria-current', 'page');
    expect(within(rail).getByRole('button', { name: 'Students' })).not.toHaveAttribute('aria-current');
  });

  test('a destination button navigates to its route', () => {
    renderLayout('/lecturer');
    fireEvent.click(within(screen.getByRole('complementary', { name: 'Lecturer navigation' })).getByRole('button', { name: 'Students' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/lecturer/students');
  });

  test('the rail collapses to icons and the toggle reports its state', () => {
    renderLayout('/lecturer');
    const toggle = screen.getByRole('button', { name: 'Collapse navigation' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    const expand = screen.getByRole('button', { name: 'Expand navigation' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    // Collapsed items keep their accessible names.
    const rail = screen.getByRole('complementary', { name: 'Lecturer navigation' });
    expect(within(rail).getByRole('button', { name: 'Students' })).toBeInTheDocument();
  });

  test('the account menu opens and logout signs out and goes to the login page', () => {
    const logout = jest.fn();
    useAuth.mockReturnValue({ user: makeUser(), isGuest: false, refreshUser: jest.fn(), logout });
    renderLayout('/lecturer');
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Profile', 'Settings', 'Logout']);
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Logout' }));
    expect(logout).toHaveBeenCalled();
    expect(screen.getByTestId('where')).toHaveTextContent('/login');
  });
});

describe('LecturerDashboardPage', () => {
  function renderDashboard(onNavigate = jest.fn()) {
    return render(
      <MemoryRouter initialEntries={['/lecturer']}>
        <Where />
        <LecturerDashboardPage onNavigate={onNavigate} />
      </MemoryRouter>
    );
  }

  test('greets the lecturer in the banner with today\'s date and shows real counts', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    enrollmentsApi.getAll.mockResolvedValue({ data: [ENROLMENT] });
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    renderDashboard();

    expect(await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Ada$/ })).toBeInTheDocument();
    expect(screen.getByText(dateLabelFor(new Date()))).toBeInTheDocument();

    const summary = await screen.findByRole('region', { name: 'Summary' });
    expect(within(summary).getByText('Total Courses')).toBeInTheDocument();
    expect(within(summary).getByText('1')).toBeInTheDocument();
    expect(within(summary).getByText('Total Students')).toBeInTheDocument();
    expect(within(summary).getByText('30')).toBeInTheDocument();
    expect(within(summary).getByText('Active Boards')).toBeInTheDocument();
    expect(within(summary).getByText('4')).toBeInTheDocument();
  });

  test('pinned and recent boards are notes that open the board', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    const onNavigate = jest.fn();
    renderDashboard(onNavigate);

    const pinned = await screen.findByRole('button', { name: /Week 1 notes/ });
    expect(pinned).toHaveTextContent('Pinned');
    expect(screen.getByRole('button', { name: /Lab sheet/ })).toHaveTextContent('Recent');
    fireEvent.click(pinned);
    expect(onNavigate).toHaveBeenCalledWith('workspace', { boardId: 10 });
  });

  test('a course note opens the courses page', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    renderDashboard();

    const note = await screen.findByRole('button', { name: /Intro to Computing/ });
    expect(note).toHaveTextContent('Active');
    fireEvent.click(note);
    expect(screen.getByTestId('where')).toHaveTextContent('/lecturer/courses');
  });

  test('the New Course button goes to the courses page', async () => {
    renderDashboard();
    await screen.findByText('No courses yet.');
    expect(screen.getByTestId('where')).toHaveTextContent('/lecturer');
    fireEvent.click(screen.getByRole('button', { name: 'New Course' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/lecturer/courses');
  });

  test('recent enrolments name the student and the course', async () => {
    enrollmentsApi.getAll.mockResolvedValue({ data: [ENROLMENT] });
    renderDashboard();

    // The name, the " - Enrolled" text and the course code sit in one row paragraph group.
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'Grace Hopper - Enrolled')
    ).toBeInTheDocument();
    expect(screen.getByText('CS101')).toBeInTheDocument();
  });

  test('empty data shows classroom empty states, not invented items', async () => {
    renderDashboard();

    expect(await screen.findByText('No boards yet.')).toBeInTheDocument();
    expect(screen.getByText('No courses yet.')).toBeInTheDocument();
    expect(screen.getByText('No enrollments yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Week 1 notes/ })).not.toBeInTheDocument();
  });

  test('loading shows a skeleton status, not a spinner', () => {
    boardsApi.getAll.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByRole('status')).toHaveTextContent('Loading your dashboard');
  });

  test('a failed load shows an alert, hides the empty messages, and retry reloads', async () => {
    boardsApi.getAll.mockRejectedValueOnce(new Error('offline'));
    boardsApi.getAll.mockResolvedValueOnce({ data: BOARDS });
    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your dashboard.');
    expect(screen.queryByText('No boards yet.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: /Week 1 notes/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('LecturerSettingsPage', () => {
  function renderSettings() {
    return render(<MemoryRouter><LecturerSettingsPage /></MemoryRouter>);
  }

  test('each switch is named by its visible label and reflects its state', () => {
    renderSettings();
    const email = screen.getByRole('checkbox', { name: 'Email Notifications' });
    expect(email).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Weekly Reports' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Allow Student Comments' })).toBeChecked();
    fireEvent.click(email);
    expect(email).not.toBeChecked();
  });

  test('the contact email is prefilled from the account and the visibility select has its label', async () => {
    renderSettings();
    await waitFor(() => expect(screen.getByLabelText('Contact Email')).toHaveValue('lecturer@example.com'));
    const select = screen.getByLabelText('Default Board Visibility');
    expect(select).toHaveValue('students');
    fireEvent.change(select, { target: { value: 'course' } });
    expect(select).toHaveValue('course');
  });

  test('saving sends the preferences and confirms', async () => {
    authApi.updateProfile.mockResolvedValue({});
    renderSettings();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Email Notifications' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save All Settings' }));

    expect(await screen.findByText('Settings saved successfully!')).toBeInTheDocument();
    expect(authApi.updateProfile).toHaveBeenCalledWith({
      preferences: expect.objectContaining({ emailNotifications: false, defaultBoardVisibility: 'students' }),
    });
  });

  test('a failed save shows an alert and no success message', async () => {
    authApi.updateProfile.mockRejectedValue(new Error('server'));
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Save All Settings' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your settings. Try again.');
    expect(screen.queryByText('Settings saved successfully!')).not.toBeInTheDocument();
  });
});

describe('LecturerProfilePage', () => {
  test('reuses the shared profile page without the navigation bar', async () => {
    render(<MemoryRouter><LecturerProfilePage onNavigate={jest.fn()} /></MemoryRouter>);
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
