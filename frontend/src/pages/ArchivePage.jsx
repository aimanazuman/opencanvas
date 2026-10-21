import React, { useState, useEffect, useCallback } from 'react';
import { Archive, RotateCcw, Trash2, Search, X, AlertTriangle, Folder, Calendar } from 'lucide-react';
import Navigation from '../components/Navigation';
import {
  ClassroomShell, ChalkboardHeader, ChalkBadge, ClassroomAlert, ClassroomButton, ClassroomDialog, PaperPanel, StickyNote,
} from '../components/classroom';
import { getTypeStyle } from './student/studentMappings';
import { boardsApi } from '../services/api';

// Placeholder rows with no motion; announced once through a status region.
function ListSkeleton() {
  return (
    <PaperPanel tone="white" padded={false} className="overflow-hidden" aria-busy="true">
      <p role="status" className="sr-only">Loading archived boards</p>
      <div aria-hidden="true">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-3 border-t border-line p-4 first:border-t-0">
            <span className="h-10 w-10 flex-none rounded bg-line" />
            <span className="flex-1 space-y-2">
              <span className="block h-3 w-1/3 rounded-sm bg-line" />
              <span className="block h-3 w-2/3 rounded-sm bg-line" />
            </span>
          </div>
        ))}
      </div>
    </PaperPanel>
  );
}

