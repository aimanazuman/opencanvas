import React from 'react';
import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="text-center py-12 px-4">
      {Icon && <Icon className="w-5 h-5 mx-auto mb-2 text-ink-3" strokeWidth={1.5} aria-hidden="true" />}
      {title && <p className="text-sm font-semibold text-ink">{title}</p>}
      {description && <p className="text-xs text-ink-2 mt-1">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
