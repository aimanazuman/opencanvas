import React, { useState, useEffect, useCallback } from 'react';
import { Users, ExternalLink, Search, Filter, X, LogOut, Clock, SortAsc } from 'lucide-react';
import Navigation from '../components/Navigation';
import { boardsApi } from '../services/api';

const GRADIENT_COLORS = [
  'from-green-400 to-blue-500',
  'from-purple-400 to-pink-500',
  'from-yellow-400 to-orange-500',
  'from-blue-400 to-indigo-500',
  'from-teal-400 to-cyan-500',
  'from-rose-400 to-red-500',
  'from-emerald-400 to-green-500',
];

const SharedPage = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showLeaveModal, setShowLeaveModal] = useState(null);
  const [sharedBoards, setSharedBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSharedBoards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await boardsApi.getAll({ shared: true });
      const data = response.data.results || response.data;
      const mapped = data.map((b, idx) => ({
        id: b.id,
        name: b.name,
        owner: b.owner_name || 'Unknown',
        members: (b.collaborators?.length || 0) + 1,
        role: b.permission === 'edit' || b.can_edit === true ? 'Editor' : b.permission === 'comment' ? 'Commenter' : 'Viewer',
        lastAccess: formatDateRelative(b.updated_at),
        color: GRADIENT_COLORS[idx % GRADIENT_COLORS.length],
        boardType: b.board_type || 'course-material',
      }));
      setSharedBoards(mapped);
    } catch (err) {
      console.error('Failed to load shared boards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSharedBoards();
  }, [loadSharedBoards]);

  const roles = ['all', 'Editor', 'Viewer', 'Commenter'];

  const filteredBoards = sharedBoards
    .filter(board => {
      const matchesSearch = board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           board.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = filterRole === 'all' || board.role === filterRole;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'owner') return a.owner.localeCompare(b.owner);
      if (sortBy === 'members') return b.members - a.members;
      return 0; // recent (default order)
    });

  const handleLeaveBoard = async (boardId) => {
    try {
      await boardsApi.leave(boardId);
      setSharedBoards(sharedBoards.filter(b => b.id !== boardId));
      setShowLeaveModal(null);
    } catch (err) {
      console.error('Failed to leave board:', err);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Editor': return 'bg-green-100 text-green-600';
      case 'Viewer': return 'bg-blue-100 text-blue-600';
      case 'Commenter': return 'bg-yellow-100 text-yellow-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shared With Me</h1>
            <p className="text-gray-600 mt-1">Boards that others have shared with you</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-gray-600">{sharedBoards.length} shared boards</span>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by board name or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Filter by Role */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
              >
                {roles.map(role => (
                  <option key={role} value={role}>
                    {role === 'all' ? 'All Roles' : role}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="relative">
              <SortAsc className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
              >
                <option value="recent">Most Recent</option>
                <option value="name">Name (A-Z)</option>
                <option value="owner">Owner (A-Z)</option>
                <option value="members">Most Members</option>
              </select>
            </div>
          </div>
          {searchQuery && (
            <p className="mt-3 text-sm text-gray-600">
              Found {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredBoards.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoards.map(board => (
              <div
                key={board.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden group"
              >
                <div className={`h-32 bg-gradient-to-br ${board.color} relative`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLeaveModal(board);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white bg-opacity-20 hover:bg-opacity-40 rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="Leave board"
                  >
                    <LogOut className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{board.name}</h3>
                    {board.boardType && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        board.boardType === 'course-material' || board.boardType === 'lecture-notes' ? 'bg-indigo-100 text-indigo-700' :
                        board.boardType === 'student-notes' ? 'bg-emerald-100 text-emerald-700' :
                        board.boardType === 'study-planner' ? 'bg-teal-100 text-teal-700' :
                        'bg-cyan-100 text-cyan-700'
                      }`}>
                        {board.boardType === 'course-material' || board.boardType === 'lecture-notes' ? 'Course Material' :
                         board.boardType === 'student-notes' ? 'Student Notes' :
                         board.boardType === 'study-planner' ? 'Study Planner' : 'Kanban'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Owned by {board.owner}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{board.members} members</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(board.role)}`}>
                      {board.role}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400 mb-4">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Last accessed {board.lastAccess}</span>
                  </div>
                  <button
                    onClick={() => onNavigate('workspace', { boardId: board.id })}
                    className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center justify-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Board</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery || filterRole !== 'all' ? 'No matching boards found' : 'No shared boards yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || filterRole !== 'all'
                ? 'Try adjusting your search or filter'
                : 'When someone shares a board with you, it will appear here'}
            </p>
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Leave Board Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Leave Board</h3>
              <button
                onClick={() => setShowLeaveModal(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className={`h-24 bg-gradient-to-br ${showLeaveModal.color} rounded-lg mb-4`}></div>
            <p className="font-semibold text-gray-900 mb-2">{showLeaveModal.name}</p>
            <p className="text-sm text-gray-500 mb-4">Owned by {showLeaveModal.owner}</p>
            <p className="text-gray-600 mb-6">
              Are you sure you want to leave this board? You will lose access unless the owner shares it with you again.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLeaveModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleLeaveBoard(showLeaveModal.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Board</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatDateRelative(dateString) {
  if (!dateString) return 'Unknown';
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

export default SharedPage;
