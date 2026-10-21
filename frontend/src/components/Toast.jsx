import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const BAR_COLORS = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-accent',
};

const ICON_COLORS = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-accent',
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback({
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  }, [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto md:right-4 z-[100] flex flex-col space-y-2 md:max-w-sm">
        {toasts.map(t => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              role={t.type === 'error' ? 'alert' : 'status'}
              className={`flex items-start gap-2 px-3 py-2 rounded bg-surface text-ink border border-line border-l-4 shadow-pop animate-slideUp ${BAR_COLORS[t.type]}`}
            >
              <Icon aria-hidden="true" strokeWidth={1.5} className={`w-4 h-4 flex-shrink-0 mt-0.5 ${ICON_COLORS[t.type]}`} />
              <p className="text-sm flex-1 text-ink">{t.message}</p>
              <button
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss"
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center hover:bg-surface-hover rounded transition"
              >
                <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op toast if not within provider
    return {
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    };
  }
  return context;
}

export default ToastProvider;
