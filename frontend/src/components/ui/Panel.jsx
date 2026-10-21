import React from 'react';
import { X } from 'lucide-react';

/**
 * Floating side panel. Sits over the canvas on the right (bottom sheet on small screens).
 * The caller decides when to render it.
 */
export default function Panel({ title, onClose, children, className = '' }) {
  return (
    <aside
      aria-label={title}
      className={`fixed z-40 bg-surface border border-line shadow-pop animate-slideRight flex flex-col
        inset-x-0 bottom-0 max-h-[80vh] rounded-t-xl
        md:inset-x-auto md:right-2 md:top-12 md:bottom-auto md:w-80 md:max-h-[calc(100vh-56px)] md:rounded-lg ${className}`}
    >
      <div className="flex items-center justify-between h-9 px-3 border-b border-line flex-shrink-0">
        <h2 className="text-xs font-semibold text-ink">{title}</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-ink-2"
          >
            <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="overflow-y-auto p-3">{children}</div>
    </aside>
  );
}
