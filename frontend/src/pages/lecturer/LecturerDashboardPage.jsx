import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Folder, Plus, Activity } from 'lucide-react';
import { useLecturerData, formatTimeAgo } from '../../hooks/useLecturerData';
import useStorageWarning from '../../hooks/useStorageWarning';

export default function LecturerDashboardPage({ onNavigate }) {
  const navigate = useNavigate();
  const { courses, enrollments, loading, totalStudents, totalBoards } = useLecturerData();
  useStorageWarning();

  const recentEnrollments = [...enrollments]
    .sort((a, b) => new Date(b.enrolled_at) - new Date(a.enrolled_at))
    .slice(0, 4);

  const stats = [
    { label: 'Total Courses', value: courses.length, icon: BookOpen, color: 'indigo' },
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'green' },
    { label: 'Active Boards', value: totalBoards, icon: Folder, color: 'purple' },
  ];

  const colorClasses = {
    indigo: 'bg-indigo-100 text-indigo-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your courses.</p>
        </div>
        <button
          onClick={() => navigate('/lecturer/courses')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2 self-start"
        >
          <Plus className="w-5 h-5" />
          <span>New Course</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Enrollments */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Enrollments</h2>
            <button onClick={() => navigate('/lecturer/students')} className="text-indigo-600 text-sm hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentEnrollments.length === 0 && (
              <p className="text-gray-400 text-center py-4">No enrollments yet</p>
            )}
            {recentEnrollments.map((enrollment) => {
              const studentName = enrollment.student_details
                ? `${enrollment.student_details.first_name || ''} ${enrollment.student_details.last_name || ''}`.trim() || enrollment.student_details.username
                : `User ${enrollment.student}`;
              const initials = enrollment.student_details?.first_name && enrollment.student_details?.last_name
                ? `${enrollment.student_details.first_name[0]}${enrollment.student_details.last_name[0]}`
                : studentName[0]?.toUpperCase() || '?';
              return (
                <div key={enrollment.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">
                      <span className="font-medium">{studentName}</span>{' - Enrolled'}
                    </p>
                    <p className="text-sm text-gray-500">{enrollment.course_details?.code || ''}</p>
                  </div>
                  <span className="text-sm text-gray-400">{formatTimeAgo(enrollment.enrolled_at)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Course Overview */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Course Overview</h2>
            <button onClick={() => navigate('/lecturer/courses')} className="text-indigo-600 text-sm hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {courses.length === 0 && (
              <p className="text-gray-400 text-center py-4">No courses yet. Create your first course!</p>
            )}
            {courses.map((course) => (
              <div key={course.id} className="p-4 border rounded-lg hover:border-indigo-300 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded text-xs font-semibold">
                      {course.code}
                    </span>
                    <span className="font-medium text-gray-900">{course.name}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />{course.student_count || 0} students
                  </span>
                  <span className="flex items-center">
                    <Folder className="w-4 h-4 mr-1" />{course.board_count || 0} boards
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
