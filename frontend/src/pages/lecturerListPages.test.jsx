/**
 * Render checks for the four lecturer list pages: boards, shared, archive and analytics.
 * Each page is checked for its real data, its loading and empty states, its error alert with Try again
 * (a failed load must never look like an empty list), and its handlers. The API is mocked; the tests check
 * states, accessible names, handler calls and navigation, not visual styling.
 */
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { boardsApi, coursesApi, enrollmentsApi } from '../services/api';
import LecturerBoardsPage from './lecturer/LecturerBoardsPage';
import LecturerSharedPage from './lecturer/LecturerSharedPage';
import LecturerArchivePage from './lecturer/LecturerArchivePage';
import LecturerAnalyticsPage from './lecturer/LecturerAnalyticsPage';

jest.mock('../services/api', () => ({
  boardsApi: {
    getAll: jest.fn(),
    toggleStar: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    delete: jest.fn(),
  },
  coursesApi: { getAll: jest.fn() },
  enrollmentsApi: { getAll: jest.fn() },
}));

const NOW = new Date().toISOString();

// Shows the current path so tests can check where a control sent the user.
function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}{location.search}</p>;
}

const COURSE = {
  id: 1,
  code: 'CS101',
  name: 'Intro to Computing',
  sections: ['A', 'B'],
  student_count: 30,
  board_count: 4,
  is_active: true,
  created_at: '2026-01-10T00:00:00Z',
};

const BOARDS = [
  { id: 10, name: 'Week 1 notes', board_type: 'course-material', course_name: 'CS101', section: 'A', is_starred: true, updated_at: NOW },
  { id: 11, name: 'Lab sheet', board_type: 'kanban', course_name: null, section: null, is_starred: false, updated_at: NOW },
];

