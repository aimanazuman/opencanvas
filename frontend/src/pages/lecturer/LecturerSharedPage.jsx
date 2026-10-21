import React, { useState, useEffect, useCallback } from 'react';
import { Share2, Clock, Eye, MessageSquare } from 'lucide-react';
import { boardsApi } from '../../services/api';
import { formatTimeAgo } from '../../hooks/useLecturerData';
import {
  ChalkboardHeader, ChalkBadge, ClassroomAlert, ClassroomButton, PaperPanel, StickyNote,
} from '../../components/classroom';

// Permission badges. Label and icon carry the meaning; the tone only adds emphasis.
const PERMISSION = {
  commenter: { label: 'Commenter', icon: MessageSquare, tone: 'warning' },
  viewOnly: { label: 'View only', icon: Eye, tone: 'neutral' },
};

function permissionFor(board) {
  if (board.permission === 'comment') return PERMISSION.commenter;
  if (board.can_edit === false) return PERMISSION.viewOnly;
  return null;
}

// Placeholder rows with no motion; announced once through a status region.
function ListSkeleton() {
  return (
    <PaperPanel tone="white" padded={false} className="overflow-hidden" aria-busy="true">
      <p role="status" className="sr-only">Loading shared boards</p>
      <div aria-hidden="true">
        {[0, 1, 2].map((i) => (
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

export default function LecturerSharedPage({ onNavigate }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadBoards = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await boardsApi.getAll({ shared: 'true', is_archived: 'false' });
      setBoards(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load shared boards:', err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  let body;
  if (loading) {
    body = <ListSkeleton />;
  } else if (loadFailed) {
    body = (
      <PaperPanel tone="white" padded={false} className="space-y-3 p-4">
        <ClassroomAlert>Could not load your shared boards. Check your connection and try again.</ClassroomAlert>
        <ClassroomButton onClick={loadBoards}>Try again</ClassroomButton>
      </PaperPanel>
    );
  } else if (boards.length === 0) {
    body = (
      <StickyNote as="div" color="azure" className="mx-auto max-w-sm items-center text-center">
        <Share2 className="mb-2 h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-base font-semibold text-ink">No shared boards</h2>
        <p className="mt-1 text-sm text-ink">Boards shared with you will appear here</p>
      </StickyNote>
    );
  } else {
    body = (
      <PaperPanel tone="white" padded={false} className="overflow-hidden">
        <ul aria-label="Shared boards">
          {boards.map((board) => {
            const perm = permissionFor(board);
            return (
              <li
                key={board.id}
                className="relative flex flex-col gap-2 border-t border-line p-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-ink">
                    <button
                      type="button"
                      onClick={() => onNavigate('workspace', { boardId: board.id })}
                      className="max-w-full truncate text-left before:absolute before:inset-0 before:content-[''] hover:text-accent-700"
                    >
                      {board.name}
                    </button>
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-2">by {board.owner_name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {perm && <ChalkBadge icon={perm.icon} label={perm.label} tone={perm.tone} />}
                  <time dateTime={board.updated_at} className="flex items-center gap-1 text-xs text-ink-2">
                    <Clock className="h-3.5 w-3.5 flex-none" strokeWidth={1.5} aria-hidden="true" />
                    <span>{formatTimeAgo(board.updated_at)}</span>
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      </PaperPanel>
    );
  }

  return (
    <section aria-labelledby="shared-title" className="space-y-4">
      <ChalkboardHeader
        size="compact"
        titleId="shared-title"
        title="Shared Boards"
        subtitle="Boards shared with you by others"
      />
      {body}
    </section>
  );
}
