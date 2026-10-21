import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navigation from '../../components/Navigation';
import GuestRegistrationModal from '../../components/GuestRegistrationModal';
import { Plus, Clock, Star, Folder, Search, Grid, List, MoreVertical, Trash2, Archive, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getTemplatesForRole } from '../../utils/templateDefinitions';
import { boardsApi, coursesApi } from '../../services/api';
import { getGuestBoards, deleteGuestBoard } from '../../utils/guestStorage';
import useStorageWarning from '../../hooks/useStorageWarning';
import {
  ClassroomShell, ChalkboardHeader, ClassroomButton, ClassroomDialog, PaperPanel, StickyNote, CorkBoard, WoodFrame, ChalkBadge,
} from '../../components/classroom';
import cx from '../../components/classroom/cx';
import {
  getTypeStyle, getTypeStyleOrFallback, pickPinned, pickRecent, greetingFor, dateLabelFor, CHIP_CLASS,
} from './studentMappings';

const TAB_ON = 'bg-accent text-white';
const TAB_OFF = 'text-ink-2 hover:bg-surface-hover hover:text-ink';

function formatDate(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

// Loading placeholder: static blocks, no pulse loop (motion stays limited to reveal, lift and press).
function BoardSkeleton() {
  return (
    <div role="status" className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Loading boards</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="h-40 rounded-lg border border-line bg-surface-hover" />
      ))}
    </div>
  );
}

