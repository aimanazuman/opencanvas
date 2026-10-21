import { Users, BookOpen, Info, Trash2, HardDrive, AlertTriangle, Clock } from 'lucide-react';

/**
 * Notification types from the backend (apps/accounts/models.py TYPE_CHOICES).
 *
 * Static lookup: Tailwind only sees literal class names, so no class is built from a template literal.
 * Hue families are limited to azure (accent), teal, green, amber, orange and slate (grey).
 * Icon uses the 600 level, badge text the 700 level on a 50 tint (both above the contrast floor).
 * Colour is never the only signal: each type also carries a text label and an icon.
 */
export const NOTIFICATION_TYPES = {
  board_shared: {
    label: 'Shared',
    icon: Users,
    iconClass: 'text-accent-600',
    badge: 'bg-accent-50 text-accent-700',
    bar: 'bg-accent-600',
    dot: 'bg-accent-600',
  },
  course_enrolled: {
    label: 'Enrolled',
    icon: BookOpen,
    iconClass: 'text-teal-600',
    badge: 'bg-teal-50 text-teal-700',
    bar: 'bg-teal-600',
    dot: 'bg-teal-600',
  },
  invite_accepted: {
    label: 'Joined',
    icon: Users,
    iconClass: 'text-green-600',
    badge: 'bg-green-50 text-green-700',
    bar: 'bg-green-600',
    dot: 'bg-green-600',
  },
  system_announcement: {
    label: 'System',
    icon: Info,
    iconClass: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700',
    bar: 'bg-slate-500',
    dot: 'bg-slate-500',
  },
  quota_changed: {
    label: 'Quota',
    icon: HardDrive,
    iconClass: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-700',
    bar: 'bg-slate-500',
    dot: 'bg-slate-500',
  },
  storage_warning: {
    label: 'Storage',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  guest_account_expiry: {
    label: 'Guest account',
    icon: Clock,
    iconClass: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  file_deleted: {
    label: 'File Removed',
    icon: Trash2,
    iconClass: 'text-orange-600',
    badge: 'bg-orange-50 text-orange-700',
    bar: 'bg-orange-600',
    dot: 'bg-orange-600',
  },
};

export const DEFAULT_NOTIFICATION = {
  label: 'Info',
  icon: Info,
  iconClass: 'text-slate-600',
  badge: 'bg-slate-100 text-slate-700',
  bar: 'bg-slate-500',
  dot: 'bg-slate-400',
};

/** Resolve a type to its config. Unknown types, and prototype keys such as "constructor", use the default. */
export function getNotificationConfig(type) {
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_TYPES, type) ? NOTIFICATION_TYPES[type] : DEFAULT_NOTIFICATION;
}
