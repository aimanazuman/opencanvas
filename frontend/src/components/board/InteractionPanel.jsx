import React, { useState } from 'react';
import { Activity, ToggleLeft, ToggleRight, Users, Clock, MessageCircle, Heart, Upload, PlusCircle, UserX } from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { getInteractionSummary, getUsersWithoutInteraction } from '../../utils/interactionTracker';

const ACTION_ICONS = {
  card_created: { icon: PlusCircle, label: 'Created', color: 'text-green-600 bg-green-50' },
  card_liked: { icon: Heart, label: 'Liked', color: 'text-pink-600 bg-pink-50' },
  commented: { icon: MessageCircle, label: 'Commented', color: 'text-blue-600 bg-blue-50' },
  file_uploaded: { icon: Upload, label: 'Uploaded', color: 'text-purple-600 bg-purple-50' },
};

export default function InteractionPanel({ enrolledStudents = [] }) {
  const { board, setTrackInteractions } = useBoard();
  const [expanded, setExpanded] = useState(true);

  if (!board) return null;

  const trackingEnabled = board.trackInteractions || false;
  const summary = getInteractionSummary(board);
  const nonInteracting = getUsersWithoutInteraction(board, enrolledStudents);

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  };

  return (
    <div className="bg-white border-l border-gray-200 w-72 flex-shrink-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-sm text-gray-900">Interactions</span>
        </div>
        <button
          onClick={() => setTrackInteractions(!trackingEnabled)}
          className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full transition ${
            trackingEnabled
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
          title={trackingEnabled ? 'Disable tracking' : 'Enable tracking'}
        >
          {trackingEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          <span>{trackingEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>

      {!trackingEnabled ? (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">Tracking is disabled</p>
            <p className="text-xs text-gray-400">Enable tracking to monitor student interactions on this board</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 p-3">
            <div className="bg-indigo-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-indigo-600">{summary.totalUsers}</p>
              <p className="text-xs text-gray-500">Users</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-emerald-600">{summary.totalActions}</p>
              <p className="text-xs text-gray-500">Actions</p>
            </div>
          </div>

          {/* Interacted Users */}
          <div className="px-3 pb-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wide py-2"
            >
              <span className="flex items-center space-x-1">
                <Users className="w-3 h-3" />
                <span>Active Users ({summary.users.length})</span>
              </span>
              <span>{expanded ? '−' : '+'}</span>
            </button>

            {expanded && (
              <div className="space-y-2">
                {summary.users.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-2">No interactions recorded yet</p>
                )}
                {summary.users.map((u) => (
                  <div key={u.userId} className="bg-gray-50 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">{u.name}</span>
                      <span className="text-xs text-gray-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(u.lastAction)}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {u.actionTypes.map((type) => {
                        const info = ACTION_ICONS[type] || { icon: Activity, label: type, color: 'text-gray-600 bg-gray-50' };
                        const Icon = info.icon;
                        return (
                          <span
                            key={type}
                            className={`inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-xs ${info.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{info.label}</span>
                          </span>
                        );
                      })}
                      <span className="text-xs text-gray-400 ml-1">({u.actionCount})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Non-interacting Students */}
          {enrolledStudents.length > 0 && nonInteracting.length > 0 && (
            <div className="px-3 pb-3 border-t mt-2 pt-2">
              <div className="flex items-center space-x-1 text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">
                <UserX className="w-3 h-3" />
                <span>Not Yet Active ({nonInteracting.length})</span>
              </div>
              <div className="space-y-1">
                {nonInteracting.map((student) => (
                  <div key={student.id} className="flex items-center space-x-2 py-1">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                      {(student.first_name?.[0] || student.username?.[0] || '?').toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-500 truncate">
                      {`${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