export default function StudentDashboardPage({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterStarred, setFilterStarred] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(null);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [activeTab, setActiveTab] = useState('my-boards');
  const [classBoards, setClassBoards] = useState([]);
  const [classLoading, setClassLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [expandedCourses, setExpandedCourses] = useState({});
  const menuRef = useRef(null);
  const { user, isGuest } = useAuth();
  useStorageWarning();

  const loadBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isGuest) {
        const guestBoards = getGuestBoards();
        setBoards(guestBoards.map(b => ({
          id: b.id, name: b.name,
          type: b.type || b.board_type || 'course-material',
          board_type: b.type || b.board_type || 'course-material',
          course_name: b.course_name || null,
          is_starred: b.is_starred || false,
          is_archived: b.is_archived || false,
          updated_at: b.updated_at,
        })));
      } else {
        const params = { is_archived: 'false' };
        if (activeTab === 'my-boards') params.scope = 'personal';
        const response = await boardsApi.getAll(params);
        setBoards(response.data.results || response.data);
      }
    } catch (err) {
      setError('Failed to load boards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isGuest, activeTab]);

  const loadClassBoards = useCallback(async () => {
    setClassLoading(true);
    try {
      const response = await boardsApi.getAll({ is_archived: 'false', scope: 'course' });
      setClassBoards(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load class boards:', err);
    } finally {
      setClassLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const response = await coursesApi.getAll();
      setEnrolledCourses(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, []);

  useEffect(() => { loadBoards(); }, [loadBoards]);
  useEffect(() => { if (!isGuest) loadCourses(); }, [isGuest, loadCourses]);
  useEffect(() => { if (activeTab === 'class-boards' && !isGuest) loadClassBoards(); }, [activeTab, isGuest, loadClassBoards]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowBoardMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStar = async (boardId) => {
    if (isGuest) {
      setBoards(boards.map(b => b.id === boardId ? { ...b, is_starred: !b.is_starred } : b));
      return;
    }
    try {
      const response = await boardsApi.toggleStar(boardId);
      setBoards(boards.map(b => b.id === boardId ? { ...b, is_starred: response.data.is_starred } : b));
    } catch (err) { console.error('Failed to toggle star:', err); }
  };

  const handleArchive = async (boardId) => {
    if (isGuest) return;
    try {
      await boardsApi.archive(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to archive board:', err); }
  };

  const handleDelete = async (boardId) => {
    try {
      if (isGuest) deleteGuestBoard(boardId);
      else await boardsApi.delete(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to delete board:', err); }
  };

  const allBoards = boards.filter(b => !b.is_archived);
  const filteredBoards = allBoards.filter(board => {
    const matchesSearch = board.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStarred = !filterStarred || board.is_starred;
    return matchesSearch && matchesStarred;
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekCount = allBoards.filter(b => new Date(b.updated_at) > weekAgo).length;

  // Pinned = starred; recent = latest updates that are not already pinned. Both come from real board data.
  const pinned = pickPinned(allBoards);
  const recent = pickRecent(allBoards, new Set(pinned.map(b => b.id)));
  const starredCount = allBoards.filter(b => b.is_starred).length;

  const greeting = greetingFor(now, user?.first_name || user?.username);
  const dateLabel = dateLabelFor(now);

  const handleCreateBoard = async (templateId) => {
    setShowNewBoardModal(false);
    if (isGuest) {
      onNavigate('workspace', { templateType: templateId });
    } else {
      try {
        const response = await boardsApi.create({ name: 'Untitled Board', board_type: templateId, content: {} });
        onNavigate('workspace', { boardId: response.data.id, templateType: templateId });
      } catch (err) {
        onNavigate('workspace', { templateType: templateId });
      }
    }
  };

  const handleOpenBoard = (board) => onNavigate('workspace', { boardId: board.id });

  const showMyBoards = isGuest || activeTab === 'my-boards';
  const emptyMessage = searchQuery
    ? `No boards match "${searchQuery}"`
    : filterStarred
      ? 'No starred boards yet. Star a board to pin it here.'
      : 'Create your first board to get started.';

  // Shared board actions: star toggle and the more menu. Both sit above the card's stretched title link.
  const renderBoardMenu = (board) => (
    <div className="relative" ref={showBoardMenu === board.id ? menuRef : null}>
      <button
        type="button"
        aria-label={`Board actions for ${board.name}`}
        aria-expanded={showBoardMenu === board.id}
        onClick={(e) => { e.stopPropagation(); setShowBoardMenu(showBoardMenu === board.id ? null : board.id); }}
        className="flex h-11 w-11 items-center justify-center rounded hover:bg-surface-hover"
      >
        <MoreVertical className="h-4 w-4 text-ink-2" aria-hidden="true" />
      </button>
      {showBoardMenu === board.id && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-line bg-surface py-1 shadow-modal">
          {!isGuest && (
            <button type="button" onClick={() => handleArchive(board.id)} className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm text-ink hover:bg-surface-hover">
              <Archive className="h-4 w-4" aria-hidden="true" /><span>Archive</span>
            </button>
          )}
          <button type="button" onClick={() => handleDelete(board.id)} className="flex min-h-[44px] w-full items-center gap-2 px-3 text-left text-sm text-danger hover:bg-danger-tint">
            <Trash2 className="h-4 w-4" aria-hidden="true" /><span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );

  const renderStarButton = (board) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); toggleStar(board.id); }}
      aria-pressed={!!board.is_starred}
      aria-label={`Star ${board.name}`}
      className="flex h-11 w-11 items-center justify-center rounded hover:bg-surface-hover"
    >
      <Star className={cx('h-4 w-4', board.is_starred ? 'fill-amber-500 text-amber-500' : 'text-ink-3')} aria-hidden="true" />
    </button>
  );

  const renderGridCard = (board) => {
    const type = board.type || board.board_type;
    const known = getTypeStyle(type);
    const look = getTypeStyleOrFallback(type);
    const Icon = look.icon;
    return (
      <li key={board.id} className="relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-float transition hover:shadow-pop">
        <div aria-hidden="true" className={cx('flex h-28 items-center justify-center', look.tile)}>
          <Icon className={cx('h-10 w-10', look.glyph)} strokeWidth={1.5} />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 font-semibold text-ink">
              <button
                type="button"
                onClick={() => handleOpenBoard(board)}
                className="btn-motion block max-w-full truncate text-left hover:text-accent-700 after:absolute after:inset-0"
              >
                {board.name}
              </button>
            </h3>
            <div className="relative z-10 flex shrink-0 items-center">
              {renderStarButton(board)}
              {renderBoardMenu(board)}
            </div>
          </div>
          {known && <span className={cx(CHIP_CLASS,known.chip, 'mt-2 self-start')}>{known.label}</span>}
          <p className="mt-2 text-sm text-ink-2">{board.course_name || 'Personal'}</p>
          <p className="mt-auto pt-2 text-xs text-ink-2">{formatDate(board.updated_at)}</p>
        </div>
      </li>
    );
  };

  const renderListRow = (board) => {
    const type = board.type || board.board_type;
    const known = getTypeStyle(type);
    const look = getTypeStyleOrFallback(type);
    const Icon = look.icon;
    return (
      <li key={board.id} className="relative flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
        <span aria-hidden="true" className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded', look.tile)}>
          <Icon className={cx('h-5 w-5', look.glyph)} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-ink">
            <button
              type="button"
              onClick={() => handleOpenBoard(board)}
              className="btn-motion max-w-full truncate text-left hover:text-accent-700 after:absolute after:inset-0"
            >
              {board.name}
            </button>
          </h3>
          <p className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink-2">
            <span className="truncate">{board.course_name || 'Personal'}</span>
            {known && <span className={cx(CHIP_CLASS,known.chip)}>{known.label}</span>}
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          <span className="hidden text-sm text-ink-2 sm:block">{formatDate(board.updated_at)}</span>
          {renderStarButton(board)}
          {renderBoardMenu(board)}
        </div>
      </li>
    );
  };

  return (
    <ClassroomShell>
      <Navigation onNavigate={onNavigate} currentPage="dashboard" />
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <ChalkboardHeader
          size="banner"
          enter
          title={greeting}
          handTitle={greeting.length < 40}
          subtitle={`${dateLabel}. Here is what is on your board today.`}
          actions={
            <ClassroomButton onChalk icon={Plus} onClick={() => setShowNewBoardModal(true)}>New Board</ClassroomButton>
          }
        />

        {!isGuest && (
          <div className="mt-6 inline-flex gap-1 rounded-lg border border-line bg-surface p-1 shadow-float">
            <button
              type="button"
              aria-pressed={activeTab === 'my-boards'}
              onClick={() => setActiveTab('my-boards')}
              className={cx('btn-motion min-h-[44px] rounded px-4 text-sm font-medium', activeTab === 'my-boards' ? TAB_ON : TAB_OFF)}
            >
              My Boards
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'class-boards'}
              onClick={() => setActiveTab('class-boards')}
              className={cx('btn-motion min-h-[44px] rounded px-4 text-sm font-medium', activeTab === 'class-boards' ? TAB_ON : TAB_OFF)}
            >
              Class Boards
            </button>
          </div>
        )}

        {showMyBoards && (
          <>
            {/* Search is user text: white panel, never ruled paper or cork. */}
            <PaperPanel tone="white" padded={false} className="mt-6 flex flex-col gap-3 p-3 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search boards..."
                  aria-label="Search boards"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-[44px] w-full rounded border border-line-strong py-2 pl-10 pr-4 text-ink"
                />
              </div>
              <div className="flex shrink-0 overflow-hidden rounded border border-line-strong">
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                  className={cx('flex h-11 w-11 items-center justify-center', viewMode === 'grid' ? 'bg-accent-100 text-accent-700' : 'bg-surface text-ink-2 hover:bg-surface-hover')}
                >
                  <Grid className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                  className={cx('flex h-11 w-11 items-center justify-center', viewMode === 'list' ? 'bg-accent-100 text-accent-700' : 'bg-surface text-ink-2 hover:bg-surface-hover')}
                >
                  <List className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </PaperPanel>

            <section aria-label="Board summary" className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <PaperPanel tone="paper" padded={false} className="flex items-center gap-3 p-4">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded bg-accent-100 text-accent-600">
                  <Folder className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-2xl font-semibold text-ink">{allBoards.length}</span>
                  <span className="block text-sm text-ink-2">Total Boards</span>
                </span>
              </PaperPanel>
              <PaperPanel
                as="button"
                type="button"
                tone="paper"
                padded={false}
                aria-pressed={filterStarred}
                onClick={() => setFilterStarred(v => !v)}
                className={cx('btn-motion flex min-h-[44px] w-full items-center gap-3 p-4 text-left', filterStarred && 'ring-2 ring-amber-500')}
              >
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded bg-amber-100 text-amber-700">
                  <Star className={cx('h-5 w-5', filterStarred && 'fill-amber-500')} />
                </span>
                <span>
                  <span className="block text-2xl font-semibold text-ink">{starredCount}</span>
                  <span className="block text-sm text-ink-2">{filterStarred ? 'Starred (Active)' : 'Starred'}</span>
                </span>
              </PaperPanel>
              <PaperPanel tone="paper" padded={false} className="flex items-center gap-3 p-4">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded bg-green-100 text-green-700">
                  <Clock className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-2xl font-semibold text-ink">{thisWeekCount}</span>
                  <span className="block text-sm text-ink-2">This Week</span>
                </span>
              </PaperPanel>
            </section>

            {loading && <BoardSkeleton />}
            {error && (
              <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-danger bg-danger-tint px-4 py-3 text-danger">
                <span>{error}</span>
                <button type="button" onClick={loadBoards} className="btn-motion min-h-[44px] px-2 font-medium underline">Retry</button>
              </div>
            )}

            {/* Pinned and recent boards on a cork board. Notes hold text only; the heading sits on the wall. */}
            {!loading && !error && allBoards.length > 0 && (
              <section aria-labelledby="pinned-heading" className="mt-8">
                <h2 id="pinned-heading" className="font-hand text-xl text-ink">Pinned and recent</h2>
                <WoodFrame className="mt-3">
                  <CorkBoard padded={false} className="px-4 py-6 md:px-6 md:py-8">
                    {pinned.length > 0 ? pinned.map((board, i) => (
                      <li key={`pinned:${board.id}`}>
                        <StickyNote color="amber" pinned decorative rotate={i % 2 ? 2 : -2} className="h-full">
                          <span className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-2">Pinned</span>
                          <button
                            type="button"
                            onClick={() => handleOpenBoard(board)}
                            className="btn-motion mt-1 text-left text-base font-semibold text-ink after:absolute after:inset-0"
                          >
                            {board.name}
                          </button>
                          <span className="mt-auto pt-3 text-xs text-ink-2">{board.course_name || 'Personal'}</span>
                        </StickyNote>
                      </li>
                    )) : (
                      <li>
                        <StickyNote color="amber" className="h-full">
                          <p className="text-sm text-ink">Star a board to pin it here.</p>
                        </StickyNote>
                      </li>
                    )}
                    {recent.map((board, i) => (
                      <li key={`recent:${board.id}`}>
                        <StickyNote color="azure" decorative rotate={i % 2 ? -2 : 2} className="h-full">
                          <span className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-2">Recent</span>
                          <button
                            type="button"
                            onClick={() => handleOpenBoard(board)}
                            className="btn-motion mt-1 text-left text-base font-semibold text-ink after:absolute after:inset-0"
                          >
                            {board.name}
                          </button>
                          <span className="mt-auto pt-3 text-xs text-ink-2">{formatDate(board.updated_at)}</span>
                        </StickyNote>
                      </li>
                    ))}
                  </CorkBoard>
                </WoodFrame>
              </section>
            )}

            {!loading && !error && filteredBoards.length > 0 && (
              <section aria-labelledby="all-boards-heading" className="mt-8">
                <h2 id="all-boards-heading" className="font-hand text-xl text-ink">All boards</h2>
                {viewMode === 'grid' ? (
                  <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredBoards.map(renderGridCard)}
                  </ul>
                ) : (
                  <ul className="mt-3 overflow-hidden rounded-lg border border-line bg-surface shadow-float">
                    {filteredBoards.map(renderListRow)}
                  </ul>
                )}
              </section>
            )}

            {!loading && !error && filteredBoards.length === 0 && (
              <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-5">
                <StickyNote color="amber" decorative rotate={-2} spacious className="w-full">
                  <h3 className="font-sans text-xl font-semibold text-ink">{allBoards.length === 0 ? 'No boards yet' : 'No boards found'}</h3>
                  <p className="mt-1 text-sm text-ink">{emptyMessage}</p>
                </StickyNote>
                <ClassroomButton variant="primary" icon={Plus} onClick={() => setShowNewBoardModal(true)}>Create Board</ClassroomButton>
              </div>
            )}
          </>
        )}

        {/* Class Boards Tab */}
        {!isGuest && activeTab === 'class-boards' && (
          <>
            <PaperPanel tone="white" padded={false} className="mt-6 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search class boards by name..."
                  aria-label="Search class boards by name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-[44px] w-full rounded border border-line-strong py-2 pl-10 pr-4 text-ink"
                />
              </div>
            </PaperPanel>
            {classLoading ? (
              <BoardSkeleton />
            ) : (() => {
              const filtered = classBoards.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
              const grouped = filtered.reduce((acc, board) => {
                const courseName = board.course_name || 'Unknown Course';
                if (!acc[courseName]) acc[courseName] = [];
                acc[courseName].push(board);
                return acc;
              }, {});
              const courseNames = Object.keys(grouped).sort();
              if (courseNames.length === 0) {
                return (
                  <div className="mx-auto mt-10 max-w-md">
                    <StickyNote color="amber" decorative rotate={2} spacious className="w-full">
                      <h3 className="font-sans text-xl font-semibold text-ink">No class boards yet</h3>
                      <p className="mt-1 text-sm text-ink">{searchQuery ? `No class boards match "${searchQuery}"` : 'Boards from your enrolled courses will appear here.'}</p>
                    </StickyNote>
                  </div>
                );
              }
              return (
                <div className="mt-6 space-y-4">
                  {courseNames.map(courseName => {
                    const courseBoards = grouped[courseName];
                    const isExpanded = expandedCourses[courseName] !== false;
                    const course = enrolledCourses.find(c => c.name === courseName);
                    return (
                      <div key={courseName} className="overflow-hidden rounded-lg border border-line bg-surface shadow-float">
                        <h3>
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            onClick={() => setExpandedCourses(prev => ({ ...prev, [courseName]: !isExpanded }))}
                            className="flex min-h-[44px] w-full items-center justify-between gap-3 p-4 text-left hover:bg-surface-hover"
                          >
                            <span className="flex min-w-0 flex-wrap items-center gap-3">
                              {course?.code && <span className="rounded bg-accent-100 px-2 py-1 text-xs font-semibold text-accent-700">{course.code}</span>}
                              <span className="font-semibold text-ink">{courseName}</span>
                              <span className="text-sm text-ink-2">{courseBoards.length} board{courseBoards.length !== 1 ? 's' : ''}</span>
                            </span>
                            {isExpanded
                              ? <ChevronDown className="h-5 w-5 shrink-0 text-ink-2" aria-hidden="true" />
                              : <ChevronRight className="h-5 w-5 shrink-0 text-ink-2" aria-hidden="true" />}
                          </button>
                        </h3>
                        {isExpanded && (
                          <ul className="grid grid-cols-1 gap-3 border-t border-line p-4 md:grid-cols-2 lg:grid-cols-3">
                            {courseBoards.map(board => {
                              const type = board.type || board.board_type;
                              const known = getTypeStyle(type);
                              return (
                                <li key={board.id} className="relative rounded-lg border border-line p-4 transition hover:shadow-float">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="min-w-0 flex-1 font-medium text-ink">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenBoard(board)}
                                        className="btn-motion max-w-full truncate text-left hover:text-accent-700 after:absolute after:inset-0"
                                      >
                                        {board.name}
                                      </button>
                                    </h4>
                                    {board.is_starred && (
                                      <>
                                        <Star className="h-4 w-4 flex-shrink-0 fill-amber-500 text-amber-500" aria-hidden="true" />
                                        <span className="sr-only">Starred</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {known && <span className={cx(CHIP_CLASS,known.chip)}>{known.label}</span>}
                                    {board.can_edit === false && (
                                      <ChalkBadge label="View only" icon={Eye} />
                                    )}
                                  </div>
                                  <div className="mt-3 flex items-center justify-between text-xs text-ink-2">
                                    <span>{board.owner_name}</span>
                                    <span>{formatDate(board.updated_at)}</span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </main>

      <GuestRegistrationModal isOpen={showGuestModal} onClose={() => { setShowGuestModal(false); setPendingAction(null); }} onSuccess={() => { if (pendingAction === 'newBoard') setShowNewBoardModal(true); setPendingAction(null); loadBoards(); }} />

      {showNewBoardModal && (() => {
        const availableTemplates = getTemplatesForRole(user?.role || 'student');
        return (
          <ClassroomDialog
            titleId="new-board-title"
            title="Create New Board"
            onClose={() => setShowNewBoardModal(false)}
            closeLabel="Close"
            size="lg"
          >
            <p className="text-ink-2">Choose a board type to get started:</p>
            <div className="space-y-3">
              {availableTemplates.map((template) => {
                const look = getTypeStyleOrFallback(template.id);
                const Icon = look.icon;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleCreateBoard(template.id)}
                    className="btn-motion flex min-h-[44px] w-full items-center gap-4 rounded border border-line bg-surface p-3 text-left hover:border-accent hover:bg-accent-tint"
                  >
                    <span aria-hidden="true" className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded', look.tile)}>
                      <Icon className={cx('h-5 w-5', look.glyph)} strokeWidth={1.5} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{template.name}</span>
                      <span className="block text-sm text-ink-2">{template.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </ClassroomDialog>
        );
      })()}
    </ClassroomShell>
  );
}
