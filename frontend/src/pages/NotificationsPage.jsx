import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Info, Users, BookOpen, Trash2, HardDrive, AlertTriangle } from 'lucide-react';
import Navigation from '../components/Navigation';
import { notificationsApi } from '../services/api';

const TYPE_CONFIG = {
  board_shared: { color: 'blue', border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700', icon: Users, label: 'Shared' },
  course_enrolled: { color: 'purple', border: 'border-l-purple-500', badge: 'bg-purple-100 text-purple-700', icon: BookOpen, label: 'Enrolled' },
  system_announcement: { color: 'gray', border: 'border-l-gray-500', badge: 'bg-gray-100 text-gray-700', icon: Info, label: 'System' },
  invite_accepted: { color: 'teal', border: 'border-l-teal-500', badge: 'bg-teal-100 text-teal-700', icon: Users, label: 'Joined' },
  file_deleted: { color: 'red', border: 'border-l-red-500', badge: 'bg-red-100 text-red-700', icon: Trash2, label: 'File Removed' },
  quota_changed: { color: 'amber', border: 'border-l-amber-500', badge: 'bg-amber-100 text-amber-700', icon: HardDrive, label: 'Quota' },
  storage_warning: { color: 'orange', border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: AlertTriangle, label: 'Storage' },
};

const DEFAULT_CONFIG = { color: 'gray', border: 'border-l-gray-500', badge: 'bg-gray-100 text-gray-700', icon: Info, label: 'Info' };

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function NotificationsPage({ onNavigate, hideNav = false }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationsApi.getAll();
      const data = response.data.results || response.data;
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'board_shared', label: 'Shared' },
    { key: 'course_enrolled', label: 'Enrolled' },
    { key: 'invite_accepted', label: 'Joined' },
    { key: 'file_deleted', label: 'File Removed' },
    { key: 'storage_warning', label: 'Storage' },
  ];

  return (
    <div className={hideNav ? '' : 'min-h-screen bg-gray-50'}>
      {!hideNav && <Navigation onNavigate={onNavigate} />}

      <div className={hideNav ? '' : 'max-w-4xl mx-auto px-4 py-8'}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <Bell className="w-7 h-7 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium text-sm self-start"
            >
              <Check className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-2 mb-6 overflow-x-auto">
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                filter === btn.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* Notification List */}
            <div className="space-y-3">
              {filteredNotifications.map(notification => {
                const config = TYPE_CONFIG[notification.type] || DEFAULT_CONFIG;
                const Icon = config.icon;
                return (
                  <div
                    key={notification.id}
                    onClick={() => !notification.is_read && handleMarkRead(notification.id)}
                    className={`bg-white rounded-lg shadow-sm border border-l-4 ${config.border} p-4 transition hover:shadow-md cursor-pointer ${
                      !notification.is_read ? 'ring-1 ring-blue-100' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon className={`w-5 h-5 text-${config.color}-500`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.badge}`}>
                            {config.label}
                          </span>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <p className={`text-sm ${!notification.is_read ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(notification.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredNotifications.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm">No {filter !== 'all' ? filter.replace('_', ' ') : ''} notifications to show</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
