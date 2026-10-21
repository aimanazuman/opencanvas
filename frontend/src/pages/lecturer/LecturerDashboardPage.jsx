import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Folder, Plus, Star, Clock, ArrowRight } from 'lucide-react';
import { boardsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLecturerData, formatTimeAgo } from '../../hooks/useLecturerData';
import useStorageWarning from '../../hooks/useStorageWarning';
import {
  ChalkboardHeader, ClassroomButton, ClassroomAlert, PaperPanel, StickyNote, CorkBoard, WoodFrame, ChalkBadge,
} from '../../components/classroom';
import cx from '../../components/classroom/cx';
import {
  getTypeStyle, CHIP_CLASS, pickPinned, pickRecent, greetingFor, dateLabelFor, courseStatus,
} from '../student/studentMappings';
import { recentCourses, recentEnrollments, studentNameFor, initialsFor } from './lecturerMappings';

// Static lookup: Tailwind only sees literal class names. Hues: azure, green, teal (the approved set).
const STAT_TILE = {
  azure: 'bg-accent-100 text-accent-700',
  green: 'bg-green-100 text-green-700',
  teal: 'bg-teal-100 text-teal-700',
};

// Loading placeholder: static blocks, no pulse loop (motion stays limited to reveal, lift and press).
function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="mt-6">
      <span className="sr-only">Loading your dashboard</span>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-lg bg-line" />)}
      </div>
      <div aria-hidden="true" className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-sm bg-line" />)}
      </div>
    </div>
  );
}

