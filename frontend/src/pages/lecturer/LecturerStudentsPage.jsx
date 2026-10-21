import React, { useState } from 'react';
import { openMailto } from '../../utils/safeUrl';
import {
  UserPlus, Mail, Eye, Upload, Edit3, Check, X, Calendar, CheckCircle, XCircle, Archive, Users,
} from 'lucide-react';
import { enrollmentsApi, usersApi, coursesApi } from '../../services/api';
import { useLecturerData, formatTimeAgo } from '../../hooks/useLecturerData';
import BulkImportModal from '../../components/BulkImportModal';
import {
  ChalkboardHeader, ChalkBadge, ClassroomAlert, ClassroomButton, ClassroomDialog, ClassroomField, StickyNote,
} from '../../components/classroom';
import cx from '../../components/classroom/cx';

// Static class lookups: Tailwind only sees literal class names. Selection is a tint plus a checkbox, never colour alone.
const ICON_BUTTON = 'flex h-11 w-11 flex-none items-center justify-center rounded text-ink-2 hover:bg-surface-hover md:h-8 md:w-8';
const ICON_BUTTON_DONE = 'flex h-11 w-11 flex-none items-center justify-center rounded bg-success-tint text-success hover:opacity-90 md:h-8 md:w-8';
const TOGGLE_BASE = 'inline-flex h-11 items-center gap-2 rounded border px-3 text-sm font-medium md:h-8';
const TOGGLE = {
  on: 'border-accent bg-accent-tint text-accent-700',
  off: 'border-line-strong bg-surface text-ink hover:bg-surface-hover',
};
const CELL_CHECK = 'flex h-11 w-11 items-center justify-center';
const STAT_TILE = 'rounded-lg border border-line bg-surface p-4';
const SELECT_INLINE = 'h-11 w-28 rounded border border-line-strong bg-surface px-2 text-sm text-ink md:h-8';

// Enrolment status badges. Tone and icon carry the meaning, not colour alone.
const STATUS = {
  active: { label: 'Active', icon: CheckCircle, tone: 'success' },
  dropped: { label: 'Dropped', icon: XCircle, tone: 'danger' },
  completed: { label: 'Completed', icon: Archive, tone: 'neutral' },
};

function statusBadgeProps(status) {
  if (STATUS[status]) return STATUS[status];
  const label = status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'Unknown';
  return { label, icon: Archive, tone: 'neutral' };
}

// Loading placeholder: static rows, announced once through a status region.
function StudentsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-4">
      <span className="sr-only">Loading students</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} aria-hidden="true" className="h-20 rounded-lg border border-line bg-line" />)}
      </div>
      <div aria-hidden="true" className="h-64 rounded-lg border border-line bg-line" />
    </div>
  );
}

