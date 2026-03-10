import React, { useState } from 'react';
import {
  UserPlus, Search, Filter, Eye, Mail, X, Users, Upload, Edit3, Check, ChevronDown, Calendar
} from 'lucide-react';
import { enrollmentsApi, usersApi, coursesApi } from '../../services/api';
import { useLecturerData, formatTimeAgo } from '../../hooks/useLecturerData';
import BulkImportModal from '../../components/BulkImportModal';

export default function LecturerStudentsPage() {
  const { courses, loading, loadEnrollments, loadCourses, getStudentsList, getSectionsForCourse } = useLecturerData();
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
  const [bulkCourseId, setBulkCourseId] = useState('');
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
    if (query.length < 2) { setStudentResults([]); return; }
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
      setBulkCourseId('');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">Manage and monitor student progress across all courses</p>
        </div>
        <div className="flex items-center gap-3 self-start flex-wrap">
          {selectedStudents.size > 0 && (
            <button
              onClick={() => setShowBulkEdit(true)}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-600 transition flex items-center space-x-2"
            >
              <Edit3 className="w-5 h-5" />
              <span>Edit Selected ({selectedStudents.size})</span>
            </button>
          )}
          <button
            onClick={() => setShowBulkImport(true)}
            className="bg-white text-indigo-600 border-2 border-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Total Enrolled</p>
          <p className="text-2xl font-bold text-gray-900">{allStudents.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{allStudents.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-600">Dropped</p>
          <p className="text-2xl font-bold text-red-600">{allStudents.filter(s => s.status === 'dropped').length}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white min-w-[150px]"
            >
              <option value="all">All Courses</option>
              {courses.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white min-w-[120px]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="dropped">Dropped</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg font-medium transition flex items-center space-x-2 ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <Calendar className="w-4 h-4" />
            <span>Date</span>
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Enrolled From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Enrolled To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {(filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                className="text-sm text-indigo-600 hover:text-indigo-800 mt-4"
              >
                Clear dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Section</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Enrolled</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.map((student) => {
                const initials = student.name.trim()
                  ? student.name.split(' ').map(n => n[0]).join('').toUpperCase()
                  : '?';
                const isEditing = editingId === student.id;
                return (
                  <tr key={student.id} className={`hover:bg-gray-50 ${selectedStudents.has(student.id) ? 'bg-indigo-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => toggleSelectStudent(student.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">{student.courseCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editSection}
                          onChange={(e) => setEditSection(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 w-28"
                        >
                          <option value="">Unassigned</option>
                          {getCourseSections(editCourseId).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-600">{student.section === '-' ? '-' : `Section ${student.section}`}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 w-28"
                        >
                          <option value="active">Active</option>
                          <option value="dropped">Dropped</option>
                          <option value="completed">Completed</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.status === 'active' ? 'bg-green-100 text-green-700' :
                          student.status === 'dropped' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatTimeAgo(student.enrolledAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(student.id)}
                              disabled={saving}
                              className="p-1 bg-green-100 hover:bg-green-200 rounded text-green-700 transition"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(student)} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Edit enrollment">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setViewingStudent(student)} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="View student">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => student.email && window.open(`mailto:${student.email}`, '_blank')} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="Email student">
                              <Mail className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scaleIn">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Student Details</h2>
              <button onClick={() => setViewingStudent(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {viewingStudent.name.trim() ? viewingStudent.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{viewingStudent.name}</h3>
                  <p className="text-gray-500">{viewingStudent.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Course</p>
                  <p className="font-medium text-gray-900">{viewingStudent.courseCode}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Section</p>
                  <p className="font-medium text-gray-900">{viewingStudent.section === '-' ? 'Unassigned' : `Section ${viewingStudent.section}`}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    viewingStudent.status === 'active' ? 'bg-green-100 text-green-700' :
                    viewingStudent.status === 'dropped' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {viewingStudent.status.charAt(0).toUpperCase() + viewingStudent.status.slice(1)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Enrolled</p>
                  <p className="font-medium text-gray-900">{formatTimeAgo(viewingStudent.enrolledAt)}</p>
                </div>
              </div>
              {(() => {
                const otherEnrollments = allStudents.filter(s => s.studentId === viewingStudent.studentId && s.id !== viewingStudent.id);
                if (otherEnrollments.length === 0) return null;
                return (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Other Enrollments</h4>
                    <div className="space-y-2">
                      {otherEnrollments.map(e => (
                        <div key={e.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">{e.courseCode}</span>
                          <span className="text-sm text-gray-500">Section {e.section}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => viewingStudent.email && window.open(`mailto:${viewingStudent.email}`, '_blank')}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center space-x-2"
              >
                <Mail className="w-4 h-4" /><span>Send Email</span>
              </button>
              <button onClick={() => setViewingStudent(null)} className="flex-1 border-2 border-gray-200 py-2 rounded-lg font-medium hover:bg-gray-50 transition">Close</button>
            </div>
          </div>
        </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-backdropFade">
          <div className="bg-white rounded-xl w-full max-w-md animate-scaleIn">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Add Students</h3>
                <button onClick={closeAddModal} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {addResult && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {addResult.enrolled} student(s) enrolled successfully.
                  {addResult.already_enrolled > 0 && ` ${addResult.already_enrolled} already enrolled.`}
                  {addResult.errors > 0 && ` ${addResult.errors} failed.`}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={studentQuery}
                    onChange={(e) => handleSearchStudent(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Search by name or email..."
                  />
                </div>
                {studentResults.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                    {studentResults.map(u => {
                      const isSelected = selectedStudentIds.has(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => toggleStudentSelection(u.id)}
                          className={`w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm flex items-center space-x-2 ${isSelected ? 'bg-indigo-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{u.first_name} {u.last_name}</span>
                            <span className="text-gray-500 ml-2 text-xs">{u.email}</span>
                            {u.role && u.role !== 'student' && (
                              <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{u.role}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedStudentIds.size > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select a course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section (optional)</label>
                {courseId && getCourseSections(courseId).length > 0 ? (
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No section</option>
                    {getCourseSections(courseId).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={section} onChange={(e) => setSection(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="e.g., A" />
                )}
              </div>
            </div>
            <div className="p-6 border-t flex space-x-3">
              <button onClick={closeAddModal} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
              <button onClick={handleAddStudent} disabled={adding || selectedStudentIds.size === 0 || !courseId} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50">
                {adding ? 'Enrolling...' : `Add ${selectedStudentIds.size || ''} Student${selectedStudentIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md animate-scaleIn">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Bulk Edit Students</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected</p>
                </div>
                <button onClick={() => setShowBulkEdit(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Leave a field empty to keep the current value unchanged.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Change Section</label>
                <input
                  type="text"
                  value={bulkSection}
                  onChange={(e) => setBulkSection(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="New section (e.g., A)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Change Status</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No change</option>
                  <option value="active">Active</option>
                  <option value="dropped">Dropped</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex space-x-3">
              <button onClick={() => setShowBulkEdit(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
              <button
                onClick={handleBulkEdit}
                disabled={bulkSaving || (!bulkSection && !bulkStatus)}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition font-medium disabled:opacity-50"
              >
                {bulkSaving ? 'Updating...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
