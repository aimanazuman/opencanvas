import React, { useState, useEffect, useCallback } from 'react';
import { Archive, RotateCcw, Trash2, Search, X, AlertTriangle, Folder, Calendar, HardDrive } from 'lucide-react';
import Navigation from '../components/Navigation';
import { boardsApi } from '../services/api';

const ArchivePage = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [archivedBoards, setArchivedBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadArchivedBoards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await boardsApi.getArchived();
      const boards = (response.data.results || response.data).map(b => ({
        id: b.id,
        name: b.name,
        archivedDate: formatDateRelative(b.updated_at),
        course: b.course_name || 'No Course',
        boardType: b.board_type || b.type || 'course-material',
      }));
      setArchivedBoards(boards);
    } catch (err) {
      console.error('Failed to load archived boards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchivedBoards();
  }, [loadArchivedBoards]);

  const filteredBoards = archivedBoards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestore = async (boardId) => {
    try {
      await boardsApi.restore(boardId);
      setArchivedBoards(archivedBoards.filter(b => b.id !== boardId));
      setShowRestoreModal(null);
    } catch (err) {
      console.error('Failed to restore board:', err);
    }
  };

  const handleDelete = async (boardId) => {
    try {
      await boardsApi.delete(boardId);
      setArchivedBoards(archivedBoards.filter(b => b.id !== boardId));
      setShowDeleteModal(null);
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Archived Boards</h1>
            <p className="text-gray-600 mt-1">Restore or permanently delete archived workspaces</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border flex items-center space-x-2">
              <Archive className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">{archivedBoards.length} items</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search archived boards by name or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              Found {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''} matching "{searchQuery}"
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredBoards.length > 0 ? (
          <div className="space-y-4">
            {filteredBoards.map(board => (
              <div key={board.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <Folder className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-gray-900">{board.name}</h3>
                        {board.boardType && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            board.boardType === 'course-material' || board.boardType === 'lecture-notes' ? 'bg-indigo-100 text-indigo-700' :
                            board.boardType === 'study-planner' ? 'bg-teal-100 text-teal-700' :
                            'bg-cyan-100 text-cyan-700'
                          }`}>
                            {board.boardType === 'course-material' || board.boardType === 'lecture-notes' ? 'Course Material' :
                             board.boardType === 'study-planner' ? 'Study Planner' : 'Kanban'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-500">{board.course}</span>
                        <span className="text-sm text-gray-400">•</span>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>Archived {board.archivedDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowRestoreModal(board)}
                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(board)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No matching boards found' : 'No archived boards'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? `Try a different search term`
                : 'Boards you archive will appear here'}
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

      {/* Restore Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Restore Board</h3>
              <button onClick={() => setShowRestoreModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center space-x-4 bg-blue-50 p-4 rounded-lg mb-6">
              <Folder className="w-10 h-10 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">{showRestoreModal.name}</p>
                <p className="text-sm text-gray-500">{showRestoreModal.course}</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              This board will be restored to your dashboard and you can continue working on it.
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setShowRestoreModal(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
              <button
                onClick={() => handleRestore(showRestoreModal.id)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-red-600">Delete Board Permanently</h3>
              <button onClick={() => setShowDeleteModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center space-x-4 bg-red-50 p-4 rounded-lg mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
              <div>
                <p className="font-semibold text-gray-900">{showDeleteModal.name}</p>
                <p className="text-sm text-red-600">This action cannot be undone!</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this board? All content, files, and collaboration history will be lost forever.
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Cancel</button>
              <button
                onClick={() => handleDelete(showDeleteModal.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Forever</span>
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
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1) return 'today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export default ArchivePage;
