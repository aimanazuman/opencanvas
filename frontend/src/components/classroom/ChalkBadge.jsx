import React from 'react';
import cx from './cx';

// White surfaces: tint fill with solid token text.
const TONE = {
  neutral: 'bg-surface-hover text-ink',
  success: 'bg-success-tint text-success',
  warning: 'bg-warning-tint text-warning',
  danger: 'bg-danger-tint text-danger',
};

// Chalk surfaces: one fill for every tone; the icon and label still say the status.
const CHALK = 'bg-chalk-deep text-chalk-ink';

/**
 * Status pill. Always text plus icon. `icon` is a lucide component (required).
 * `iconClassName` is for icon-only motion (for example `motion-safe:animate-spin`); it is empty by default.
 */
export default function ChalkBadge({ label, icon: Icon, tone = 'neutral', surface = 'white', iconClassName = '', className = '', ...rest }) {
  const color = surface === 'chalk' ? CHALK : TONE[tone] || TONE.neutral;
  return (
    <span className={cx('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium', color, className)} {...rest}>
      {Icon && <Icon className={cx('h-4 w-4 flex-shrink-0', iconClassName)} strokeWidth={1.75} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
}
