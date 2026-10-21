import React, { useState, useEffect, useCallback } from 'react';
import { Archive, RotateCcw, Trash2, Clock } from 'lucide-react';
import { boardsApi } from '../../services/api';
import { formatTimeAgo } from '../../hooks/useLecturerData';
import {
  ChalkboardHeader, ClassroomAlert, ClassroomButton, PaperPanel, StickyNote,
} from '../../components/classroom';

// Placeholder rows with no motion; announced once through a status region.
function ListSkeleton() {
  return (
    <PaperPanel tone="white" padded={false} className="overflow-hidden" aria-busy="true">
      <p role="status" className="sr-only">Loading archived boards</p>
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

export default function LecturerArchivePage() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await boardsApi.getAll({ is_archived: 'true' });
      setBoards(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load archived boards:', err);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id) => {
    try {
      await boardsApi.restore(id);
      setBoards((prev) => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to restore board:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this board?')) return;
    try {
      await boardsApi.delete(id);
      setBoards((prev) => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  let body;
  if (loading) {
    body = <ListSkeleton />;
  } else if (loadFailed) {
    body = (
      <PaperPanel tone="white" padded={false} className="space-y-3 p-4">
        <ClassroomAlert>Could not load your archived boards. Check your connection and try again.</ClassroomAlert>
        <ClassroomButton onClick={load}>Try again</ClassroomButton>
      </PaperPanel>
    );
  } else if (boards.length === 0) {
    body = (
      <StickyNote as="div" color="azure" className="mx-auto max-w-sm items-center text-center">
        <Archive className="mb-2 h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="text-base font-semibold text-ink">No archived boards</h2>
        <p className="mt-1 text-sm text-ink">Boards you archive will appear here</p>
      </StickyNote>
    );
  } else {
    body = (
      <PaperPanel tone="white" padded={false} className="overflow-hidden">
        <ul aria-label="Archived boards">
          {boards.map((board) => (
            <li
              key={board.id}
              className="flex flex-col gap-3 border-t border-line p-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold text-ink">{board.name}</h2>
                <time dateTime={board.updated_at} className="mt-1 flex items-center gap-1 text-xs text-ink-2">
                  <Clock className="h-3.5 w-3.5 flex-none" strokeWidth={1.5} aria-hidden="true" />
                  <span>{formatTimeAgo(board.updated_at)}</span>
                </time>
              </div>
              <div className="flex flex-none gap-2">
                <ClassroomButton icon={RotateCcw} onClick={() => handleRestore(board.id)}>
                  Restore
                </ClassroomButton>
                <ClassroomButton icon={Trash2} onClick={() => handleDelete(board.id)}>
                  Delete
                </ClassroomButton>
              </div>
            </li>
          ))}
        </ul>
      </PaperPanel>
    );
  }

  return (
    <section aria-labelledby="archive-title" className="space-y-4">
      <ChalkboardHeader
        size="compact"
        titleId="archive-title"
        title="Archived Boards"
        subtitle="Boards you have archived. Restore or permanently delete them."
      />
      {body}
    </section>
  );
}
