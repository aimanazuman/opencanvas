import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Calendar, Edit2, Save, Clock, Folder, ArrowRight, Activity, User as UserIcon, HardDrive, GraduationCap, BookOpen, Shield, AlertTriangle } from 'lucide-react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import useStorageUsage from '../hooks/useStorageUsage';
import { authApi, boardsApi } from '../services/api';
import {
  ClassroomShell, ChalkboardHeader, ChalkBadge, ClassroomAlert, ClassroomButton, ClassroomField, PaperPanel, StickyNote,
} from '../components/classroom';
import cx from '../components/classroom/cx';

// Static lookup: role badge icon. Unknown roles fall back to the generic user icon.
const ROLE_ICON = { student: GraduationCap, lecturer: BookOpen, admin: Shield };

function ProfileDetail({ icon: Icon, label, children }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-ink-2">
        <Icon className="h-4 w-4 flex-none" strokeWidth={1.5} aria-hidden="true" />
        <span>{label}</span>
      </p>
      <div className="mt-1 break-words text-sm font-medium text-ink">{children}</div>
    </div>
  );
}

const ProfilePage = ({ onNavigate, hideNav = false }) => {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    bio: '',
    role: '',
    username: '',
  });
  const [recentBoards, setRecentBoards] = useState([]);
  const [boardCount, setBoardCount] = useState(0);

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        bio: user.bio || '',
        role: user.role || 'student',
        username: user.username || '',
      });
    }
  }, [user]);

  const loadBoards = useCallback(async () => {
    try {
      const response = await boardsApi.getAll({ ordering: '-updated_at', is_archived: 'false' });
      const data = response.data.results || response.data;
      setBoardCount(data.length);
      setRecentBoards(data.slice(0, 5).map(b => ({
        id: b.id,
        name: b.name,
        course: b.course_name || 'No Course',
        lastEdited: formatTimeAgo(b.updated_at),
      })));
    } catch (err) {
      console.error('Failed to load boards:', err);
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updateData = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        bio: profile.bio,
      };
      // Include username/email only if changed
      if (profile.username !== user?.username) updateData.username = profile.username;
      if (profile.email !== user?.email) updateData.email = profile.email;

      await authApi.updateProfile(updateData);
      if (refreshUser) refreshUser();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
      const errors = err.response?.data;
      if (errors) {
        const messages = Object.entries(errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('; ');
        setSaveError(messages);
      } else {
        setSaveError('Failed to save profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.username;

  const initials = profile.first_name && profile.last_name
    ? `${profile.first_name[0]}${profile.last_name[0]}`
    : profile.username?.[0]?.toUpperCase() || '?';

  const joinDate = user?.date_joined
    ? new Date(user.date_joined).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  const RoleIcon = ROLE_ICON[profile.role] || UserIcon;

  // Storage figures for the stats panel: effective quota from the usage endpoint (raw user figures if it fails).
  const storage = useStorageUsage();
  const hasQuota = storage.quota > 0;
  const pct = Math.round(storage.percent);
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(3).replace(/\.?0+$/, '')} ${units[i]}`;
  };
  const usedDisplay = formatSize(storage.used);
  const quotaDisplay = formatSize(storage.quota);
  const barColor = pct >= 90 ? 'bg-danger' : pct >= 80 ? 'bg-amber-500' : 'bg-accent-500';
  const textColor = pct >= 90 ? 'text-danger' : pct >= 80 ? 'text-warning' : 'text-accent-600';

  const Content = hideNav ? 'div' : 'main';

  return (
    <ClassroomShell embedded={hideNav}>
      {!hideNav && <Navigation onNavigate={onNavigate} />}
      <Content
        aria-labelledby="profile-title"
        className={hideNav ? 'space-y-6' : 'mx-auto max-w-4xl space-y-6 px-4 py-8'}
      >
        <ChalkboardHeader size="banner" titleId="profile-title" title="Profile" />

        {/* ID card: avatar, name, role and institution. Flat, no tilt. */}
        <PaperPanel tone="white" padded={false} className="overflow-hidden">
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-line text-xl font-semibold text-ink"
              >
                {initials}
              </span>
              <div className="min-w-0">
                {isEditing ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <ClassroomField
                      id="profile-first-name"
                      label="First name"
                      value={profile.first_name}
                      onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                      placeholder="First name"
                    />
                    <ClassroomField
                      id="profile-last-name"
                      label="Last name"
                      value={profile.last_name}
                      onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                      placeholder="Last name"
                    />
                  </div>
                ) : (
                  <h2 className="truncate text-lg font-semibold text-ink">{displayName}</h2>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {profile.role && (
                    <ChalkBadge label={profile.role} icon={RoleIcon} className="capitalize" />
                  )}
                  {user?.institution_name && (
                    <span className="text-xs text-ink-2">{user.institution_name}</span>
                  )}
                </div>
              </div>
            </div>
            <ClassroomButton
              variant={isEditing ? 'primary' : 'secondary'}
              icon={isEditing ? Save : Edit2}
              disabled={saving}
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              className="self-start"
            >
              {isEditing ? (saving ? 'Saving...' : 'Save') : 'Edit Profile'}
            </ClassroomButton>
          </div>

          <div className="grid gap-5 border-t border-line p-4 md:grid-cols-2 md:p-6">
            <div className="space-y-4">
              {isEditing ? (
                <ClassroomField
                  id="profile-email"
                  label="Email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  hint={user?.email_change_info
                    ? `${user.email_change_info.changes_used}/${user.email_change_info.max_changes} changes used${user.email_change_info.days_remaining > 0 ? ` | ${user.email_change_info.days_remaining} days until next change` : ''}`
                    : undefined}
                />
              ) : (
                <ProfileDetail icon={Mail} label="Email">{profile.email}</ProfileDetail>
              )}

              {isEditing ? (
                <ClassroomField
                  id="profile-username"
                  label="Username"
                  value={profile.username}
                  onChange={(e) => setProfile({...profile, username: e.target.value})}
                  hint={user?.username_change_info
                    ? `${user.username_change_info.changes_used}/${user.username_change_info.max_changes} changes used${user.username_change_info.days_remaining > 0 ? ` | ${user.username_change_info.days_remaining} days until next change` : ''}`
                    : undefined}
                />
              ) : (
                <ProfileDetail icon={UserIcon} label="Username">@{profile.username}</ProfileDetail>
              )}
            </div>

            <div className="space-y-4">
              {isEditing ? (
                <ClassroomField
                  id="profile-bio"
                  as="textarea"
                  label="Bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({...profile, bio: e.target.value})}
                  placeholder="Tell us about yourself..."
                  rows={2}
                />
              ) : (
                <ProfileDetail icon={Activity} label="Bio">{profile.bio || 'No bio yet'}</ProfileDetail>
              )}

              <ProfileDetail icon={Calendar} label="Joined">{joinDate}</ProfileDetail>
            </div>
          </div>

          {isEditing && (
            <div className="space-y-3 border-t border-line p-4 md:px-6">
              {saveError && <ClassroomAlert>{saveError}</ClassroomAlert>}
              <ClassroomButton variant="ghost" onClick={() => { setIsEditing(false); setSaveError(null); }}>
                Cancel editing
              </ClassroomButton>
            </div>
          )}
        </PaperPanel>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-2">
          <PaperPanel tone="white" className="p-4 md:p-6">
            <p className="text-sm text-ink-2">Active Boards</p>
            <p className="mt-2 text-3xl font-semibold text-accent-600">{boardCount}</p>
          </PaperPanel>

          <PaperPanel tone="white" className="p-4 md:p-6">
            <p className="flex items-center gap-1.5 text-sm text-ink-2">
              <HardDrive className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              <span>Storage</span>
            </p>
            {storage.status === 'loading' ? (
              <div className="mt-2 space-y-3" aria-busy="true">
                <span className="sr-only">Loading storage usage</span>
                <div className="skeleton h-6 w-1/2" />
                <div className="skeleton h-2 w-full" />
              </div>
            ) : hasQuota ? (
              <>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <p className="text-xl font-semibold text-ink">
                    {usedDisplay} <span className="text-sm font-normal text-ink-2">/ {quotaDisplay}</span>
                  </p>
                  <span className={cx('text-base font-semibold', textColor)}>{pct}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Storage used"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(pct, 100)}
                  className="mt-2 h-2 w-full rounded-sm bg-line"
                >
                  <div className={cx('h-2 rounded-sm', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                {pct >= 80 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ChalkBadge
                      tone={pct >= 90 ? 'danger' : 'warning'}
                      icon={AlertTriangle}
                      label={pct >= 90 ? 'Almost full' : 'Getting full'}
                    />
                    <p className="text-sm text-ink-2">
                      {pct >= 90 ? 'Storage almost full! Consider freeing up space.' : 'Storage getting full. Consider cleaning up files.'}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-2">Used {usedDisplay}. No storage quota is set for this account.</p>
            )}
          </PaperPanel>
        </div>

        {/* Recent Boards */}
        <PaperPanel tone="white" padded={false} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
            <h2 id="profile-recent-title" className="text-base font-semibold text-ink">Recent Boards</h2>
            <ClassroomButton variant="ghost" onClick={() => onNavigate('dashboard')}>
              <span>View All</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </ClassroomButton>
          </div>
          {recentBoards.length > 0 ? (
            <ul>
              {recentBoards.map(board => (
                <li key={board.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onNavigate('workspace', { boardId: board.id })}
                    className="flex min-h-[44px] w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-surface-hover"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded bg-accent-50">
                        <Folder className="h-4 w-4 text-accent-600" strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{board.name}</span>
                        <span className="block truncate text-xs text-ink-2">{board.course}</span>
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-1.5 text-xs text-ink-2">
                      <Clock className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                      <span>{board.lastEdited}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <StickyNote color="azure">
                <p className="text-sm font-semibold text-ink">No boards yet</p>
                <p className="mt-1 text-xs text-ink-2">Boards you create or join show here.</p>
              </StickyNote>
            </div>
          )}
        </PaperPanel>
      </Content>
    </ClassroomShell>
  );
};

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default ProfilePage;
