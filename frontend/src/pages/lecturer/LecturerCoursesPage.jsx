import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Users, Folder, FileText, Plus, Trash2, Eye, BarChart,
  Settings, X, Layers, Share2, Copy, RefreshCw, Link, Check
} from 'lucide-react';
import { coursesApi, boardsApi } from '../../services/api';
import { useLecturerData } from '../../hooks/useLecturerData';

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md animate-scaleIn">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Share Course</h3>
              <p className="text-sm text-gray-500">{course.code} - {course.name}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invite Code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center">
                <span className="text-2xl font-mono font-bold tracking-widest text-indigo-600">{course.invite_code}</span>
              </div>
              <button
                onClick={copyCode}
                className={`px-3 py-3 rounded-lg border transition font-medium text-sm ${copied ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Share this code with students so they can join the course</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Invite Link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 truncate">
                {inviteLink}
              </div>
              <button
                onClick={copyLink}
                className={`px-3 py-2 rounded-lg border transition font-medium text-sm ${copiedLink ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}
              >
                {copiedLink ? <Check className="w-5 h-5" /> : <Link className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
            <span>{regenerating ? 'Regenerating...' : 'Regenerate Invite Code'}</span>
          </button>
        </div>
        <div className="p-6 border-t">
          <button onClick={onClose} className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Done</button>
        </div>
      </div>
    </div>
  );
}

