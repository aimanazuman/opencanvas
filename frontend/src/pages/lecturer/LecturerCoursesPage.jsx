import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Users, Folder, FileText, Plus, Trash2, Eye, BarChart, Layers, Share2, Copy, RefreshCw, Link, Check,
} from 'lucide-react';
import { coursesApi, boardsApi } from '../../services/api';
import { useLecturerData } from '../../hooks/useLecturerData';
import { courseStatus, spineFor } from '../student/studentMappings';
import {
  ChalkboardHeader, ChalkBadge, ClassroomAlert, ClassroomButton, ClassroomDialog, ClassroomField, PaperPanel, StickyNote,
} from '../../components/classroom';
import cx from '../../components/classroom/cx';

// Static class lookups: Tailwind only sees literal class names.
const VIEW_CHOICE_BASE = 'inline-flex h-11 items-center gap-1.5 rounded border px-3 text-sm font-medium md:h-8';
const VIEW_CHOICE = {
  on: 'border-accent bg-accent-tint text-accent-700',
  off: 'border-line-strong bg-surface text-ink hover:bg-surface-hover',
};
const ICON_BUTTON = 'flex h-11 w-11 flex-none items-center justify-center rounded text-ink-2 hover:bg-surface-hover hover:text-danger md:h-8 md:w-8';
const SECTION_TILE = 'flex min-h-[44px] w-full flex-col rounded-lg border border-line-strong bg-surface p-4 text-left hover:border-accent hover:bg-surface-hover';
const COPY_BUTTON = 'flex h-11 w-11 flex-none items-center justify-center rounded border md:h-8 md:w-8';
const COPY_BUTTON_IDLE = 'border-line-strong bg-surface text-ink hover:bg-surface-hover';
const COPY_BUTTON_DONE = 'border-success bg-success-tint text-success';
const STAT_TILE = 'rounded-lg border border-line p-4 text-center';

// Element id for a course card's name (used by aria-labelledby).
function courseTitleId(courseId) {
  return 'course-' + courseId + '-name';
}

// Loading placeholder: static blocks, announced once through a status region.
function CoursesSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Loading courses</span>
      {[0, 1].map((i) => <div key={i} aria-hidden="true" className="h-44 rounded-lg border border-line bg-line" />)}
    </div>
  );
}

