import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Filter, Folder, BookOpen, Clock, MoreVertical, Star, Archive, Trash2, Users } from 'lucide-react';
import { boardsApi, coursesApi } from '../../services/api';
import { formatTimeAgo } from '../../hooks/useLecturerData';
import {
  ChalkboardHeader, ChalkBadge, ClassroomAlert, ClassroomButton, PaperPanel, StickyNote,
} from '../../components/classroom';
import cx from '../../components/classroom/cx';
import { getTypeStyleOrFallback, CHIP_CLASS } from '../student/studentMappings';

// Static class lookups: Tailwind only sees literal class names. Selection is a border plus tint, never colour alone.
const CHOICE_BASE = 'inline-flex h-11 items-center gap-1.5 rounded border px-3 text-sm font-medium md:h-8';
const CHOICE = {
  on: 'border-accent bg-accent-tint text-accent-700',
  off: 'border-line-strong bg-surface text-ink hover:bg-surface-hover',
};
const ICON_BUTTON = 'flex h-11 w-11 flex-none items-center justify-center rounded text-ink-2 hover:bg-surface-hover md:h-8 md:w-8';
const MENU_ITEM = 'flex h-11 w-full items-center gap-2 rounded px-2 text-left text-sm text-ink hover:bg-surface-hover md:h-8';
const MENU_ITEM_DANGER = 'flex h-11 w-full items-center gap-2 rounded px-2 text-left text-sm text-danger hover:bg-danger-tint md:h-8';

// Loading placeholder: static blocks, announced once through a status region.
function BoardsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Loading boards</span>
      {[0, 1, 2].map((i) => <div key={i} aria-hidden="true" className="h-28 rounded border border-line bg-line" />)}
    </div>
  );
}

