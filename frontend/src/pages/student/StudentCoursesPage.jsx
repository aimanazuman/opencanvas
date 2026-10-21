import React, { useState, useEffect } from 'react';
import Navigation from '../../components/Navigation';
import { Plus, Search, Users, Calendar, Hash, CheckCircle, LogOut } from 'lucide-react';
import { coursesApi } from '../../services/api';
import {
  ClassroomShell, ChalkboardHeader, ClassroomButton, ClassroomDialog, ClassroomField, ClassroomAlert, PaperPanel, StickyNote, ChalkBadge,
} from '../../components/classroom';
import cx from '../../components/classroom/cx';
import { courseStatus, spineFor } from './studentMappings';

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
}

// Loading placeholder: static blocks, no pulse loop.
function CourseSkeleton() {
  return (
    <div role="status" className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Loading courses</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="h-44 rounded-lg border border-line bg-surface-hover" />
      ))}
    </div>
  );
}

export default function StudentCoursesPage({ onNavigate }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Join course modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinPreview, setJoinPreview] = useState(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const [joinSection, setJoinSection] = useState('');

  // Drop course
  const [droppingCourseId, setDroppingCourseId] = useState(null);

  const load = async () => {
    try {
      const res = await coursesApi.getAll();
      setCourses(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = courses.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLookupCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    setJoinLoading(true);
    setJoinError('');
    setJoinPreview(null);
    try {
      const res = await coursesApi.getInviteInfo(code);
      setJoinPreview(res.data);
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Invalid invite code');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleJoinCourse = async () => {
    setJoinLoading(true);
    setJoinError('');
    try {
      const res = await coursesApi.joinByCode({
        invite_code: inviteCode.trim().toUpperCase(),
        section: joinSection,
      });
      setJoinSuccess(res.data.message || 'Successfully enrolled!');
      setJoinPreview(null);
      load();
    } catch (err) {
      setJoinError(err.response?.data?.error || 'Failed to join course');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleDropCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to drop this course? You can re-enroll later.')) return;
    setDroppingCourseId(courseId);
    try {
      await coursesApi.unenroll(courseId);
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to drop course');
    } finally {
      setDroppingCourseId(null);
    }
  };

  const closeJoinModal = () => {
    setShowJoinModal(false);
    setInviteCode('');
    setJoinPreview(null);
    setJoinError('');
    setJoinSuccess('');
    setJoinSection('');
  };

  const now = new Date();

  // Paper card. The title is the card's one link (stretched over the card); the drop button sits above it.
  const renderCourse = (course) => {
    const status = courseStatus(course, now);
    const dropping = droppingCourseId === course.id;
    return (
      <PaperPanel as="li" key={course.id} padded={false} className="relative flex flex-col overflow-hidden">
        <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-2', spineFor(course.id))} />
        <div className="flex flex-1 flex-col gap-3 p-5 pl-6">
          <div className="flex flex-wrap items-center gap-2">
            {course.code && (
              <span className="inline-flex h-6 items-center rounded bg-accent-100 px-2 text-xs font-semibold text-accent-700">{course.code}</span>
            )}
            <ChalkBadge label={status.label} icon={status.icon} tone={status.tone} />
          </div>
          <h3 className="break-words text-lg font-semibold leading-snug text-ink">
            <button
              type="button"
              onClick={() => onNavigate('course', { courseId: course.id })}
              className="btn-motion text-left hover:text-accent-700 after:absolute after:inset-0"
            >
              {course.name}
            </button>
          </h3>
          {course.description && (
            <p className="line-clamp-2 text-sm text-ink-2">{course.description}</p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {course.instructor_name || 'Instructor'}
            </span>
            {course.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDate(course.start_date)}
              </span>
            )}
          </div>
        </div>
        <div className="relative z-10 border-t border-line">
          <button
            type="button"
            onClick={() => handleDropCourse(course.id)}
            disabled={dropping}
            className="flex min-h-[44px] w-full items-center justify-center gap-1 px-3 text-sm font-medium text-danger hover:bg-danger-tint disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{dropping ? 'Dropping...' : 'Drop Course'}</span>
          </button>
        </div>
      </PaperPanel>
    );
  };

  return (
    <ClassroomShell>
      <Navigation onNavigate={onNavigate} currentPage="courses" />
      <main className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <ChalkboardHeader
          size="banner"
          enter
          title="My Courses"
          subtitle="Courses you are enrolled in"
          actions={
            <ClassroomButton onChalk icon={Plus} onClick={() => setShowJoinModal(true)}>Join Course</ClassroomButton>
          }
        />

        {/* Search is user text: white panel, never ruled paper or cork. */}
        <PaperPanel tone="white" padded={false} className="mt-6 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-2" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search courses..."
              aria-label="Search courses"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[44px] w-full rounded border border-line-strong py-2 pl-10 pr-4 text-ink"
            />
          </div>
        </PaperPanel>

        {loading ? (
          <CourseSkeleton />
        ) : filtered.length === 0 ? (
          <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-5">
            <StickyNote color="amber" decorative rotate={-2} spacious className="w-full">
              <h3 className="font-sans text-xl font-semibold text-ink">No courses found</h3>
              <p className="mt-1 text-sm text-ink">
                {searchQuery ? `No courses match "${searchQuery}"` : 'You are not enrolled in any courses yet.'}
              </p>
            </StickyNote>
            {!searchQuery && (
              <ClassroomButton variant="primary" icon={Plus} onClick={() => setShowJoinModal(true)}>Join a Course</ClassroomButton>
            )}
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(renderCourse)}
          </ul>
        )}
      </main>

      {/* Join Course Modal: white panel on the shared dialog (focus, Escape, focus return); no chalkboard or ruled paper */}
      {showJoinModal && (
        <ClassroomDialog
          titleId="join-course-title"
          title="Join a Course"
          onClose={closeJoinModal}
          closeLabel="Close"
          size="md"
          footer={(
            <ClassroomButton variant="secondary" className="w-full" onClick={closeJoinModal}>
              {joinSuccess ? 'Done' : 'Cancel'}
            </ClassroomButton>
          )}
        >
          {joinSuccess ? (
            <div className="py-4 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-success" strokeWidth={1.5} aria-hidden="true" />
              <p className="mb-1 font-medium text-ink">{joinSuccess}</p>
              <p className="text-sm text-ink-2">You can now access this course from your courses list</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <ClassroomField
                  id="invite-code-input"
                  label="Course Invite Code"
                  className="min-w-0 flex-1"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setJoinError(''); setJoinPreview(null); }}
                  controlClassName="pl-9 uppercase tracking-wider"
                  aria-describedby="invite-code-hint"
                  endAdornment={(
                    <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
                      <Hash className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                  )}
                  placeholder="Enter code"
                  maxLength={20}
                />
                <ClassroomButton variant="secondary" onClick={handleLookupCode} disabled={joinLoading || !inviteCode.trim()}>
                  {joinLoading && !joinPreview ? 'Looking...' : 'Lookup'}
                </ClassroomButton>
              </div>
              <p id="invite-code-hint" className="text-xs text-ink-2">Enter the code shared by your lecturer</p>

              {joinError && <ClassroomAlert>{joinError}</ClassroomAlert>}

              {joinPreview && (
                <div className="space-y-3 rounded-lg border border-line bg-surface-hover p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ChalkBadge icon={Hash} label={joinPreview.code} />
                    <span className="font-semibold text-ink">{joinPreview.name}</span>
                  </div>
                  {joinPreview.description && (
                    <p className="text-sm text-ink-2">{joinPreview.description}</p>
                  )}
                  <div className="text-sm text-ink-2">
                    Instructor: {joinPreview.instructor_name}
                  </div>

                  {(joinPreview.sections || []).length > 0 && (
                    <ClassroomField
                      id="join-section-select"
                      as="select"
                      label="Select Section (optional)"
                      value={joinSection}
                      onChange={(e) => setJoinSection(e.target.value)}
                    >
                      <option value="">No section</option>
                      {joinPreview.sections.map(s => (
                        <option key={s} value={s}>Section {s}</option>
                      ))}
                    </ClassroomField>
                  )}

                  {joinPreview.is_enrolled ? (
                    <p className="text-sm font-medium text-success">You are already enrolled in this course</p>
                  ) : (
                    <ClassroomButton variant="primary" className="w-full" onClick={handleJoinCourse} disabled={joinLoading}>
                      {joinLoading ? 'Joining...' : 'Join This Course'}
                    </ClassroomButton>
                  )}
                </div>
              )}
            </>
          )}
        </ClassroomDialog>
      )}
    </ClassroomShell>
  );
}
