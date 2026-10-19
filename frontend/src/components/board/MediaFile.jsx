import React from 'react';
import { useMediaUrl } from '../../utils/media';

/** <img> for a stored upload reference (or a blob: preview). Shows nothing until the signed URL is ready. */
export function MediaImg({ src, alt = '', ...props }) {
  const url = useMediaUrl(src);
  if (!url) return null;
  return <img src={url} alt={alt} {...props} />;
}

/** Download link for a stored upload reference. */
export function MediaDownloadLink({ src, name, children, ...props }) {
  const url = useMediaUrl(src);
  if (!url) return null;
  return (
    <a href={url} download={name} rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}
