import React from 'react';
import cx from './cx';

// Frame thickness. `md` is the HomePage frame (10 px, 12 px from md). `sm` is a 4 px edge.
const WIDTH = {
  md: 'p-2.5 md:p-3',
  sm: 'p-1',
};

/**
 * Wood frame for a chalkboard or cork board. Only wrap chalkboards and cork boards.
 */
export default function WoodFrame({ width = 'md', as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={cx('wood-frame rounded-lg shadow-float', WIDTH[width] || WIDTH.md, className)} {...rest}>
      {children}
    </Tag>
  );
}
