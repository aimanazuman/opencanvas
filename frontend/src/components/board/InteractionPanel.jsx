import React, { useState } from 'react';
import { Activity, ToggleLeft, ToggleRight, Users, Clock, MessageCircle, Heart, Upload, PlusCircle, UserX } from 'lucide-react';
import { useBoard } from '../../contexts/BoardContext';
import { getInteractionSummary, getUsersWithoutInteraction } from '../../utils/interactionTracker';
import cx from '../classroom/cx';

// Static class lookup maps: Tailwind only sees literal class names. Each action also has a text label.
const ACTION_ICONS = {
  card_created: { icon: PlusCircle, label: 'Created', tone: 'text-success bg-success-tint' },
  card_liked: { icon: Heart, label: 'Liked', tone: 'text-warning bg-warning-tint' },
  commented: { icon: MessageCircle, label: 'Commented', tone: 'text-accent-700 bg-accent-tint' },
  file_uploaded: { icon: Upload, label: 'Uploaded', tone: 'text-teal-700 bg-teal-50' },
};
const FALLBACK_ACTION = { icon: Activity, tone: 'text-ink-2 bg-surface-hover' };

const TRACK = {
  on: 'bg-success-tint text-success',
  off: 'bg-surface-hover text-ink-2',
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
    <aside aria-label="Interactions" className="flex w-72 flex-shrink-0 flex-col overflow-hidden border-l border-line bg-surface">
      {/* Header */}
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Activity className="h-4 w-4 flex-none text-accent-700" strokeWidth={1.5} aria-hidden="true" />
          <h2 className="text-sm font-semibold text-ink">Interactions</h2>
        </div>
        <button
          type="button"
          onClick={() => setTrackInteractions(!trackingEnabled)}
          aria-pressed={trackingEnabled}
          className={cx(
            'flex h-11 flex-none items-center gap-1 rounded px-2.5 text-xs font-medium md:h-7',
            TRACK[trackingEnabled ? 'on' : 'off']
          )}
          title={trackingEnabled ? 'Disable tracking' : 'Enable tracking'}
        >
          {trackingEnabled ? <ToggleRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" /> : <ToggleLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />}
          <span>{trackingEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>

      {!trackingEnabled ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div>
            <Activity className="mx-auto mb-3 h-10 w-10 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
            <p className="mb-1 text-sm text-ink-2">Tracking is disabled</p>
            <p className="text-xs text-ink-3">Enable tracking to monitor student interactions on this board</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 p-3">
            <div className="rounded bg-accent-tint p-2 text-center">
              <p className="text-lg font-semibold text-accent-700">{summary.totalUsers}</p>
              <p className="text-xs text-ink-2">Users</p>
            </div>
            <div className="rounded bg-success-tint p-2 text-center">
              <p className="text-lg font-semibold text-success">{summary.totalActions}</p>
              <p className="text-xs text-ink-2">Actions</p>
            </div>
          </div>

          {/* Interacted Users */}
          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between py-2 text-xs font-semibold uppercase tracking-wide text-ink-2"
            >
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <span>Active Users ({summary.users.length})</span>
              </span>
              <span>{expanded ? '−' : '+'}</span>
            </button>

            {expanded && (
              <div className="space-y-2">
                {summary.users.length === 0 && (
                  <p className="py-2 text-xs italic text-ink-3">No interactions recorded yet</p>
                )}
                {summary.users.map((u) => (
                  <div key={u.userId} className="rounded bg-surface-hover p-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-ink">{u.name}</span>
                      <span className="flex flex-none items-center gap-1 text-xs text-ink-3">
                        <Clock className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                        <span>{formatTime(u.lastAction)}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {u.actionTypes.map((type) => {
                        const info = ACTION_ICONS[type] || { ...FALLBACK_ACTION, label: type };
                        const Icon = info.icon;
                        return (
                          <span
                            key={type}
                            className={cx('inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-xs', info.tone)}
                          >
                            <Icon className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                            <span>{info.label}</span>
                          </span>
                        );
                      })}
                      <span className="ml-1 text-xs text-ink-3">({u.actionCount})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Non-interacting Students */}
          {enrolledStudents.length > 0 && nonInteracting.length > 0 && (
            <div className="mt-2 border-t border-line px-3 pb-3 pt-2">
              <div className="flex items-center gap-1 py-2 text-xs font-semibold uppercase tracking-wide text-ink-2">
                <UserX className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
                <span>Not Yet Active ({nonInteracting.length})</span>
              </div>
              <div className="space-y-1">
                {nonInteracting.map((student) => (
                  <div key={student.id} className="flex items-center gap-2 py-1">
                    <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-surface-hover text-xs text-ink-2">
                      {(student.first_name?.[0] || student.username?.[0] || '?').toUpperCase()}
                    </div>
                    <span className="truncate text-xs text-ink-2">
                      {`${student.first_name || ''} ${student.last_name || ''}`.trim() || student.username}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
