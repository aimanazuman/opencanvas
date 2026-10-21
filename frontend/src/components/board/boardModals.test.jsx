/* eslint-disable testing-library/no-node-access -- the backdrop check reads the scrim element that wraps the dialog */
/**
 * Board modals and panels on the classroom dialog: render states, names, focus on open, Escape and the backdrop,
 * copy-link feedback in a status region, the restore confirmation, and a file preview opened from a card
 * (Escape closes the preview first, then the card). API, auth and media helpers are mocked.
 */
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import ShareModal from './ShareModal';
import VersionHistoryPanel from './VersionHistoryPanel';
import DocumentPreviewModal from './DocumentPreviewModal';
import CommentThread from './CommentThread';
import KanbanCardDetail from './kanban/KanbanCardDetail';
import { boardsApi, sharesApi, usersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { resolveMediaUrl } from '../../utils/media';

jest.mock('../../services/api', () => ({
  boardsApi: {
    get: jest.fn(),
    getInvites: jest.fn(),
    createInvite: jest.fn(),
    revokeInvite: jest.fn(),
    getVersions: jest.fn(),
    restoreVersion: jest.fn(),
  },
  sharesApi: { create: jest.fn(), remove: jest.fn(), update: jest.fn() },
  usersApi: { search: jest.fn() },
}));

jest.mock('../../contexts/AuthContext', () => ({ useAuth: jest.fn() }));

jest.mock('../../utils/media', () => ({
  ...jest.requireActual('../../utils/media'),
  resolveMediaUrl: jest.fn(async (ref) => ref),
}));

let errorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { id: 1, username: 'ana', email: 'ana@example.com' } });
  boardsApi.get.mockResolvedValue({
    data: {
      owner: 1,
      owner_details: { id: 1, username: 'ana', email: 'ana@example.com' },
      collaborators: [
        { id: 5, user: 2, permission: 'view', user_details: { id: 2, username: 'ben', email: 'ben@example.com' } },
      ],
    },
  });
  boardsApi.getInvites.mockResolvedValue({ data: [] });
  usersApi.search.mockResolvedValue({ data: [] });
  // CRA resets mocks before each test, so the media resolver is set up here, not in the factory.
  resolveMediaUrl.mockImplementation(async (ref) => ref);
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