export default function LecturerStudentsPage() {
  const { courses, loading, loadFailed, reload, loadEnrollments, loadCourses, getStudentsList } = useLecturerData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [viewingStudent, setViewingStudent] = useState(null);

  // Modals
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [courseId, setCourseId] = useState('');
  const [section, setSection] = useState('');
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState(null);

  // Inline editing
  const [editingId, setEditingId] = useState(null);
  const [editCourseId, setEditCourseId] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk edit
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkSection, setBulkSection] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Filters panel
  const [showFilters, setShowFilters] = useState(false);

  const allStudents = getStudentsList();

  const filteredStudents = allStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === 'all' || student.courseCode === filterCourse;
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
    let matchesDate = true;
    if (filterDateFrom) {
      matchesDate = matchesDate && new Date(student.enrolledAt) >= new Date(filterDateFrom);
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setDate(toDate.getDate() + 1);
      matchesDate = matchesDate && new Date(student.enrolledAt) < toDate;
    }
    return matchesSearch && matchesCourse && matchesStatus && matchesDate;
  });

  const handleSearchStudent = async (query) => {
    setStudentQuery(query);
    if (query.length < 3) { setStudentResults([]); return; }
    try {
      const res = await usersApi.search(query);
      setStudentResults(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to search users:', err);
    }
  };

  const toggleStudentSelection = (id) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddStudent = async () => {
    if (selectedStudentIds.size === 0 || !courseId) return;
    setAdding(true);
    setAddResult(null);
    try {
      if (selectedStudentIds.size === 1) {
        const [studentId] = selectedStudentIds;
        await enrollmentsApi.create({
          student: studentId,
          course: parseInt(courseId),
          section,
        });
        setAddResult({ enrolled: 1, already_enrolled: 0, errors: 0 });
      } else {
        const res = await coursesApi.bulkEnroll(parseInt(courseId), {
          student_ids: Array.from(selectedStudentIds),
          section,
        });
        setAddResult(res.data);
      }
      loadEnrollments();
      loadCourses();
    } catch (err) {
      alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || err.response?.data?.error || 'Failed to enroll student(s)');
    } finally {
      setAdding(false);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setStudentQuery('');
    setStudentResults([]);
    setSelectedStudentIds(new Set());
    setCourseId('');
    setSection('');
    setAddResult(null);
  };

  const startEdit = (student) => {
    setEditingId(student.id);
    setEditCourseId(student.courseId);
    setEditSection(student.section === '-' ? '' : student.section);
    setEditStatus(student.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCourseId('');
    setEditSection('');
    setEditStatus('');
  };

  const saveEdit = async (studentEnrollmentId) => {
    setSaving(true);
    try {
      const data = {};
      if (editSection !== undefined) data.section = editSection;
      if (editStatus) data.status = editStatus;
      await enrollmentsApi.update(studentEnrollmentId, data);
      cancelEdit();
      loadEnrollments();
      loadCourses();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update enrollment');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleBulkEdit = async () => {
    if (selectedStudents.size === 0) return;
    setBulkSaving(true);
    try {
      const updates = [];
      for (const id of selectedStudents) {
        const data = {};
        if (bulkSection) data.section = bulkSection;
        if (bulkStatus) data.status = bulkStatus;
        if (Object.keys(data).length > 0) {
          updates.push(enrollmentsApi.update(id, data));
        }
      }
      await Promise.all(updates);
      setShowBulkEdit(false);
      setSelectedStudents(new Set());
      setBulkSection('');
      setBulkStatus('');
      loadEnrollments();
      loadCourses();
    } catch (err) {
      alert('Some updates failed. Please try again.');
    } finally {
      setBulkSaving(false);
    }
  };

  const getCourseSections = (cId) => {
    const course = courses.find(c => c.id === parseInt(cId) || c.id === cId);
    return course?.sections || [];
  };

  const closeBulkEdit = () => setShowBulkEdit(false);
  const closeViewing = () => setViewingStudent(null);
  const viewingBadge = viewingStudent ? statusBadgeProps(viewingStudent.status) : null;

  let body;
  if (loading) {
    body = <StudentsSkeleton />;
  } else if (loadFailed) {
    // A failed load must not look like zero students: the alert replaces the stats and the table.
    body = (
      <ClassroomAlert>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>Could not load your students. Check your connection and try again.</p>
          <ClassroomButton onClick={reload}>Try again</ClassroomButton>
        </div>
      </ClassroomAlert>
    );
  } else {
    body = (
      <>
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={STAT_TILE}>
            <p className="text-sm text-ink-2">Total Enrolled</p>
            <p className="text-2xl font-semibold text-ink">{allStudents.length}</p>
          </div>
          <div className={STAT_TILE}>
            <p className="text-sm text-ink-2">Active</p>
            <p className="text-2xl font-semibold text-success">{allStudents.filter(s => s.status === 'active').length}</p>
          </div>
          <div className={STAT_TILE}>
            <p className="text-sm text-ink-2">Dropped</p>
            <p className="text-2xl font-semibold text-danger">{allStudents.filter(s => s.status === 'dropped').length}</p>
          </div>
        </div>

        {/* Search & Filter */}
        <section aria-label="Search and filter students" className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <ClassroomField
              type="search"
              className="min-w-0 md:flex-1"
              label="Search students"
              placeholder="Name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <ClassroomField
              as="select"
              className="md:w-48"
              label="Course"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
            >
              <option value="all">All Courses</option>
              {courses.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </ClassroomField>
            <ClassroomField
              as="select"
              className="md:w-44"
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="dropped">Dropped</option>
              <option value="completed">Completed</option>
            </ClassroomField>
            <button
              type="button"
              aria-expanded={showFilters}
              aria-controls="students-date-filters"
              onClick={() => setShowFilters(!showFilters)}
              className={cx(TOGGLE_BASE, showFilters ? TOGGLE.on : TOGGLE.off)}
            >
              <Calendar className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Date</span>
            </button>
          </div>
          {showFilters && (
            <div id="students-date-filters" className="flex flex-wrap items-end gap-4 border-t border-line pt-3">
              <ClassroomField
                type="date"
                className="w-full sm:w-44"
                label="Enrolled From"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
              <ClassroomField
                type="date"
                className="w-full sm:w-44"
                label="Enrolled To"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
              {(filterDateFrom || filterDateTo) && (
                <ClassroomButton variant="ghost" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>
                  Clear dates
                </ClassroomButton>
              )}
            </div>
          )}
        </section>

        {/* Table: white body with hairline rows. On phones it scrolls sideways inside its own region. */}
        <section aria-label="Enrolled students" className="overflow-hidden rounded-lg border border-line bg-surface">
          {filteredStudents.length === 0 ? (
            <div className="p-4">
              <StickyNote color="azure" className="mx-auto max-w-sm items-center text-center">
                <Users className="mb-2 h-5 w-5 text-ink-2" strokeWidth={1.5} aria-hidden="true" />
                <h2 className="font-hand text-lg leading-tight text-ink">
                  {allStudents.length === 0 ? 'No students enrolled yet' : 'No students found'}
                </h2>
                <p className="mt-1 text-sm text-ink">
                  {allStudents.length === 0 ? 'Add students or import a list to get started' : 'Try a different search or filter'}
                </p>
              </StickyNote>
            </div>
          ) : (
            <>
              <p className="border-b border-line px-4 py-2 text-xs text-ink-2 md:hidden">Swipe sideways to see every column.</p>
              <div role="region" aria-label="Students table" tabIndex={0} className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <caption className="sr-only">Students with their course, section, status and enrolment date</caption>
                  <thead className="bg-surface-hover">
                    <tr>
                      <th scope="col" className="px-2 py-1 text-left">
                        <label className={CELL_CHECK}>
                          <input
                            type="checkbox"
                            aria-label="Select all students"
                            checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-line-strong"
                          />
                        </label>
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-sm font-medium text-ink-2">Student</th>
                      <th scope="col" className="px-3 py-3 text-left text-sm font-medium text-ink-2">Course</th>
                      <th scope="col" className="px-3 py-3 text-left text-sm font-medium text-ink-2">Section</th>
                      <th scope="col" className="px-3 py-3 text-left text-sm font-medium text-ink-2">Status</th>
                      <th scope="col" className="px-3 py-3 text-left text-sm font-medium text-ink-2">Enrolled</th>
                      <th scope="col" className="px-3 py-3 text-left text-sm font-medium text-ink-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredStudents.map((student) => {
                      const initials = student.name.trim()
                        ? student.name.split(' ').map(n => n[0]).join('').toUpperCase()
                        : '?';
                      const isEditing = editingId === student.id;
                      const isSelected = selectedStudents.has(student.id);
                      const badge = statusBadgeProps(student.status);
                      return (
                        <tr key={student.id} className={cx('hover:bg-surface-hover', isSelected && 'bg-accent-tint')}>
                          <td className="px-2 py-1">
                            <label className={CELL_CHECK}>
                              <input
                                type="checkbox"
                                aria-label={`Select ${student.name}`}
                                checked={isSelected}
                                onChange={() => toggleSelectStudent(student.id)}
                                className="h-4 w-4 rounded border-line-strong"
                              />
                            </label>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              <div aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-accent-500 font-medium text-white">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-ink">{student.name}</p>
                                <p className="break-all text-sm text-ink-2">{student.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex h-6 items-center rounded bg-accent-tint px-2 text-xs font-semibold text-accent-700">{student.courseCode}</span>
                          </td>
                          <td className="px-3 py-3">
                            {isEditing ? (
                              <select
                                aria-label={`Section for ${student.name}`}
                                value={editSection}
                                onChange={(e) => setEditSection(e.target.value)}
                                className={SELECT_INLINE}
                              >
                                <option value="">Unassigned</option>
                                {getCourseSections(editCourseId).map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-ink-2">{student.section === '-' ? '-' : `Section ${student.section}`}</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {isEditing ? (
                              <select
                                aria-label={`Status for ${student.name}`}
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value)}
                                className={SELECT_INLINE}
                              >
                                <option value="active">Active</option>
                                <option value="dropped">Dropped</option>
                                <option value="completed">Completed</option>
                              </select>
                            ) : (
                              <ChalkBadge label={badge.label} icon={badge.icon} tone={badge.tone} />
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-ink-2">{formatTimeAgo(student.enrolledAt)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => saveEdit(student.id)}
                                    disabled={saving}
                                    className={ICON_BUTTON_DONE}
                                    title="Save"
                                    aria-label="Save"
                                  >
                                    <Check className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className={ICON_BUTTON}
                                    title="Cancel"
                                    aria-label="Cancel"
                                  >
                                    <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button type="button" onClick={() => startEdit(student)} className={ICON_BUTTON} title="Edit enrollment" aria-label="Edit enrollment">
                                    <Edit3 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                                  </button>
                                  <button type="button" onClick={() => setViewingStudent(student)} className={ICON_BUTTON} title="View student" aria-label="View student">
                                    <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                                  </button>
                                  <button type="button" onClick={() => openMailto(student.email)} className={ICON_BUTTON} title="Email student" aria-label="Email student">
                                    <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </>
    );
  }

  return (
    <div className="space-y-4">
      <ChalkboardHeader
        size="compact"
        titleId="students-title"
        title="Students"
        subtitle="Manage and monitor student progress across all courses"
        actions={
          <>
            {selectedStudents.size > 0 && (
              <ClassroomButton onChalk icon={Edit3} onClick={() => setShowBulkEdit(true)}>
                Edit Selected ({selectedStudents.size})
              </ClassroomButton>
            )}
            <ClassroomButton onChalk icon={Upload} onClick={() => setShowBulkImport(true)}>
              Bulk Import
            </ClassroomButton>
            <ClassroomButton onChalk icon={UserPlus} onClick={() => setShowAddModal(true)}>
              Add Student
            </ClassroomButton>
          </>
        }
      />

      {body}

      {/* Student Detail Modal */}
      {viewingStudent && (
        <ClassroomDialog
          titleId="students-detail-title"
          size="lg"
          title="Student Details"
          onClose={closeViewing}
          footer={
            <>
              <ClassroomButton variant="primary" className="flex-1" icon={Mail} onClick={() => openMailto(viewingStudent.email)}>
                Send Email
              </ClassroomButton>
              <ClassroomButton className="flex-1" onClick={closeViewing}>Close</ClassroomButton>
            </>
          }
        >
          <div className="flex items-center gap-4">
            <div aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-accent-500 text-xl font-semibold text-white">
              {viewingStudent.name.trim() ? viewingStudent.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-lg font-semibold text-ink">{viewingStudent.name}</h3>
              <p className="break-all text-sm text-ink-2">{viewingStudent.email}</p>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-line bg-surface-hover p-3">
              <dt className="text-xs text-ink-2">Course</dt>
              <dd className="mt-1 font-medium text-ink">{viewingStudent.courseCode}</dd>
            </div>
            <div className="rounded-lg border border-line bg-surface-hover p-3">
              <dt className="text-xs text-ink-2">Section</dt>
              <dd className="mt-1 font-medium text-ink">{viewingStudent.section === '-' ? 'Unassigned' : `Section ${viewingStudent.section}`}</dd>
            </div>
            <div className="rounded-lg border border-line bg-surface-hover p-3">
              <dt className="text-xs text-ink-2">Status</dt>
              <dd className="mt-1">
                <ChalkBadge {...viewingBadge} />
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-surface-hover p-3">
              <dt className="text-xs text-ink-2">Enrolled</dt>
              <dd className="mt-1 font-medium text-ink">{formatTimeAgo(viewingStudent.enrolledAt)}</dd>
            </div>
          </dl>
          {(() => {
            const otherEnrollments = allStudents.filter(s => s.studentId === viewingStudent.studentId && s.id !== viewingStudent.id);
            if (otherEnrollments.length === 0) return null;
            return (
              <section aria-labelledby="students-other-title">
                <h4 id="students-other-title" className="mb-2 font-medium text-ink">Other Enrollments</h4>
                <ul className="space-y-2">
                  {otherEnrollments.map(e => (
                    <li key={e.id} className="flex items-center justify-between gap-3 rounded border border-line bg-surface-hover p-2">
                      <span className="inline-flex h-6 items-center rounded bg-accent-tint px-2 text-xs font-semibold text-accent-700">{e.courseCode}</span>
                      <span className="text-sm text-ink-2">Section {e.section}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })()}
        </ClassroomDialog>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          courses={courses}
          onClose={() => setShowBulkImport(false)}
          onComplete={() => { loadEnrollments(); loadCourses(); }}
        />
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <ClassroomDialog
          titleId="students-add-title"
          title="Add Students"
          onClose={closeAddModal}
          footer={
            <>
              <ClassroomButton className="flex-1" onClick={closeAddModal}>Cancel</ClassroomButton>
              <ClassroomButton
                variant="primary"
                className="flex-1"
                onClick={handleAddStudent}
                disabled={adding || selectedStudentIds.size === 0 || !courseId}
              >
                {adding ? 'Enrolling...' : `Add ${selectedStudentIds.size || ''} Student${selectedStudentIds.size !== 1 ? 's' : ''}`}
              </ClassroomButton>
            </>
          }
        >
          {addResult && (
            <ClassroomAlert tone="success">
              {addResult.enrolled} student(s) enrolled successfully.
              {addResult.already_enrolled > 0 && ` ${addResult.already_enrolled} already enrolled.`}
              {addResult.errors > 0 && ` ${addResult.errors} failed.`}
            </ClassroomAlert>
          )}
          <div>
            <ClassroomField
              type="search"
              label="Search Students"
              hint="Type three or more letters to search by name or username"
              value={studentQuery}
              onChange={(e) => handleSearchStudent(e.target.value)}
              placeholder="Name or username"
            />
            {studentResults.length > 0 && (
              <ul aria-label="Search results" className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded border border-line p-1">
                {studentResults.map(u => {
                  const isSelected = selectedStudentIds.has(u.id);
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleStudentSelection(u.id)}
                        className={cx('flex min-h-[44px] w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-ink hover:bg-surface-hover', isSelected && 'bg-accent-tint')}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{u.first_name} {u.last_name}</span>
                          <span className="ml-2 break-all text-xs text-ink-2">{u.email_hint || u.email}</span>
                        </span>
                        {u.role && u.role !== 'student' && <ChalkBadge label={u.role} icon={Users} />}
                        {isSelected && <Check className="h-4 w-4 flex-none text-accent-700" strokeWidth={1.5} aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {selectedStudentIds.size > 0 && (
              <p className="mt-1 text-sm text-success">
                {selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <ClassroomField
            as="select"
            label="Course"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">Select a course</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
          </ClassroomField>
          {courseId && getCourseSections(courseId).length > 0 ? (
            <ClassroomField
              as="select"
              label="Section (optional)"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              <option value="">No section</option>
              {getCourseSections(courseId).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </ClassroomField>
          ) : (
            <ClassroomField
              label="Section (optional)"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g., A"
            />
          )}
        </ClassroomDialog>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <ClassroomDialog
          titleId="students-bulk-title"
          title="Bulk Edit Students"
          subtitle={`${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''} selected`}
          onClose={closeBulkEdit}
          footer={
            <>
              <ClassroomButton className="flex-1" onClick={closeBulkEdit}>Cancel</ClassroomButton>
              <ClassroomButton
                variant="primary"
                className="flex-1"
                onClick={handleBulkEdit}
                disabled={bulkSaving || (!bulkSection && !bulkStatus)}
              >
                {bulkSaving ? 'Updating...' : 'Apply Changes'}
              </ClassroomButton>
            </>
          }
        >
          <p className="text-sm text-ink-2">Leave a field empty to keep the current value unchanged.</p>
          <ClassroomField
            label="Change Section"
            value={bulkSection}
            onChange={(e) => setBulkSection(e.target.value)}
            placeholder="New section (e.g., A)"
          />
          <ClassroomField
            as="select"
            label="Change Status"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
          >
            <option value="">No change</option>
            <option value="active">Active</option>
            <option value="dropped">Dropped</option>
            <option value="completed">Completed</option>
          </ClassroomField>
        </ClassroomDialog>
      )}
    </div>
  );
}
