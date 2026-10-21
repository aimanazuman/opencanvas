import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check } from 'lucide-react';
import Navigation from '../components/Navigation';
import { ClassroomShell, ChalkboardHeader, ChalkBadge, ClassroomAlert, ClassroomButton, PaperPanel, StickyNote } from '../components/classroom';
import cx from '../components/classroom/cx';
import { notificationsApi } from '../services/api';
import { getNotificationConfig } from '../utils/notificationTypes';

// Filter keys are backend types; 'all' shows everything.
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'board_shared', label: 'Shared' },
  { key: 'course_enrolled', label: 'Enrolled' },
  { key: 'invite_accepted', label: 'Joined' },
  { key: 'file_deleted', label: 'File Removed' },
  { key: 'storage_warning', label: 'Storage' },
];

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

function NotificationRow({ notification, onMarkRead }) {
  const config = getNotificationConfig(notification.type);
  const Icon = config.icon;
  const unread = !notification.is_read;

  const body = (
    <span className="flex items-start gap-3">
      <Icon className={cx('mt-0.5 h-4 w-4 flex-none', config.iconClass)} strokeWidth={1.5} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cx('inline-flex h-5 items-center rounded-sm px-1.5 text-2xs font-medium', config.badge)}>
            {config.label}
          </span>
          {unread && (
            <>
              <span aria-hidden="true" className={cx('h-2 w-2 rounded-full', config.dot)} />
              <span className="sr-only">Unread. Activate to mark as read.</span>
            </>
          )}
        </span>
        <span className={cx('mt-1 block text-sm', unread ? 'font-medium text-ink' : 'text-ink-2')}>
          {notification.message}
        </span>
        <span className="mt-1 block text-xs text-ink-2">{formatTimeAgo(notification.created_at)}</span>
      </span>
    </span>
  );

  return (
    <li className="relative border-b border-line last:border-b-0">
      <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 w-1', config.bar)} />
      {unread ? (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          className="block w-full px-4 py-3 pl-5 text-left hover:bg-surface-hover md:min-h-[32px]"
        >
          {body}
        </button>
      ) : (
        <div className="px-4 py-3 pl-5">{body}</div>
      )}
    </li>
  );
}

function NotificationsPage({ onNavigate, hideNav = false }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await notificationsApi.getAll();
      const data = response.data.results || response.data;
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setLoadError(true);
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
  const activeFilter = FILTERS.find(f => f.key === filter) || FILTERS[0];

  const Content = hideNav ? 'div' : 'main';

  let list;
  if (loading) {
    list = (
      <PaperPanel tone="white" padded={false} className="overflow-hidden" aria-busy="true">
        <p role="status" className="sr-only">Loading notifications</p>
        <div aria-hidden="true">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex gap-3 border-b border-line p-4 last:border-b-0">
              <span className="h-4 w-4 flex-none rounded-sm bg-line" />
              <span className="flex-1 space-y-2">
                <span className="block h-3 w-24 rounded-sm bg-line" />
                <span className="block h-3 w-full rounded-sm bg-line" />
                <span className="block h-3 w-1/3 rounded-sm bg-line" />
              </span>
            </div>
          ))}
        </div>
      </PaperPanel>
    );
  } else if (loadError) {
    list = (
      <PaperPanel tone="white" padded={false} className="p-4">
        <div className="space-y-3">
          <ClassroomAlert>Could not load your notifications.</ClassroomAlert>
          <ClassroomButton variant="secondary" onClick={loadNotifications}>Try again</ClassroomButton>
        </div>
      </PaperPanel>
    );
  } else if (filteredNotifications.length === 0) {
    list = (
      <StickyNote color="azure" className="mx-auto max-w-sm items-center text-center">
        <Bell className="mb-2 h-5 w-5 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
        <p className="text-sm font-semibold text-ink">No notifications</p>
        <p className="mt-1 text-xs text-ink-2">
          {filter === 'all'
            ? 'Shares, enrolments and storage alerts show here.'
            : `No ${activeFilter.label.toLowerCase()} notifications to show.`}
        </p>
      </StickyNote>
    );
  } else {
    list = (
      <PaperPanel tone="white" padded={false} className="overflow-hidden">
        <ul aria-label="Notifications">
          {filteredNotifications.map(notification => (
            <NotificationRow key={notification.id} notification={notification} onMarkRead={handleMarkRead} />
          ))}
        </ul>
      </PaperPanel>
    );
  }

  return (
    <ClassroomShell embedded={hideNav}>
      {!hideNav && <Navigation onNavigate={onNavigate} />}

      <Content
        aria-labelledby="notifications-title"
        className={hideNav ? 'space-y-4' : 'mx-auto max-w-4xl space-y-4 px-4 py-8'}
      >
        <ChalkboardHeader
          size="compact"
          titleId="notifications-title"
          title="Notifications"
          actions={unreadCount > 0 ? (
            <ClassroomButton onChalk icon={Check} onClick={handleMarkAllRead}>
              Mark all as read
            </ClassroomButton>
          ) : undefined}
        >
          <span className="mt-3 block">
            <ChalkBadge
              surface="chalk"
              icon={Bell}
              role="status"
              label={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            />
          </span>
        </ChalkboardHeader>

        <div role="group" aria-label="Filter notifications" className="flex gap-1 overflow-x-auto rounded bg-line p-1">
          {FILTERS.map(btn => {
            const active = filter === btn.key;
            return (
              <button
                key={btn.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(btn.key)}
                className={cx(
                  'min-h-[44px] flex-none whitespace-nowrap rounded px-3 text-sm font-medium transition md:min-h-[32px]',
                  active ? 'bg-surface text-ink shadow-float' : 'text-ink-2 hover:text-ink'
                )}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {list}
      </Content>
    </ClassroomShell>
  );
}

export default NotificationsPage;
