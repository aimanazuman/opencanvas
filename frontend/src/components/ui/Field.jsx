import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

const CONTROL =
  'w-full h-11 md:h-8 px-2 rounded border bg-surface text-sm text-ink placeholder:text-ink-3 ' +
  'hover:border-ink-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent ' +
  'disabled:bg-gray-100 disabled:cursor-not-allowed';

/**
 * Labelled form control. `as` is 'input' (default), 'select' or 'textarea'.
 * Pass `error` (string) to show the danger border and message.
 * `className` styles the wrapper; `controlClassName` styles the input itself.
 * `endAdornment` (optional node, e.g. an icon button) is placed over the end of the control; the control
 * then sits in a relative wrapper. Without it the markup is unchanged.
 */
export default function Field({
  label,
  error,
  hint,
  as: Tag = 'input',
  className = '',
  controlClassName = '',
  endAdornment = null,
  children,
  id,
  ...rest
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const describedBy = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined;
  const sizing = Tag === 'textarea' ? 'h-auto py-1.5 md:h-auto' : '';
  const control = (
    <Tag
      id={fieldId}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className={`${CONTROL} ${sizing} ${error ? 'border-danger' : 'border-line-strong'}${controlClassName ? ` ${controlClassName}` : ''}`}
      {...rest}
    >
      {children}
    </Tag>
  );
  return (
    <div className={className}>
      {label && <label htmlFor={fieldId} className="block text-xs font-medium text-ink mb-1">{label}</label>}
      {endAdornment ? <div className="relative">{control}{endAdornment}</div> : control}
      {hint && !error && <p id={`${fieldId}-hint`} className="mt-1 text-xs text-ink-2">{hint}</p>}
      {error && (
        <p id={`${fieldId}-err`} className="mt-1 flex items-center gap-1 text-xs text-danger">
          <AlertCircle className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
