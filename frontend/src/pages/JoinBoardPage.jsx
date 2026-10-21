import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, CheckCircle, Check } from 'lucide-react';
import { inviteApi } from '../services/api';
import AuthFrame from '../components/auth/AuthFrame';
import { ClassroomButton, ClassroomAlert, ChalkBadge } from '../components/classroom';
import cx from '../components/classroom/cx';

// Static lookup for the board type tag. Hues follow the classroom palette: azure, green, teal, amber.
const BOARD_TYPE = {
  'course-material': { label: 'Course Material', className: 'bg-accent-50 text-accent-700' },
  'student-notes': { label: 'Student Notes', className: 'bg-green-50 text-green-700' },
  'study-planner': { label: 'Study Planner', className: 'bg-teal-50 text-teal-700' },
  kanban: { label: 'Kanban', className: 'bg-amber-50 text-amber-700' },
};
const BOARD_TYPE_FALLBACK = BOARD_TYPE.kanban;

export default function JoinBoardPage({ onNavigate }) {
  const { token } = useParams();
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

  const goHome = () => onNavigate('dashboard');

  if (loading) {
    return (
      <AuthFrame titleId="join-board-title" title="Join board" subtitle="Checking your invite" onHome={goHome}>
        <div aria-busy="true" className="space-y-3">
          <p role="status" className="text-sm text-ink-2">Loading invite</p>
          <div aria-hidden="true" className="space-y-2">
            <span className="block h-4 w-3/4 rounded-sm bg-line" />
            <span className="block h-3 w-1/2 rounded-sm bg-line" />
            <span className="block h-11 w-full rounded-sm bg-line" />
          </div>
        </div>
      </AuthFrame>
    );
  }

  if (error && !boardInfo) {
    return (
      <AuthFrame titleId="join-board-title" title="Invalid invite" onHome={goHome}>
        <div className="space-y-4">
          <ClassroomAlert>{error}</ClassroomAlert>
          <ClassroomButton variant="primary" className="w-full" onClick={() => onNavigate('dashboard')}>
            Go to Dashboard
          </ClassroomButton>
        </div>
      </AuthFrame>
    );
  }

  if (joined) {
    const alreadyMember = boardInfo?.already_member;
    return (
      <AuthFrame
        titleId="join-board-title"
        title={alreadyMember ? 'Already a member' : 'Joined successfully'}
        onHome={goHome}
      >
        <div className="space-y-4">
          <ChalkBadge
            tone="success"
            icon={alreadyMember ? Check : CheckCircle}
            label={alreadyMember ? 'You already have access' : 'Access granted'}
          />
          <p className="text-sm text-ink">
            You {alreadyMember ? 'are already a member of' : 'have joined'}{' '}
            <span className="font-semibold">{boardInfo?.board_name}</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ClassroomButton variant="secondary" className="w-full sm:flex-1" onClick={() => onNavigate('dashboard')}>
              Dashboard
            </ClassroomButton>
            {joinedBoardId && (
              <ClassroomButton
                variant="primary"
                className="w-full sm:flex-1"
                onClick={() => onNavigate('workspace', { boardId: joinedBoardId })}
              >
                Open Board
              </ClassroomButton>
            )}
          </div>
        </div>
      </AuthFrame>
    );
  }

  const typeTag = boardInfo?.board_type
    ? BOARD_TYPE[boardInfo.board_type] || BOARD_TYPE_FALLBACK
    : null;

  return (
    <AuthFrame
      titleId="join-board-title"
      title="You're invited"
      subtitle="You've been invited to join a board"
      onHome={goHome}
    >
      <div className="space-y-4">
        <div className="rounded border border-line bg-surface p-3">
          <h2 className="text-base font-semibold text-ink">{boardInfo?.board_name}</h2>
          <p className="mt-1 text-sm text-ink-2">
            By {boardInfo?.owner_name}
            <span aria-hidden="true"> · </span>
            <span className="capitalize">{boardInfo?.permission === 'edit' ? 'Can edit' : 'View only'}</span>
          </p>
          {typeTag && (
            <span className={cx('mt-2 inline-flex h-5 items-center rounded-sm px-1.5 text-2xs font-medium', typeTag.className)}>
              {typeTag.label}
            </span>
          )}
        </div>

        {error && <ClassroomAlert>{error}</ClassroomAlert>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <ClassroomButton variant="secondary" className="w-full sm:flex-1" onClick={() => onNavigate('dashboard')}>
            Cancel
          </ClassroomButton>
          <ClassroomButton
            variant="primary"
            icon={Users}
            loading={joining}
            className="w-full sm:flex-1"
            onClick={handleJoin}
          >
            {joining ? 'Joining...' : 'Join Board'}
          </ClassroomButton>
        </div>
      </div>
    </AuthFrame>
  );
}
