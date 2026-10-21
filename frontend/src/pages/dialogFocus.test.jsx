/**
 * Retrofitted page modals on the classroom dialog: focus moves into the dialog on open, Tab wraps inside it,
 * Escape closes it, and focus returns to the control that opened it. Covers the settings modals, the join-course
 * modal and the create-board modal. API, auth and navigation are mocked.
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import SettingsPage from './SettingsPage';
import StudentCoursesPage from './student/StudentCoursesPage';
import StudentDashboardPage from './student/StudentDashboardPage';
import { coursesApi, boardsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../services/api', () => ({
  authApi: { updateProfile: jest.fn(), changePassword: jest.fn(), exportData: jest.fn(), deleteAccount: jest.fn() },
  coursesApi: { getAll: jest.fn(), getInviteInfo: jest.fn(), joinByCode: jest.fn(), unenroll: jest.fn() },
  boardsApi: { getAll: jest.fn(), create: jest.fn(), toggleStar: jest.fn(), archive: jest.fn(), delete: jest.fn() },
}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/Navigation', () => () => null);
jest.mock('../hooks/useStorageWarning', () => () => {});

let errorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({
    user: { id: 1, role: 'student', first_name: 'Ada', last_name: 'Lovelace', username: 'ada', email: 'ada@example.com' },
    isGuest: false,
    refreshUser: jest.fn(),
    logout: jest.fn(),
  });
  coursesApi.getAll.mockResolvedValue({ data: [] });
  boardsApi.getAll.mockResolvedValue({ data: [] });
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  const reactWarnings = errorSpy.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => t.startsWith('Warning:') && !/not wrapped in act|ReactDOMTestUtils\.act/.test(t));
  errorSpy.mockRestore();
  expect(reactWarnings).toEqual([]);
});

describe('SettingsPage dialogs', () => {
  function renderSettings() {
    return render(<MemoryRouter><SettingsPage onNavigate={jest.fn()} /></MemoryRouter>);
  }

  test('change password moves focus into the first field; Escape closes and returns focus to the trigger', () => {
    renderSettings();
    const trigger = screen.getByRole('button', { name: 'Change Password' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Change Password' });
    expect(within(dialog).getByLabelText('Current Password')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  test('Tab from the last control wraps to the close control inside the dialog', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    const dialog = screen.getByRole('dialog', { name: 'Change Password' });
    const last = within(dialog).getByRole('button', { name: 'Update Password' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  test('delete account opens with focus on its confirm field and Escape closes it', () => {
    renderSettings();
    const trigger = screen.getByRole('button', { name: 'Delete Account' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Delete Account' });
    expect(within(dialog).getByLabelText('Type DELETE to confirm')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});

describe('StudentCoursesPage join dialog', () => {
  test('focus lands on the invite code; Escape closes and returns focus to Join Course', async () => {
    render(<MemoryRouter><StudentCoursesPage onNavigate={jest.fn()} /></MemoryRouter>);
    const trigger = await screen.findByRole('button', { name: 'Join Course' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Join a Course' });
    expect(within(dialog).getByLabelText('Course Invite Code')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  test('a failed lookup shows its error as an alert inside the dialog', async () => {
    coursesApi.getInviteInfo.mockRejectedValue({ response: { data: { error: 'Invalid code' } } });
    render(<MemoryRouter><StudentCoursesPage onNavigate={jest.fn()} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Join Course' }));
    const dialog = screen.getByRole('dialog', { name: 'Join a Course' });
    fireEvent.change(within(dialog).getByLabelText('Course Invite Code'), { target: { value: 'abc' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Lookup' }));
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
  });
});

describe('StudentDashboardPage create-board dialog', () => {
  test('focus moves to the first board type; Escape closes and returns focus to New Board', async () => {
    render(<MemoryRouter><StudentDashboardPage onNavigate={jest.fn()} /></MemoryRouter>);
    const trigger = await screen.findByRole('button', { name: 'New Board' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Create New Board' });
    await waitFor(() => expect(within(dialog).getAllByRole('button')[1]).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
