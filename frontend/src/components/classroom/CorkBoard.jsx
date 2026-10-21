import React from 'react';
import cx from './cx';

// Static lookup. `three` is 1 / 2 / 3 columns; `five` is the HomePage template row (2 / 5).
const LAYOUT = {
  three: 'sm:grid-cols-2 lg:grid-cols-3',
  five: 'sm:grid-cols-2 lg:grid-cols-5',
};

/**
 * Cork board for StickyNotes only. Put it inside a WoodFrame. No inputs on cork.
 * `header` sits above the grid; `children` are the items, each wrapped in an <li>.
 * `overflow-x-clip` stops tilted notes causing a horizontal scroll.
 */
export default function CorkBoard({
  as: Tag = 'section',
  header,
  layout = 'three',
  padded = true,
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag className={cx('cork-board overflow-x-clip', padded && 'px-4 py-16 md:py-20', className)} {...rest}>
      <div className="mx-auto max-w-6xl">
        {header}
        <ul className={cx('grid gap-6 pt-2', LAYOUT[layout] || LAYOUT.three)}>{children}</ul>
      </div>
    </Tag>
  );
}
