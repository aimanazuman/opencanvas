import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Search, Star, MoreVertical, Archive, Trash2, ArrowLeft, Grid, List } from 'lucide-react';
import Navigation from '../../components/Navigation';
import { ClassroomShell, ChalkboardHeader, ClassroomButton, ClassroomAlert, PaperPanel, StickyNote } from '../../components/classroom';
import cx from '../../components/classroom/cx';
import { getTypeStyleOrFallback } from '../student/studentMappings';
import { boardsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function formatTimeAgo(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Static placeholders for the loading state. No pulse loop.
function BoardSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Loading boards</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="h-40 rounded-lg border border-line bg-surface-hover" />
      ))}
    </div>
  );
}

export default function TemplateBoardsPage({ onNavigate, templateId, templateName, templateDescription, TemplateIcon }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showBoardMenu, setShowBoardMenu] = useState(null);
  const menuRef = useRef(null);
  const { isGuest } = useAuth();

  // Colour comes from the board type, the same static map the student dashboard uses.
  const look = getTypeStyleOrFallback(templateId);

  const loadBoards = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await boardsApi.getAll({ board_type: templateId, is_archived: 'false' });
      setBoards(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load boards:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowBoardMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = async () => {
    try {
      const res = await boardsApi.create({ name: `Untitled ${templateName}`, board_type: templateId, content: {} });
      onNavigate('workspace', { boardId: res.data.id, templateType: templateId });
    } catch (err) {
      onNavigate('workspace', { templateType: templateId });
    }
  };

  const handleOpen = (board) => onNavigate('workspace', { boardId: board.id });

  const toggleStar = async (boardId) => {
    try {
      const res = await boardsApi.toggleStar(boardId);
      setBoards(prev => prev.map(b => b.id === boardId ? { ...b, is_starred: res.data.is_starred } : b));
    } catch (err) { console.error('Failed to toggle star:', err); }
  };

  const handleArchive = async (boardId) => {
    try {
      await boardsApi.archive(boardId);
      setBoards(prev => prev.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to archive:', err); }
  };

  const handleDelete = async (boardId) => {
    if (!window.confirm('Delete this board?')) return;
    try {
      await boardsApi.delete(boardId);
      setBoards(prev => prev.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to delete:', err); }
  };

  const query = searchQuery.toLowerCase();
  const filtered = boards.filter(b => b.name.toLowerCase().includes(query));

  // Star toggle and the more menu. Both sit above the row's stretched title button.
  const renderStarButton = (board) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); toggleStar(board.id); }}
      aria-pressed={!!board.is_starred}
      aria-label={`Star ${board.name}`}
      className="flex h-11 w-11 items-center justify-center rounded hover:bg-surface-hover"
    >
      <Star className={cx('h-4 w-4', board.is_starred ? 'fill-amber-500 text-amber-500' : 'text-ink-2')} aria-hidden="true" />
    </button>
  );

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

  const renderGridCard = (board) => (
    <li key={board.id} className="relative flex flex-col rounded-lg border border-line bg-surface shadow-float transition hover:shadow-pop">
      <div aria-hidden="true" className={cx('flex h-28 items-center justify-center rounded-t-lg', look.tile)}>
        <TemplateIcon className={cx('h-10 w-10', look.glyph)} strokeWidth={1.5} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 font-medium text-ink">
            <button
              type="button"
              onClick={() => handleOpen(board)}
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
        <p className="mt-auto pt-2 text-xs text-ink-2">{formatTimeAgo(board.updated_at)}</p>
      </div>
    </li>
  );

  const renderListRow = (board) => (
    <li key={board.id} className="relative flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
      <span aria-hidden="true" className={cx('flex h-10 w-10 flex-none items-center justify-center rounded', look.tile)}>
        <TemplateIcon className={cx('h-5 w-5', look.glyph)} strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium text-ink">
          <button
            type="button"
            onClick={() => handleOpen(board)}
            className="btn-motion max-w-full truncate text-left hover:text-accent-700 after:absolute after:inset-0"
          >
            {board.name}
          </button>
        </h3>
        <p className="truncate text-sm text-ink-2">{board.course_name || 'Personal'}</p>
      </div>
      <div className="relative z-10 flex flex-none items-center gap-1">
        <span className="hidden text-sm text-ink-2 sm:block">{formatTimeAgo(board.updated_at)}</span>
        {renderStarButton(board)}
        {renderBoardMenu(board)}
      </div>
    </li>
  );

  let content;
  if (loading) {
    content = <BoardSkeleton />;
  } else if (loadError) {
    content = (
      <PaperPanel tone="white" padded={false} className="space-y-3 p-4">
        <ClassroomAlert>Could not load these boards.</ClassroomAlert>
        <ClassroomButton onClick={loadBoards}>Try again</ClassroomButton>
      </PaperPanel>
    );
  } else if (filtered.length === 0) {
    content = (
      <StickyNote color="azure" className="mx-auto max-w-sm items-center text-center">
        <TemplateIcon className="mb-2 h-6 w-6 text-ink" strokeWidth={1.5} aria-hidden="true" />
        <h3 className="text-base font-semibold text-ink">
          {searchQuery ? `No boards match "${searchQuery}"` : `No ${templateName.toLowerCase()} boards yet`}
        </h3>
        <p className="mt-1 text-sm text-ink">{searchQuery ? 'Try a different search' : 'Create your first one to get started'}</p>
        {!searchQuery && (
          <ClassroomButton variant="primary" icon={Plus} className="mt-4" onClick={handleCreate}>
            Create {templateName}
          </ClassroomButton>
        )}
      </StickyNote>
    );
  } else if (viewMode === 'grid') {
    content = (
      <ul aria-label={`${templateName} boards`} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(renderGridCard)}
      </ul>
    );
  } else {
    content = (
      <ul aria-label={`${templateName} boards`} className="rounded-lg border border-line bg-surface shadow-float">
        {filtered.map(renderListRow)}
      </ul>
    );
  }

  return (
    <ClassroomShell>
      <Navigation onNavigate={onNavigate} currentPage="templates" />
      <main aria-labelledby="template-boards-title" className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={() => onNavigate('templates')}
          className="btn-motion inline-flex min-h-[44px] items-center gap-1 rounded text-sm font-medium text-ink-2 hover:text-accent-700"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          <span>All Templates</span>
        </button>

        <ChalkboardHeader
          size="banner"
          underline
          titleId="template-boards-title"
          title={templateName}
          subtitle={templateDescription}
          actions={
            <ClassroomButton onChalk icon={Plus} onClick={handleCreate}>New {templateName}</ClassroomButton>
          }
        />

        {/* Search and view toggle are user input: white panel, never ruled paper or cork. */}
        <PaperPanel tone="white" padded={false} className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
            <label htmlFor="template-boards-search" className="sr-only">{`Search ${templateName} boards`}</label>
            <input
              id="template-boards-search"
              type="text"
              placeholder={`Search ${templateName.toLowerCase()} boards...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[44px] w-full rounded border border-line-strong py-2 pl-10 pr-4 text-ink"
            />
          </div>
          <div className="flex items-center justify-between gap-3 md:justify-end">
            <span className="text-sm text-ink-2">{filtered.length} board{filtered.length !== 1 ? 's' : ''}</span>
            <div role="group" aria-label="View mode" className="flex overflow-hidden rounded border border-line-strong">
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
          </div>
        </PaperPanel>

        {content}
      </main>
    </ClassroomShell>
  );
}
