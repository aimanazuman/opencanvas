import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, CheckCircle, AlertTriangle, Loader2, Layout } from 'lucide-react';
import { inviteApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function JoinBoardPage({ onNavigate }) {
  const { token } = useParams();
  const { user } = useAuth();
  const [boardInfo, setBoardInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [joined, setJoined] = useState(false);
  const [joinedBoardId, setJoinedBoardId] = useState(null);

  useEffect(() => {
    const fetchBoardInfo = async () => {
      try {
        const response = await inviteApi.getInfo(token);
        setBoardInfo(response.data);
        if (response.data.already_member) {
          setJoined(true);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError('This invite link is invalid.');
        } else if (err.response?.status === 410) {
          setError('This invite link has expired or reached its usage limit.');
        } else {
          setError('Failed to load invite information.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchBoardInfo();
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const response = await inviteApi.join(token);
      setJoined(true);
      setJoinedBoardId(response.data.board_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join board.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error && !boardInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {joined ? (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {boardInfo?.already_member ? 'Already a Member' : 'Joined Successfully!'}
            </h2>
            <p className="text-gray-600 mb-6">
              You {boardInfo?.already_member ? 'are already a member of' : 'have joined'}{' '}
              <span className="font-semibold">{boardInfo?.board_name}</span>
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Dashboard
              </button>
              {joinedBoardId && (
                <button
                  onClick={() => onNavigate('workspace', { boardId: joinedBoardId })}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Open Board
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layout className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">You're Invited!</h2>
              <p className="text-gray-500 text-sm">You've been invited to join a board</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 text-lg">{boardInfo?.board_name}</h3>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span>By {boardInfo?.owner_name}</span>
                <span className="text-gray-300">|</span>
                <span className="capitalize">
                  {boardInfo?.permission === 'edit' ? 'Can Edit' : 'View Only'}
                </span>
              </div>
              {boardInfo?.board_type && (
                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  boardInfo.board_type === 'course-material' ? 'bg-indigo-100 text-indigo-700' :
                  boardInfo.board_type === 'student-notes' ? 'bg-emerald-100 text-emerald-700' :
                  boardInfo.board_type === 'study-planner' ? 'bg-teal-100 text-teal-700' :
                  'bg-cyan-100 text-cyan-700'
                }`}>
                  {boardInfo.board_type === 'course-material' ? 'Course Material' :
                   boardInfo.board_type === 'student-notes' ? 'Student Notes' :
                   boardInfo.board_type === 'study-planner' ? 'Study Planner' : 'Kanban'}
                </span>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {joining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                <span>{joining ? 'Joining...' : 'Join Board'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
