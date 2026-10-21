import React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { ClassroomField } from '../classroom';
import cx from '../classroom/cx';

// Notice tones. Literal class strings for the Tailwind scanner.
const TONE = {
  error: 'border-danger bg-danger-tint text-danger',
  success: 'border-success bg-success-tint text-success',
  warning: 'border-warning bg-warning-tint text-ink',
};

/**
 * Message box for errors, successes and warnings. Errors are announced at once (role alert);
 * other tones are polite status. Render it only when there is a message, so it is announced on insert.
 */
export function Notice({ tone = 'error', icon: Icon, children, className = '' }) {
  const isError = tone === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={cx('mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm', TONE[tone] || TONE.error, className)}
    >
      {Icon && <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Centred on the control itself: Field puts the adornment in a wrapper that holds only the control (no label,
// no hint), so the icon stays level with the input whether or not a label is shown and at any control height.
const ICON_CENTRED = 'pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-ink-3';

/** Labelled input with a leading icon. The icon is decorative. */
export function IconField({ icon: Icon, controlClassName = '', ...rest }) {
  return (
    <ClassroomField
      controlClassName={cx('pl-10', controlClassName)}
      endAdornment={Icon ? (
        <span aria-hidden="true" className={ICON_CENTRED}>
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </span>
      ) : null}
      {...rest}
    />
  );
}

/**
 * Password input with a leading lock and a show/hide button (44 x 44 px target).
 * The caller owns `visible` and `onToggle`, so the page state stays where it was.
 */
export function PasswordField({ visible, onToggle, controlClassName = '', ...rest }) {
  return (
    <ClassroomField
      type={visible ? 'text' : 'password'}
      controlClassName={cx('pl-10 pr-12', controlClassName)}
      endAdornment={(
        <>
          <span aria-hidden="true" className={ICON_CENTRED}>
            <Lock className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-label={visible ? 'Hide password' : 'Show password'}
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded text-ink-2 hover:text-ink md:h-8 md:w-8"
          >
            {visible ? <EyeOff className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" /> : <Eye className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />}
          </button>
        </>
      )}
      {...rest}
    />
  );
}
