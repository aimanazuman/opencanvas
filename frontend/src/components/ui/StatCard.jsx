import React from 'react';

const COLOR_CLASSES = {
  azure: 'bg-accent-50 text-accent-700',
  blue: 'bg-accent-50 text-accent-700',
  green: 'bg-green-50 text-green-700',
  teal: 'bg-teal-50 text-teal-700',
  yellow: 'bg-amber-50 text-amber-700',
  orange: 'bg-orange-50 text-orange-700',
  red: 'bg-red-50 text-red-700',
};

export default function StatCard({ label, value, icon: Icon, color = 'azure', subtitle, onClick }) {
  const colorClass = COLOR_CLASSES[color] || COLOR_CLASSES.azure;
  const interactive = onClick
    ? 'lift cursor-pointer hover:border-gray-300 focus-visible:outline-accent'
    : '';

  return (
    <div
      className={`bg-surface rounded border border-line p-3 ${interactive}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } : undefined}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-2">{label}</p>
          <p className="text-xl font-semibold text-ink mt-1">{value}</p>
          {subtitle && <p className="text-xs text-success mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded ${colorClass}`}>
            <Icon className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
