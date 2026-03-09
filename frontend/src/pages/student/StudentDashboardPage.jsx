import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navigation from '../../components/Navigation';
import GuestRegistrationModal from '../../components/GuestRegistrationModal';
import { Plus, Clock, Star, Folder, Search, Filter, Grid, List, MoreVertical, Trash2, Archive, Share2, BookOpen, Calendar, Layout, Lightbulb, X, ChevronDown, ChevronRight } from 'lucide-react';
import { BOARD_TYPES } from '../../utils/boardHelpers';
import { useAuth } from '../../contexts/AuthContext';
import { getTemplatesForRole } from '../../utils/templateDefinitions';
import { boardsApi, coursesApi } from '../../services/api';
import { getGuestBoards, deleteGuestBoard } from '../../utils/guestStorage';
import useStorageWarning from '../../hooks/useStorageWarning';

const TYPE_BADGES = {
  [BOARD_TYPES.COURSE_MATERIAL]: { label: 'Course Material', bg: 'bg-indigo-100', text: 'text-indigo-700', icon: BookOpen },
  [BOARD_TYPES.LECTURE_NOTES]: { label: 'Course Material', bg: 'bg-indigo-100', text: 'text-indigo-700', icon: BookOpen },
  [BOARD_TYPES.STUDENT_NOTES]: { label: 'Student Notes', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Lightbulb },
  [BOARD_TYPES.STUDY_PLANNER]: { label: 'Study Planner', bg: 'bg-teal-100', text: 'text-teal-700', icon: Calendar },
  [BOARD_TYPES.KANBAN]: { label: 'Kanban', bg: 'bg-cyan-100', text: 'text-cyan-700', icon: Layout },
};

const TEMPLATE_ICONS = {
  'course-material': BookOpen,
  'student-notes': Lightbulb,
  'study-planner': Calendar,
  'kanban': Layout,
};

