import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="text-center py-12 text-gray-400">
      {Icon && <Icon className="w-12 h-12 mx-auto mb-3 opacity-50" />}
      {title && <p className="text-lg font-medium">{title}</p>}
      {description && <p className="text-sm mt-1">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
