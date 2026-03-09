import React, { useState, useEffect } from 'react';
import { Share2, Clock } from 'lucide-react';
import { boardsApi } from '../../services/api';
import { formatTimeAgo } from '../../hooks/useLecturerData';

export default function LecturerSharedPage({ onNavigate }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await boardsApi.getAll({ shared: 'true', is_archived: 'false' });
        setBoards(res.data.results || res.data);
      } catch (err) {
        console.error('Failed to load shared boards:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Shared Boards</h1>
        <p className="text-gray-600 mt-1">Boards shared with you by others</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      ) : boards.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Share2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No shared boards</p>
          <p className="text-sm">Boards shared with you will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => (
            <button
              key={board.id}
              onClick={() => onNavigate('workspace', { boardId: board.id })}
              className="bg-white rounded-xl shadow-sm border p-5 text-left hover:shadow-md hover:border-indigo-300 transition group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition truncate mb-2">
                {board.name}
              </h3>
              <p className="text-sm text-gray-500 mb-2">by {board.owner_name}</p>
              {board.permission === 'comment' ? (
                <span className="inline-block text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded mb-2">Commenter</span>
              ) : board.can_edit === false ? (
                <span className="inline-block text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded mb-2">View only</span>
              ) : null}
              <p className="text-xs text-gray-400 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />{formatTimeAgo(board.updated_at)}
              </p>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
