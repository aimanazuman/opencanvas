import React from 'react';
import Field from '../ui/Field';
import cx from './cx';

/**
 * Labelled field for classroom forms. Visible label, white control, 44 px high.
 * Never place it on ruled paper or cork: its white fill is what keeps the text readable.
 */
export default function ClassroomField({ controlClassName = '', ...rest }) {
  return <Field controlClassName={cx('min-h-[44px]', controlClassName)} {...rest} />;
}
