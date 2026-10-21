/**
 * Render smoke test for shared components: UI kit, every board block (view and edit mode, filled and empty),
 * modals and menus. Each must mount without throwing, without console.error and without broken class tokens.
 */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor, act } from '@testing-library/react';


import { setRole } from '../testUtils/axiosMock';
import { brokenClassTokens } from '../testUtils/domChecks';
import { AuthProvider } from '../contexts/AuthContext';
import { BoardProvider } from '../contexts/BoardContext';
import { ToastProvider } from './Toast';
import { BLOCK_TYPES, BOARD_TYPES } from '../utils/boardHelpers';
import { DEMO_BOARDS } from '../utils/mockData';

import { Inbox } from 'lucide-react';
import Badge from './ui/Badge';
import Button from './ui/Button';
import ConfirmModal from './ui/ConfirmModal';
import EmptyState from './ui/EmptyState';
import Field from './ui/Field';
import Panel from './ui/Panel';
import SearchBar from './ui/SearchBar';
import StatCard from './ui/StatCard';
import Tooltip from './ui/Tooltip';
import { SkeletonText, SkeletonAvatar, SkeletonCard, SkeletonBoardGrid, SkeletonTable } from './SkeletonLoader';
import BlockRenderer from './board/BlockRenderer';
import AddBlockMenu from './board/AddBlockMenu';
import BoardHeader from './board/BoardHeader';
import CommentThread from './board/CommentThread';
import DocumentPreviewModal from './board/DocumentPreviewModal';
import ShareModal from './board/ShareModal';
import VersionHistoryPanel from './board/VersionHistoryPanel';
import InteractionPanel from './board/InteractionPanel';
import BulkImportModal from './BulkImportModal';
import GuestRegistrationModal from './GuestRegistrationModal';
import GuestExpiryBanner from './GuestExpiryBanner';
import NotificationDropdown from './NotificationDropdown';
import Navigation from './Navigation';
import LecturerLayout from './LecturerLayout';

jest.mock('axios', () => require('../testUtils/axiosMock').axiosModule);

