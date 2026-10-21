/**
 * Board content surfaces in the classroom theme: Kanban columns, cards and column management, the lecture and
 * student notes boards, and block components in view and edit mode. Checks go through names, roles, states and the
 * callbacks, not classes. Board and auth context are mocked. Nothing here uploads a file.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KanbanBoard from './KanbanBoard';
import LectureNotesBoard from './LectureNotesBoard';
import StudentNotesBoard from './StudentNotesBoard';
import BlockRenderer from './BlockRenderer';
import { useBoard } from '../../contexts/BoardContext';
import { useAuth } from '../../contexts/AuthContext';
import { BLOCK_TYPES } from '../../utils/boardHelpers';

jest.mock('../../contexts/BoardContext', () => ({ useBoard: jest.fn() }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

const noop = () => {};
const LECTURER = { id: 7, first_name: 'Ana', last_name: 'Lee', role: 'lecturer' };
const STUDENT = { id: 7, first_name: 'Ana', last_name: 'Lee', role: 'student' };
const LONG_TITLE = 'A column name that is longer than forty characters';

let errorSpy;

beforeEach(() => {
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

// React's own warnings (keys, unknown props, invalid nesting) fail the test. The act() notices are harness timing.
afterEach(() => {
  const reactWarnings = errorSpy.mock.calls
    .map((c) => c.map(String).join(' '))
    .filter((t) => t.startsWith('Warning:') && !/not wrapped in act|ReactDOMTestUtils\.act/.test(t));
  errorSpy.mockRestore();
  expect(reactWarnings).toEqual([]);
});

// ---------- Kanban ----------

function kanbanBoard() {
  return {
    owner: { id: 7 },
    columns: [
      {
        id: 'c1',
        title: 'To do',
        color: '#0A66C2',
        cards: [{
          id: 'k1',
          title: 'Read chapter 3',
          content: 'Pages 1 to 20',
          likes: [{ userId: 9, userName: 'Ben' }],
          comments: [{ id: 'm1' }],
          files: [],
          author: { id: 7, name: 'Ana Lee', avatar: 'AL' },
        }],
      },
      { id: 'c2', title: LONG_TITLE, color: '#0A66C2', cards: [] },
    ],
  };
}

function setKanban(board, { canEdit = true, canComment = true, user = LECTURER } = {}) {
  const updateColumns = jest.fn();
  useAuth.mockReturnValue({ user });
  useBoard.mockReturnValue({ board, canEdit, canComment, updateColumns, recordInteraction: jest.fn() });
  return { updateColumns };
}

describe('KanbanBoard', () => {
  test('column titles are headings in the UI font, short or long (no hand font, so rename does not switch font)', () => {
    setKanban(kanbanBoard());
    render(<KanbanBoard />);
    expect(screen.getByRole('heading', { level: 3, name: 'To do' })).not.toHaveClass('font-hand');
    expect(screen.getByRole('heading', { level: 3, name: LONG_TITLE })).not.toHaveClass('font-hand');
  });

  test('each card is a single button that carries its title and detail', () => {
    setKanban(kanbanBoard());
    render(<KanbanBoard />);
    const card = screen.getByRole('button', { name: /Read chapter 3/ });
    expect(card).toHaveTextContent('Pages 1 to 20');
    expect(card).toHaveTextContent('Ana Lee');
    expect(card).toBeInstanceOf(HTMLButtonElement);
  });

  test('the column menu is named and shows its state, and rename opens a labelled input', () => {
    setKanban(kanbanBoard());
    render(<KanbanBoard />);
    const menu = screen.getByRole('button', { name: 'Column menu for To do' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('text-danger');
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    expect(screen.getByRole('textbox', { name: 'Column name' })).toHaveValue('To do');
  });

  test('a card added to a column is saved through updateColumns with the trimmed title', () => {
    const { updateColumns } = setKanban(kanbanBoard());
    render(<KanbanBoard />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Add a card' })[0]);
    const submit = screen.getByRole('button', { name: 'Add Card' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Card title' }), { target: { value: '  Lab report ' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    const columns = updateColumns.mock.calls[0][0];
    expect(columns[0].cards).toHaveLength(2);
    expect(columns[0].cards[1].title).toBe('Lab report');
  });

  test('a lecturer adds a column from a labelled field', () => {
    const { updateColumns } = setKanban(kanbanBoard());
    render(<KanbanBoard />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Column' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'New column title' }), { target: { value: 'Week 4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Column' }));
    const columns = updateColumns.mock.calls[0][0];
    expect(columns).toHaveLength(3);
    expect(columns[2].title).toBe('Week 4');
  });

  test('a read-only viewer sees no column management and no add-card controls', () => {
    setKanban(kanbanBoard(), { canEdit: false, canComment: false, user: STUDENT });
    render(<KanbanBoard />);
    expect(screen.getByRole('button', { name: /Read chapter 3/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Column' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add a card' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Column menu for To do' })).toBeNull();
  });
});

// ---------- Notes boards ----------

function notesHandlers() {
  return {
    addBlockToSection: jest.fn(),
    updateBlockInSection: jest.fn(),
    removeBlockFromSection: jest.fn(),
    addComment: jest.fn(),
    addPersonalNote: jest.fn(),
    removePersonalNote: jest.fn(),
    toggleBookmark: jest.fn(),
    getPersonalNote: jest.fn(() => undefined),
    isBookmarked: jest.fn(() => false),
    getBookmarkedBlockIds: jest.fn(() => []),
  };
}

function setNotes(board, { user = LECTURER, canEdit = true, canComment = true } = {}) {
  const handlers = notesHandlers();
  useAuth.mockReturnValue({ user });
  useBoard.mockReturnValue({ board, canEdit, canComment, ...handlers });
  return handlers;
}

describe('LectureNotesBoard', () => {
  const board = () => ({
    comments: {},
    sections: [
      { id: 's1', title: 'Topic', blocks: [{ id: 'b1', type: BLOCK_TYPES.TEXT, content: 'Week 4 intro' }] },
      { id: 's2', title: 'Summary', blocks: [] },
    ],
  });

  test('sections are named headings, and an empty section shows one note', () => {
    setNotes(board());
    render(<LectureNotesBoard />);
    expect(screen.getByRole('heading', { level: 2, name: 'Topic' })).toBeInTheDocument();
    expect(screen.getByText('Week 4 intro')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Summary' })).toBeInTheDocument();
    expect(screen.getByText('No content yet')).toBeInTheDocument();
  });

  test('a student bookmarks a block and the filter reports its pressed state', () => {
    const handlers = setNotes(board(), { user: STUDENT, canEdit: false });
    render(<LectureNotesBoard />);
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark this block' }));
    expect(handlers.toggleBookmark).toHaveBeenCalledWith('b1', 7);
    // The filter starts off and reports its pressed state; turning it on hides blocks that are not bookmarked.
    const filter = screen.getByRole('button', { name: 'Show Bookmarked (0)' });
    expect(filter).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(filter);
    expect(filter).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Week 4 intro')).toBeNull();
  });

  test('a student writes a personal note in a labelled editor and saves it', () => {
    const handlers = setNotes(board(), { user: STUDENT, canEdit: false });
    render(<LectureNotesBoard />);
    fireEvent.click(screen.getByRole('button', { name: 'Add personal note' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Personal note' }), { target: { value: 'Revise this' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(handlers.addPersonalNote).toHaveBeenCalledWith('b1', 'Revise this', 7);
  });
});

describe('StudentNotesBoard', () => {
  test('an empty section shows its hint in one note, and a filled section shows its block', () => {
    setNotes({
      owner: { id: 7 },
      comments: {},
      sections: [
        { id: 's1', title: 'My Ideas', blocks: [] },
        { id: 's2', title: 'Questions', blocks: [{ id: 'b2', type: BLOCK_TYPES.TEXT, content: 'Why?' }] },
      ],
    }, { user: STUDENT });
    render(<StudentNotesBoard />);
    expect(screen.getByRole('heading', { level: 2, name: 'My Ideas' })).toBeInTheDocument();
    expect(screen.getByText('Jot down your brainstorming ideas here...')).toBeInTheDocument();
    expect(screen.getByText('Why?')).toBeInTheDocument();
    expect(screen.queryByText('Write questions you want to ask your lecturer...')).toBeNull();
  });
});

// ---------- Blocks in view and edit mode ----------

describe('block components', () => {
  test('text block: the text shows in view mode, and an edit saves through onUpdate', () => {
    const onUpdate = jest.fn();
    render(<BlockRenderer block={{ id: 't1', type: BLOCK_TYPES.TEXT, content: 'Draft' }} canEdit canSubmit={false} onUpdate={onUpdate} onDelete={noop} currentUserId={7} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const area = screen.getByRole('textbox', { name: 'Text content' });
    expect(area).toHaveValue('Draft');
    fireEvent.change(area, { target: { value: 'Final' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onUpdate).toHaveBeenCalledWith({ content: 'Final' });
    expect(screen.queryByRole('textbox', { name: 'Text content' })).toBeNull();
  });

  test('announcement: an urgent notice is labelled in text, and its edit fields are named', () => {
    const onUpdate = jest.fn();
    render(<BlockRenderer block={{ id: 'a1', type: BLOCK_TYPES.ANNOUNCEMENT, title: 'Quiz moved', content: 'Now Friday', priority: 'urgent' }} canEdit canSubmit={false} onUpdate={onUpdate} onDelete={noop} currentUserId={7} />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('textbox', { name: 'Announcement title' })).toHaveValue('Quiz moved');
    expect(screen.getByLabelText('Priority:')).toHaveValue('urgent');
    fireEvent.change(screen.getByLabelText('Priority:'), { target: { value: 'normal' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onUpdate).toHaveBeenCalledWith({ title: 'Quiz moved', content: 'Now Friday', priority: 'normal' });
  });

  test('progress tracker: the progress bar and student toggles are named, and a toggle saves the list', () => {
    const onUpdate = jest.fn();
    const block = { id: 'p1', type: BLOCK_TYPES.PROGRESS_TRACKER, title: 'Lab 2', students: [{ name: 'Asha', viewed: true, submitted: false }] };
    render(<BlockRenderer block={block} canEdit canSubmit={false} onUpdate={onUpdate} onDelete={noop} currentUserId={7} />);
    expect(screen.getByRole('progressbar', { name: 'Students submitted' })).toHaveAttribute('aria-valuenow', '0');
    const submitted = screen.getByRole('button', { name: 'Submitted: Asha' });
    expect(submitted).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(submitted);
    expect(onUpdate).toHaveBeenCalledWith({ students: [{ name: 'Asha', viewed: true, submitted: true }] });
  });

  test('progress tracker, view only: the toggles are disabled and no remove control appears', () => {
    const block = { id: 'p2', type: BLOCK_TYPES.PROGRESS_TRACKER, title: 'Lab 2', students: [{ name: 'Asha', viewed: false, submitted: false }] };
    render(<BlockRenderer block={block} canEdit={false} canSubmit={false} onUpdate={noop} onDelete={noop} currentUserId={7} />);
    expect(screen.getByRole('button', { name: 'Viewed: Asha' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });

  test('link embed: the address field is named, and a stored unsafe link is shown as blocked', () => {
    const onUpdate = jest.fn();
    const { unmount } = render(<BlockRenderer block={{ id: 'l1', type: BLOCK_TYPES.LINK_EMBED }} canEdit canSubmit={false} onUpdate={onUpdate} onDelete={noop} currentUserId={7} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Link address' }), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Embed' }));
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ linkUrl: expect.stringContaining('example.com') }));
    unmount();

    // Built at runtime so the lint rule does not read the unsafe scheme as a literal.
    const unsafe = ['java', 'script:alert(1)'].join('');
    render(<BlockRenderer block={{ id: 'l2', type: BLOCK_TYPES.LINK_EMBED, linkUrl: unsafe }} canEdit={false} canSubmit={false} onUpdate={onUpdate} onDelete={noop} currentUserId={7} />);
    expect(screen.getByText('This link was blocked because it is not a normal web address.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('image placeholder is a button only for a viewer who can edit', () => {
    const { unmount } = render(<BlockRenderer block={{ id: 'i1', type: BLOCK_TYPES.IMAGE }} canEdit canSubmit={false} onUpdate={noop} onDelete={noop} currentUserId={7} />);
    expect(screen.getByRole('button', { name: 'Click to upload an image' })).toBeInTheDocument();
    unmount();

    render(<BlockRenderer block={{ id: 'i2', type: BLOCK_TYPES.IMAGE }} canEdit={false} canSubmit={false} onUpdate={noop} onDelete={noop} currentUserId={7} />);
    expect(screen.queryByRole('button', { name: 'Click to upload an image' })).toBeNull();
    expect(screen.getByText('No image uploaded')).toBeInTheDocument();
  });

  test('personal note: the owner opens the note from a button and saves the change', () => {
    const onUpdate = jest.fn();
    render(<BlockRenderer block={{ id: 'n1', type: BLOCK_TYPES.PERSONAL_NOTE, content: 'Remember', ownerId: 7 }} canEdit canSubmit={false} onUpdate={onUpdate} onDelete={noop} currentUserId={7} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remember' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Personal note' }), { target: { value: 'Remember more' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onUpdate).toHaveBeenCalledWith({ content: 'Remember more' });
  });

  test('resource library: a viewer can preview and download, and only an editor can remove', () => {
    const files = [{ id: 'f1', name: 'x.pdf', url: 'https://example.com/x.pdf', size: 2048 }];
    const { unmount } = render(<BlockRenderer block={{ id: 'r1', type: BLOCK_TYPES.RESOURCE_LIBRARY, title: 'Readings', files }} canEdit={false} canSubmit={false} onUpdate={noop} onDelete={noop} currentUserId={7} />);
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
    unmount();

    render(<BlockRenderer block={{ id: 'r2', type: BLOCK_TYPES.RESOURCE_LIBRARY, title: 'Readings', files }} canEdit canSubmit={false} onUpdate={noop} onDelete={noop} currentUserId={7} />);
    expect(screen.getByRole('button', { name: 'Upload files' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });
});
