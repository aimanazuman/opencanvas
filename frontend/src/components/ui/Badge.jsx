import React from 'react';

const TONES = {
  neutral: 'bg-gray-100 text-gray-700',
  azure: 'bg-accent-50 text-accent-700',
  green: 'bg-green-50 text-green-700',
  teal: 'bg-teal-50 text-teal-700',
  amber: 'bg-amber-50 text-amber-700',
  orange: 'bg-orange-50 text-orange-700',
  red: 'bg-red-50 text-red-700',
};

/** Small status or type tag. Always pair colour with a text label. */
export default function Badge({ tone = 'neutral', icon: Icon, className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-sm text-2xs font-medium ${TONES[tone] || TONES.neutral} ${className}`}>
      {Icon && <Icon className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />}
      {children}
    </span>
  );
}