function CourseInviteModal({ course, onClose, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const inviteLink = `${window.location.origin}/join-course/${course.invite_code}`;

  const copyCode = () => {
    navigator.clipboard.writeText(course.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!window.confirm('This will invalidate the current invite code. Students with the old code will not be able to join. Continue?')) return;
    setRegenerating(true);
    try {
      const res = await coursesApi.regenerateInvite(course.id);
      onRegenerate(res.data.invite_code);
    } catch (err) {
      alert('Failed to regenerate invite code');
    } finally {
      setRegenerating(false);
    }
  };

  const announcement = [copied && 'Invite code copied', copiedLink && 'Invite link copied'].filter(Boolean).join('. ');

  return (
    <ClassroomDialog
      titleId="courses-share-title"
      title="Share Course"
      subtitle={`${course.code} - ${course.name}`}
      onClose={onClose}
      footer={<ClassroomButton className="w-full" onClick={onClose}>Done</ClassroomButton>}
    >
      <section aria-labelledby="invite-code-heading">
        <h3 id="invite-code-heading" className="mb-2 text-sm font-medium text-ink">Invite Code</h3>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 rounded border border-line bg-surface-hover px-4 py-3 text-center font-mono text-2xl font-semibold tracking-widest text-accent-700">
            {course.invite_code}
          </p>
          <button
            type="button"
            onClick={copyCode}
            aria-label="Copy invite code"
            className={cx(COPY_BUTTON, copied ? COPY_BUTTON_DONE : COPY_BUTTON_IDLE)}
          >
            {copied ? <Check className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" /> : <Copy className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-2">Share this code with students so they can join the course</p>
      </section>

      <section aria-labelledby="invite-link-heading">
        <h3 id="invite-link-heading" className="mb-2 text-sm font-medium text-ink">Invite Link</h3>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate rounded border border-line bg-surface-hover px-3 py-2 text-sm text-ink-2">{inviteLink}</p>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy invite link"
            className={cx(COPY_BUTTON, copiedLink ? COPY_BUTTON_DONE : COPY_BUTTON_IDLE)}
          >
            {copiedLink ? <Check className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" /> : <Link className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />}
          </button>
        </div>
      </section>

      <ClassroomButton
        className="w-full"
        icon={RefreshCw}
        loading={regenerating}
        onClick={handleRegenerate}
      >
        {regenerating ? 'Regenerating...' : 'Regenerate Invite Code'}
      </ClassroomButton>

      <p role="status" className="sr-only">{announcement}</p>
    </ClassroomDialog>
  );
}

export default function LecturerCoursesPage({ onNavigate }) {
  const navigate = useNavigate();
  const { courses, loading, loadFailed, reload, loadCourses, loadEnrollments, getSectionsForCourse } = useLecturerData();
  const [viewMode, setViewMode] = useState('sections');
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [newCourse, setNewCourse] = useState({ code: '', name: '', description: '' });
  const [addingCourse, setAddingCourse] = useState(false);
  const [courseError, setCourseError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(null);
  const [showSectionModal, setShowSectionModal] = useState(null);
  const [newSectionName, setNewSectionName] = useState('');
  const [sectionError, setSectionError] = useState('');
  const [sectionBoardCount, setSectionBoardCount] = useState(0);

  // Keep section modal in sync when courses reload
  useEffect(() => {
    if (showSectionModal) {
      const updated = courses.find(c => c.id === showSectionModal.id);
      if (updated) setShowSectionModal(updated);
    }
  }, [courses, showSectionModal]);

  const handleAddSection = async (course) => {
    const name = newSectionName.trim();
    if (!name) return;
    const existing = course.sections || [];
    if (existing.includes(name)) {
      setSectionError('Section already exists');
      return;
    }
    try {
      await coursesApi.update(course.id, { sections: [...existing, name] });
      setNewSectionName('');
      setSectionError('');
      loadCourses();
    } catch (err) {
      setSectionError('Failed to add section');
    }
  };

  const handleRemoveSection = async (course, sectionName) => {
    const enrollmentSections = getSectionsForCourse(course.id);
    const sectionData = enrollmentSections.find(s => s.name === sectionName);
    if (sectionData && sectionData.students > 0) {
      setSectionError('Cannot remove section with enrolled students');
      return;
    }
    const updated = (course.sections || []).filter(s => s !== sectionName);
    try {
      await coursesApi.update(course.id, { sections: updated });
      setSectionError('');
      loadCourses();
    } catch (err) {
      setSectionError('Failed to remove section');
    }
  };

  const handleAddCourse = async () => {
    if (!newCourse.code || !newCourse.name) return;
    setAddingCourse(true);
    setCourseError('');
    try {
      await coursesApi.create(newCourse);
      setShowAddCourseModal(false);
      setNewCourse({ code: '', name: '', description: '' });
      loadCourses();
    } catch (err) {
      const data = err.response?.data;
      setCourseError(data?.code?.[0] || data?.detail || 'Failed to create course');
    } finally {
      setAddingCourse(false);
    }
  };

  const closeAddCourseModal = () => {
    setShowAddCourseModal(false);
    setCourseError('');
  };

  const closeSectionModal = () => setShowSectionModal(null);

  const openSectionDetail = async (course, section) => {
    setSelectedSection({ course, section });
    setSectionBoardCount(0);
    try {
      const params = { course: course.id, is_archived: 'false' };
      const res = await boardsApi.getAll(params);
      const allBoards = res.data.results || res.data;
      const sectionName = section.name === 'Unassigned' ? '' : section.name;
      const count = allBoards.filter(b => (b.section || '') === sectionName).length;
      setSectionBoardCount(count);
    } catch (err) {
      console.error('Failed to load section boards:', err);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This will also remove all enrollments.')) return;
    try {
      await coursesApi.delete(courseId);
      loadCourses();
      loadEnrollments();
    } catch (err) {
      console.error('Failed to delete course:', err);
    }
  };

  let body;
  if (loading) {
    body = <CoursesSkeleton />;
  } else if (loadFailed) {
    // A failed load must not look like an empty list: the alert replaces the lists.
    body = (
      <ClassroomAlert>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>Could not load your courses or enrolments. Check your connection and try again.</p>
          <ClassroomButton onClick={reload}>Try again</ClassroomButton>
        </div>
      </ClassroomAlert>
    );
  } else if (courses.length === 0) {
    body = (
      <StickyNote color="azure" className="mx-auto max-w-sm items-center text-center">
        <BookOpen className="mb-2 h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
        <h2 className="font-hand text-lg leading-tight text-ink">No courses yet</h2>
        <p className="mt-1 text-sm text-ink">Create your first course to get started</p>
      </StickyNote>
    );
  } else {
    body = (
      <ul className="space-y-4" aria-label="Courses">
        {courses.map(course => {
          const sections = getSectionsForCourse(course.id);
          const status = courseStatus(course);
          const definedSections = course.sections || [];
          // Merge: show all defined sections + any enrollment-only sections
          const sectionNames = [...new Set([...definedSections, ...sections.map(s => s.name)])].filter(n => n !== 'Unassigned');
          const unassigned = sections.find(s => s.name === 'Unassigned');
          const sectionCount = definedSections.length || sections.length;
          return (
            <li key={course.id}>
              <PaperPanel as="article" padded={false} aria-labelledby={courseTitleId(course.id)} className="relative overflow-hidden">
                <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-2', spineFor(course.id))} />
                <div className="p-4 pl-6 md:p-5 md:pl-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-6 items-center rounded bg-accent-tint px-2 text-xs font-semibold text-accent-700">
                          {course.code}
                        </span>
                        <ChalkBadge label={status.label} icon={status.icon} tone={status.tone} />
                      </div>
                      <h2 id={courseTitleId(course.id)} className="break-words text-lg font-semibold leading-snug text-ink">
                        {course.name}
                      </h2>
                      <ul aria-label="Course totals" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
                        <li className="flex items-center gap-1"><Users className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />{course.student_count || 0} students</li>
                        <li className="flex items-center gap-1"><Folder className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />{sectionCount} sections</li>
                        <li className="flex items-center gap-1"><FileText className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />{course.board_count || 0} boards</li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCourse(course.id)}
                      className={cx(ICON_BUTTON, 'self-start')}
                      title="Delete course"
                      aria-label="Delete course"
                    >
                      <Trash2 className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <ClassroomButton icon={Eye} className="min-w-[140px] flex-1" onClick={() => navigate(`/lecturer/boards?course=${course.id}`)}>
                      View Boards
                    </ClassroomButton>
                    <ClassroomButton icon={BarChart} className="min-w-[140px] flex-1" onClick={() => navigate('/lecturer/analytics')}>
                      Analytics
                    </ClassroomButton>
                    <ClassroomButton icon={Plus} className="min-w-[140px] flex-1" onClick={() => onNavigate('lecturer-templates', { courseId: course.id, courseName: course.code })}>
                      New Board
                    </ClassroomButton>
                    <ClassroomButton icon={Layers} className="min-w-[140px] flex-1" onClick={() => { setShowSectionModal(course); setNewSectionName(''); setSectionError(''); }}>
                      Sections
                    </ClassroomButton>
                    <ClassroomButton icon={Share2} className="min-w-[140px] flex-1" onClick={() => setShowInviteModal(course)}>
                      Share
                    </ClassroomButton>
                  </div>
                </div>

                {viewMode === 'sections' && (sectionNames.length > 0 || unassigned) && (
                  <div className="border-t border-line bg-surface-hover p-4 md:p-5">
                    <h3 className="mb-3 font-semibold text-ink">Sections</h3>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sectionNames.map((name) => {
                        const enrollData = sections.find(s => s.name === name);
                        const studentCount = enrollData ? enrollData.students : 0;
                        return (
                          <li key={name}>
                            <button
                              type="button"
                              onClick={() => openSectionDetail(course, { name, students: studentCount, enrollments: enrollData?.enrollments || [] })}
                              className={SECTION_TILE}
                            >
                              <span className="font-semibold text-ink">Section {name}</span>
                              <span className="mt-1 text-sm text-ink-2">{studentCount} students</span>
                              <span className="mt-3 flex items-center gap-2">
                                <span aria-hidden="true" className="flex -space-x-2">
                                  {[...Array(Math.min(3, studentCount))].map((_, i) => (
                                    <span key={i} className="h-6 w-6 rounded-full border-2 border-surface bg-accent-400" />
                                  ))}
                                </span>
                                {studentCount > 3 && <span className="text-xs text-ink-2">+{studentCount - 3}</span>}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                      {unassigned && (
                        <li>
                          <button
                            type="button"
                            onClick={() => openSectionDetail(course, unassigned)}
                            className={SECTION_TILE}
                          >
                            <span className="font-semibold text-ink">No Section</span>
                            <span className="mt-1 text-sm text-ink-2">{unassigned.students} students</span>
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </PaperPanel>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <ChalkboardHeader
        size="compact"
        titleId="courses-title"
        title="My Courses"
        subtitle="Manage courses, sections, and student activities"
        actions={
          <ClassroomButton onChalk icon={Plus} onClick={() => setShowAddCourseModal(true)}>
            New Course
          </ClassroomButton>
        }
      />

      {!loading && !loadFailed && courses.length > 0 && (
        <div role="group" aria-label="Course view" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={viewMode === 'sections'}
            onClick={() => setViewMode('sections')}
            className={cx(VIEW_CHOICE_BASE, viewMode === 'sections' ? VIEW_CHOICE.on : VIEW_CHOICE.off)}
          >
            Sections View
          </button>
          <button
            type="button"
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            className={cx(VIEW_CHOICE_BASE, viewMode === 'list' ? VIEW_CHOICE.on : VIEW_CHOICE.off)}
          >
            List View
          </button>
        </div>
      )}

      {body}

      {/* Section Details Modal */}
      {selectedSection && (
        <ClassroomDialog
          titleId="courses-section-title"
          size="xl"
          title={selectedSection.section.name === 'Unassigned' ? 'No Section' : `Section ${selectedSection.section.name}`}
          subtitle={selectedSection.course.name}
          onClose={() => setSelectedSection(null)}
          footer={
            <>
              {selectedSection.section.name !== 'Unassigned' && (
                <>
                  <ClassroomButton variant="primary" className="flex-1" onClick={() => { navigate(`/lecturer/boards?course=${selectedSection.course.id}&section=${selectedSection.section.name}`); setSelectedSection(null); }}>
                    View Section Boards
                  </ClassroomButton>
                  <ClassroomButton className="flex-1" onClick={() => { onNavigate('lecturer-templates', { courseId: selectedSection.course.id, courseName: selectedSection.course.code, section: selectedSection.section.name }); setSelectedSection(null); }}>
                    Create Board
                  </ClassroomButton>
                </>
              )}
              {selectedSection.section.name === 'Unassigned' && (
                <ClassroomButton variant="primary" className="flex-1" onClick={() => { navigate(`/lecturer/boards?course=${selectedSection.course.id}`); setSelectedSection(null); }}>
                  View Course Boards
                </ClassroomButton>
              )}
              <ClassroomButton className="flex-1" onClick={() => setSelectedSection(null)}>
                Close
              </ClassroomButton>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div className={cx(STAT_TILE, 'bg-accent-tint')}>
              <p className="text-2xl font-semibold text-accent-700">{selectedSection.section.students}</p>
              <p className="text-sm text-ink-2">Students</p>
            </div>
            <div className={cx(STAT_TILE, 'bg-success-tint')}>
              <p className="text-2xl font-semibold text-success">{sectionBoardCount}</p>
              <p className="text-sm text-ink-2">Section Boards</p>
            </div>
          </div>
          {selectedSection.section.enrollments?.length > 0 && (
            <div>
              <h3 className="mb-3 font-semibold text-ink">Students in this Section</h3>
              <ul className="space-y-2">
                {selectedSection.section.enrollments.map((enrollment) => {
                  const name = enrollment.student_details
                    ? `${enrollment.student_details.first_name || ''} ${enrollment.student_details.last_name || ''}`.trim() || enrollment.student_details.username
                    : `User ${enrollment.student}`;
                  return (
                    <li key={enrollment.id} className="flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-1 rounded border border-line bg-surface-hover p-2 text-sm text-ink-2">
                      <Users className="h-4 w-4 flex-shrink-0 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
                      <span className="font-medium text-ink">{name}</span>
                      <span className="break-all text-ink-2">{enrollment.student_details?.email || ''}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </ClassroomDialog>
      )}

      {/* Manage Sections Modal */}
      {showSectionModal && (
        <ClassroomDialog
          titleId="courses-sections-title"
          title="Manage Sections"
          subtitle={`${showSectionModal.code} - ${showSectionModal.name}`}
          onClose={closeSectionModal}
          footer={<ClassroomButton className="w-full" onClick={closeSectionModal}>Done</ClassroomButton>}
        >
          {sectionError && <ClassroomAlert>{sectionError}</ClassroomAlert>}
          <div className="flex items-end gap-2">
            <ClassroomField
              className="min-w-0 flex-1"
              label="Add Section"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="e.g., A, B, Morning"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(showSectionModal); }}
            />
            <ClassroomButton
              onClick={() => handleAddSection(showSectionModal)}
              disabled={!newSectionName.trim()}
            >
              Add
            </ClassroomButton>
          </div>
          <section aria-labelledby="current-sections-heading">
            <h3 id="current-sections-heading" className="mb-2 text-sm font-medium text-ink">Current Sections</h3>
            {(showSectionModal.sections || []).length === 0 ? (
              <p className="text-sm text-ink-2">No sections defined yet</p>
            ) : (
              <ul className="space-y-2">
                {(showSectionModal.sections || []).map((sec) => {
                  const enrollData = getSectionsForCourse(showSectionModal.id).find(s => s.name === sec);
                  const count = enrollData ? enrollData.students : 0;
                  const removeLabel = count > 0 ? 'Cannot remove: has students' : 'Remove section';
                  return (
                    <li key={sec} className="flex min-h-[44px] items-center justify-between gap-3 rounded border border-line bg-surface-hover px-3 py-2">
                      <p>
                        <span className="font-medium text-ink">Section {sec}</span>
                        <span className="ml-2 text-sm text-ink-2">({count} students)</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(showSectionModal, sec)}
                        className={ICON_BUTTON}
                        title={removeLabel}
                        aria-label={removeLabel}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </ClassroomDialog>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <ClassroomDialog
          titleId="courses-add-title"
          title="Add New Course"
          onClose={closeAddCourseModal}
          footer={
            <>
              <ClassroomButton className="flex-1" onClick={closeAddCourseModal}>Cancel</ClassroomButton>
              <ClassroomButton
                variant="primary"
                className="flex-1"
                onClick={handleAddCourse}
                disabled={addingCourse || !newCourse.code || !newCourse.name}
              >
                {addingCourse ? 'Creating...' : 'Add Course'}
              </ClassroomButton>
            </>
          }
        >
          {courseError && <ClassroomAlert>{courseError}</ClassroomAlert>}
          <ClassroomField
            label="Course Code"
            value={newCourse.code}
            onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
            placeholder="e.g., CS101"
          />
          <ClassroomField
            label="Course Name"
            value={newCourse.name}
            onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
            placeholder="e.g., Introduction to Programming"
          />
          <ClassroomField
            as="textarea"
            rows={2}
            label="Description (optional)"
            value={newCourse.description}
            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
            placeholder="Brief course description..."
          />
        </ClassroomDialog>
      )}

      {/* Course Invite Modal */}
      {showInviteModal && (
        <CourseInviteModal
          course={showInviteModal}
          onClose={() => setShowInviteModal(null)}
          onRegenerate={(newCode) => {
            setShowInviteModal({ ...showInviteModal, invite_code: newCode });
            loadCourses();
          }}
        />
      )}
    </div>
  );
}
