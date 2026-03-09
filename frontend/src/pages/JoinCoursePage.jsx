import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, Users, Calendar, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { coursesApi } from '../services/api';

export default function JoinCoursePage({ onNavigate }) {
  const { inviteCode } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedSection, setSelectedSection] = useState('');

  useEffect(() => {
    if (!inviteCode) return;
    const loadInfo = async () => {
      try {
        const res = await coursesApi.getInviteInfo(inviteCode);
        setCourse(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid invite code');
      } finally {
        setLoading(false);
      }
    };
    loadInfo();
  }, [inviteCode]);

  const handleJoin = async () => {
    setJoining(true);
    setError('');
    try {
      await coursesApi.joinByCode({ invite_code: inviteCode, section: selectedSection });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join course');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading course info...</p>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Successfully Enrolled!</h2>
          <p className="text-gray-600 mb-6">You have been enrolled in <strong>{course.name}</strong></p>
          <button
            onClick={() => onNavigate('courses')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            View My Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Join Course</h2>
          <p className="text-gray-500">You've been invited to join a course</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Course Code</span>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-sm font-semibold">{course.code}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Course Name</span>
            <p className="font-semibold text-gray-900">{course.name}</p>
          </div>
          {course.description && (
            <div>
              <span className="text-sm text-gray-500">Description</span>
              <p className="text-sm text-gray-700">{course.description}</p>
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 pt-1">
            <span className="flex items-center"><Users className="w-4 h-4 mr-1" />{course.instructor_name}</span>
            {course.student_count != null && (
              <span>{course.student_count} students</span>
            )}
          </div>
        </div>

        {(course.sections || []).length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Section (optional)</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No section</option>
              {course.sections.map(s => (
                <option key={s} value={s}>Section {s}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">{error}</div>
        )}

        {course.is_enrolled ? (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-4">You are already enrolled in this course</p>
            <button
              onClick={() => onNavigate('courses')}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Go to My Courses
            </button>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join Course'}
          </button>
        )}
      </div>
    </div>
  );
}
