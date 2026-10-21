import React from 'react';
import cx from './cx';

const COLOR = {
  azure: 'bg-note-azure',
  amber: 'bg-note-amber',
  green: 'bg-note-green',
  teal: 'bg-note-teal',
  orange: 'bg-note-orange',
};

// Tilt is decorative only, limited to -2, 0 and 2 degrees, and removed below 480 px.
const TILT = {
  '-2': 'min-[480px]:-rotate-2',
  '0': '',
  '2': 'min-[480px]:rotate-2',
};

/**
 * Sticky note: a text container, so its text carries the contrast, not the edge.
 * `rotate` applies only with `decorative`. `pinned` adds a decorative pin on top.
 */
export default function StickyNote({
  as: Tag = 'div',
  color = 'amber',
  rotate = 0,
  decorative = false,
  pinned = false,
  spacious = false,
  className = '',
  children,
  ...rest
}) {
  const tilt = decorative ? TILT[String(rotate)] || '' : '';
  return (
    <Tag
      className={cx(
        'relative flex flex-col rounded-sm text-ink shadow-float',
        spacious ? 'p-5' : 'p-3',
        COLOR[color] || COLOR.amber,
        tilt,
        className
      )}
      {...rest}
    >
      {pinned && (
        <span
          aria-hidden="true"
          className="absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-danger shadow-float ring-2 ring-surface"
        />
      )}
      {children}
    </Tag>
  );
}