export default function LecturerDashboardPage({ onNavigate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courses, enrollments, loading: dataLoading, loadFailed, reload, totalStudents, totalBoards } = useLecturerData();
  useStorageWarning();

  const [boards, setBoards] = useState([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [boardsFailed, setBoardsFailed] = useState(false);

  const loadBoards = useCallback(async () => {
    setBoardsLoading(true);
    try {
      const res = await boardsApi.getAll({ is_archived: 'false' });
      setBoards(res.data.results || res.data);
      setBoardsFailed(false);
    } catch (err) {
      console.error('Failed to load boards:', err);
      setBoardsFailed(true);
    } finally {
      setBoardsLoading(false);
    }
  }, []);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  const loading = dataLoading || boardsLoading;
  const failed = loadFailed || boardsFailed;

  const retry = () => {
    reload();
    loadBoards();
  };

  const now = new Date();
  const greeting = greetingFor(now, user?.first_name || user?.username);
  const dateLabel = dateLabelFor(now);

  // Pinned = starred boards; recent = latest updates that are not pinned. Both come from the boards list.
  const pinned = pickPinned(boards);
  const recent = pickRecent(boards, new Set(pinned.map((b) => b.id)));
  const boardNotes = [
    ...pinned.map((board) => ({ board, kind: 'pinned' })),
    ...recent.map((board) => ({ board, kind: 'recent' })),
  ];
  const courseNotes = recentCourses(courses);
  const enrolments = recentEnrollments(enrollments, 4);

  const stats = [
    { label: 'Total Courses', value: courses.length, icon: BookOpen, tile: STAT_TILE.azure },
    { label: 'Total Students', value: totalStudents, icon: Users, tile: STAT_TILE.green },
    { label: 'Active Boards', value: totalBoards, icon: Folder, tile: STAT_TILE.teal },
  ];

  return (
    <div>
      <ChalkboardHeader
        size="banner"
        enter
        title={greeting}
        handTitle={greeting.length < 40}
        subtitle={dateLabel}
        actions={
          <ClassroomButton onChalk icon={Plus} onClick={() => navigate('/lecturer/courses')}>
            New Course
          </ClassroomButton>
        }
      />

      {failed && (
        <div className="mt-6">
          <ClassroomAlert tone="danger">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>Could not load your dashboard. Check your connection and try again.</p>
              <ClassroomButton onClick={retry}>Try again</ClassroomButton>
            </div>
          </ClassroomAlert>
        </div>
      )}

      {loading ? <DashboardSkeleton /> : (
        <>
          {/* Summary: paper tiles with counts from the courses list. */}
          <section aria-label="Summary" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <PaperPanel key={stat.label} tone="paper" padded={false} className="flex items-center gap-3 p-4">
                <span aria-hidden="true" className={cx('flex h-10 w-10 flex-none items-center justify-center rounded', stat.tile)}>
                  <stat.icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="block text-2xl font-semibold tabular-nums text-ink">{stat.value}</span>
                  <span className="block text-sm text-ink-2">{stat.label}</span>
                </span>
              </PaperPanel>
            ))}
          </section>

          {/* Cork board of pinned and recent boards. Headings sit on the wall, never on cork. */}
          <section aria-labelledby="dash-boards-title" className="mt-8">
            <h2 id="dash-boards-title" className="text-base font-semibold text-ink">Pinned and recent boards</h2>
            <p className="mt-1 text-sm text-ink-2">Star a board in My Boards to pin it here.</p>
            <WoodFrame width="sm" className="mt-3">
              <CorkBoard as="div" padded={false} className="rounded-sm p-3 md:p-5">
                {boardNotes.length === 0 && !failed && (
                  <li>
                    <StickyNote color="amber" className="text-sm">
                      <span className="font-medium">No boards yet.</span>
                      <span className="mt-1 text-ink-2">Boards you create or are given appear here.</span>
                    </StickyNote>
                  </li>
                )}
                {boardNotes.map(({ board, kind }, index) => {
                  const type = board.board_type || board.type;
                  const known = getTypeStyle(type);
                  return (
                    <li key={`${kind}-${board.id}`}>
                      <StickyNote
                        as="button"
                        type="button"
                        color={kind === 'pinned' ? 'amber' : 'azure'}
                        decorative
                        rotate={index % 2 ? 2 : -2}
                        onClick={() => onNavigate('workspace', { boardId: board.id })}
                        className="btn-motion h-full w-full text-left focus-visible:outline-ink"
                      >
                        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2">
                          {kind === 'pinned'
                            ? <Star className="h-4 w-4 fill-amber-500 text-amber-700" strokeWidth={1.5} aria-hidden="true" />
                            : <Clock className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
                          <span>{kind === 'pinned' ? 'Pinned' : 'Recent'}</span>
                        </span>
                        <span className="mt-2 break-words text-sm font-semibold text-ink">{board.name}</span>
                        <span className="mt-1 break-words text-xs text-ink-2">{board.course_name || 'Personal'}</span>
                        {known && <span className={cx(CHIP_CLASS, known.chip, 'mt-2 self-start')}>{known.label}</span>}
                        <span className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-ink-2">
                          <span>{formatTimeAgo(board.updated_at)}</span>
                          <span className="flex items-center gap-1 font-medium text-accent-800">
                            <span>Open</span>
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                          </span>
                        </span>
                      </StickyNote>
                    </li>
                  );
                })}
              </CorkBoard>
            </WoodFrame>
          </section>

          {/* Course overview: recent courses as notes. Each opens the courses page. */}
          <section aria-labelledby="dash-courses-title" className="mt-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 id="dash-courses-title" className="text-base font-semibold text-ink">Course Overview</h2>
                <p className="mt-1 text-sm text-ink-2">Your most recent courses.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/lecturer/courses')}
                className="btn-motion min-h-[44px] rounded px-2 text-sm font-medium text-accent-700 hover:underline"
              >
                View All
              </button>
            </div>
            <WoodFrame width="sm" className="mt-3">
              <CorkBoard as="div" padded={false} className="rounded-sm p-3 md:p-5">
                {courseNotes.length === 0 && !failed && (
                  <li>
                    <StickyNote color="amber" className="text-sm">
                      <span className="font-medium">No courses yet.</span>
                      <span className="mt-1 text-ink-2">Create your first course to start a board.</span>
                    </StickyNote>
                  </li>
                )}
                {courseNotes.map((course, index) => {
                  const status = courseStatus(course);
                  return (
                    <li key={course.id}>
                      <StickyNote
                        as="button"
                        type="button"
                        color="green"
                        decorative
                        rotate={index % 2 ? -2 : 2}
                        onClick={() => navigate('/lecturer/courses')}
                        className="btn-motion h-full w-full text-left focus-visible:outline-ink"
                      >
                        <span className="text-xs font-semibold text-ink-2">{course.code}</span>
                        <span className="mt-1 break-words text-sm font-semibold text-ink">{course.name}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                            <span>{course.student_count || 0} students</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Folder className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                            <span>{course.board_count || 0} boards</span>
                          </span>
                        </span>
                        <span className="mt-3">
                          <ChalkBadge label={status.label} icon={status.icon} tone={status.tone} />
                        </span>
                      </StickyNote>
                    </li>
                  );
                })}
              </CorkBoard>
            </WoodFrame>
          </section>

          {/* Recent enrolments: a dense list on a white panel (no paper rules, no cork). */}
          <section aria-labelledby="dash-enrol-title" className="mt-8">
            <PaperPanel tone="white" padded={false} className="p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 id="dash-enrol-title" className="text-base font-semibold text-ink">Recent Enrollments</h2>
                <button
                  type="button"
                  onClick={() => navigate('/lecturer/students')}
                  className="btn-motion min-h-[44px] rounded px-2 text-sm font-medium text-accent-700 hover:underline"
                >
                  View All
                </button>
              </div>
              {enrolments.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-2">No enrollments yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {enrolments.map((enrollment) => (
                    <li key={enrollment.id} className="flex items-center gap-3 py-3">
                      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-accent-500 text-sm font-medium text-white">
                        {initialsFor(enrollment)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">
                          <span className="font-medium">{studentNameFor(enrollment)}</span>
                          {' - Enrolled'}
                        </p>
                        <p className="text-xs text-ink-2">{enrollment.course_details?.code || ''}</p>
                      </div>
                      <span className="flex-none text-xs text-ink-2">{formatTimeAgo(enrollment.enrolled_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </PaperPanel>
          </section>
        </>
      )}
    </div>
  );
}
