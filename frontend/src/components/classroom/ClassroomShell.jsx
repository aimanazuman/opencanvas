import React, { forwardRef } from 'react';
import cx from './cx';

// Static lookup: Tailwind only sees literal class names.
const VARIANT = {
  plain: '',
  // Ruled paper with the red margin. Marketing and auth pages only.
  paper: 'paper-rules',
};

// `embedded` drops the wall and full height for pages rendered inside another layout that owns its background.
const BASE = {
  wall: 'classroom min-h-[100dvh] bg-wall text-ink',
  embedded: 'classroom text-ink',
};

/**
 * Root for classroom pages. Adds the `.classroom` scope that opt-in CSS keys off (see index.css).
 * AdminPage never renders this, so scoped rules cannot reach it.
 */
const ClassroomShell = forwardRef(function ClassroomShell(
  { variant = 'plain', embedded = false, as: Tag = 'div', className = '', children, ...rest },
  ref
) {
  return (
    <Tag ref={ref} className={cx(BASE[embedded ? 'embedded' : 'wall'], VARIANT[variant] || '', className)} {...rest}>
      {children}
    </Tag>
  );
});

export default ClassroomShell;
