import React, { useState, useEffect } from 'react';
import Navigation from '../../components/Navigation';
import { ArrowLeft, BookOpen, Users, Calendar, Clock, Folder, Star, Layout, Lightbulb, LogOut } from 'lucide-react';
import { coursesApi, boardsApi } from '../../services/api';
import { BOARD_TYPES } from '../../utils/boardHelpers';

const TYPE_BADGES = {
  [BOARD_TYPES.COURSE_MATERIAL]: { label: 'Course Material', bg: 'bg-indigo-100', text: 'text-indigo-700', icon: BookOpen },
  [BOARD_TYPES.LECTURE_NOTES]: { label: 'Course Material', bg: 'bg-indigo-100', text: 'text-indigo-700', icon: BookOpen },
  [BOARD_TYPES.STUDENT_NOTES]: { label: 'Student Notes', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Lightbulb },
  [BOARD_TYPES.STUDY_PLANNER]: { label: 'Study Planner', bg: 'bg-teal-100', text: 'text-teal-700' },
  [BOARD_TYPES.KANBAN]: { label: 'Kanban', bg: 'bg-cyan-100', text: 'text-cyan-700', icon: Layout },
};

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation onNavigate={onNavigate} currentPage="courses" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation onNavigate={onNavigate} currentPage="courses" />
        <div className="text-center py-20 text-gray-500">
          <p>Course not found</p>
          <button onClick={() => onNavigate('courses')} className="mt-4 text-indigo-600 hover:underline">Back to courses</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} currentPage="courses" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => onNavigate('courses')}
          className="flex items-center text-gray-600 hover:text-indigo-600 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span className="text-sm">Back to Courses</span>
        </button>

        {/* Course header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              {course.code && (
                <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs font-semibold mb-2">
                  {course.code}
                </span>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{course.name}</h1>
              {course.description && <p className="text-gray-600 mt-2">{course.description}</p>}
            </div>
            <button
              onClick={handleDrop}
              disabled={dropping}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>{dropping ? 'Dropping...' : 'Drop Course'}</span>
            </button>
          </div>
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
            <span className="flex items-center"><Users className="w-4 h-4 mr-1" />{course.instructor_name || 'Instructor'}</span>
            {course.student_count != null && (
              <span className="flex items-center"><Users className="w-4 h-4 mr-1" />{course.student_count} students</span>
            )}
            {course.start_date && (
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" />Started {new Date(course.start_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Course boards */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Boards ({boards.length})</h2>

        {boards.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No boards yet</p>
            <p className="text-sm">Boards for this course will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map(board => {
              const boardType = board.type || board.board_type;
              const badge = TYPE_BADGES[boardType];
              return (
                <div
                  key={board.id}
                  onClick={() => onNavigate('workspace', { boardId: board.id })}
                  className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md hover:border-indigo-300 transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 pr-2">
                      {board.name}
                    </h3>
                    {board.is_starred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                  </div>
                  {badge && (
                    <span className={`inline-block ${badge.bg} ${badge.text} text-xs font-medium px-2 py-0.5 rounded-full mb-2`}>
                      {badge.label}
                    </span>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{board.owner_name}</span>
                    <span className="flex items-center"><Clock className="w-3 h-3 mr-1" />{formatTimeAgo(board.updated_at)}</span>
                  </div>
                  {board.can_edit === false && (
                    <span className="inline-block mt-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">View only</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
