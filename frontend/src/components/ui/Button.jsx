import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-800 disabled:bg-line disabled:text-ink-3',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-hover disabled:text-ink-3 disabled:bg-gray-100',
  ghost: 'bg-transparent text-ink hover:bg-surface-hover disabled:text-ink-3',
  danger: 'bg-danger text-white hover:opacity-90 disabled:bg-line disabled:text-ink-3',
  // Classroom: for buttons sitting on a chalkboard (see classroom/ClassroomButton).
  chalk: 'bg-chalk-ink text-chalk-board hover:bg-chalk-dust disabled:bg-chalk-deep disabled:text-chalk-dust',
};

/**
 * Button. Height 32px on desktop, 44px on small screens.
 * Pass `icon` (a lucide component) for a leading icon; `loading` swaps it for a spinner and keeps the label.
 */
const Button = React.forwardRef(function Button(
  { variant = 'secondary', icon: Icon, loading = false, disabled = false, type = 'button', className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 h-11 md:h-8 px-3 rounded text-sm font-medium btn-motion disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.secondary} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} aria-hidden="true" /> : Icon && <Icon className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />}
      {children}
    </button>
  );
});

export default Button;
