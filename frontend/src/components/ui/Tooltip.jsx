import React, { useState, useId } from 'react';

/**
 * Tooltip shown on hover and keyboard focus, dismissed with Escape.
 * Wrap a single focusable child; the text is also exposed through aria-describedby.
 */
export default function Tooltip({ text, side = 'bottom', children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const position = side === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : 'top-full left-1/2 -translate-x-1/2 mt-1';
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-50 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white pointer-events-none motion-safe:animate-oc-fade-in ${position}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