beforeEach(() => {
  jest.clearAllMocks();
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

describe('LecturerBoardsPage', () => {
  function renderBoards(onNavigate = jest.fn(), path = '/lecturer/boards') {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <LecturerBoardsPage onNavigate={onNavigate} />
      </MemoryRouter>
    );
  }

  test('shows a loading status first, then the boards with their type and course badges', async () => {
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    renderBoards();
    // The first render is already loading (state starts true), so the status is there before the request resolves.
    expect(screen.getByRole('status')).toHaveTextContent('Loading boards');

    expect(await screen.findByRole('button', { name: 'Week 1 notes' })).toBeInTheDocument();
    expect(screen.getByText('Course Material')).toBeInTheDocument();
    expect(screen.getByText('Kanban')).toBeInTheDocument();
    expect(screen.getByText('CS101')).toBeInTheDocument();
    expect(screen.getByText('Section A')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('the board name opens its workspace', async () => {
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    const onNavigate = jest.fn();
    renderBoards(onNavigate);
    fireEvent.click(await screen.findByRole('button', { name: 'Lab sheet' }));
    expect(onNavigate).toHaveBeenCalledWith('workspace', { boardId: 11 });
  });

  test('the star is a named toggle that reports its pressed state and calls the API', async () => {
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    boardsApi.toggleStar.mockResolvedValue({ data: { is_starred: false } });
    renderBoards();

    const star = await screen.findByRole('button', { name: 'Star Week 1 notes' });
    expect(star).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(star);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Star Week 1 notes' })).toHaveAttribute('aria-pressed', 'false'));
    expect(boardsApi.toggleStar).toHaveBeenCalledWith(10);
  });

  test('the board menu archives a board and removes it from the list', async () => {
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    boardsApi.archive.mockResolvedValue({});
    renderBoards();

    fireEvent.click(await screen.findByRole('button', { name: 'Board actions for Lab sheet' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getAllByRole('menuitem').map((m) => m.textContent)).toEqual(['Archive', 'Delete']);
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Archive' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Lab sheet' })).not.toBeInTheDocument());
    expect(boardsApi.archive).toHaveBeenCalledWith(11);
  });

  test('a course chip filters the list and reports its pressed state; a section narrows it further', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    renderBoards();

    const course = await screen.findByRole('button', { name: 'CS101' });
    expect(course).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(course);
    expect(course).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(boardsApi.getAll).toHaveBeenLastCalledWith({ is_archived: 'false', course: '1' }));

    fireEvent.click(screen.getByRole('button', { name: 'Section B' }));
    expect(await screen.findByText('No boards found')).toBeInTheDocument();
    expect(screen.getByText('Create a new board to get started')).toBeInTheDocument();
  });

  test('search narrows by name and a miss says to try another term', async () => {
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    renderBoards();
    await screen.findByRole('button', { name: 'Week 1 notes' });

    fireEvent.change(screen.getByRole('textbox', { name: 'Search boards by name' }), { target: { value: 'lab' } });
    expect(screen.getByRole('button', { name: 'Lab sheet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Week 1 notes' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search boards by name' }), { target: { value: 'zzz' } });
    expect(screen.getByText('No boards found')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term')).toBeInTheDocument();
  });

  test('an empty list shows one empty note, not invented boards', async () => {
    renderBoards();
    expect(await screen.findByText('No boards found')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Boards' })).not.toBeInTheDocument();
  });

  test('a failed load shows an alert instead of the empty note, and Try again reloads', async () => {
    boardsApi.getAll.mockRejectedValueOnce(new Error('offline'));
    boardsApi.getAll.mockResolvedValueOnce({ data: BOARDS });
    renderBoards();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your boards.');
    expect(screen.queryByText('No boards found')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Week 1 notes' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('New Board on personal boards starts a template with no course context', async () => {
    const onNavigate = jest.fn();
    renderBoards(onNavigate);
    await screen.findByText('No boards found');
    fireEvent.click(screen.getByRole('button', { name: 'New Board' }));
    expect(onNavigate).toHaveBeenCalledWith('lecturer-templates', {});
  });

  test('New Board keeps the course and section from the URL', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    boardsApi.getAll.mockResolvedValue({ data: BOARDS });
    const onNavigate = jest.fn();
    renderBoards(onNavigate, '/lecturer/boards?course=1&section=A');

    await screen.findByRole('button', { name: 'CS101' });
    expect(screen.getByRole('button', { name: 'Section A' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'New Board' }));
    expect(onNavigate).toHaveBeenCalledWith('lecturer-templates', { courseId: '1', courseName: 'CS101', section: 'A' });
  });
});

describe('LecturerSharedPage', () => {
  const SHARED = [
    { id: 20, name: 'Assessment brief', owner_name: 'Dr Hopper', permission: 'comment', updated_at: NOW },
    { id: 21, name: 'Reading list', owner_name: 'Dr Lovelace', can_edit: false, updated_at: NOW },
  ];

  function renderShared(onNavigate = jest.fn()) {
    return render(
      <MemoryRouter>
        <LecturerSharedPage onNavigate={onNavigate} />
      </MemoryRouter>
    );
  }

  test('lists shared boards with the owner and a text permission badge', async () => {
    boardsApi.getAll.mockResolvedValue({ data: SHARED });
    renderShared();

    const list = await screen.findByRole('list', { name: 'Shared boards' });
    expect(within(list).getByText('by Dr Hopper')).toBeInTheDocument();
    expect(within(list).getByText('Commenter')).toBeInTheDocument();
    expect(within(list).getByText('View only')).toBeInTheDocument();
    expect(boardsApi.getAll).toHaveBeenCalledWith({ shared: 'true', is_archived: 'false' });
  });

  test('a shared board name opens the board', async () => {
    boardsApi.getAll.mockResolvedValue({ data: SHARED });
    const onNavigate = jest.fn();
    renderShared(onNavigate);
    fireEvent.click(await screen.findByRole('button', { name: 'Assessment brief' }));
    expect(onNavigate).toHaveBeenCalledWith('workspace', { boardId: 20 });
  });

  test('no shared boards shows the empty note', async () => {
    renderShared();
    expect(await screen.findByRole('heading', { name: 'No shared boards' })).toBeInTheDocument();
  });

  test('a failed load shows an alert with Try again, not the empty note', async () => {
    boardsApi.getAll.mockRejectedValueOnce(new Error('offline'));
    boardsApi.getAll.mockResolvedValueOnce({ data: SHARED });
    renderShared();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your shared boards.');
    expect(screen.queryByRole('heading', { name: 'No shared boards' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Reading list' })).toBeInTheDocument();
  });
});

describe('LecturerArchivePage', () => {
  const ARCHIVED = [{ id: 30, name: 'Old lab', updated_at: NOW }];

  function renderArchive() {
    return render(
      <MemoryRouter>
        <LecturerArchivePage />
      </MemoryRouter>
    );
  }

  test('restore removes the board from the list through the API', async () => {
    boardsApi.getAll.mockResolvedValue({ data: ARCHIVED });
    boardsApi.restore.mockResolvedValue({});
    renderArchive();

    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    expect(await screen.findByRole('heading', { name: 'No archived boards' })).toBeInTheDocument();
    expect(boardsApi.restore).toHaveBeenCalledWith(30);
    expect(boardsApi.getAll).toHaveBeenCalledWith({ is_archived: 'true' });
  });

  test('delete asks first and only calls the API when the owner confirms', async () => {
    boardsApi.getAll.mockResolvedValue({ data: ARCHIVED });
    boardsApi.delete.mockResolvedValue({});
    const confirm = jest.spyOn(window, 'confirm');

    confirm.mockReturnValueOnce(false);
    renderArchive();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(confirm).toHaveBeenCalledWith('Permanently delete this board?');
    expect(boardsApi.delete).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(boardsApi.delete).toHaveBeenCalledWith(30));
    confirm.mockRestore();
  });

  test('a failed load shows an alert with Try again, not the empty note', async () => {
    boardsApi.getAll.mockRejectedValueOnce(new Error('offline'));
    boardsApi.getAll.mockResolvedValueOnce({ data: ARCHIVED });
    renderArchive();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your archived boards.');
    expect(screen.queryByRole('heading', { name: 'No archived boards' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Old lab' })).toBeInTheDocument();
  });
});

describe('LecturerAnalyticsPage', () => {
  const TRACKED = {
    id: 40,
    name: 'Quiz 1',
    updated_at: NOW,
    content: {
      trackInteractions: true,
      interactions: { u1: { actions: [1, 2] }, u2: { actions: [1] } },
    },
  };

  function renderAnalytics(onNavigate = jest.fn()) {
    return render(
      <MemoryRouter>
        <LecturerAnalyticsPage onNavigate={onNavigate} />
      </MemoryRouter>
    );
  }

  test('shows a loading status, then metric tiles built from real counts', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    boardsApi.getAll.mockResolvedValue({ data: [TRACKED] });
    renderAnalytics();
    expect(screen.getByRole('status')).toHaveTextContent('Loading analytics');

    const metrics = await screen.findByRole('region', { name: 'Key metrics' });
    expect(within(metrics).getByText('Total Students')).toBeInTheDocument();
    expect(within(metrics).getByText('30')).toBeInTheDocument();
    expect(within(metrics).getByText('Total Boards')).toBeInTheDocument();
    expect(within(metrics).getByText('4')).toBeInTheDocument();
    expect(within(metrics).getByText('Total Courses')).toBeInTheDocument();
    expect(within(metrics).getByText('Interactions')).toBeInTheDocument();
    expect(within(metrics).getByText('3')).toBeInTheDocument();
  });

  test('course performance and tracked board activity show their numbers in labelled lists', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    boardsApi.getAll.mockResolvedValue({ data: [TRACKED] });
    renderAnalytics();

    const courses = await screen.findByRole('list', { name: 'Course Performance' });
    expect(within(courses).getByText('CS101')).toBeInTheDocument();
    const activity = screen.getByRole('list', { name: 'Board Interaction Activity' });
    expect(within(activity).getByRole('heading', { name: 'Quiz 1' })).toBeInTheDocument();
    expect(within(activity).getByText('Active Users')).toBeInTheDocument();
    expect(within(activity).getByText('Total Actions')).toBeInTheDocument();
  });

  test('Open Board navigates to the tracked board', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    boardsApi.getAll.mockResolvedValue({ data: [TRACKED] });
    const onNavigate = jest.fn();
    renderAnalytics(onNavigate);
    fireEvent.click(await screen.findByRole('button', { name: 'Open Board' }));
    expect(onNavigate).toHaveBeenCalledWith('workspace', { boardId: 40 });
  });

  test('no courses shows the empty note inside the performance panel', async () => {
    renderAnalytics();
    expect(await screen.findByText('No courses to analyze')).toBeInTheDocument();
  });

  test('a failed boards request shows an alert, not zero counts, and Try again reloads', async () => {
    coursesApi.getAll.mockResolvedValue({ data: [COURSE] });
    boardsApi.getAll.mockRejectedValueOnce(new Error('offline'));
    boardsApi.getAll.mockResolvedValueOnce({ data: [TRACKED] });
    renderAnalytics();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your analytics.');
    expect(screen.queryByRole('region', { name: 'Key metrics' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'Key metrics' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