// One board. The title button stretches over the whole card (before: overlay), so the card opens the board
// without nesting buttons. The star and the menu sit above that overlay.
function BoardCard({ board, menuOpen, menuRef, onOpen, onToggleStar, onToggleMenu, onArchive, onDelete }) {
  const style = board.board_type ? getTypeStyleOrFallback(board.board_type) : null;
  const TypeIcon = style?.icon;
  return (
    <li className="relative flex flex-col rounded border border-line bg-surface p-3 hover:shadow-float">
      <div className="flex items-start gap-2">
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-ink">
          <button
            type="button"
            onClick={onOpen}
            className="max-w-full truncate text-left before:absolute before:inset-0 before:content-[''] hover:text-accent-700"
          >
            {board.name}
          </button>
        </h2>
        <div ref={menuOpen ? menuRef : undefined} className="relative z-10 flex flex-none items-center">
          <button
            type="button"
            onClick={onToggleStar}
            aria-pressed={Boolean(board.is_starred)}
            aria-label={`Star ${board.name}`}
            className={ICON_BUTTON}
          >
            <Star
              className={cx('h-4 w-4', board.is_starred ? 'fill-amber-500 text-amber-700' : 'text-ink-3')}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={onToggleMenu}
            aria-label={`Board actions for ${board.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={ICON_BUTTON}
          >
            <MoreVertical className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-11 z-20 w-40 rounded-lg border border-line bg-surface p-1 shadow-pop md:top-8">
              <button type="button" role="menuitem" onClick={onArchive} className={MENU_ITEM}>
                <Archive className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /><span>Archive</span>
              </button>
              <button type="button" role="menuitem" onClick={onDelete} className={MENU_ITEM_DANGER}>
                <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /><span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {board.board_type && (
          <span className={cx(CHIP_CLASS, style.chip)}>
            {TypeIcon && <TypeIcon className="mr-1 h-3 w-3 flex-none" strokeWidth={1.5} aria-hidden="true" />}
            <span>{style.label || board.board_type}</span>
          </span>
        )}
        {board.course_name && <ChalkBadge icon={BookOpen} label={board.course_name} />}
        {board.section && <ChalkBadge icon={Users} label={`Section ${board.section}`} />}
      </div>
      <time dateTime={board.updated_at} className="mt-3 flex items-center gap-1 text-xs text-ink-2">
        <Clock className="h-3.5 w-3.5 flex-none" strokeWidth={1.5} aria-hidden="true" />
        <span>{formatTimeAgo(board.updated_at)}</span>
      </time>
    </li>
  );
}

export default function LecturerBoardsPage({ onNavigate }) {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const urlCourse = urlParams.get('course');
  const urlSection = urlParams.get('section');

  const [boards, setBoards] = useState([]);
  const [courses, setCourses] = useState([]);
  // Starts true so the empty state never flashes before the first request.
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [courseFilter, setCourseFilter] = useState(urlCourse || 'all');
  const [sectionFilter, setSectionFilter] = useState(urlSection || '');
  const [search, setSearch] = useState('');
  const [showBoardMenu, setShowBoardMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    coursesApi.getAll().then(res => setCourses(res.data.results || res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowBoardMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadBoards = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const params = { is_archived: 'false' };
      if (courseFilter === 'all') params.scope = 'personal';
      else if (courseFilter === 'all-courses') params.scope = 'course';
      else params.course = courseFilter;
      const res = await boardsApi.getAll(params);
      setBoards(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load boards:', err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [courseFilter]);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  const toggleStar = async (boardId) => {
    try {
      const response = await boardsApi.toggleStar(boardId);
      setBoards((prev) => prev.map(b => b.id === boardId ? { ...b, is_starred: response.data.is_starred } : b));
    } catch (err) { console.error('Failed to toggle star:', err); }
  };

  const handleArchive = async (boardId) => {
    try {
      await boardsApi.archive(boardId);
      setBoards((prev) => prev.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to archive board:', err); }
  };

  const handleDelete = async (boardId) => {
    if (!window.confirm('Are you sure you want to delete this board?')) return;
    try {
      await boardsApi.delete(boardId);
      setBoards((prev) => prev.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to delete board:', err); }
  };

  const handleNewBoard = () => {
    const params = {};
    if (courseFilter && courseFilter !== 'all' && courseFilter !== 'all-courses') {
      params.courseId = courseFilter;
      const course = courses.find(c => String(c.id) === String(courseFilter));
      if (course) params.courseName = course.code;
      if (sectionFilter) params.section = sectionFilter;
    }
    onNavigate('lecturer-templates', params);
  };

  let filtered = boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  if (sectionFilter) filtered = filtered.filter(b => b.section === sectionFilter);

  let body;
  if (loading) {
    body = <BoardsSkeleton />;
  } else if (loadFailed) {
    body = null; // The alert above explains the state; an empty message would be wrong here.
  } else if (filtered.length === 0) {
    body = (
      <StickyNote color="azure" className="mx-auto max-w-sm items-center text-center">
        <Folder className="mb-2 h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-base font-semibold text-ink">No boards found</h2>
        <p className="mt-1 text-sm text-ink">{search ? 'Try a different search term' : 'Create a new board to get started'}</p>
      </StickyNote>
    );
  } else {
    body = (
      <ul aria-label="Boards" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(board => (
          <BoardCard
            key={board.id}
            board={board}
            menuOpen={showBoardMenu === board.id}
            menuRef={menuRef}
            onOpen={() => onNavigate('workspace', { boardId: board.id })}
            onToggleStar={() => toggleStar(board.id)}
            onToggleMenu={() => setShowBoardMenu(showBoardMenu === board.id ? null : board.id)}
            onArchive={() => handleArchive(board.id)}
            onDelete={() => handleDelete(board.id)}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <ChalkboardHeader
        size="compact"
        titleId="boards-title"
        title="My Boards"
        subtitle="View and manage your boards across all courses"
        actions={
          <ClassroomButton onChalk icon={Plus} onClick={handleNewBoard}>
            New Board
          </ClassroomButton>
        }
      />

      <PaperPanel tone="white" className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <label htmlFor="boards-search" className="sr-only">Search boards by name</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
            <input
              id="boards-search"
              type="text"
              placeholder="Search boards by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 md:h-8"
            />
          </div>
          <div className="relative">
            <label htmlFor="boards-course" className="sr-only">Show boards from</label>
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
            <select
              id="boards-course"
              value={courseFilter}
              onChange={(e) => { setCourseFilter(e.target.value); setSectionFilter(''); }}
              className="h-11 w-full min-w-[180px] appearance-none rounded border border-line-strong bg-surface pl-9 pr-8 text-sm text-ink md:h-8"
            >
              <option value="all">Personal Boards</option>
              <option value="all-courses">All Course Boards</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {courses.length > 0 && (
          <section aria-labelledby="boards-browse" className="border-t border-line pt-4">
            <h2 id="boards-browse" className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-2">
              Browse by Course & Section
            </h2>
            <div className="flex flex-wrap gap-2">
              {courses.map(c => {
                const active = String(courseFilter) === String(c.id);
                return (
                  <React.Fragment key={c.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => { setCourseFilter(String(c.id)); setSectionFilter(''); }}
                      className={cx(CHOICE_BASE, active ? CHOICE.on : CHOICE.off)}
                    >
                      <BookOpen className="h-4 w-4 flex-none" strokeWidth={1.5} aria-hidden="true" />
                      <span>{c.code}</span>
                    </button>
                    {active && (c.sections || []).map(sec => {
                      const secActive = sectionFilter === sec;
                      return (
                        <button
                          key={sec}
                          type="button"
                          aria-pressed={secActive}
                          onClick={() => setSectionFilter(secActive ? '' : sec)}
                          className={cx(CHOICE_BASE, secActive ? CHOICE.on : CHOICE.off)}
                        >
                          <span>Section {sec}</span>
                        </button>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </section>
        )}
      </PaperPanel>

      {loadFailed && (
        <ClassroomAlert>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>Could not load your boards. Check your connection and try again.</p>
            <ClassroomButton onClick={loadBoards}>Try again</ClassroomButton>
          </div>
        </ClassroomAlert>
      )}

      {body}
    </div>
  );
}
