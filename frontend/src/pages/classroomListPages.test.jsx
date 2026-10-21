/**
 * Render checks for the classroom list pages: archive, shared with me, board templates and the templates
 * gallery (plus one board list under a template). API, auth and the navigation bar are mocked. The tests check
 * states, accessible names, dialogs and handlers.
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Calendar } from 'lucide-react';
import { boardsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ArchivePage from './ArchivePage';
import SharedPage from './SharedPage';
import TemplatesPage from './TemplatesPage';
import TemplateBoardsPage from './templates/TemplateBoardsPage';

jest.mock('../services/api', () => ({
  boardsApi: {
    getAll: jest.fn(),
    getArchived: jest.fn(),
    restore: jest.fn(),
    delete: jest.fn(),
    leave: jest.fn(),
    create: jest.fn(),
    toggleStar: jest.fn(),
    archive: jest.fn(),
  },
}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/Navigation', () => () => null);

const NOW = new Date().toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { role: 'student' }, isGuest: false });
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

describe('ArchivePage', () => {
  test('lists archived boards with a type label and restores one through its dialog', async () => {
    boardsApi.getArchived.mockResolvedValue({
      data: [{ id: 1, name: 'Week 3 notes', course_name: 'CS101', board_type: 'student-notes', updated_at: NOW }],
    });
    boardsApi.restore.mockResolvedValue({});
    render(<MemoryRouter><ArchivePage onNavigate={jest.fn()} /></MemoryRouter>);

    expect(await screen.findByRole('heading', { level: 2, name: 'Week 3 notes' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Archived boards' });
    expect(within(list).getByText('Student Notes')).toBeInTheDocument();
    expect(within(list).getByText('Archived today')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore Week 3 notes' }));
    const dialog = screen.getByRole('dialog', { name: 'Restore Board' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restore' }));

    await waitFor(() => expect(boardsApi.restore).toHaveBeenCalledWith(1));
    expect(await screen.findByRole('heading', { level: 2, name: 'No archived boards' })).toBeInTheDocument();
  });

  test('Escape closes the confirmation dialog without calling the API', async () => {
    boardsApi.getArchived.mockResolvedValue({ data: [{ id: 4, name: 'Draft', course_name: '', board_type: 'kanban', updated_at: NOW }] });
    render(<MemoryRouter><ArchivePage onNavigate={jest.fn()} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 2, name: 'Draft' });

    fireEvent.click(screen.getByRole('button', { name: 'Restore Draft' }));
    const dialog = screen.getByRole('dialog', { name: 'Restore Board' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(boardsApi.restore).not.toHaveBeenCalled();
  });

  test('deleting asks for confirmation in a dialog before calling the API', async () => {
    boardsApi.getArchived.mockResolvedValue({ data: [{ id: 2, name: 'Old quiz', course_name: '', board_type: 'quiz', updated_at: NOW }] });
    boardsApi.delete.mockResolvedValue({});
    render(<MemoryRouter><ArchivePage onNavigate={jest.fn()} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 2, name: 'Old quiz' });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Old quiz' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Board Permanently' });
    expect(within(dialog).getByText('This action cannot be undone!')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(boardsApi.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Old quiz' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete Forever' }));
    await waitFor(() => expect(boardsApi.delete).toHaveBeenCalledWith(2));
  });

  test('a search with no match shows the empty note, and clearing the search restores the list', async () => {
    boardsApi.getArchived.mockResolvedValue({ data: [{ id: 3, name: 'Lab notes', course_name: 'CS101', board_type: 'kanban', updated_at: NOW }] });
    render(<MemoryRouter><ArchivePage onNavigate={jest.fn()} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 2, name: 'Lab notes' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Search archived boards' }), { target: { value: 'zzz' } });
    expect(screen.getByRole('heading', { level: 2, name: 'No matching boards found' })).toBeInTheDocument();
    expect(screen.getByText('Found 0 boards matching "zzz"')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Lab notes' })).toBeInTheDocument();
  });

  test('a failed load shows an alert with a retry control', async () => {
    boardsApi.getArchived.mockRejectedValueOnce(new Error('offline'));
    boardsApi.getArchived.mockResolvedValueOnce({ data: [] });
    render(<MemoryRouter><ArchivePage onNavigate={jest.fn()} /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your archived boards.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'No archived boards' })).toBeInTheDocument();
  });
});

describe('SharedPage', () => {
  const SHARED = [
    { id: 5, name: 'Lab notes', owner_name: 'Dr Lee', permission: 'edit', board_type: 'kanban', collaborators: [{}], updated_at: NOW },
    { id: 6, name: 'Essay plan', owner_name: 'Sam', permission: 'view', board_type: 'student-notes', updated_at: NOW },
  ];

  test('shows each permission as a badge and opens a board through the navigation callback', async () => {
    boardsApi.getAll.mockResolvedValue({ data: SHARED });
    const onNavigate = jest.fn();
    render(<MemoryRouter><SharedPage onNavigate={onNavigate} /></MemoryRouter>);

    expect(await screen.findByRole('heading', { level: 2, name: 'Lab notes' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Shared boards' });
    expect(within(list).getByText('Editor')).toBeInTheDocument();
    expect(within(list).getByText('Viewer')).toBeInTheDocument();
    expect(within(list).getByText('Kanban')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Board Lab notes' }));
    expect(onNavigate).toHaveBeenCalledWith('workspace', { boardId: 5 });
  });

  test('the role filter narrows the list and an empty filter shows the matching empty note', async () => {
    boardsApi.getAll.mockResolvedValue({ data: SHARED });
    render(<MemoryRouter><SharedPage onNavigate={jest.fn()} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 2, name: 'Lab notes' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by role' }), { target: { value: 'Commenter' } });
    expect(screen.getByRole('heading', { level: 2, name: 'No matching boards found' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Lab notes' })).not.toBeInTheDocument();
  });

  test('leaving a board confirms in a dialog and removes the row', async () => {
    boardsApi.getAll.mockResolvedValue({ data: [SHARED[0]] });
    boardsApi.leave.mockResolvedValue({});
    render(<MemoryRouter><SharedPage onNavigate={jest.fn()} /></MemoryRouter>);
    await screen.findByRole('heading', { level: 2, name: 'Lab notes' });

    fireEvent.click(screen.getByRole('button', { name: 'Leave Lab notes' }));
    const dialog = screen.getByRole('dialog', { name: 'Leave Board' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Leave Board' }));

    await waitFor(() => expect(boardsApi.leave).toHaveBeenCalledWith(5));
    expect(await screen.findByRole('heading', { level: 2, name: 'No shared boards yet' })).toBeInTheDocument();
  });

  test('a failed load shows an alert, not an empty state', async () => {
    boardsApi.getAll.mockRejectedValueOnce(new Error('offline'));
    render(<MemoryRouter><SharedPage onNavigate={jest.fn()} /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your shared boards.');
  });
});

describe('TemplatesPage', () => {
  test('a student sees the templates open to students, and the course context banner', () => {
    useAuth.mockReturnValue({ user: { role: 'student' } });
    render(
      <MemoryRouter initialEntries={['/templates?courseId=7&courseName=CS101&section=A']}>
        <TemplatesPage onNavigate={jest.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Board Templates' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Student Notes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Study Planner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Kanban Board' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Quiz' })).not.toBeInTheDocument();
    expect(screen.getByText('CS101')).toBeInTheDocument();
    expect(screen.getByText('Section A')).toBeInTheDocument();
  });

  test('Create New opens the workspace with the course and section kept', () => {
    useAuth.mockReturnValue({ user: { role: 'student' } });
    const onNavigate = jest.fn();
    render(
      <MemoryRouter initialEntries={['/templates?courseId=7&section=A']}>
        <TemplatesPage onNavigate={onNavigate} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create New Study Planner' }));
    expect(onNavigate).toHaveBeenCalledWith('workspace', { templateType: 'study-planner', courseId: '7', section: 'A' });
    fireEvent.click(screen.getByRole('button', { name: 'View Boards for Kanban Board' }));
    expect(onNavigate).toHaveBeenCalledWith('templates-kanban');
  });

  test('a search with no match shows the empty note and Show All Templates restores the gallery', () => {
    useAuth.mockReturnValue({ user: { role: 'lecturer' } });
    render(<MemoryRouter><TemplatesPage onNavigate={jest.fn()} /></MemoryRouter>);

    expect(screen.getByRole('heading', { level: 3, name: 'Quiz' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search templates' }), { target: { value: 'nothing matches this' } });
    expect(screen.getByRole('heading', { level: 3, name: 'No templates found' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show All Templates' }));
    expect(screen.getByRole('heading', { level: 3, name: 'Quiz' })).toBeInTheDocument();
  });

  test('hideNav renders inside another layout: no navigation landmark and no main element', () => {
    useAuth.mockReturnValue({ user: { role: 'lecturer' } });
    render(
      <MemoryRouter><TemplatesPage onNavigate={jest.fn()} hideNav /></MemoryRouter>
    );
    expect(screen.queryByRole('main')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Board Templates' })).toBeInTheDocument();
  });
});

describe('TemplateBoardsPage', () => {
  const BOARDS = [
    { id: 11, name: 'Week plan', course_name: 'CS101', updated_at: NOW, is_starred: false },
    { id: 12, name: 'Exam prep', course_name: null, updated_at: NOW, is_starred: true },
  ];

  function setupPage(props = {}) {
    const onNavigate = props.onNavigate || jest.fn();
    render(
      <MemoryRouter>
        <TemplateBoardsPage
          onNavigate={onNavigate}
          templateId="study-planner"
          templateName="Study Planner"
          templateDescription="Weekly timetable to plan study sessions"
          TemplateIcon={Calendar}
        />
      </MemoryRouter>
    );
    return onNavigate;
  }

  test('lists the boards of this type and stars one', async () => {
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    boardsApi.toggleStar.mockResolvedValue({ data: { is_starred: true } });
    setupPage();

    expect(boardsApi.getAll).toHaveBeenCalledWith({ board_type: 'study-planner', is_archived: 'false' });
    expect(await screen.findByRole('heading', { level: 3, name: 'Week plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Star Week plan' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Star Exam prep' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Star Week plan' }));
    await waitFor(() => expect(boardsApi.toggleStar).toHaveBeenCalledWith(11));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Star Week plan' })).toHaveAttribute('aria-pressed', 'true'));
  });

  test('switching to list view keeps the boards and the view toggle states', async () => {
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    setupPage();
    await screen.findByRole('heading', { level: 3, name: 'Week plan' });

    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    const list = screen.getByRole('list', { name: 'Study Planner boards' });
    expect(within(list).getByRole('heading', { level: 3, name: 'Exam prep' })).toBeInTheDocument();
  });

  test('a search with no match shows the empty note; the create button is hidden while searching', async () => {
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    setupPage();
    await screen.findByRole('heading', { level: 3, name: 'Week plan' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Search Study Planner boards' }), { target: { value: 'xyz' } });
    expect(screen.getByRole('heading', { level: 3, name: 'No boards match "xyz"' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Study Planner' })).not.toBeInTheDocument();
  });

  test('creating a board posts the template type and opens the new board', async () => {
    boardsApi.getAll.mockResolvedValue({ data: [] });
    boardsApi.create.mockResolvedValue({ data: { id: 99 } });
    const onNavigate = setupPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Create Study Planner' }));
    await waitFor(() => expect(boardsApi.create).toHaveBeenCalledWith({
      name: 'Untitled Study Planner', board_type: 'study-planner', content: {},
    }));
    // Navigation runs after the create promise settles, so wait for it.
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('workspace', { boardId: 99, templateType: 'study-planner' }));
  });

  test('the board menu deletes after the browser confirmation', async () => {
    boardsApi.getAll.mockResolvedValue({ data: [BOARDS[0]] });
    boardsApi.delete.mockResolvedValue({});
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    setupPage();
    await screen.findByRole('heading', { level: 3, name: 'Week plan' });

    fireEvent.click(screen.getByRole('button', { name: 'Board actions for Week plan' }));
    expect(screen.getByRole('button', { name: 'Board actions for Week plan' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Delete/ }));
    await waitFor(() => expect(boardsApi.delete).toHaveBeenCalledWith(11));
    window.confirm.mockRestore();
  });

  test('a failed load shows an alert with a retry control', async () => {
    boardsApi.getAll.mockRejectedValueOnce(new Error('offline'));
    boardsApi.getAll.mockResolvedValueOnce({ data: BOARDS });
    setupPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load these boards.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Week plan' })).toBeInTheDocument();
  });
});