let errorSpy;
beforeEach(() => {
  localStorage.clear();
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

const noise = (t) => t.includes('ReactDOMTestUtils.act` is deprecated');
function errors() {
  return errorSpy.mock.calls.map((c) => c.map(String).join(' ').slice(0, 400)).filter((t) => !noise(t));
}

async function mount(ui, { role = 'lecturer', withBoard = false } = {}) {
  setRole(role);
  localStorage.setItem('access_token', 'test-token');
  let tree = ui;
  if (withBoard) tree = <BoardProvider>{tree}</BoardProvider>;
  const view = render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>{tree}</ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  return view;
}

function expectClean(view) {
  expect(errors()).toEqual([]);
  expect(brokenClassTokens(view.container)).toEqual([]);
  expect(brokenClassTokens(document.body)).toEqual([]);
}

const noop = () => {};

describe('UI kit', () => {
  test('Badge, every tone and an unknown one', async () => {
    const view = await mount(
      <div>
        {['neutral', 'azure', 'green', 'teal', 'amber', 'orange', 'red', 'nonsense'].map((t) => (
          <Badge key={t} tone={t} icon={Inbox}>{t}</Badge>
        ))}
      </div>
    );
    expect(view.container.innerHTML).not.toMatch(/undefined/);
    expectClean(view);
  });

  test('Button variants, loading and disabled', async () => {
    const view = await mount(
      <div>
        {['primary', 'secondary', 'ghost', 'danger', 'bogus'].map((v) => <Button key={v} variant={v} icon={Inbox}>{v}</Button>)}
        <Button loading>Saving</Button>
        <Button disabled>Off</Button>
      </div>
    );
    expectClean(view);
  });

  test('ConfirmModal open and closed', async () => {
    const open = await mount(<ConfirmModal isOpen title="Delete" message="Sure?" onConfirm={noop} onCancel={noop} />);
    expect(screen.getByText('Sure?')).toBeInTheDocument();
    expectClean(open);
    open.unmount();
    for (const variant of ['danger', 'primary', 'warning', 'unknown']) {
      const v = await mount(<ConfirmModal isOpen variant={variant} title="T" message="M" onConfirm={noop} onCancel={noop} />);
      expectClean(v);
      v.unmount();
    }
    const closed = await mount(<ConfirmModal isOpen={false} title="Delete" message="Sure?" onConfirm={noop} onCancel={noop} />);
    expect(screen.queryByText('Sure?')).not.toBeInTheDocument();
    expectClean(closed);
  });

  test('EmptyState, Field, Panel, SearchBar, StatCard, Tooltip', async () => {
    const view = await mount(
      <div>
        <EmptyState icon={Inbox} title="Nothing" description="d" actionLabel="Add" onAction={noop} />
        <EmptyState title="Bare" />
        <Field label="Name" hint="hint" />
        <Field label="Name2" error="bad" />
        <Field as="textarea" label="Bio" />
        <Field as="select" label="Pick"><option>a</option></Field>
        <Panel title="Panel" onClose={noop}>body</Panel>
        <SearchBar value="" onChange={noop} />
        {['azure', 'blue', 'green', 'teal', 'yellow', 'orange', 'red', 'zzz'].map((c) => (
          <StatCard key={c} label={c} value={1} icon={Inbox} color={c} subtitle="s" onClick={noop} />
        ))}
        <Tooltip text="tip"><button type="button">hover</button></Tooltip>
      </div>
    );
    expectClean(view);
  });

  test('Skeleton loaders', async () => {
    const view = await mount(
      <div>
        <SkeletonText /><SkeletonAvatar size="sm" /><SkeletonAvatar size="lg" /><SkeletonAvatar size="weird" />
        <SkeletonCard /><SkeletonBoardGrid /><SkeletonTable />
      </div>
    );
    expectClean(view);
  });
});

describe('board blocks', () => {
  const stamp = new Date().toISOString();
  const base = { id: 'b', createdAt: stamp, updatedAt: stamp };
  const filled = [
    { ...base, type: BLOCK_TYPES.TEXT, content: 'Hello **world**\n- item' },
    { ...base, type: BLOCK_TYPES.IMAGE, src: 'https://example.com/a.png', caption: 'cap' },
    { ...base, type: BLOCK_TYPES.VIDEO, url: 'https://www.youtube.com/watch?v=abc', embedUrl: 'https://www.youtube.com/embed/abc' },
    { ...base, type: BLOCK_TYPES.FILE, fileName: 'a.pdf', fileSize: '1 MB', fileUrl: 'https://example.com/a.pdf' },
    { ...base, type: BLOCK_TYPES.AUDIO, name: 'a.mp3', url: 'https://example.com/a.mp3' },
    { ...base, type: BLOCK_TYPES.LINK_EMBED, url: 'https://example.com', title: 'Example' },
    { ...base, type: BLOCK_TYPES.PERSONAL_NOTE, content: 'mine', userId: 1 },
    { ...base, type: BLOCK_TYPES.ANNOUNCEMENT, title: 'Heads up', content: 'text', priority: 'normal' },
    { ...base, type: BLOCK_TYPES.ANNOUNCEMENT, title: 'Urgent', content: 'text', priority: 'urgent' },
    { ...base, type: BLOCK_TYPES.ANNOUNCEMENT, title: 'Odd', content: 'text', priority: 'not-a-priority' },
    { ...base, type: BLOCK_TYPES.RESOURCE_LIBRARY, title: 'Lib', files: [{ id: 'f', name: 'x.pdf', url: 'https://example.com/x.pdf', type: 'pdf' }] },
    { ...base, type: BLOCK_TYPES.PROGRESS_TRACKER, title: 'Progress', students: [{ id: 1, name: 'A', progress: 50, status: 'in-progress' }] },
    { ...base, type: BLOCK_TYPES.GOOGLE_MEET, meetUrl: 'https://meet.google.com/abc-defg-hij', title: 'Meet', scheduledAt: stamp },
  ];
  const empty = Object.values(BLOCK_TYPES).map((type) => ({ ...base, type }));
  const unknown = [{ ...base, type: 'made-up' }];

  describe.each([
    ['filled', filled],
    ['empty', empty],
    ['unknown type', unknown],
  ])('%s', (_name, blocks) => {
    test.each([[true], [false]])('canEdit=%s', async (canEdit) => {
      const view = await mount(
        <div>
          {blocks.map((b, i) => (
            <BlockRenderer key={i} block={b} canEdit={canEdit} canSubmit={canEdit} onUpdate={noop} onDelete={noop} currentUserId={1} />
          ))}
        </div>
      );
      expectClean(view);
    });
  });

  test('every demo board block renders', async () => {
    const blocks = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      if (node.type && Object.values(BLOCK_TYPES).includes(node.type) && node.id) blocks.push(node);
      Object.values(node).forEach(walk);
    };
    DEMO_BOARDS.forEach(walk);
    expect(blocks.length).toBeGreaterThan(0);
    const view = await mount(
      <div>{blocks.map((b, i) => <BlockRenderer key={i} block={b} canEdit onUpdate={noop} onDelete={noop} currentUserId={1} />)}</div>
    );
    expectClean(view);
  });
});

describe('board chrome and modals', () => {
  test.each(Object.values(BOARD_TYPES))('BoardHeader for %s', async (type) => {
    for (const canEdit of [true, false]) {
      const view = await mount(
        <BoardHeader boardName="B" boardType={type} boardId={1} isDirty canEdit={canEdit} canUndo canRedo courseName="CS" sectionName="S"
          saveStatus="saved" onNameChange={noop} onUndo={noop} onRedo={noop} onSave={noop} onBack={noop} onShowVersionHistory={noop} />
      );
      expectClean(view);
      view.unmount();
    }
  });

  test.each(['saving', 'saved', 'error', 'idle', undefined])('BoardHeader save status %s', async (saveStatus) => {
    const view = await mount(<BoardHeader boardName="B" boardType="kanban" saveStatus={saveStatus} onBack={noop} />);
    expectClean(view);
  });

  test.each(['lecturer', 'student', 'admin'])('AddBlockMenu for %s', async (role) => {
    const view = await mount(<AddBlockMenu onAddBlock={noop} userRole={role} currentUserId={1} />);
    expectClean(view);
  });

  test('CommentThread with and without comments', async () => {
    const comments = [{ id: 1, text: 'hi', user: { id: 1, name: 'A B', avatar: 'AB' }, createdAt: new Date().toISOString() }];
    for (const props of [{ comments }, { comments: [] }, { comments, canComment: false }]) {
      const view = await mount(<CommentThread onAddComment={noop} {...props} />);
      expectClean(view);
      view.unmount();
    }
  });

  test('DocumentPreviewModal', async () => {
    const view = await mount(<DocumentPreviewModal fileUrl="https://example.com/a.pdf" fileName="a.pdf" fileSize="1 MB" onClose={noop} />);
    expectClean(view);
  });

  test('ShareModal open', async () => {
    const view = await mount(<ShareModal isOpen onClose={noop} boardId={1} boardName="B" />);
    await waitFor(() => expect(errors()).toEqual([]));
    expectClean(view);
  });

  test('VersionHistoryPanel open', async () => {
    const view = await mount(<VersionHistoryPanel isOpen onClose={noop} boardId={1} onRestore={noop} />);
    expectClean(view);
  });

  test('InteractionPanel inside a board provider', async () => {
    const view = await mount(<InteractionPanel enrolledStudents={[{ id: 1, first_name: 'A', last_name: 'B' }]} />, { withBoard: true });
    expectClean(view);
  });

  test('BulkImportModal with and without course selector', async () => {
    for (const showCourseSelector of [true, false]) {
      const view = await mount(<BulkImportModal courses={[{ id: 1, code: 'CS', name: 'Web' }]} onClose={noop} onComplete={noop} showCourseSelector={showCourseSelector} />);
      expectClean(view);
      view.unmount();
    }
  });

  test('GuestRegistrationModal open', async () => {
    const view = await mount(<GuestRegistrationModal isOpen onClose={noop} onSuccess={noop} />, { role: 'guest' });
    expectClean(view);
  });

  test('GuestExpiryBanner for a guest', async () => {
    const view = await mount(<GuestExpiryBanner />, { role: 'guest' });
    expect(await screen.findByText(/day/i)).toBeInTheDocument();
    expectClean(view);
  });

  test('NotificationDropdown', async () => {
    const view = await mount(<NotificationDropdown onNavigate={noop} />);
    expectClean(view);
  });

  test.each(['student', 'lecturer', 'admin', 'guest'])('Navigation for %s', async (role) => {
    const view = await mount(<Navigation onNavigate={noop} />, { role });
    expectClean(view);
  });

  test('LecturerLayout', async () => {
    const view = await mount(<LecturerLayout onNavigate={noop}><p>child</p></LecturerLayout>);
    expect(screen.getByText('child')).toBeInTheDocument();
    expectClean(view);
  });
});