const ArchivePage = ({ onNavigate, hideNav = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [archivedBoards, setArchivedBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadArchivedBoards = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await boardsApi.getArchived();
      const boards = (response.data.results || response.data).map(b => ({
        id: b.id,
        name: b.name,
        archivedDate: formatDateRelative(b.updated_at),
        course: b.course_name || 'No Course',
        boardType: b.board_type || b.type || 'course-material',
      }));
      setArchivedBoards(boards);
    } catch (err) {
      console.error('Failed to load archived boards:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchivedBoards();
  }, [loadArchivedBoards]);

  const query = searchQuery.toLowerCase();
  const filteredBoards = archivedBoards.filter(board =>
    board.name.toLowerCase().includes(query) ||
    board.course.toLowerCase().includes(query)
  );

  const handleRestore = async (boardId) => {
    try {
      await boardsApi.restore(boardId);
      setArchivedBoards(prev => prev.filter(b => b.id !== boardId));
      setShowRestoreModal(null);
    } catch (err) {
      console.error('Failed to restore board:', err);
    }
  };

  const handleDelete = async (boardId) => {
    try {
      await boardsApi.delete(boardId);
      setArchivedBoards(prev => prev.filter(b => b.id !== boardId));
      setShowDeleteModal(null);
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  const Content = hideNav ? 'div' : 'main';

  let list;
  if (loading) {
    list = <ListSkeleton />;
  } else if (loadError) {
    list = (
      <PaperPanel tone="white" padded={false} className="space-y-3 p-4">
        <ClassroomAlert>Could not load your archived boards.</ClassroomAlert>
        <ClassroomButton onClick={loadArchivedBoards}>Try again</ClassroomButton>
      </PaperPanel>
    );
  } else if (filteredBoards.length === 0) {
    list = (
      <StickyNote color="azure" className="mx-auto max-w-sm items-center text-center">
        <Archive className="mb-2 h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-base font-semibold text-ink">
          {searchQuery ? 'No matching boards found' : 'No archived boards'}
        </h2>
        <p className="mt-1 text-sm text-ink">
          {searchQuery ? 'Try a different search term' : 'Boards you archive will appear here'}
        </p>
        <ClassroomButton variant="primary" className="mt-4" onClick={() => onNavigate('dashboard')}>
          Go to Dashboard
        </ClassroomButton>
      </StickyNote>
    );
  } else {
    list = (
      <PaperPanel tone="white" padded={false} className="overflow-hidden">
        <ul aria-label="Archived boards">
          {filteredBoards.map(board => {
            const type = getTypeStyle(board.boardType);
            return (
              <li key={board.id} className="flex flex-col gap-3 border-t border-line px-4 py-3 first:border-t-0 sm:flex-row sm:items-center">
                <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded bg-surface-hover">
                  <Folder className="h-5 w-5 text-ink-2" strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 truncate font-semibold text-ink">{board.name}</h2>
                    {type && <ChalkBadge icon={type.icon} label={type.label} />}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
                    <span>{board.course}</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>Archived {board.archivedDate}</span>
                    </span>
                  </p>
                </div>
                <div className="flex flex-none gap-2">
                  <ClassroomButton icon={RotateCcw} onClick={() => setShowRestoreModal(board)}>
                    Restore<span className="sr-only"> {board.name}</span>
                  </ClassroomButton>
                  <ClassroomButton icon={Trash2} onClick={() => setShowDeleteModal(board)}>
                    Delete<span className="sr-only"> {board.name}</span>
                  </ClassroomButton>
                </div>
              </li>
            );
          })}
        </ul>
      </PaperPanel>
    );
  }

  return (
    <ClassroomShell embedded={hideNav}>
      {!hideNav && <Navigation onNavigate={onNavigate} />}

      <Content
        aria-labelledby="archive-title"
        className={hideNav ? 'space-y-4' : 'mx-auto max-w-5xl space-y-4 px-4 py-6 md:py-8'}
      >
        <ChalkboardHeader
          size="compact"
          titleId="archive-title"
          title="Archived Boards"
          subtitle="Restore or permanently delete archived workspaces"
        >
          <span className="mt-3 block">
            <ChalkBadge surface="chalk" icon={Archive} label={`${archivedBoards.length} items`} />
          </span>
        </ChalkboardHeader>

        <PaperPanel tone="white" padded={false} className="p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
            <label htmlFor="archive-search" className="sr-only">Search archived boards</label>
            <input
              id="archive-search"
              type="text"
              placeholder="Search archived boards by name or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[44px] w-full rounded border border-line-strong py-2 pl-10 pr-11 text-ink"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded hover:bg-surface-hover"
              >
                <X className="h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-ink-2">
              Found {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
            </p>
          )}
        </PaperPanel>

        {list}
      </Content>

      {showRestoreModal && (
        <ClassroomDialog
          titleId="restore-board-title"
          title="Restore Board"
          closeLabel="Close"
          onClose={() => setShowRestoreModal(null)}
          footer={(
            <>
              <ClassroomButton className="flex-1" onClick={() => setShowRestoreModal(null)}>Cancel</ClassroomButton>
              <ClassroomButton variant="primary" icon={RotateCcw} className="flex-1" onClick={() => handleRestore(showRestoreModal.id)}>
                Restore
              </ClassroomButton>
            </>
          )}
        >
          <div className="flex items-center gap-3 rounded-lg bg-accent-50 p-4">
            <Folder className="h-8 w-8 flex-none text-accent-600" strokeWidth={1.5} aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{showRestoreModal.name}</p>
              <p className="text-sm text-ink-2">{showRestoreModal.course}</p>
            </div>
          </div>
          <p className="text-ink-2">
            This board will be restored to your dashboard and you can continue working on it.
          </p>
        </ClassroomDialog>
      )}

      {showDeleteModal && (
        <ClassroomDialog
          titleId="delete-board-title"
          title="Delete Board Permanently"
          titleClassName="text-danger"
          closeLabel="Close"
          onClose={() => setShowDeleteModal(null)}
          footer={(
            <>
              <ClassroomButton className="flex-1" onClick={() => setShowDeleteModal(null)}>Cancel</ClassroomButton>
              <ClassroomButton variant="danger" icon={Trash2} className="flex-1" onClick={() => handleDelete(showDeleteModal.id)}>
                Delete Forever
              </ClassroomButton>
            </>
          )}
        >
          <div className="flex items-center gap-3 rounded-lg bg-danger-tint p-4">
            <AlertTriangle className="h-8 w-8 flex-none text-danger" strokeWidth={1.5} aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{showDeleteModal.name}</p>
              <p className="text-sm text-danger">This action cannot be undone!</p>
            </div>
          </div>
          <p className="text-ink-2">
            Are you sure you want to permanently delete this board? All content, files, and collaboration history will be lost forever.
          </p>
        </ClassroomDialog>
      )}
    </ClassroomShell>
  );
};

function formatDateRelative(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export default ArchivePage;
