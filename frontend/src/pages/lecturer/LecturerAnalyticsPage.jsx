import React, { useState, useEffect } from 'react';
import { Users, Folder, BookOpen, Activity } from 'lucide-react';
import { boardsApi } from '../../services/api';
import { useLecturerData } from '../../hooks/useLecturerData';

export default function LecturerAnalyticsPage({ onNavigate }) {
  const { courses, loading, totalStudents, totalBoards } = useLecturerData();
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    boardsApi.getAll({ is_archived: 'false' }).then(res => setBoards(res.data.results || res.data)).catch(() => {});
  }, []);

  const boardsWithTracking = boards.filter(b => b.content?.trackInteractions);
  const totalInteractions = boardsWithTracking.reduce((sum, b) => {
    const interactions = b.content?.interactions || {};
    return sum + Object.values(interactions).reduce((s, u) => s + (u.actions?.length || 0), 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Track student engagement and course performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Students</span>
            <Users className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Boards</span>
            <Folder className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalBoards}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Total Courses</span>
            <BookOpen className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600">Interactions</span>
            <Activity className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalInteractions}</p>
        </div>
      </div>

      {/* Course Performance */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Course Performance</h2>
        {courses.length === 0 && <p className="text-gray-400 text-center py-4">No courses to analyze</p>}
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded text-xs font-semibold">{course.code}</span>
                  <span className="font-semibold text-gray-900">{course.name}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Students</p>
                  <p className="text-lg font-bold text-gray-900">{course.student_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Boards</p>
                  <p className="text-lg font-bold text-gray-900">{course.board_count || 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Board Activity */}
      {boardsWithTracking.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-yellow-500" />
            <span>Board Interaction Activity</span>
          </h2>
          <div className="space-y-4">
            {boardsWithTracking.map((b) => {
              const interactions = b.content?.interactions || {};
              const userCount = Object.keys(interactions).length;
              const actionCount = Object.values(interactions).reduce((s, u) => s + (u.actions?.length || 0), 0);
              return (
                <div key={b.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{b.name}</span>
                    <button onClick={() => onNavigate('workspace', { boardId: b.id })} className="text-xs text-indigo-600 hover:underline">
                      Open Board
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Active Users</p>
                      <p className="text-lg font-bold text-gray-900">{userCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Actions</p>
                      <p className="text-lg font-bold text-gray-900">{actionCount}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
