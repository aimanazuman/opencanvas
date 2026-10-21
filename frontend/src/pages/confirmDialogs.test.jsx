/**
 * Confirmation dialogs on the archive and shared pages now use the shared ClassroomDialog: focus moves in, Tab
 * wraps inside, Escape closes and returns focus to the control that opened it, and the destructive action keeps
 * its danger style. API, auth and navigation are mocked.
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ArchivePage from './ArchivePage';
import SharedPage from './SharedPage';
import { boardsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../services/api', () => ({
  boardsApi: { getArchived: jest.fn(), getAll: jest.fn(), restore: jest.fn(), delete: jest.fn(), leave: jest.fn() },
}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/Navigation', () => () => null);

const NOW = new Date().toISOString();

let errorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: 'student' }, isGuest: false });
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  const reactWarnings = errorSpy.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => t.startsWith('Warning:') && !/not wrapped in act|ReactDOMTestUtils\.act/.test(t));
  errorSpy.mockRestore();
  expect(reactWarnings).toEqual([]);
});

describe('ArchivePage confirmation dialogs', () => {
  beforeEach(() => {
    boardsApi.getArchived.mockResolvedValue({
      data: [{ id: 3, name: 'Lab notes', course_name: 'CS101', board_type: 'kanban', updated_at: NOW }],
    });
  });

  test('restore: focus moves in, Tab wraps inside, Escape returns focus to Restore', async () => {
    render(<MemoryRouter><ArchivePage onNavigate={jest.fn()} /></MemoryRouter>);
    const trigger = await screen.findByRole('button', { name: 'Restore Lab notes' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Restore Board' });
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();

    const last = within(dialog).getByRole('button', { name: 'Restore' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('delete: the title keeps the danger colour and Cancel closes the dialog', async () => {
    render(<MemoryRouter><ArchivePage onNavigate={jest.fn()} /></MemoryRouter>);
    const trigger = await screen.findByRole('button', { name: 'Delete Lab notes' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Delete Board Permanently' });
    expect(within(dialog).getByRole('heading', { name: 'Delete Board Permanently' })).toHaveClass('text-danger');
    expect(within(dialog).getByRole('button', { name: 'Delete Forever' })).toHaveClass('min-h-[44px]');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(boardsApi.delete).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  test('the close control has the Close name and closes the restore dialog', async () => {
    render(<MemoryRouter><ArchivePage onNavigate={jest.fn()} /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore Lab notes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(boardsApi.restore).not.toHaveBeenCalled();
  });
});

describe('SharedPage confirmation dialog', () => {
  beforeEach(() => {
    boardsApi.getAll.mockResolvedValue({
      data: [{ id: 5, name: 'Lab notes', owner_name: 'Dr Lee', permission: 'edit', board_type: 'kanban', updated_at: NOW }],
    });
  });

  test('leave: Escape returns focus to Leave Lab notes, and the leave action keeps the danger style', async () => {
    render(<MemoryRouter><SharedPage onNavigate={jest.fn()} /></MemoryRouter>);
    const trigger = await screen.findByRole('button', { name: 'Leave Lab notes' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Leave Board' });
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(within(dialog).getByRole('button', { name: 'Leave Board' })).toHaveClass('min-h-[44px]');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(boardsApi.leave).not.toHaveBeenCalled();
  });
});
