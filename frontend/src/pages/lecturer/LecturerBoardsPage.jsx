import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Search, Filter, Folder, BookOpen, Clock, MoreVertical, Star, Archive, Trash2 } from 'lucide-react';
import { boardsApi, coursesApi } from '../../services/api';
import { formatTimeAgo } from '../../hooks/useLecturerData';

export default function LecturerBoardsPage({ onNavigate }) {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const urlCourse = urlParams.get('course');
  const urlSection = urlParams.get('section');

  const [boards, setBoards] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [courseFilter, setCourseFilter] = useState(urlCourse || 'all');
  const [sectionFilter, setSectionFilter] = useState(urlSection || '');
  const [search, setSearch] = useState('');
  const [showBoardMenu, setShowBoardMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    coursesApi.getAll().then(res => setCourses(res.data.results || res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowBoardMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadBoards = useCallback(async () => {
    setLoading(true);
    try {
      const params = { is_archived: 'false' };
      if (courseFilter === 'all') params.scope = 'personal';
      else if (courseFilter === 'all-courses') params.scope = 'course';
      else params.course = courseFilter;
      const res = await boardsApi.getAll(params);
      setBoards(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  }, [courseFilter]);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  const toggleStar = async (boardId) => {
    try {
      const response = await boardsApi.toggleStar(boardId);
      setBoards(boards.map(b => b.id === boardId ? { ...b, is_starred: response.data.is_starred } : b));
    } catch (err) { console.error('Failed to toggle star:', err); }
  };

  const handleArchive = async (boardId) => {
    try {
      await boardsApi.archive(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to archive board:', err); }
  };

  const handleDelete = async (boardId) => {
    if (!window.confirm('Are you sure you want to delete this board?')) return;
    try {
      await boardsApi.delete(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to delete board:', err); }
  };

  let filtered = boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  if (sectionFilter) filtered = filtered.filter(b => b.section === sectionFilter);

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Boards</h1>
          <p className="text-gray-600 mt-1">View and manage your boards across all courses</p>
        </div>
        <button
          onClick={() => {
            const params = {};
            if (courseFilter && courseFilter !== 'all' && courseFilter !== 'all-courses') {
              params.courseId = courseFilter;
              const course = courses.find(c => String(c.id) === String(courseFilter));
              if (course) params.courseName = course.code;
              if (sectionFilter) params.section = sectionFilter;
            }
            onNavigate('lecturer-templates', params);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center space-x-2 self-start"
        >
          <Plus className="w-5 h-5" />
          <span>New Board</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search boards by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={courseFilter}
              onChange={(e) => { setCourseFilter(e.target.value); setSectionFilter(''); }}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none bg-white min-w-[180px]"
            >
              <option value="all">Personal Boards</option>
              <option value="all-courses">All Course Boards</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Course/Section Navigation */}
      {courses.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Browse by Course & Section</h3>
          <div className="flex flex-wrap gap-2">
            {courses.map(c => (
              <React.Fragment key={c.id}>
                <button
                  onClick={() => { setCourseFilter(String(c.id)); setSectionFilter(''); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    String(courseFilter) === String(c.id)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                  {c.code}
                </button>
                {String(courseFilter) === String(c.id) && (c.sections || []).length > 0 && (
                  (c.sections || []).map(sec => (
                    <button
                      key={sec}
                      onClick={() => setSectionFilter(sectionFilter === sec ? '' : sec)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                        sectionFilter === sec
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-400'
                      }`}
                    >
                      Section {sec}
                    </button>
                  ))
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Boards Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-3 text-gray-500">Loading boards...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No boards found</p>
          <p className="text-sm">{search ? 'Try a different search term' : 'Create a new board to get started'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(board => (
            <div
              key={board.id}
              className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md hover:border-indigo-300 transition group relative cursor-pointer"
              onClick={() => onNavigate('workspace', { boardId: board.id })}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate pr-2">
                  {board.name}
                </h3>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStar(board.id); }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Star className={`w-4 h-4 ${board.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                  <div className="relative" ref={showBoardMenu === board.id ? menuRef : null}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowBoardMenu(showBoardMenu === board.id ? null : board.id); }}
                      className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {showBoardMenu === board.id && (
                      <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border py-1 z-10 w-36 animate-slideDown" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleArchive(board.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2">
                          <Archive className="h-4 w-4" /><span>Archive</span>
                        </button>
                        <button onClick={() => handleDelete(board.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2">
                          <Trash2 className="h-4 w-4" /><span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {board.board_type && (
                <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-medium mb-2">
                  {board.board_type}
                </span>
              )}
              {(board.course_name || board.section) && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {board.course_name && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      <BookOpen className="w-3 h-3 mr-1 flex-shrink-0" />
                      {board.course_name}
                    </span>
                  )}
                  {board.section && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                      Section {board.section}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {formatTimeAgo(board.updated_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
