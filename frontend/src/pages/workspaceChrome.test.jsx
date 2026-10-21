/**
 * Render checks for the board editor chrome: WorkspacePage (loading skeleton, read-only boards, save and Ctrl+S,
 * the unsaved-changes dialog, the lecturer-only interaction panel), BoardHeader (type, course and save-state
 * badges as text, the title font rule, accessible names), AddBlockMenu (role filter, toggle, Escape, outside click)
 * and InteractionPanel (tracking switch, disclosure, not-yet-active list). The API and auth are mocked. The tests
 * check states, accessible names, handler calls and the static class rules of the touched files; they do not
 * check visual styling.
 */
import React, { useEffect } from 'react';
import fs from 'fs';
import path from 'path';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { boardsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { BoardProvider, useBoard } from '../contexts/BoardContext';
import { BOARD_TYPES, BLOCK_TYPES } from '../utils/boardHelpers';
import { createEmptyBoard } from '../utils/mockData';
import WorkspacePage from './WorkspacePage';
import BoardHeader from '../components/board/BoardHeader';
import AddBlockMenu from '../components/board/AddBlockMenu';
import InteractionPanel from '../components/board/InteractionPanel';

jest.mock('../services/api', () => ({
  boardsApi: { get: jest.fn(), update: jest.fn(), create: jest.fn(), getAll: jest.fn(), getInvites: jest.fn() },
  sharesApi: { getAll: jest.fn() },
  usersApi: { getAll: jest.fn() },
  filesApi: { getAll: jest.fn() },
  coursesApi: { getAll: jest.fn() },
  enrollmentsApi: { getAll: jest.fn() },
}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const NOW = new Date().toISOString();
const LECTURER = { id: 1, username: 'lecturer', first_name: 'Sarah', last_name: 'Johnson', role: 'lecturer', is_guest: false };
const STUDENT = { id: 2, username: 'ahmad', first_name: 'Ahmad', last_name: 'Razak', role: 'student', is_guest: false };

function setUser(user) {
  useAuth.mockReturnValue({ user, isGuest: false });
}

// The shape the workspace receives from GET /boards/:id/. The content name wins over the top-level name.
function apiBoard(overrides = {}) {
  const name = overrides.name || 'Week 1 notes';
  return {
    id: 5,
    name,
    board_type: BOARD_TYPES.COURSE_MATERIAL,
    course_name: 'CS101',
    section: 'A',
    can_edit: true,
    can_comment: true,
    updated_at: NOW,
    content: { ...createEmptyBoard(BOARD_TYPES.COURSE_MATERIAL), name },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  setUser(LECTURER);
  boardsApi.get.mockResolvedValue({ data: apiBoard() });
  boardsApi.update.mockResolvedValue({ data: {} });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// React's own warnings (keys, unknown props, invalid nesting) fail the test. Expected app-level error logs
// (a failed save) and act() notices are not counted.
afterEach(() => {
  const reactWarnings = console.error.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => t.startsWith('Warning:') && !/not wrapped in act|ReactDOMTestUtils\.act/.test(t));
  console.error.mockRestore();
  expect(reactWarnings).toEqual([]);
});

function mountWorkspace({ url = '/workspace?boardId=5', onNavigate = jest.fn() } = {}) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <WorkspacePage onNavigate={onNavigate} />
    </MemoryRouter>
  );
  return onNavigate;
}

// Waits for the header of the loaded board. Badges and actions live in the page banner.
async function loadedHeader() {
  await screen.findByRole('textbox', { name: 'Board name' });
  return within(screen.getByRole('banner'));
}

// Make the board dirty by renaming it, then press Back.
async function renameAndPressBack(onNavigate) {
  const input = await screen.findByRole('textbox', { name: 'Board name' });
  fireEvent.change(input, { target: { value: 'Renamed board' } });
  await screen.findByText('Unsaved changes');
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  return screen.findByRole('dialog', { name: 'Unsaved Changes' });
}

describe('WorkspacePage', () => {
  test('shows a labelled loading status until the board arrives, then the title', async () => {
    let resolveBoard;
    boardsApi.get.mockReturnValue(new Promise((resolve) => { resolveBoard = resolve; }));
    mountWorkspace();
    expect(screen.getByRole('status')).toHaveTextContent('Loading board');

    await act(async () => { resolveBoard({ data: apiBoard() }); });
    const input = await screen.findByRole('textbox', { name: 'Board name' });
    expect(input).toHaveValue('Week 1 notes');
    // The save-status region stays in the page (it is the live region); only the loading text goes.
    expect(screen.queryByText('Loading board')).not.toBeInTheDocument();
  });

  test('a lecturer sees the course and type as text badges, the Save action and the interaction panel', async () => {
    mountWorkspace();
    await loadedHeader();
    const header = within(screen.getByRole('banner'));
    expect(header.getByText('CS101 / A')).toBeInTheDocument();
    expect(header.getByText('Course Material')).toBeInTheDocument();
    expect(header.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(header.getByRole('button', { name: 'Version History' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Interactions' })).toBeInTheDocument();
  });

  test('a student gets no interaction panel', async () => {
    setUser(STUDENT);
    mountWorkspace();
    await loadedHeader();
    expect(screen.queryByRole('complementary', { name: 'Interactions' })).not.toBeInTheDocument();
  });

  test('a read-only board shows View Only, the title as text, and no edit actions', async () => {
    boardsApi.get.mockResolvedValue({ data: apiBoard({ can_edit: false }) });
    mountWorkspace();
    expect(await screen.findByText('View Only')).toBeInTheDocument();
    const header = within(screen.getByRole('banner'));
    expect(header.getByText('Week 1 notes')).toBeInTheDocument();
    expect(header.queryByRole('textbox', { name: 'Board name' })).not.toBeInTheDocument();
    expect(header.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(header.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  test('the Save button sends the board to the API and then shows Saved as text', async () => {
    mountWorkspace();
    await loadedHeader();
    const header = within(screen.getByRole('banner'));
    fireEvent.click(header.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(boardsApi.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ name: 'Week 1 notes', board_type: BOARD_TYPES.COURSE_MATERIAL })
    ));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  test('Ctrl+S takes the same save path as the Save button', async () => {
    mountWorkspace();
    await loadedHeader();
    // The shortcut listener is bound in an effect that can flush after the header appears, so retry the press.
    for (let attempt = 0; attempt < 20 && boardsApi.update.mock.calls.length === 0; attempt += 1) {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
      await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 50); }); });
    }
    expect(boardsApi.update).toHaveBeenCalledWith(5, expect.any(Object));
  });

  test('a failed save shows Save failed as text', async () => {
    boardsApi.update.mockRejectedValue(new Error('network'));
    mountWorkspace();
    await loadedHeader();
    const header = within(screen.getByRole('banner'));
    fireEvent.click(header.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Save failed')).toBeInTheDocument();
  });

  test('Cancel in the unsaved-changes dialog keeps the lecturer on the board', async () => {
    const onNavigate = mountWorkspace();
    const dialog = await renameAndPressBack(onNavigate);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test('Escape closes the unsaved-changes dialog without leaving', async () => {
    const onNavigate = mountWorkspace();
    await renameAndPressBack(onNavigate);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test('Leave Without Saving navigates to the lecturer boards list', async () => {
    const onNavigate = mountWorkspace();
    const dialog = await renameAndPressBack(onNavigate);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Leave Without Saving' }));
    expect(onNavigate).toHaveBeenCalledWith('lecturer-boards');
    expect(boardsApi.update).not.toHaveBeenCalled();
  });

  test('Save & Leave saves first and then navigates', async () => {
    const onNavigate = mountWorkspace();
    const dialog = await renameAndPressBack(onNavigate);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save & Leave' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('lecturer-boards'));
    expect(boardsApi.update).toHaveBeenCalledTimes(1);
  });

  test('Back from a clean board goes straight to the dashboard for a student', async () => {
    setUser(STUDENT);
    const onNavigate = mountWorkspace();
    fireEvent.click(await screen.findByRole('button', { name: 'Go back' }));
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('BoardHeader', () => {
  const base = {
    boardName: 'Week 1',
    boardType: BOARD_TYPES.KANBAN,
    boardId: 1,
    isDirty: false,
    canEdit: true,
    canUndo: true,
    canRedo: false,
    courseName: 'CS101',
    sectionName: '',
    saveStatus: 'idle',
    onNameChange: jest.fn(),
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onSave: jest.fn(),
    onBack: jest.fn(),
    onShowVersionHistory: jest.fn(),
  };

  test.each([
    [BOARD_TYPES.COURSE_MATERIAL, 'Course Material'],
    [BOARD_TYPES.LECTURE_NOTES, 'Course Material'],
    [BOARD_TYPES.STUDENT_NOTES, 'Student Notes'],
    [BOARD_TYPES.STUDY_PLANNER, 'Study Planner'],
    [BOARD_TYPES.KANBAN, 'Kanban'],
    [BOARD_TYPES.QUIZ, 'Quiz'],
  ])('board type %s shows the label "%s" as text', (type, label) => {
    render(<BoardHeader {...base} boardType={type} />);
    expect(within(screen.getByRole('banner')).getByText(label)).toBeInTheDocument();
  });

  test.each([
    ['saving', false, 'Saving...'],
    ['saved', false, 'Saved'],
    ['error', false, 'Save failed'],
    ['error', true, 'Save failedUnsaved changes'],
    ['idle', true, 'Unsaved changes'],
    ['idle', false, ''],
  ])('save status %s (dirty %s) puts the text "%s" in the status region', (saveStatus, isDirty, text) => {
    render(<BoardHeader {...base} saveStatus={saveStatus} isDirty={isDirty} />);
    expect(screen.getByRole('status').textContent).toBe(text);
  });

  test('a read-only board shows View Only and no edit controls', () => {
    render(<BoardHeader {...base} canEdit={false} />);
    const header = within(screen.getByRole('banner'));
    expect(header.getByText('View Only')).toBeInTheDocument();
    expect(header.queryByRole('textbox', { name: 'Board name' })).not.toBeInTheDocument();
    expect(header.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  test('Undo is disabled when there is nothing to undo, and the icon buttons keep their names', () => {
    render(<BoardHeader {...base} canUndo={false} canRedo />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Version History' })).toBeInTheDocument();
  });

  test.each([39, 40])('a board name of %i characters uses the UI font, never the hand font', (length) => {
    render(<BoardHeader {...base} boardName={'x'.repeat(length)} />);
    const input = screen.getByRole('textbox', { name: 'Board name' });
    expect(input.classList.contains('font-hand')).toBe(false);
    expect(input.classList.contains('font-sans')).toBe(true);
  });
});

describe('AddBlockMenu', () => {
  test('the trigger reports whether the menu is open, and the lecturer sees lecturer blocks', () => {
    render(<AddBlockMenu onAddBlock={jest.fn()} userRole="lecturer" currentUserId={1} />);
    const trigger = screen.getByRole('button', { name: 'Add content' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^Announcement/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Personal Note/ })).not.toBeInTheDocument();
  });

  test('a student sees the personal note and not the lecturer blocks', () => {
    render(<AddBlockMenu onAddBlock={jest.fn()} userRole="student" currentUserId={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add content' }));
    expect(screen.getByRole('button', { name: /^Personal Note/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Announcement/ })).not.toBeInTheDocument();
  });

  test('choosing an option adds that block and closes the menu', () => {
    const onAddBlock = jest.fn();
    render(<AddBlockMenu onAddBlock={onAddBlock} userRole="lecturer" currentUserId={1} />);
    const trigger = screen.getByRole('button', { name: 'Add content' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: /^Text/ }));
    expect(onAddBlock).toHaveBeenCalledWith(expect.objectContaining({ type: BLOCK_TYPES.TEXT }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^Text/ })).not.toBeInTheDocument();
  });

  test('Escape closes the menu and returns focus to the trigger', () => {
    render(<AddBlockMenu onAddBlock={jest.fn()} userRole="lecturer" currentUserId={1} />);
    const trigger = screen.getByRole('button', { name: 'Add content' });
    fireEvent.click(trigger);
    const item = screen.getByRole('button', { name: /^Text/ });
    item.focus();
    fireEvent.keyDown(item, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: /^Text/ })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test('a press outside the menu closes it', () => {
    render(<AddBlockMenu onAddBlock={jest.fn()} userRole="lecturer" currentUserId={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add content' }));
    expect(screen.getByRole('button', { name: /^Text/ })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: /^Text/ })).not.toBeInTheDocument();
  });
});

describe('InteractionPanel', () => {
  // Loads the board into the provider once, then renders the panel as the workspace does.
  function Harness({ board, students }) {
    const { loadBoard } = useBoard();
    useEffect(() => { loadBoard(board); }, [board, loadBoard]);
    return <InteractionPanel enrolledStudents={students} />;
  }

  function renderPanel({ trackInteractions = false, students = [] } = {}) {
    const board = { id: 7, name: 'Lab', type: BOARD_TYPES.KANBAN, blocks: [], trackInteractions };
    render(
      <BoardProvider>
        <Harness board={board} students={students} />
      </BoardProvider>
    );
  }

  test('tracking starts off and the switch reports its state', async () => {
    renderPanel();
    const toggle = await screen.findByRole('button', { name: 'Off' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Tracking is disabled')).toBeInTheDocument();
  });

  test('turning tracking on shows the empty activity list', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Off' }));
    const toggle = await screen.findByRole('button', { name: 'On' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('No interactions recorded yet')).toBeInTheDocument();
  });

  test('students who have not interacted are listed by name', async () => {
    renderPanel({
      trackInteractions: true,
      students: [{ id: 3, first_name: 'Ali', last_name: 'Bakar', username: 'ali' }],
    });
    expect(await screen.findByText('Not Yet Active (1)')).toBeInTheDocument();
    expect(screen.getByText('Ali Bakar')).toBeInTheDocument();
  });

  test('the active users disclosure reports its state and hides the list when collapsed', async () => {
    renderPanel({ trackInteractions: true });
    const toggle = await screen.findByRole('button', { name: /Active Users \(0\)/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('No interactions recorded yet')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('No interactions recorded yet')).not.toBeInTheDocument();
  });
});

describe('touched files follow the classroom and token rules', () => {
  const FILES = [
    path.join(__dirname, 'WorkspacePage.jsx'),
    path.join(__dirname, '..', 'components', 'board', 'BoardHeader.jsx'),
    path.join(__dirname, '..', 'components', 'board', 'AddBlockMenu.jsx'),
    path.join(__dirname, '..', 'components', 'board', 'InteractionPanel.jsx'),
  ];
  const sources = FILES.map((file) => ({ file: path.basename(file), text: fs.readFileSync(file, 'utf8') }));

  test.each(sources.map((s) => [s.file, s.text]))('%s has no text-gray-400 and no forbidden hue', (_file, text) => {
    expect(text).not.toMatch(/text-gray-400/);
    expect(text).not.toMatch(/(^|[\s"'`])(purple|indigo|violet|fuchsia|magenta|lavender|pink|rose)-\d/);
    expect(text).not.toMatch(/(^|[\s"'`])(from|via|to)-[a-z]/);
  });

  test.each(sources.map((s) => [s.file, s.text]))('%s builds no class names from variables', (_file, text) => {
    expect(text).not.toMatch(/-\$\{/);
  });

  test.each(sources.map((s) => [s.file, s.text]))('%s uses only motion-safe spin and no pulse', (_file, text) => {
    expect(text).not.toMatch(/(?<![\w:-])animate-spin/);
    expect(text).not.toMatch(/animate-pulse/);
  });
});
