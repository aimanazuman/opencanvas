import React, { useState, useEffect } from 'react';
import Navigation from '../../components/Navigation';
import { BookOpen, Search, Users, Calendar, ChevronRight, Plus, X, Hash, CheckCircle, LogOut } from 'lucide-react';
import { coursesApi } from '../../services/api';

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} currentPage="courses" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
            <p className="text-gray-600 mt-1">Courses you are enrolled in</p>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Join Course</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery ? `No courses match "${searchQuery}"` : 'You are not enrolled in any courses yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                Join a Course
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md hover:border-indigo-300 transition group"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => onNavigate('course', { courseId: course.id })}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      {course.code && (
                        <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs font-semibold mb-2">
                          {course.code}
                        </span>
                      )}
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate">
                        {course.name}
                      </h3>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-400 flex-shrink-0 mt-1" />
                  </div>
                  {course.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1" />
                      {course.instructor_name || 'Instructor'}
                    </span>
                    {course.start_date && (
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        {formatDate(course.start_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDropCourse(course.id); }}
                    disabled={droppingCourseId === course.id}
                    className="w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition flex items-center justify-center space-x-1 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{droppingCourseId === course.id ? 'Dropping...' : 'Drop Course'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Join Course Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md animate-scaleIn">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Join a Course</h3>
                <button onClick={closeJoinModal} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {joinSuccess ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium text-gray-900 mb-1">{joinSuccess}</p>
                  <p className="text-sm text-gray-500">You can now access this course from your courses list</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Invite Code</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={inviteCode}
                          onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setJoinError(''); setJoinPreview(null); }}
                          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono tracking-wider uppercase"
                          placeholder="Enter code"
                          maxLength={20}
                        />
                      </div>
                      <button
                        onClick={handleLookupCode}
                        disabled={joinLoading || !inviteCode.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
                      >
                        {joinLoading && !joinPreview ? 'Looking...' : 'Lookup'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Enter the code shared by your lecturer</p>
                  </div>

                  {joinError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{joinError}</div>
                  )}

                  {joinPreview && (
                    <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">{joinPreview.code}</span>
                        <span className="font-semibold text-gray-900">{joinPreview.name}</span>
                      </div>
                      {joinPreview.description && (
                        <p className="text-sm text-gray-600">{joinPreview.description}</p>
                      )}
                      <div className="text-sm text-gray-500">
                        Instructor: {joinPreview.instructor_name}
                      </div>

                      {(joinPreview.sections || []).length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Select Section (optional)</label>
                          <select
                            value={joinSection}
                            onChange={(e) => setJoinSection(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                          >
                            <option value="">No section</option>
                            {joinPreview.sections.map(s => (
                              <option key={s} value={s}>Section {s}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {joinPreview.is_enrolled ? (
                        <p className="text-green-600 text-sm font-medium">You are already enrolled in this course</p>
                      ) : (
                        <button
                          onClick={handleJoinCourse}
                          disabled={joinLoading}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                        >
                          {joinLoading ? 'Joining...' : 'Join This Course'}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-6 border-t">
              <button onClick={closeJoinModal} className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">
                {joinSuccess ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
