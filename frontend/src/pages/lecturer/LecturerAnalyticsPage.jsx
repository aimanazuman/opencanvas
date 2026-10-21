import React, { useState, useEffect, useCallback } from 'react';
import { Users, Folder, BookOpen, Activity } from 'lucide-react';
import { boardsApi } from '../../services/api';
import { useLecturerData } from '../../hooks/useLecturerData';
import {
  ChalkboardHeader, ClassroomAlert, ClassroomButton, PaperPanel, StickyNote,
} from '../../components/classroom';
import cx from '../../components/classroom/cx';

// Metric tiles: one hue per metric from the chart palette (azure, green, teal, amber). Each tile also has a text label.
const TILE = {
  azure: 'bg-accent-100 text-accent-700',
  green: 'bg-green-100 text-green-700',
  teal: 'bg-teal-100 text-teal-700',
  amber: 'bg-amber-100 text-amber-700',
};

// Loading placeholder: static blocks, announced once through a status region.
function AnalyticsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="mt-4 space-y-4">
      <span className="sr-only">Loading analytics</span>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-line" />)}
      </div>
      <div aria-hidden="true" className="h-40 rounded-lg bg-line" />
    </div>
  );
}

export default function LecturerAnalyticsPage({ onNavigate }) {
  const { courses, loading: dataLoading, loadFailed: dataFailed, reload: reloadData, totalStudents, totalBoards } = useLecturerData();
  const [boards, setBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [boardsFailed, setBoardsFailed] = useState(false);

  const loadBoards = useCallback(async () => {
    setBoardsLoading(true);
    setBoardsFailed(false);
    try {
      const res = await boardsApi.getAll({ is_archived: 'false' });
      setBoards(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load boards:', err);
      setBoardsFailed(true);
    } finally {
      setBoardsLoading(false);
    }
  }, []);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  const loading = dataLoading || boardsLoading;
  const failed = dataFailed || boardsFailed;

  const retry = () => {
    reloadData();
    loadBoards();
  };

  const boardsWithTracking = boards.filter(b => b.content?.trackInteractions);
  const totalInteractions = boardsWithTracking.reduce((sum, b) => {
    const interactions = b.content?.interactions || {};
    return sum + Object.values(interactions).reduce((s, u) => s + (u.actions?.length || 0), 0);
  }, 0);

  const metrics = [
    { label: 'Total Students', value: totalStudents, icon: Users, tile: TILE.green },
    { label: 'Total Boards', value: totalBoards, icon: Folder, tile: TILE.teal },
    { label: 'Total Courses', value: courses.length, icon: BookOpen, tile: TILE.azure },
    { label: 'Interactions', value: totalInteractions, icon: Activity, tile: TILE.amber },
  ];

  let body;
  if (failed) {
    // A failed request must not show zeros that look like real data.
    body = (
      <PaperPanel tone="white" padded={false} className="space-y-3 p-4">
        <ClassroomAlert>Could not load your analytics. Check your connection and try again.</ClassroomAlert>
        <ClassroomButton onClick={retry}>Try again</ClassroomButton>
      </PaperPanel>
    );
  } else {
    body = (
      <div className="space-y-4">
        <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <PaperPanel key={m.label} tone="white" className="flex items-center gap-3">
              <span aria-hidden="true" className={cx('flex h-10 w-10 flex-none items-center justify-center rounded', m.tile)}>
                <m.icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-ink-2">{m.label}</p>
                <p className="text-2xl font-semibold tabular-nums text-ink">{m.value}</p>
              </div>
            </PaperPanel>
          ))}
        </section>

        <PaperPanel tone="white" className="space-y-4 p-4">
          <h2 id="analytics-courses" className="text-base font-semibold text-ink">Course Performance</h2>
          {courses.length === 0 ? (
            <StickyNote as="div" color="azure" className="mx-auto max-w-sm items-center text-center">
              <p className="text-sm text-ink">No courses to analyze</p>
            </StickyNote>
          ) : (
            <ul aria-labelledby="analytics-courses" className="divide-y divide-line">
              {courses.map((course) => (
                <li key={course.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="flex-none rounded-sm bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-700">{course.code}</span>
                    <span className="min-w-0 truncate text-sm font-semibold text-ink">{course.name}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-ink-2">Students</dt>
                      <dd className="text-lg font-semibold tabular-nums text-ink">{course.student_count || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-ink-2">Boards</dt>
                      <dd className="text-lg font-semibold tabular-nums text-ink">{course.board_count || 0}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </PaperPanel>

        {boardsWithTracking.length > 0 && (
          <PaperPanel tone="white" className="space-y-4 p-4">
            <h2 id="analytics-activity" className="flex items-center gap-2 text-base font-semibold text-ink">
              <Activity className="h-4 w-4 flex-none text-amber-700" strokeWidth={1.5} aria-hidden="true" />
              <span>Board Interaction Activity</span>
            </h2>
            <ul aria-labelledby="analytics-activity" className="divide-y divide-line">
              {boardsWithTracking.map((b) => {
                const interactions = b.content?.interactions || {};
                const userCount = Object.keys(interactions).length;
                const actionCount = Object.values(interactions).reduce((s, u) => s + (u.actions?.length || 0), 0);
                return (
                  <li key={b.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="min-w-0 truncate text-sm font-semibold text-ink">{b.name}</h3>
                      <ClassroomButton onClick={() => onNavigate('workspace', { boardId: b.id })}>
                        Open Board
                      </ClassroomButton>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm text-ink-2">Active Users</dt>
                        <dd className="text-lg font-semibold tabular-nums text-ink">{userCount}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-ink-2">Total Actions</dt>
                        <dd className="text-lg font-semibold tabular-nums text-ink">{actionCount}</dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ul>
          </PaperPanel>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="analytics-title" className="space-y-4">
      <ChalkboardHeader
        size="compact"
        titleId="analytics-title"
        title="Analytics"
        subtitle="Track student engagement and course performance"
      />
      {loading ? <AnalyticsSkeleton /> : body}
    </section>
  );
}
