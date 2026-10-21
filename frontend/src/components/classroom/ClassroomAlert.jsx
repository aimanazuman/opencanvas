import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import cx from './cx';

// Static lookup. Status is never colour alone: each tone has its own icon and the text carries the message.
const TONE = {
  danger: { box: 'border-danger bg-danger-tint text-danger', icon: AlertTriangle, role: 'alert' },
  success: { box: 'border-success bg-success-tint text-success', icon: CheckCircle, role: 'status' },
};

/**
 * Inline status message on a white panel. `danger` announces as an alert, `success` as a status.
 * Pass `role` to override. Children are the message (and any inline action).
 */
export default function ClassroomAlert({ tone = 'danger', role, className = '', children, ...rest }) {
  const t = TONE[tone] || TONE.danger;
  const Icon = t.icon;
  return (
    <div
      role={role || t.role}
      className={cx('flex items-start gap-2 rounded border-l-4 p-3 text-sm', t.box, className)}
      {...rest}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.5} aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
