import React, { useState, useEffect, useCallback } from 'react';
import { Archive, RotateCcw, Trash2, Clock } from 'lucide-react';
import { boardsApi } from '../../services/api';
import { formatTimeAgo } from '../../hooks/useLecturerData';

export default function LecturerArchivePage({ onNavigate }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await boardsApi.getAll({ is_archived: 'true' });
      setBoards(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load archived boards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (id) => {
    try {
      await boardsApi.restore(id);
      setBoards(boards.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to restore board:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this board?')) return;
    try {
      await boardsApi.delete(id);
      setBoards(boards.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Archived Boards</h1>
        <p className="text-gray-600 mt-1">Boards you have archived. Restore or permanently delete them.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      ) : boards.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No archived boards</p>
          <p className="text-sm">Boards you archive will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <div key={board.id} className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-900 truncate mb-2">{board.name}</h3>
              <p className="text-xs text-gray-400 flex items-center mb-4">
                <Clock className="w-3.5 h-3.5 mr-1" />{formatTimeAgo(board.updated_at)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRestore(board.id)}
                  className="flex-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition flex items-center justify-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /><span>Restore</span>
                </button>
                <button
                  onClick={() => handleDelete(board.id)}
                  className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
