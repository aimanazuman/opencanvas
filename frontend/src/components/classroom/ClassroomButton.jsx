import React, { forwardRef } from 'react';
import Button from '../ui/Button';
import cx from './cx';

/**
 * Button for classroom pages. Min 44 x 44 px. `onChalk` is for buttons sitting on a chalkboard:
 * chalk fill, chalkboard text, and a chalk-ink focus ring. `btn-motion` comes from ui/Button.
 */
const ClassroomButton = forwardRef(function ClassroomButton({ onChalk = false, variant, className = '', ...rest }, ref) {
  return (
    <Button
      ref={ref}
      variant={onChalk ? 'chalk' : variant}
      className={cx('min-h-[44px] min-w-[44px]', onChalk && 'focus-visible:outline-chalk-ink', className)}
      {...rest}
    />
  );
});

export default ClassroomButton;
