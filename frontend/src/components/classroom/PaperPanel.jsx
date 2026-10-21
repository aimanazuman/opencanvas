import React from 'react';
import cx from './cx';

const TONE = {
  paper: 'bg-paper',
  white: 'bg-surface',
};

/**
 * Panel on notebook paper or white. Keep it off for dense content: ruled lines are decorative only.
 * `ruled` draws the rules; `margin` adds the red margin line and needs `ruled` (a margin forces paper colour).
 * `flat` drops the border, radius and shadow for full-width sections.
 */
export default function PaperPanel({
  as: Tag = 'div',
  ruled = false,
  margin = false,
  padded = true,
  tone = 'paper',
  flat = false,
  className = '',
  children,
  ...rest
}) {
  const hasMargin = ruled && margin;
  let rules = '';
  if (ruled) rules = hasMargin ? 'paper-rules' : 'paper-lines';
  return (
    <Tag
      className={cx(
        TONE[tone] || TONE.paper,
        rules,
        !flat && 'rounded-lg border border-line shadow-float',
        // With the margin on, text starts past the red line.
        padded && (hasMargin ? 'p-3 pl-10 md:pl-12' : 'p-3'),
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