export default function LecturerCoursesPage({ onNavigate }) {
  const navigate = useNavigate();
  const { courses, loading, loadCourses, loadEnrollments, getSectionsForCourse } = useLecturerData();
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
  React.useEffect(() => {
    if (showSectionModal) {
      const updated = courses.find(c => c.id === showSectionModal.id);
      if (updated) setShowSectionModal(updated);
    }
  }, [courses]);

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
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-600 mt-1">Manage courses, sections, and student activities</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('sections')}
              className={`px-3 py-2 text-sm ${viewMode === 'sections' ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Sections View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              List View
            </button>
          </div>
          <button
            onClick={() => setShowAddCourseModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Course</span>
          </button>
        </div>
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No courses yet</p>
          <p className="text-sm">Create your first course to get started</p>
        </div>
      )}

      {/* Courses List */}
      <div className="space-y-4">
        {courses.map(course => {
          const sections = getSectionsForCourse(course.id);
          return (
            <div key={course.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-sm font-semibold">
                          {course.code}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900">{course.name}</h3>
                        {!course.is_active && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Inactive</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center"><Users className="w-4 h-4 mr-1" />{course.student_count || 0} students</span>
                        <span className="flex items-center"><Folder className="w-4 h-4 mr-1" />{(course.sections || []).length || sections.length} sections</span>
                        <span className="flex items-center"><FileText className="w-4 h-4 mr-1" />{course.board_count || 0} boards</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="text-gray-400 hover:text-red-500 self-start"
                    title="Delete course"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={() => navigate(`/lecturer/boards?course=${course.id}`)}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Boards</span>
                  </button>
                  <button
                    onClick={() => navigate('/lecturer/analytics')}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition font-medium flex items-center justify-center space-x-2"
                  >
                    <BarChart className="w-4 h-4" />
                    <span>Analytics</span>
                  </button>
                  <button
                    onClick={() => onNavigate('lecturer-templates', { courseId: course.id, courseName: course.code })}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition font-medium flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New Board</span>
                  </button>
                  <button
                    onClick={() => { setShowSectionModal(course); setNewSectionName(''); setSectionError(''); }}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition font-medium flex items-center justify-center space-x-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Sections</span>
                  </button>
                  <button
                    onClick={() => setShowInviteModal(course)}
                    className="flex-1 min-w-[120px] px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition font-medium flex items-center justify-center space-x-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {viewMode === 'sections' && (() => {
                const enrollmentSections = sections;
                const definedSections = course.sections || [];
                // Merge: show all defined sections + any enrollment-only sections
                const allSectionNames = [...new Set([...definedSections, ...enrollmentSections.map(s => s.name)])].filter(n => n !== 'Unassigned');
                const unassigned = enrollmentSections.find(s => s.name === 'Unassigned');
                return (allSectionNames.length > 0 || unassigned) && (
                  <div className="border-t border-gray-100 p-6 bg-gray-50">
                    <h4 className="font-semibold text-gray-700 mb-4">Sections</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allSectionNames.map((name, idx) => {
                        const enrollData = enrollmentSections.find(s => s.name === name);
                        const studentCount = enrollData ? enrollData.students : 0;
                        return (
                          <button
                            key={idx}
                            onClick={() => openSectionDetail(course, { name, students: studentCount, enrollments: enrollData?.enrollments || [] })}
                            className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-400 hover:shadow-md transition text-left"
                          >
                            <p className="font-semibold text-gray-900 mb-1">Section {name}</p>
                            <p className="text-sm text-gray-600">{studentCount} students</p>
                            <div className="mt-3 flex items-center space-x-2">
                              <div className="flex -space-x-2">
                                {[...Array(Math.min(3, studentCount))].map((_, i) => (
                                  <div key={i} className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full border-2 border-white" />
                                ))}
                              </div>
                              {studentCount > 3 && (
                                <span className="text-xs text-gray-500">+{studentCount - 3}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                      {unassigned && (
                        <button
                          onClick={() => openSectionDetail(course, unassigned)}
                          className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-indigo-400 hover:shadow-md transition text-left"
                        >
                          <p className="font-semibold text-gray-900 mb-1">No Section</p>
                          <p className="text-sm text-gray-600">{unassigned.students} students</p>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Section Details Modal */}
      {selectedSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
            <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedSection.section.name === 'Unassigned' ? 'No Section' : `Section ${selectedSection.section.name}`}
                </h2>
                <p className="text-gray-600">{selectedSection.course.name}</p>
              </div>
              <button onClick={() => setSelectedSection(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{selectedSection.section.students}</p>
                  <p className="text-sm text-gray-600">Students</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{sectionBoardCount}</p>
                  <p className="text-sm text-gray-600">Section Boards</p>
                </div>
              </div>
              {selectedSection.section.enrollments?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Students in this Section</h3>
                  <div className="space-y-2">
                    {selectedSection.section.enrollments.map((enrollment) => {
                      const name = enrollment.student_details
                        ? `${enrollment.student_details.first_name || ''} ${enrollment.student_details.last_name || ''}`.trim() || enrollment.student_details.username
                        : `User ${enrollment.student}`;
                      return (
                        <div key={enrollment.id} className="flex items-center space-x-3 text-sm text-gray-600 p-2 bg-gray-50 rounded">
                          <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{name}</span>
                          <span className="text-gray-400">{enrollment.student_details?.email || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t bg-gray-50 flex gap-3 flex-shrink-0 flex-wrap">
              {selectedSection.section.name !== 'Unassigned' && (
                <>
                  <button
                    onClick={() => { navigate(`/lecturer/boards?course=${selectedSection.course.id}&section=${selectedSection.section.name}`); setSelectedSection(null); }}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                  >
                    View Section Boards
                  </button>
                  <button
                    onClick={() => { onNavigate('lecturer-templates', { courseId: selectedSection.course.id, courseName: selectedSection.course.code, section: selectedSection.section.name }); setSelectedSection(null); }}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                  >
                    Create Board
                  </button>
                </>
              )}
              {selectedSection.section.name === 'Unassigned' && (
                <button
                  onClick={() => { navigate(`/lecturer/boards?course=${selectedSection.course.id}`); setSelectedSection(null); }}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  View Course Boards
                </button>
              )}
              <button onClick={() => setSelectedSection(null)} className="flex-1 border-2 border-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-50 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Sections Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md animate-scaleIn">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Manage Sections</h3>
                  <p className="text-sm text-gray-500">{showSectionModal.code} - {showSectionModal.name}</p>
                </div>
                <button onClick={() => setShowSectionModal(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {sectionError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{sectionError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add Section</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., A, B, Morning"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(showSectionModal); }}
                  />
                  <button
                    onClick={() => handleAddSection(showSectionModal)}
                    disabled={!newSectionName.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Sections</label>
                {(showSectionModal.sections || []).length === 0 ? (
                  <p className="text-sm text-gray-400">No sections defined yet</p>
                ) : (
                  <div className="space-y-2">
                    {(showSectionModal.sections || []).map((sec) => {
                      const enrollData = getSectionsForCourse(showSectionModal.id).find(s => s.name === sec);
                      const count = enrollData ? enrollData.students : 0;
                      return (
                        <div key={sec} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">Section {sec}</span>
                            <span className="text-sm text-gray-500 ml-2">({count} students)</span>
                          </div>
                          <button
                            onClick={() => handleRemoveSection(showSectionModal, sec)}
                            className="p-1 text-gray-400 hover:text-red-500 transition"
                            title={count > 0 ? 'Cannot remove: has students' : 'Remove section'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t">
              <button onClick={() => setShowSectionModal(null)} className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md animate-scaleIn">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Add New Course</h3>
                <button onClick={() => { setShowAddCourseModal(false); setCourseError(''); }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {courseError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{courseError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                <input
                  type="text" value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., CS101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                <input
                  type="text" value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Introduction to Programming"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={2} placeholder="Brief course description..."
                />
              </div>
            </div>
            <div className="p-6 border-t flex space-x-3">
              <button onClick={() => { setShowAddCourseModal(false); setCourseError(''); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
              <button
                onClick={handleAddCourse}
                disabled={addingCourse || !newCourse.code || !newCourse.name}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
              >
                {addingCourse ? 'Creating...' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
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
    </>
  );
}