function formatDate(dateString) {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

export default function StudentDashboardPage({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterStarred, setFilterStarred] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(null);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [activeTab, setActiveTab] = useState('my-boards');
  const [classBoards, setClassBoards] = useState([]);
  const [classLoading, setClassLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [expandedCourses, setExpandedCourses] = useState({});
  const menuRef = useRef(null);
  const { user, isGuest } = useAuth();
  useStorageWarning();

  const loadBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isGuest) {
        const guestBoards = getGuestBoards();
        setBoards(guestBoards.map(b => ({
          id: b.id, name: b.name,
          type: b.type || b.board_type || 'course-material',
          board_type: b.type || b.board_type || 'course-material',
          course_name: b.course_name || null,
          is_starred: b.is_starred || false,
          is_archived: b.is_archived || false,
          updated_at: b.updated_at,
        })));
      } else {
        const params = { is_archived: 'false' };
        if (activeTab === 'my-boards') params.scope = 'personal';
        const response = await boardsApi.getAll(params);
        setBoards(response.data.results || response.data);
      }
    } catch (err) {
      setError('Failed to load boards. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isGuest, activeTab]);

  const loadClassBoards = useCallback(async () => {
    setClassLoading(true);
    try {
      const response = await boardsApi.getAll({ is_archived: 'false', scope: 'course' });
      setClassBoards(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load class boards:', err);
    } finally {
      setClassLoading(false);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const response = await coursesApi.getAll();
      setEnrolledCourses(response.data.results || response.data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, []);

  useEffect(() => { loadBoards(); }, [loadBoards]);
  useEffect(() => { if (!isGuest) loadCourses(); }, [isGuest, loadCourses]);
  useEffect(() => { if (activeTab === 'class-boards' && !isGuest) loadClassBoards(); }, [activeTab, isGuest, loadClassBoards]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowBoardMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleStar = async (boardId) => {
    if (isGuest) {
      setBoards(boards.map(b => b.id === boardId ? { ...b, is_starred: !b.is_starred } : b));
      return;
    }
    try {
      const response = await boardsApi.toggleStar(boardId);
      setBoards(boards.map(b => b.id === boardId ? { ...b, is_starred: response.data.is_starred } : b));
    } catch (err) { console.error('Failed to toggle star:', err); }
  };

  const handleArchive = async (boardId) => {
    if (isGuest) return;
    try {
      await boardsApi.archive(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to archive board:', err); }
  };

  const handleDelete = async (boardId) => {
    try {
      if (isGuest) deleteGuestBoard(boardId);
      else await boardsApi.delete(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to delete board:', err); }
  };

  const allBoards = boards.filter(b => !b.is_archived);
  const filteredBoards = allBoards.filter(board => {
    const matchesSearch = board.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStarred = !filterStarred || board.is_starred;
    return matchesSearch && matchesStarred;
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeekCount = allBoards.filter(b => new Date(b.updated_at) > weekAgo).length;

  const handleCreateBoard = async (templateId) => {
    setShowNewBoardModal(false);
    if (isGuest) {
      onNavigate('workspace', { templateType: templateId });
    } else {
      try {
        const response = await boardsApi.create({ name: 'Untitled Board', board_type: templateId, content: {} });
        onNavigate('workspace', { boardId: response.data.id, templateType: templateId });
      } catch (err) {
        onNavigate('workspace', { templateType: templateId });
      }
    }
  };

  const handleOpenBoard = (board) => onNavigate('workspace', { boardId: board.id });
  const getBadge = (type) => TYPE_BADGES[type] || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} currentPage="dashboard" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here are your recent boards.</p>
          </div>
          <button onClick={() => setShowNewBoardModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition inline-flex items-center space-x-2">
            <Plus className="h-5 w-5" /><span>New Board</span>
          </button>
        </div>

        {/* Tabs */}
        {!isGuest && (
          <div className="flex items-center space-x-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
            <button onClick={() => setActiveTab('my-boards')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'my-boards' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}>My Boards</button>
            <button onClick={() => setActiveTab('class-boards')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'class-boards' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}>Class Boards</button>
          </div>
        )}

        {/* Search and Stats for My Boards */}
        {(isGuest || activeTab === 'my-boards') && <>
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search boards..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Grid className="h-5 w-5" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><List className="h-5 w-5" /></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 p-2 rounded-lg"><Folder className="h-6 w-6 text-indigo-600" /></div>
                <div><p className="text-2xl font-bold">{allBoards.length}</p><p className="text-sm text-gray-600">Total Boards</p></div>
              </div>
            </div>
            <div onClick={() => setFilterStarred(!filterStarred)} className={`p-4 rounded-lg shadow-sm border cursor-pointer transition hover:shadow-md ${filterStarred ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-300' : 'bg-white'}`}>
              <div className="flex items-center space-x-3">
                <div className="bg-yellow-100 p-2 rounded-lg"><Star className={`h-6 w-6 ${filterStarred ? 'text-yellow-600 fill-yellow-500' : 'text-yellow-600'}`} /></div>
                <div><p className="text-2xl font-bold">{allBoards.filter(b => b.is_starred).length}</p><p className="text-sm text-gray-600">{filterStarred ? 'Starred (Active)' : 'Starred'}</p></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 p-2 rounded-lg"><Clock className="h-6 w-6 text-green-600" /></div>
                <div><p className="text-2xl font-bold">{thisWeekCount}</p><p className="text-sm text-gray-600">This Week</p></div>
              </div>
            </div>
          </div>

          {loading && <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}<button onClick={loadBoards} className="ml-4 text-red-800 underline">Retry</button></div>}

          {!loading && !error && viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBoards.map((board) => {
                const boardType = board.type || board.board_type;
                const badge = getBadge(boardType);
                return (
                  <div key={board.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition group">
                    <div onClick={() => handleOpenBoard(board)} className="h-32 bg-gradient-to-br from-indigo-100 to-purple-50 flex items-center justify-center cursor-pointer rounded-t-lg overflow-hidden relative">
                      {badge ? <badge.icon className="h-12 w-12 text-indigo-400" /> : <Folder className="h-12 w-12 text-indigo-400" />}
                      {badge && <span className={`absolute top-2 left-2 ${badge.bg} ${badge.text} text-xs font-medium px-2 py-0.5 rounded-full`}>{badge.label}</span>}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 onClick={() => handleOpenBoard(board)} className="font-medium text-gray-900 truncate cursor-pointer hover:text-indigo-600">{board.name}</h3>
                          <p className="text-sm text-gray-500">{board.course_name || 'Personal'}</p>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); toggleStar(board.id); }} className="p-1 hover:bg-gray-100 rounded">
                            <Star className={`h-4 w-4 ${board.is_starred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                          </button>
                          <div className="relative" ref={showBoardMenu === board.id ? menuRef : null}>
                            <button onClick={(e) => { e.stopPropagation(); setShowBoardMenu(showBoardMenu === board.id ? null : board.id); }} className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition">
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                            </button>
                            {showBoardMenu === board.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 z-50 w-36 animate-slideDown">
                                {!isGuest && <button onClick={() => handleArchive(board.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"><Archive className="h-4 w-4" /><span>Archive</span></button>}
                                <button onClick={() => handleDelete(board.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2"><Trash2 className="h-4 w-4" /><span>Delete</span></button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(board.updated_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !loading && !error ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b"><h2 className="text-lg font-semibold">All Boards</h2></div>
              <div className="divide-y">
                {filteredBoards.map((board) => {
                  const boardType = board.type || board.board_type;
                  const badge = getBadge(boardType);
                  return (
                    <div key={board.id} className="p-4 hover:bg-gray-50 flex items-center justify-between group">
                      <div onClick={() => handleOpenBoard(board)} className="flex items-center space-x-4 min-w-0 flex-1 cursor-pointer">
                        <div className="bg-gradient-to-br from-indigo-100 to-purple-50 p-3 rounded-lg flex-shrink-0">
                          {badge ? <badge.icon className="h-6 w-6 text-indigo-600" /> : <Folder className="h-6 w-6 text-indigo-600" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900 truncate hover:text-indigo-600">{board.name}</h3>
                            {badge && <span className={`${badge.bg} ${badge.text} text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0`}>{badge.label}</span>}
                          </div>
                          <p className="text-sm text-gray-500">{board.course_name || 'Personal'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); toggleStar(board.id); }} className="p-1 hover:bg-gray-100 rounded">
                          <Star className={`h-5 w-5 ${board.is_starred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                        </button>
                        <span className="text-sm text-gray-500 hidden sm:block">{formatDate(board.updated_at)}</span>
                        <div className="relative" ref={showBoardMenu === board.id ? menuRef : null}>
                          <button onClick={(e) => { e.stopPropagation(); setShowBoardMenu(showBoardMenu === board.id ? null : board.id); }} className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition">
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>
                          {showBoardMenu === board.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border py-1 z-50 w-36">
                              {!isGuest && <button onClick={() => handleArchive(board.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"><Archive className="h-4 w-4" /><span>Archive</span></button>}
                              <button onClick={() => handleDelete(board.id)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center space-x-2"><Trash2 className="h-4 w-4" /><span>Delete</span></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!loading && filteredBoards.length === 0 && (
            <div className="text-center py-12">
              <Folder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No boards found</h3>
              <p className="text-gray-500 mb-4">{searchQuery ? `No boards match "${searchQuery}"` : 'Create your first board to get started'}</p>
              <button onClick={() => setShowNewBoardModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition inline-flex items-center space-x-2">
                <Plus className="h-5 w-5" /><span>Create Board</span>
              </button>
            </div>
          )}
        </>}

        {/* Class Boards Tab */}
        {!isGuest && activeTab === 'class-boards' && (
          <>
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" placeholder="Search class boards by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>
            {classLoading ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>
            ) : (() => {
              const filtered = classBoards.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
              const grouped = filtered.reduce((acc, board) => {
                const courseName = board.course_name || 'Unknown Course';
                if (!acc[courseName]) acc[courseName] = [];
                acc[courseName].push(board);
                return acc;
              }, {});
              const courseNames = Object.keys(grouped).sort();
              if (courseNames.length === 0) {
                return (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No class boards yet</h3>
                    <p className="text-gray-500">{searchQuery ? `No class boards match "${searchQuery}"` : 'Boards from your enrolled courses will appear here'}</p>
                  </div>
                );
              }
              return (
                <div className="space-y-4">
                  {courseNames.map(courseName => {
                    const courseBoards = grouped[courseName];
                    const isExpanded = expandedCourses[courseName] !== false;
                    const course = enrolledCourses.find(c => c.name === courseName);
                    return (
                      <div key={courseName} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <button onClick={() => setExpandedCourses(prev => ({ ...prev, [courseName]: !isExpanded }))} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition">
                          <div className="flex items-center space-x-3">
                            {course?.code && <span className="px-2 py-1 bg-indigo-100 text-indigo-600 rounded text-xs font-semibold">{course.code}</span>}
                            <h3 className="font-semibold text-gray-900">{courseName}</h3>
                            <span className="text-sm text-gray-500">{courseBoards.length} board{courseBoards.length !== 1 ? 's' : ''}</span>
                          </div>
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        </button>
                        {isExpanded && (
                          <div className="border-t p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {courseBoards.map(board => {
                                const boardType = board.type || board.board_type;
                                const badge = getBadge(boardType);
                                return (
                                  <div key={board.id} onClick={() => handleOpenBoard(board)} className="p-4 border rounded-lg hover:border-indigo-300 hover:shadow-sm transition cursor-pointer group">
                                    <div className="flex items-start justify-between mb-2">
                                      <h4 className="font-medium text-gray-900 truncate group-hover:text-indigo-600 pr-2">{board.name}</h4>
                                      {board.is_starred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                                    </div>
                                    {badge && <span className={`inline-block ${badge.bg} ${badge.text} text-xs font-medium px-2 py-0.5 rounded-full mb-2`}>{badge.label}</span>}
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                      <span>{board.owner_name}</span>
                                      <span>{formatDate(board.updated_at)}</span>
                                    </div>
                                    {board.can_edit === false && <span className="inline-block mt-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">View only</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </main>

      <GuestRegistrationModal isOpen={showGuestModal} onClose={() => { setShowGuestModal(false); setPendingAction(null); }} onSuccess={() => { if (pendingAction === 'newBoard') setShowNewBoardModal(true); setPendingAction(null); loadBoards(); }} />

      {showNewBoardModal && (() => {
        const availableTemplates = getTemplatesForRole(user?.role || 'student');
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-scaleIn">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">Create New Board</h2>
                <button onClick={() => setShowNewBoardModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">Choose a board type to get started:</p>
                <div className="space-y-3">
                  {availableTemplates.map((template) => {
                    const IconComp = TEMPLATE_ICONS[template.id] || Folder;
                    return (
                      <button key={template.id} onClick={() => handleCreateBoard(template.id)} className="w-full flex items-center space-x-4 p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition text-left">
                        <div className={`bg-${template.color}-100 p-3 rounded-lg`}><IconComp className={`w-6 h-6 text-${template.color}-600`} /></div>
                        <div><h3 className="font-semibold text-gray-900">{template.name}</h3><p className="text-sm text-gray-500">{template.description}</p></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
