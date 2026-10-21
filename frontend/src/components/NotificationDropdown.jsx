import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check } from 'lucide-react';
import { notificationsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ChalkBadge } from './classroom';
import { getNotificationConfig } from '../utils/notificationTypes';

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

function NotificationDropdown({ onNavigate }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const { user } = useAuth();

  const loadNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getAll(),
        notificationsApi.getUnreadCount(),
      ]);
      const data = notifRes.data.results || notifRes.data;
      setNotifications(data);
      setUnreadCount(countRes.data.count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    // Poll every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-haspopup="true"
        aria-expanded={showDropdown}
        className="relative flex h-11 w-11 items-center justify-center rounded text-ink-2 transition hover:bg-surface-hover md:h-8 md:w-8"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white text-2xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="motion-safe:animate-oc-fade-in absolute right-0 z-50 mt-1 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
          {/* Header: UI-font title and a chalk count, the only chalk accent in the menu */}
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="font-sans text-base font-semibold leading-tight text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <ChalkBadge
                  surface="chalk"
                  icon={Bell}
                  label={unreadCount > 9 ? '9+ unread' : `${unreadCount} unread`}
                />
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-accent-700 hover:text-accent-800 md:min-h-[32px]"
              >
                <Check className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length > 0 ? (
              recentNotifications.map(notification => {
                const config = getNotificationConfig(notification.type);
                const unread = !notification.is_read;
                return (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 border-b border-line px-3 py-3 last:border-b-0"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${config.dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      {unread && <span className="sr-only">Unread: </span>}
                      <p className={`text-sm ${unread ? 'font-medium text-ink' : 'text-ink-2'}`}>
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-ink-2">{formatTimeAgo(notification.created_at)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="px-3 py-8 text-center text-sm text-ink-2">No notifications yet</p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-line">
            <button
              type="button"
              onClick={() => {
                setShowDropdown(false);
                onNavigate(user?.role === 'lecturer' ? 'lecturer-notifications' : 'notifications');
              }}
              className="flex min-h-[44px] w-full items-center justify-center text-sm font-medium text-accent-700 hover:bg-surface-hover hover:text-accent-800 md:min-h-[32px]"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
