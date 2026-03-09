import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Calendar, Edit2, Save, X, Clock, Folder, ArrowRight, Activity, User as UserIcon, HardDrive } from 'lucide-react';
import Navigation from '../components/Navigation';
import { useAuth } from '../contexts/AuthContext';
import { authApi, boardsApi } from '../services/api';

const ProfilePage = ({ onNavigate, hideNav = false }) => {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
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

  return (
    <div className={hideNav ? '' : 'min-h-screen bg-gray-50'}>
      {!hideNav && <Navigation onNavigate={onNavigate} />}
      <div className={hideNav ? '' : 'max-w-4xl mx-auto px-4 py-8'}>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-32"></div>
          <div className="relative px-8 pb-8">
            <div className="flex justify-between items-start -mt-16 mb-6">
              <div className="flex items-end space-x-4">
                <div className="w-32 h-32 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center text-4xl font-bold text-gray-600">
                  {initials}
                </div>
                <div className="pb-4">
                  {isEditing ? (
                    <div className="flex space-x-2 mb-1">
                      <input
                        type="text"
                        value={profile.first_name}
                        onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                        placeholder="First name"
                        className="text-xl font-bold border border-gray-300 rounded px-2 py-1 w-36"
                      />
                      <input
                        type="text"
                        value={profile.last_name}
                        onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                        placeholder="Last name"
                        className="text-xl font-bold border border-gray-300 rounded px-2 py-1 w-36"
                      />
                    </div>
                  ) : (
                    <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                  )}
                  <p className="text-gray-600 capitalize">{profile.role}</p>
                </div>
              </div>
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={saving}
                className={`mt-4 px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2 ${
                  isEditing
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                <span>{isEditing ? (saving ? 'Saving...' : 'Save') : 'Edit Profile'}</span>
              </button>
            </div>

            {/* Profile Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Email</p>
                    {isEditing ? (
                      <div>
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        {user?.email_change_info && (
                          <p className="text-xs text-gray-400 mt-1">
                            {user.email_change_info.changes_used}/{user.email_change_info.max_changes} changes used
                            {user.email_change_info.days_remaining > 0 && ` | ${user.email_change_info.days_remaining} days until next change`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="font-medium">{profile.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Username</p>
                    {isEditing ? (
                      <div>
                        <input
                          type="text"
                          value={profile.username}
                          onChange={(e) => setProfile({...profile, username: e.target.value})}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        {user?.username_change_info && (
                          <p className="text-xs text-gray-400 mt-1">
                            {user.username_change_info.changes_used}/{user.username_change_info.max_changes} changes used
                            {user.username_change_info.days_remaining > 0 && ` | ${user.username_change_info.days_remaining} days until next change`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="font-medium">@{profile.username}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Bio</p>
                    {isEditing ? (
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        placeholder="Tell us about yourself..."
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        rows={2}
                      />
                    ) : (
                      <p className="font-medium">{profile.bio || 'No bio yet'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Joined</p>
                    <p className="font-medium">{joinDate}</p>
                  </div>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-4 space-y-2">
                {saveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {saveError}
                  </div>
                )}
                <button
                  onClick={() => { setIsEditing(false); setSaveError(null); }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel editing
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        {(() => {
          const usedBytes = user?.storage_used || 0;
          const quotaBytes = user?.storage_quota || 5368709120;
          const formatSize = (bytes) => {
            if (!bytes || bytes === 0) return '0 B';
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            const k = 1024;
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            const value = bytes / Math.pow(k, i);
            return `${value.toFixed(3).replace(/\.?0+$/, '')} ${units[i]}`;
          };
          const usedDisplay = formatSize(usedBytes);
          const quotaDisplay = formatSize(quotaBytes);
          const pct = quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 100) : 0;
          const barColor = pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500';
          const textColor = pct >= 90 ? 'text-red-600' : pct >= 80 ? 'text-yellow-600' : 'text-blue-600';
          return (
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-gray-600 mb-2">Active Boards</p>
                <p className="text-3xl font-bold text-blue-600">{boardCount}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center space-x-2 mb-3">
                  <HardDrive className="w-5 h-5 text-gray-400" />
                  <p className="text-gray-600">Storage</p>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <p className="text-2xl font-bold text-gray-900">{usedDisplay} <span className="text-base font-normal text-gray-500">/ {quotaDisplay}</span></p>
                  <span className={`text-lg font-bold ${textColor}`}>{pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                {pct >= 80 && (
                  <p className={`text-sm mt-2 ${pct >= 90 ? 'text-red-600' : 'text-yellow-600'}`}>
                    {pct >= 90 ? 'Storage almost full! Consider freeing up space.' : 'Storage getting full. Consider cleaning up files.'}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Recent Boards */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Boards</h3>
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentBoards.map(board => (
              <div
                key={board.id}
                onClick={() => onNavigate('workspace', { boardId: board.id })}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-3 rounded-lg">
                    <Folder className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{board.name}</h4>
                    <p className="text-sm text-gray-500">{board.course}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{board.lastEdited}</span>
                </div>
              </div>
            ))}
            {recentBoards.length === 0 && (
              <p className="text-center text-gray-400 py-8">No boards yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
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
