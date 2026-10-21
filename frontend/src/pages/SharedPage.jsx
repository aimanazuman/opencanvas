import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Filter, X, LogOut, Clock, SortAsc, Pencil, Eye, MessageSquare, ExternalLink } from 'lucide-react';
import Navigation from '../components/Navigation';
import {
  ClassroomShell, ChalkboardHeader, ChalkBadge, ClassroomAlert, ClassroomButton, ClassroomDialog, PaperPanel, StickyNote,
} from '../components/classroom';
import { getTypeStyle } from './student/studentMappings';
import { boardsApi } from '../services/api';

// Static lookup. Permission is shown as a ChalkBadge: the icon and label carry it, colour only adds emphasis.
const ROLE_STYLE = {
  Editor: { icon: Pencil, tone: 'success' },
  Viewer: { icon: Eye, tone: 'neutral' },
  Commenter: { icon: MessageSquare, tone: 'warning' },
};

// Placeholder rows with no motion; announced once through a status region.
function ListSkeleton() {
  return (
    <PaperPanel tone="white" padded={false} className="overflow-hidden" aria-busy="true">
      <p role="status" className="sr-only">Loading shared boards</p>
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

const SharedPage = ({ onNavigate, hideNav = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showLeaveModal, setShowLeaveModal] = useState(null);
  const [sharedBoards, setSharedBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadSharedBoards = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await boardsApi.getAll({ shared: true });
      const data = response.data.results || response.data;
      const mapped = data.map((b) => ({
        id: b.id,
        name: b.name,
        owner: b.owner_name || 'Unknown',
        members: (b.collaborators?.length || 0) + 1,
        role: b.permission === 'edit' || b.can_edit === true ? 'Editor' : b.permission === 'comment' ? 'Commenter' : 'Viewer',
        lastAccess: formatDateRelative(b.updated_at),
        boardType: b.board_type || 'course-material',
      }));
      setSharedBoards(mapped);
    } catch (err) {
      console.error('Failed to load shared boards:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSharedBoards();
  }, [loadSharedBoards]);

  const roles = ['all', 'Editor', 'Viewer', 'Commenter'];
  const query = searchQuery.toLowerCase();

  const filteredBoards = sharedBoards
    .filter(board => {
      const matchesSearch = board.name.toLowerCase().includes(query) ||
                           board.owner.toLowerCase().includes(query);
      const matchesRole = filterRole === 'all' || board.role === filterRole;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'owner') return a.owner.localeCompare(b.owner);
      if (sortBy === 'members') return b.members - a.members;
      return 0; // recent (default order)
    });

  const handleLeaveBoard = async (boardId) => {
    try {
      await boardsApi.leave(boardId);
      setSharedBoards(prev => prev.filter(b => b.id !== boardId));
      setShowLeaveModal(null);
    } catch (err) {
      console.error('Failed to leave board:', err);
    }
  };

  const Content = hideNav ? 'div' : 'main';

  let list;
  if (loading) {
    list = <ListSkeleton />;
  } else if (loadError) {
    list = (
      <PaperPanel tone="white" padded={false} className="space-y-3 p-4">
        <ClassroomAlert>Could not load your shared boards.</ClassroomAlert>
        <ClassroomButton onClick={loadSharedBoards}>Try again</ClassroomButton>
      </PaperPanel>
    );
  } else if (filteredBoards.length === 0) {
    const filtered = Boolean(searchQuery) || filterRole !== 'all';
    list = (
      <StickyNote color="azure" className="mx-auto max-w-sm items-center text-center">
        <Users className="mb-2 h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-base font-semibold text-ink">
          {filtered ? 'No matching boards found' : 'No shared boards yet'}
        </h2>
        <p className="mt-1 text-sm text-ink">
          {filtered ? 'Try adjusting your search or filter' : 'When someone shares a board with you, it will appear here'}
        </p>
        <ClassroomButton variant="primary" className="mt-4" onClick={() => onNavigate('dashboard')}>
          Go to Dashboard
        </ClassroomButton>
      </StickyNote>
    );
  } else {
    list = (
      <PaperPanel tone="white" padded={false} className="overflow-hidden">
        <ul aria-label="Shared boards">
          {filteredBoards.map(board => {
            const type = getTypeStyle(board.boardType);
            const role = ROLE_STYLE[board.role] || ROLE_STYLE.Viewer;
            return (
              <li key={board.id} className="flex flex-col gap-3 border-t border-line px-4 py-3 first:border-t-0 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 truncate font-semibold text-ink">{board.name}</h2>
                    {type && <ChalkBadge icon={type.icon} label={type.label} />}
                  </div>
                  <p className="mt-1 text-sm text-ink-2">Owned by {board.owner}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>{board.members} members</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>Last accessed {board.lastAccess}</span>
                    </span>
                  </p>
                </div>
                <div className="flex flex-none flex-wrap items-center gap-2">
                  <ChalkBadge icon={role.icon} label={board.role} tone={role.tone} />
                  <ClassroomButton icon={ExternalLink} onClick={() => onNavigate('workspace', { boardId: board.id })}>
                    Open Board<span className="sr-only"> {board.name}</span>
                  </ClassroomButton>
                  <ClassroomButton icon={LogOut} onClick={() => setShowLeaveModal(board)}>
                    Leave<span className="sr-only"> {board.name}</span>
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
        aria-labelledby="shared-title"
        className={hideNav ? 'space-y-4' : 'mx-auto max-w-5xl space-y-4 px-4 py-6 md:py-8'}
      >
        <ChalkboardHeader
          size="compact"
          titleId="shared-title"
          title="Shared With Me"
          subtitle="Boards that others have shared with you"
        >
          <span className="mt-3 block">
            <ChalkBadge surface="chalk" icon={Users} label={`${sharedBoards.length} shared boards`} />
          </span>
        </ChalkboardHeader>

        {/* Search and filters are user input: white panel, never ruled paper or cork. */}
        <PaperPanel tone="white" padded={false} className="flex flex-col gap-3 p-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
            <label htmlFor="shared-search" className="sr-only">Search shared boards</label>
            <input
              id="shared-search"
              type="text"
              placeholder="Search by board name or owner..."
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

          <div className="relative md:w-44">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
            <label htmlFor="shared-role" className="sr-only">Filter by role</label>
            <select
              id="shared-role"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="min-h-[44px] w-full appearance-none rounded border border-line-strong bg-surface py-2 pl-10 pr-8 text-ink"
            >
              {roles.map(role => (
                <option key={role} value={role}>
                  {role === 'all' ? 'All Roles' : role}
                </option>
              ))}
            </select>
          </div>

          <div className="relative md:w-44">
            <SortAsc className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
            <label htmlFor="shared-sort" className="sr-only">Sort shared boards</label>
            <select
              id="shared-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="min-h-[44px] w-full appearance-none rounded border border-line-strong bg-surface py-2 pl-10 pr-8 text-ink"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Name (A-Z)</option>
              <option value="owner">Owner (A-Z)</option>
              <option value="members">Most Members</option>
            </select>
          </div>
          {searchQuery && (
            <p className="text-sm text-ink-2 md:basis-full">
              Found {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''} matching &quot;{searchQuery}&quot;
            </p>
          )}
        </PaperPanel>

        {list}
      </Content>

      {showLeaveModal && (
        <ClassroomDialog
          titleId="leave-board-title"
          title="Leave Board"
          closeLabel="Close"
          onClose={() => setShowLeaveModal(null)}
          footer={(
            <>
              <ClassroomButton className="flex-1" onClick={() => setShowLeaveModal(null)}>Cancel</ClassroomButton>
              <ClassroomButton variant="danger" icon={LogOut} className="flex-1" onClick={() => handleLeaveBoard(showLeaveModal.id)}>
                Leave Board
              </ClassroomButton>
            </>
          )}
        >
          <div className="rounded-lg bg-surface-hover p-4">
            <p className="font-semibold text-ink">{showLeaveModal.name}</p>
            <p className="text-sm text-ink-2">Owned by {showLeaveModal.owner}</p>
          </div>
          <p className="text-ink-2">
            Are you sure you want to leave this board? You will lose access unless the owner shares it with you again.
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

export default SharedPage;
