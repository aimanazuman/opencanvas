import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative flex-1 ${className}`}>
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" strokeWidth={1.5} aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-11 md:h-8 pl-8 pr-9 text-sm bg-surface border border-line-strong rounded hover:border-ink-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded text-ink-3 hover:bg-surface-hover"
        >
          <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
