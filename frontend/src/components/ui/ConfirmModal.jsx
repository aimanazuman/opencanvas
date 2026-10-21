import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ConfirmModal({ isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && previous.focus) previous.focus();
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[var(--scrim)] flex items-end md:items-center justify-center z-50 md:p-4 animate-backdropFade">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-surface rounded-t-xl md:rounded-xl shadow-modal w-full max-w-md animate-scaleIn"
      >
        <div className="flex items-center justify-between h-11 px-4 border-b border-line">
          <div className="flex items-center gap-2">
            {variant === 'danger' && <AlertTriangle className="w-4 h-4 text-danger" strokeWidth={1.5} aria-hidden="true" />}
            <h3 id="confirm-modal-title" className="text-base font-semibold text-ink">{title}</h3>
          </div>
          <button onClick={onCancel} aria-label="Close" className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-hover text-ink-2">
            <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-ink-2">{message}</p>
        </div>
        <div className="px-4 py-3 border-t border-line flex justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
