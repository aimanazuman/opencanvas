import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navigation from '../../components/Navigation';
import { Plus, Search, Star, Clock, Folder, MoreVertical, Archive, Trash2, ArrowLeft, Grid, List } from 'lucide-react';
import { boardsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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

export default function TemplateBoardsPage({ onNavigate, templateId, templateName, templateDescription, templateColor, TemplateIcon }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showBoardMenu, setShowBoardMenu] = useState(null);
  const menuRef = useRef(null);
  const { isGuest } = useAuth();

  const colorMap = {
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', gradient: 'from-indigo-100 to-indigo-50', btn: 'bg-indigo-600 hover:bg-indigo-700' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', gradient: 'from-emerald-100 to-emerald-50', btn: 'bg-emerald-600 hover:bg-emerald-700' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600', gradient: 'from-teal-100 to-teal-50', btn: 'bg-teal-600 hover:bg-teal-700' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', gradient: 'from-cyan-100 to-cyan-50', btn: 'bg-cyan-600 hover:bg-cyan-700' },
  };
  const colors = colorMap[templateColor] || colorMap.indigo;

  const loadBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await boardsApi.getAll({ board_type: templateId, is_archived: 'false' });
      setBoards(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => { loadBoards(); }, [loadBoards]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowBoardMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = async () => {
    try {
      const res = await boardsApi.create({ name: `Untitled ${templateName}`, board_type: templateId, content: {} });
      onNavigate('workspace', { boardId: res.data.id, templateType: templateId });
    } catch (err) {
      onNavigate('workspace', { templateType: templateId });
    }
  };

  const handleOpen = (board) => onNavigate('workspace', { boardId: board.id });

  const toggleStar = async (boardId) => {
    try {
      const res = await boardsApi.toggleStar(boardId);
      setBoards(boards.map(b => b.id === boardId ? { ...b, is_starred: res.data.is_starred } : b));
    } catch (err) { console.error('Failed to toggle star:', err); }
  };

  const handleArchive = async (boardId) => {
    try {
      await boardsApi.archive(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to archive:', err); }
  };

  const handleDelete = async (boardId) => {
    if (!window.confirm('Delete this board?')) return;
    try {
      await boardsApi.delete(boardId);
      setBoards(boards.filter(b => b.id !== boardId));
      setShowBoardMenu(null);
    } catch (err) { console.error('Failed to delete:', err); }
  };

  const filtered = boards.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onNavigate={onNavigate} currentPage="templates" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Back link */}
        <button onClick={() => onNavigate('templates')} className="flex items-center text-gray-600 hover:text-indigo-600 mb-6 transition">
          <ArrowLeft className="w-4 h-4 mr-1" /><span className="text-sm">All Templates</span>
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center`}>
              <TemplateIcon className={`w-7 h-7 ${colors.text}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{templateName}</h1>
              <p className="text-gray-600">{templateDescription}</p>
            </div>
          </div>
          <button onClick={handleCreate} className={`${colors.btn} text-white px-4 py-2 rounded-lg transition inline-flex items-center space-x-2`}>
            <Plus className="h-5 w-5" /><span>New {templateName}</span>
          </button>
        </div>

        {/* Search + View Toggle */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input type="text" placeholder={`Search ${templateName.toLowerCase()} boards...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">{filtered.length} board{filtered.length !== 1 ? 's' : ''}</span>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? `${colors.bg} ${colors.text}` : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Grid className="h-5 w-5" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? `${colors.bg} ${colors.text}` : 'bg-white text-gray-600 hover:bg-gray-50'}`}><List className="h-5 w-5" /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600`} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <TemplateIcon className={`w-16 h-16 ${colors.text} mx-auto mb-4 opacity-30`} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? `No boards match "${searchQuery}"` : `No ${templateName.toLowerCase()} boards yet`}
            </h3>
            <p className="text-gray-500 mb-6">{searchQuery ? 'Try a different search' : 'Create your first one to get started'}</p>
            {!searchQuery && (
              <button onClick={handleCreate} className={`${colors.btn} text-white px-4 py-2 rounded-lg transition inline-flex items-center space-x-2`}>
                <Plus className="h-5 w-5" /><span>Create {templateName}</span>
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(board => (
              <div key={board.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition group animate-fadeIn">
                <div onClick={() => handleOpen(board)} className={`h-28 bg-gradient-to-br ${colors.gradient} flex items-center justify-center cursor-pointer rounded-t-lg`}>
                  <TemplateIcon className={`h-10 w-10 ${colors.text} opacity-40`} />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 onClick={() => handleOpen(board)} className="font-medium text-gray-900 truncate cursor-pointer hover:text-indigo-600">{board.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(board.updated_at)}</p>
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border divide-y">
            {filtered.map(board => (
              <div key={board.id} className="p-4 hover:bg-gray-50 flex items-center justify-between group animate-fadeIn">
                <div onClick={() => handleOpen(board)} className="flex items-center space-x-4 min-w-0 flex-1 cursor-pointer">
                  <div className={`${colors.bg} p-3 rounded-lg flex-shrink-0`}>
                    <TemplateIcon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 truncate hover:text-indigo-600">{board.name}</h3>
                    <p className="text-sm text-gray-500">{board.course_name || 'Personal'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); toggleStar(board.id); }} className="p-1 hover:bg-gray-100 rounded">
                    <Star className={`h-5 w-5 ${board.is_starred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                  </button>
                  <span className="text-sm text-gray-500 hidden sm:block">{formatTimeAgo(board.updated_at)}</span>
                  <div className="relative" ref={showBoardMenu === board.id ? menuRef : null}>
                    <button onClick={(e) => { e.stopPropagation(); setShowBoardMenu(showBoardMenu === board.id ? null : board.id); }} className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition">
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
