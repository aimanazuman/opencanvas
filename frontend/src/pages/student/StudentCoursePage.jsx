import React, { useState, useEffect } from 'react';
import Navigation from '../../components/Navigation';
import { ArrowLeft, Clock, Star, Hash, Eye, LogOut, Users, Calendar } from 'lucide-react';
import { coursesApi, boardsApi } from '../../services/api';
import { ClassroomShell, ChalkboardHeader, ChalkBadge, ClassroomButton, PaperPanel, StickyNote } from '../../components/classroom';
import cx from '../../components/classroom/cx';
import { getTypeStyle, courseStatus, CHIP_CLASS } from './studentMappings';

// Literal ids: aria-controls and aria-labelledby point at these.
const TABS = [
  { id: 'boards', label: 'Boards', tabId: 'course-tab-boards', panelId: 'course-panel-boards' },
  { id: 'details', label: 'Details', tabId: 'course-tab-details', panelId: 'course-panel-details' },
];

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

export default function StudentCoursePage({ onNavigate, courseId }) {
  const [course, setCourse] = useState(null);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropping, setDropping] = useState(false);
  const [activeTab, setActiveTab] = useState('boards');

  useEffect(() => {
    if (!courseId) return;
    const load = async () => {
      try {
        const [courseRes, boardsRes] = await Promise.all([
          coursesApi.get(courseId),
          boardsApi.getAll({ course: courseId, is_archived: 'false' }),
        ]);
        setCourse(courseRes.data);
        setBoards(boardsRes.data.results || boardsRes.data);
      } catch (err) {
        console.error('Failed to load course:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  const handleDrop = async () => {
    if (!window.confirm('Are you sure you want to drop this course? You can re-enroll later using the invite code.')) return;
    setDropping(true);
    try {
      await coursesApi.unenroll(courseId);
      onNavigate('courses');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to drop course');
      setDropping(false);
    }
  };

  // WAI tabs pattern: arrows, Home and End move between tabs and focus the new tab.
  const onTabKeyDown = (e) => {
    const index = TABS.findIndex(t => t.id === activeTab);
    let next = null;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    setActiveTab(TABS[next].id);
    const el = document.getElementById(TABS[next].tabId);
    if (el) el.focus();
  };

  if (loading) {
    return (
      <ClassroomShell>
        <Navigation onNavigate={onNavigate} currentPage="courses" />
        <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
          <div role="status" className="space-y-4">
            <span className="sr-only">Loading course</span>
            <div aria-hidden="true" className="h-28 rounded-lg border border-line bg-surface-hover" />
            <div aria-hidden="true" className="h-40 rounded-lg border border-line bg-surface-hover" />
          </div>
        </main>
      </ClassroomShell>
    );
  }

  if (!course) {
    return (
      <ClassroomShell>
        <Navigation onNavigate={onNavigate} currentPage="courses" />
        <main className="mx-auto max-w-7xl px-4 py-10">
          <div className="mx-auto flex max-w-md flex-col items-center gap-5">
            <StickyNote color="amber" decorative rotate={-2} spacious className="w-full">
              <h1 className="font-hand text-xl text-ink">Course not found</h1>
            </StickyNote>
            <ClassroomButton variant="primary" onClick={() => onNavigate('courses')}>Back to courses</ClassroomButton>
          </div>
        </main>
      </ClassroomShell>
    );
  }

  const status = courseStatus(course);

  const renderBoard = (board) => {
    const type = board.type || board.board_type;
    const known = getTypeStyle(type);
    return (
      <li key={board.id} className="relative rounded-lg border border-line bg-surface p-4 shadow-float transition hover:shadow-pop">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 font-semibold text-ink">
            <button
              type="button"
              onClick={() => onNavigate('workspace', { boardId: board.id })}
              className="btn-motion block max-w-full truncate text-left hover:text-accent-700 after:absolute after:inset-0"
            >
              {board.name}
            </button>
          </h3>
          {board.is_starred && (
            <>
              <Star className="h-4 w-4 flex-shrink-0 fill-amber-500 text-amber-500" aria-hidden="true" />
              <span className="sr-only">Starred</span>
            </>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {known && <span className={cx(CHIP_CLASS, known.chip)}>{known.label}</span>}
          {board.can_edit === false && <ChalkBadge label="View only" icon={Eye} />}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-2">
          <span className="truncate">{board.owner_name}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {formatTimeAgo(board.updated_at)}
          </span>
        </div>
      </li>
    );
  };

  return (
    <ClassroomShell>
      <Navigation onNavigate={onNavigate} currentPage="courses" />
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <button
          type="button"
          onClick={() => onNavigate('courses')}
          className="btn-motion mb-4 inline-flex min-h-[44px] items-center gap-1 rounded px-1 text-sm font-medium text-ink-2 hover:text-accent-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Courses</span>
        </button>

        <ChalkboardHeader
          size="compact"
          title={course.name}
          handTitle={(course.name || '').length < 40}
          subtitle={course.instructor_name ? `Taught by ${course.instructor_name}` : undefined}
        >
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {course.code && <ChalkBadge label={course.code} icon={Hash} surface="chalk" />}
            <ChalkBadge label={status.label} icon={status.icon} surface="chalk" />
          </div>
          <div role="tablist" aria-label="Course sections" onKeyDown={onTabKeyDown} className="mt-3 flex gap-2">
            {TABS.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={tab.tabId}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={tab.panelId}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={cx(
                    'btn-motion min-h-[44px] rounded px-4 text-sm font-medium',
                    selected ? 'bg-chalk-ink text-chalk-board' : 'text-chalk-dust hover:text-chalk-ink'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </ChalkboardHeader>

        {activeTab === 'boards' ? (
          <section id="course-panel-boards" role="tabpanel" aria-labelledby="course-tab-boards" className="mt-6">
            <h2 className="font-hand text-xl text-ink">Course Boards ({boards.length})</h2>
            {boards.length === 0 ? (
              <div className="mx-auto mt-6 max-w-md">
                <StickyNote color="amber" decorative rotate={2} spacious className="w-full">
                  <h3 className="font-sans text-xl font-semibold text-ink">No boards yet</h3>
                  <p className="mt-1 text-sm text-ink">Boards for this course will appear here.</p>
                </StickyNote>
              </div>
            ) : (
              <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {boards.map(renderBoard)}
              </ul>
            )}
          </section>
        ) : (
          <section id="course-panel-details" role="tabpanel" aria-labelledby="course-tab-details" className="mt-6">
            <PaperPanel tone="white" padded={false} className="p-5 md:p-6">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.04em] text-ink-2">Instructor</dt>
                  <dd className="mt-1 flex items-center gap-1 text-ink">
                    <Users className="h-4 w-4 text-ink-2" aria-hidden="true" />
                    {course.instructor_name || 'Instructor'}
                  </dd>
                </div>
                {course.student_count != null && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.04em] text-ink-2">Students</dt>
                    <dd className="mt-1 text-ink">{course.student_count}</dd>
                  </div>
                )}
                {course.start_date && (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-[0.04em] text-ink-2">Started</dt>
                    <dd className="mt-1 flex items-center gap-1 text-ink">
                      <Calendar className="h-4 w-4 text-ink-2" aria-hidden="true" />
                      {new Date(course.start_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
              {course.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-ink">About this course</h3>
                  <p className="mt-1 whitespace-pre-line text-ink-2">{course.description}</p>
                </div>
              )}
              <div className="mt-6 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={handleDrop}
                  disabled={dropping}
                  className="flex min-h-[44px] items-center gap-2 rounded px-3 text-sm font-medium text-danger hover:bg-danger-tint disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>{dropping ? 'Dropping...' : 'Drop Course'}</span>
                </button>
              </div>
            </PaperPanel>
          </section>
        )}
      </main>
    </ClassroomShell>
  );
}