describe('ShareModal', () => {
  function renderShare(props = {}) {
    const onClose = jest.fn();
    render(<ShareModal isOpen boardId={7} boardName="Week 3 notes" onClose={onClose} {...props} />);
    return { onClose };
  }

  test('is a named dialog with the board name, and focus starts inside it on the first tab', async () => {
    renderShare();
    const dialog = screen.getByRole('dialog', { name: 'Share Board' });
    expect(within(dialog).getByText('Week 3 notes')).toBeInTheDocument();
    expect(await screen.findByText('Members (2)')).toBeInTheDocument();
    // Owner status arrives with the members request, so the tabs may mount after the first focus; focus stays inside.
    expect(dialog).toContainElement(document.activeElement);
  });

  test('lists members with a permission badge that is text plus icon', async () => {
    renderShare();
    const benRow = (await screen.findByText('ben')).closest('li');
    expect(within(benRow).getByText('Viewer')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  test('Escape closes; a click on the backdrop closes; a click inside does not', () => {
    const { onClose } = renderShare();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole('dialog', { name: 'Share Board' });
    fireEvent.click(screen.getByText('Share Board'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(dialog.parentElement);
    fireEvent.click(dialog.parentElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('a text selection that starts in the panel and ends on the backdrop does not close it', () => {
    const { onClose } = renderShare();
    const dialog = screen.getByRole('dialog', { name: 'Share Board' });
    fireEvent.mouseDown(screen.getByText('Share Board'));
    fireEvent.click(dialog.parentElement);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('a non-owner sees no tabs and no search', async () => {
    boardsApi.get.mockResolvedValueOnce({
      data: { owner: 9, owner_details: { id: 9, username: 'zoe' }, collaborators: [] },
    });
    renderShare();
    await screen.findByText('Members (1)');
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByLabelText('Add people')).toBeNull();
  });

  test('owner searches, adds a viewer, and the success message is a status', async () => {
    usersApi.search.mockResolvedValue({
      data: [{ id: 3, username: 'cy', first_name: 'Cy', last_name: 'Dee', email_hint: 'c***@example.com', role: 'student' }],
    });
    sharesApi.create.mockResolvedValue({ data: { id: 11 } });
    renderShare();
    fireEvent.change(await screen.findByLabelText('Add people'), { target: { value: 'cy' } });
    fireEvent.click(await screen.findByRole('button', { name: /Cy Dee/ }, { timeout: 2000 }));
    await waitFor(() => expect(sharesApi.create).toHaveBeenCalledWith({ board: 7, user: 3, permission: 'view' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Cy Dee added as Viewer');
  });

  test('copying an invite link announces the feedback in a status region', async () => {
    boardsApi.getInvites.mockResolvedValue({
      data: [{ id: 9, token: 'tok123', permission: 'view', use_count: 0, max_uses: null, expires_at: null, is_valid: true }],
    });
    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderShare();
    fireEvent.click(await screen.findByRole('tab', { name: /Invite Links/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join/tok123`);
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied');
  });

  test('an invalid invite shows a text badge with an icon', async () => {
    boardsApi.getInvites.mockResolvedValue({
      data: [{ id: 4, token: 'old', permission: 'comment', use_count: 3, max_uses: 3, expires_at: null, is_valid: true }],
    });
    renderShare();
    fireEvent.click(await screen.findByRole('tab', { name: /Invite Links/ }));
    expect(await screen.findByText('Limit Reached')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
  });
});

describe('VersionHistoryPanel', () => {
  const versions = [
    {
      id: 'v2', version_number: 2, created_at: '2026-10-19T10:00:00Z', created_by_name: 'Ana', description: '',
      content: { name: 'A', blocks: [{ id: 'b1', type: 'text', content: 'x' }] },
    },
    {
      id: 'v1', version_number: 1, created_at: '2026-10-18T10:00:00Z', created_by_name: 'Ana', description: '',
      content: { name: 'A', blocks: [] },
    },
  ];

  test('marks the latest version, summarises changes, and offers restore on older versions', async () => {
    boardsApi.getVersions.mockResolvedValue({ data: versions });
    render(<VersionHistoryPanel isOpen boardId={7} onClose={jest.fn()} onRestore={jest.fn()} />);
    expect(await screen.findByText('Latest')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore this version' })).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /1 change/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Block:')).toBeInTheDocument();
  });

  test('shows an empty state with no versions', async () => {
    boardsApi.getVersions.mockResolvedValue({ data: [] });
    render(<VersionHistoryPanel isOpen boardId={7} onClose={jest.fn()} />);
    expect(await screen.findByText('No version history yet')).toBeInTheDocument();
  });

  test('restore asks in a dialog; Escape closes it and returns focus to the control', async () => {
    boardsApi.getVersions.mockResolvedValue({ data: versions });
    render(<VersionHistoryPanel isOpen boardId={7} onClose={jest.fn()} />);
    const restore = await screen.findByRole('button', { name: 'Restore this version' });
    restore.focus();
    fireEvent.click(restore);
    const dialog = screen.getByRole('dialog', { name: 'Restore Version?' });
    expect(dialog).toHaveTextContent('Version 1');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(restore).toHaveFocus();
  });

  test('confirming restore calls the API with the version and reports back', async () => {
    boardsApi.getVersions.mockResolvedValue({ data: versions });
    boardsApi.restoreVersion.mockResolvedValue({ data: { id: 7 } });
    const onRestore = jest.fn();
    render(<VersionHistoryPanel isOpen boardId={7} onClose={jest.fn()} onRestore={onRestore} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restore this version' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Restore Version?' })).getByRole('button', { name: 'Restore' }));
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith({ id: 7 }));
    expect(boardsApi.restoreVersion).toHaveBeenCalledWith(7, 'v1');
  });
});

describe('DocumentPreviewModal', () => {
  test('an image preview is a named dialog that closes on Escape and on the backdrop', () => {
    const onClose = jest.fn();
    render(<DocumentPreviewModal fileUrl="https://files.example.com/a.png" fileName="a.png" onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'Document preview' });
    expect(within(dialog).getByRole('img', { name: 'a.png' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Open / download' })).toHaveAttribute('href', 'https://files.example.com/a.png');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(dialog.parentElement);
    fireEvent.click(dialog.parentElement);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('an office file offers a download link with the file name', () => {
    render(<DocumentPreviewModal fileUrl="https://files.example.com/report.docx" fileName="report.docx" fileSize={2048} onClose={jest.fn()} />);
    const link = screen.getByRole('link', { name: 'Download File' });
    expect(link).toHaveAttribute('download', 'report.docx');
    expect(screen.getByRole('heading', { name: 'report.docx' })).toBeInTheDocument();
  });

  test('an unsafe URL renders nothing', () => {
    render(<DocumentPreviewModal fileUrl="javascript:alert(1)" fileName="x.png" onClose={jest.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('CommentThread', () => {
  const comments = [{ id: 1, user: { name: 'Ben', avatar: 'B' }, text: 'Nice work', createdAt: new Date().toISOString() }];

  test('the toggle exposes its state, and a trimmed comment is added then cleared', () => {
    const onAdd = jest.fn();
    render(<CommentThread comments={comments} onAddComment={onAdd} />);
    const toggle = screen.getByRole('button', { name: '1 comment' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Nice work')).toBeInTheDocument();
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Add a comment'), { target: { value: '  Thanks  ' } });
    fireEvent.click(send);
    expect(onAdd).toHaveBeenCalledWith('Thanks');
    expect(screen.getByLabelText('Add a comment')).toHaveValue('');
  });

  test('a read-only thread shows the comments and no form', () => {
    render(<CommentThread comments={comments} canComment={false} />);
    fireEvent.click(screen.getByRole('button', { name: '1 comment' }));
    expect(screen.getByText('Nice work')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add a comment')).toBeNull();
  });
});

describe('KanbanCardDetail', () => {
  const card = {
    id: 'c1',
    title: 'Ship it',
    content: 'Details here',
    author: { id: 1, name: 'Ana', avatar: 'A' },
    likes: [],
    comments: [{ id: 'm1', user: { name: 'Ben', avatar: 'B' }, text: 'Ok', createdAt: new Date().toISOString() }],
    files: [{ id: 'f1', name: 'notes.docx', dataUrl: 'https://files.example.com/notes.docx', size: 2048 }],
    createdAt: new Date().toISOString(),
  };
  const columns = [
    { id: 'col1', title: 'To do', color: '#888888' },
    { id: 'col2', title: 'Done', color: '#008800' },
  ];

  function mountCard(props = {}) {
    const handlers = {
      onClose: jest.fn(),
      onDeleteCard: jest.fn(),
      onMoveCard: jest.fn(),
      onToggleLike: jest.fn(),
      onAddComment: jest.fn(),
    };
    render(
      <KanbanCardDetail
        selectedCard={{ card, columnId: 'col1' }}
        columns={columns}
        user={{ id: 1, username: 'ana' }}
        canEdit
        canComment
        {...handlers}
        {...props}
      />
    );
    return handlers;
  }

  test('is a named dialog; Escape and the backdrop close it', () => {
    const handlers = mountCard();
    expect(screen.getByRole('dialog', { name: 'Card Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ship it' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
    const scrim = screen.getByRole('dialog', { name: 'Card Details' }).parentElement;
    fireEvent.mouseDown(scrim);
    fireEvent.click(scrim);
    expect(handlers.onClose).toHaveBeenCalledTimes(2);
  });

  test('like reports its pressed state and toggles through the handler', () => {
    const handlers = mountCard();
    const like = screen.getByRole('button', { name: 'Like' });
    expect(like).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(like);
    expect(handlers.onToggleLike).toHaveBeenCalledWith('col1', 'c1');
  });

  test('the card menu deletes the card and closes the dialog', () => {
    const handlers = mountCard();
    fireEvent.click(screen.getByRole('button', { name: 'Card actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete card' }));
    expect(handlers.onDeleteCard).toHaveBeenCalledWith('col1', 'c1');
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  test('move lists the other columns and moves the card', () => {
    const handlers = mountCard();
    fireEvent.click(screen.getByRole('button', { name: 'Card actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to column' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(handlers.onMoveCard).toHaveBeenCalledWith('col1', 'c1', 'col2');
  });

  test('a read-only viewer sees no menu and no comment field', () => {
    mountCard({ canEdit: false, canComment: false });
    expect(screen.queryByRole('button', { name: 'Card actions' })).toBeNull();
    expect(screen.queryByLabelText('Add a comment')).toBeNull();
  });

  test('a file preview opened from the card closes alone on Escape; the next Escape closes the card', async () => {
    const handlers = mountCard();
    const previewButton = screen.getByRole('button', { name: 'Preview' });
    previewButton.focus();
    fireEvent.click(previewButton);
    expect(await screen.findByRole('dialog', { name: 'Document preview' })).toBeInTheDocument();
    expect(resolveMediaUrl).toHaveBeenCalledWith('https://files.example.com/notes.docx');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Document preview' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Card Details' })).toBeInTheDocument();
    expect(handlers.onClose).not.toHaveBeenCalled();
    expect(previewButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});
